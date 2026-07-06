// store/services/BmiReportSyncManager.ts
// 🔄 BMI REPORT SYNC MANAGER — Offline-first sync engine
//
// Singleton that drains pending BMI reports from local SQLite to
// app.mysehat.ai. Runs while the partner is logged in and the app is
// in foreground. Triggered by:
//
//   1. triggerNow()        — explicit call from the SAVE handler
//   2. NetInfo online      — when device transitions offline → online
//   3. AppState 'active'   — when the app returns to foreground
//   4. setInterval (2 min) — safety-net polling while foregrounded
//
// All four funnel into processPending(). One cycle at a time
// (isRunning guard). A triggerNow() during a running cycle queues a
// single follow-up so a freshly-inserted row never waits for the next
// timer tick.

import {
  AppState,
  type AppStateStatus,
  type NativeEventSubscription,
} from 'react-native';
import {
  apiClient,
  networkManager,
  NetworkError,
  ApiError,
  SessionExpiredError,
} from '../../utils/apiClient';
import {
  getPendingForPartner,
  markSyncing,
  markSynced,
  markRetryable,
  markFailed,
  resetStuckSyncing,
} from '../../utils/localReportRepository';
import { isLocalDbReady, type BmiReportRow } from '../../utils/localDb';

// ─── Constants ─────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes — foreground only
const BATCH_SIZE       = 25;            // max rows POSTed per cycle
const MAX_RETRIES      = 50;            // soft cap — promote to 'failed' beyond this

/**
 * Route lives in routes/partnerBmiReportRoutes.js, mounted at
 * /api/v1/partner-bmi-reports. Requires '/partner-bmi-reports/' to
 * exist in apiClient.ts's isPartnerRequest detection so the partner
 * JWT is auto-attached.
 *
 * Contract:
 *   POST /api/v1/partner-bmi-reports
 *   Body 200: { success, data: { report_id, client_uuid, is_duplicate } }
 *   4xx     → markFailed (no auto-retry)
 *   5xx/net → markRetryable (auto-retry on next trigger)
 */
const ENDPOINT = '/partner-bmi-reports';

type PostOutcome = 'synced' | 'retried' | 'failed';

interface CycleStats {
  succeeded: number;
  retried: number;
  failed: number;
  skipped: number;
}

// ─── Singleton ─────────────────────────────────────────────────────────────
class BmiReportSyncManager {
  // Lifecycle flags
  private isStarted = false;
  private isRunning = false;
  private pendingTrigger = false;
  private currentPartnerAuthId: string | null = null;

  // OS state (tracked for transition detection — we only fire on edges)
  private wasOnline = true;
  private currentAppState: AppStateStatus = 'active';

  // Subscriptions / handles
  private netInfoUnsubscribe: (() => void) | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  // ─── PUBLIC API ────────────────────────────────────────────────────────

  /**
   * Start the sync engine for a given partner.
   *   • Same partner re-call → no-op
   *   • Different partner    → internal stop + restart
   *
   * Call from App.tsx on partner login (and on app boot if already
   * authenticated). Don't call before initLocalDb() has resolved.
   */
  start(partnerAuthId: string): void {
    if (this.isStarted && this.currentPartnerAuthId === partnerAuthId) {
      console.log('🔄 SyncManager already running for', partnerAuthId);
      return;
    }

    if (this.isStarted) {
      console.log('🔄 SyncManager partner changed — restarting');
      this.stop();
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 STARTING BMI SYNC MANAGER');
    console.log('Partner:', partnerAuthId);

    this.currentPartnerAuthId = partnerAuthId;
    this.wasOnline = networkManager.getIsOnline();
    this.currentAppState = AppState.currentState;
    this.isStarted = true;

    // Trigger 2 — NetInfo
    this.netInfoUnsubscribe = networkManager.subscribe((isOnline) =>
      this.handleNetworkChange(isOnline),
    );

    // Trigger 3 — AppState
    this.appStateSubscription = AppState.addEventListener('change', (next) =>
      this.handleAppStateChange(next),
    );

    // Trigger 4 — interval (foreground only)
    if (this.currentAppState === 'active') {
      this.startInterval();
    }

    // Recover any 'syncing' rows left orphaned by a previous crash
    resetStuckSyncing(partnerAuthId).catch((e) =>
      console.log('⚠️ resetStuckSyncing failed:', e.message),
    );

    // Initial sync attempt — fire and forget
    this.processPending('start');

    console.log('✅ Sync manager started');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * Stop the engine. Call on partner logout. Idempotent.
   * If a cycle is in flight it finishes naturally, but the follow-up
   * queue is cleared so no further work runs.
   */
  stop(): void {
    if (!this.isStarted) return;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🛑 STOPPING BMI SYNC MANAGER');

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.stopInterval();

    this.isStarted = false;
    this.currentPartnerAuthId = null;
    this.pendingTrigger = false;

    console.log('✅ Sync manager stopped');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * Trigger 1 — fire a sync NOW. Called by the SAVE handler immediately
   * after insertReport(). Non-blocking (fire & forget).
   *
   * If a cycle is already in progress, queues exactly one follow-up so
   * the freshly-inserted row is picked up the moment the current cycle
   * finishes — no need to wait for the 2-min tick.
   */
  triggerNow(): void {
    if (!this.isStarted) {
      console.log('⚠️ triggerNow: manager not started — ignored');
      return;
    }
    if (this.isRunning) {
      console.log('🔄 triggerNow: cycle running — queued follow-up');
      this.pendingTrigger = true;
      return;
    }
    this.processPending('triggerNow');
  }

  /** For UI / debug — is a cycle currently in progress? */
  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }

  // ─── TRIGGER HANDLERS ──────────────────────────────────────────────────

  /** Trigger 2 — fired when NetInfo flips offline → online. */
  private handleNetworkChange(isOnline: boolean): void {
    const wasOnline = this.wasOnline;
    this.wasOnline = isOnline;

    if (!wasOnline && isOnline) {
      console.log('📡 Network online — triggering sync');
      this.processPending('netOnline');
    }
  }

  /**
   * Trigger 3 — AppState changes.
   * On 'active': restart interval + run a catch-up cycle.
   * On 'background': stop the interval (no point burning CPU/battery
   * while the user can't see results).
   */
  private handleAppStateChange(next: AppStateStatus): void {
    const prev = this.currentAppState;
    this.currentAppState = next;

    if (next === 'active' && prev !== 'active') {
      console.log('📱 App foreground — sync + restart interval');
      this.startInterval();
      this.processPending('foreground');
    } else if (next === 'background' && prev !== 'background') {
      console.log('📱 App background — stopping interval');
      this.stopInterval();
    }
  }

  /** Trigger 4 — periodic safety net while in foreground. */
  private startInterval(): void {
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(() => {
      console.log('⏱ 2-min tick — sync');
      this.processPending('interval');
    }, POLL_INTERVAL_MS);
  }

  private stopInterval(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  // ─── CYCLE EXECUTION ───────────────────────────────────────────────────

  /**
   * Drain pending rows for the current partner. One cycle = up to
   * BATCH_SIZE POSTs. isRunning guard means concurrent triggers don't
   * stack — second one just sets pendingTrigger.
   */
  private async processPending(source: string): Promise<void> {
    // ── Guards ──
    if (this.isRunning) {
      console.log(`🔄 Cycle in progress — [${source}] skipped`);
      return;
    }
    if (!this.isStarted || !this.currentPartnerAuthId) return;
    if (!isLocalDbReady()) {
      console.log('🗄️ DB not ready — skipping sync');
      return;
    }
    if (!networkManager.getIsOnline()) {
      console.log(`📡 Offline — [${source}] skipped`);
      return;
    }

    this.isRunning = true;
    this.pendingTrigger = false;
    const partnerAuthId = this.currentPartnerAuthId;
    const stats: CycleStats = {
      succeeded: 0,
      retried: 0,
      failed: 0,
      skipped: 0,
    };
    const startTs = Date.now();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔄 SYNC CYCLE [${source}] — partner ${partnerAuthId}`);

    try {
      const pending = await getPendingForPartner(partnerAuthId, BATCH_SIZE);
      console.log(`📋 ${pending.length} pending row(s)`);

      if (pending.length === 0) {
        console.log('🔄 Nothing to sync');
        return;
      }

      for (const row of pending) {
        // Manager stopped mid-cycle (logout)? Bail clean.
        if (!this.isStarted) {
          console.log('🛑 Stopped mid-cycle — breaking');
          break;
        }
        // Network died mid-cycle? Bail and let next trigger pick up.
        if (!networkManager.getIsOnline()) {
          console.log('📡 Went offline mid-cycle — breaking');
          break;
        }

        // Soft retry cap — promote to terminal failure
        if (row.retry_count >= MAX_RETRIES) {
          await markFailed(
            row.client_uuid,
            `Exceeded retry limit (${MAX_RETRIES})`,
          );
          stats.failed++;
          continue;
        }

        // Race-safe claim. If another cycle grabbed this row,
        // claimed=false and we skip without POSTing.
        const claimed = await markSyncing(row.client_uuid);
        if (!claimed) {
          stats.skipped++;
          continue;
        }

        const outcome = await this.postOneRow(row);
        if (outcome === 'synced') stats.succeeded++;
        else if (outcome === 'retried') stats.retried++;
        else stats.failed++;
      }
    } catch (err: any) {
      if (err instanceof SessionExpiredError) {
        console.log('🔒 Session expired — aborting cycle');
      } else {
        console.log('❌ Cycle error:', err?.message ?? err);
      }
    } finally {
      const dur = Date.now() - startTs;
      console.log(
        `📊 Cycle done in ${dur}ms — ${stats.succeeded}✅ ${stats.retried}🔁 ${stats.failed}❌ ${stats.skipped}⏭`,
      );
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      this.isRunning = false;

      // If triggerNow fired during this cycle, run one more pass so the
      // row that came in mid-cycle gets picked up.
      if (this.pendingTrigger && this.isStarted) {
        this.pendingTrigger = false;
        setTimeout(() => this.processPending('queued'), 0);
      }
    }
  }

  /**
   * POST a single row. Maps response/error → repository call.
   * Throws only on SessionExpiredError so the outer cycle aborts cleanly
   * (global session-expired handler does the actual logout).
   */
  private async postOneRow(row: BmiReportRow): Promise<PostOutcome> {
    const body = {
      // The idempotency key — server uses this to dedupe retries.
      client_uuid: row.client_uuid,

      // BMI readings (from kiosk)
      height_cm: row.height_cm,
      weight_kg: row.weight_kg,
      bmi: row.bmi,
      bmi_status: row.bmi_status,
      fat_percent: row.fat_percent,

      // Partner-entered patient details
      gender: row.gender,
      age: row.age,
      patient_name: row.patient_name,
      mobile: row.mobile,

      // Which kiosk was connected
      bt_device_address: row.bt_device_address,
      bt_device_name: row.bt_device_name,

      // Original capture time on the phone (ISO for the server)
      created_at: new Date(row.created_at).toISOString(),

      // partner_auth_id + org_id come from the JWT — NOT sent in body.
    };

    try {
      const response: any = await apiClient.post(ENDPOINT, body);
      const serverReportId = response?.data?.report_id ?? null;
      await markSynced(row.client_uuid, serverReportId);
      return 'synced';
    } catch (err: any) {
      // Session dead — don't touch the row, let global handler log out.
      if (err instanceof SessionExpiredError) throw err;

      // No network / can't reach server → retryable
      if (err instanceof NetworkError) {
        await markRetryable(row.client_uuid, err.message);
        return 'retried';
      }

      // HTTP error → 4xx terminal, 5xx retryable
      if (err instanceof ApiError) {
        const status = err.statusCode;
        if (status && status >= 400 && status < 500) {
          await markFailed(row.client_uuid, `${status}: ${err.message}`);
          return 'failed';
        }
        await markRetryable(
          row.client_uuid,
          `${status ?? '5xx'}: ${err.message}`,
        );
        return 'retried';
      }

      // Unknown shape → treat as retryable, don't burn the row
      await markRetryable(row.client_uuid, err?.message ?? 'Unknown error');
      return 'retried';
    }
  }
}

export const bmiReportSyncManager = new BmiReportSyncManager();