// utils/localDb.ts
// 🗄️ LOCAL SQLITE — Offline-first BMI reports storage
//
// On-device SQLite database used by the BMI report sync engine.
// Partner saves land here first (whether online or offline). The sync
// manager replays pending rows to app.mysehat.ai when the network is up.
//
// Schema versioning via SQLite's PRAGMA user_version. To change the
// schema later: bump DB_SCHEMA_VERSION and add a migration block in
// runMigrations() — DO NOT edit existing migrations or the table DDL.

import { open, type DB } from '@op-engineering/op-sqlite';

// ─── Constants ─────────────────────────────────────────────────────────────
const DB_NAME = 'mysehat_local.db';
const DB_SCHEMA_VERSION = 1;
export const TABLE_BMI_REPORTS = 'bmi_reports';

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * State machine for each local row.
 *   pending  → not yet sent to server (default on insert)
 *   syncing  → POST in flight (set just before fetch, cleared after)
 *   synced   → server accepted, server_report_id stored
 *   failed   → 4xx from server (will not auto-retry without bumping)
 */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface BmiReportRow {
  // Primary key — generated on the phone (uuid v4) BEFORE insert.
  // Also the idempotency key the server uses to dedupe retries.
  client_uuid: string;

  // From BMI kiosk over Bluetooth
  height_cm: number;
  weight_kg: number;
  bmi: number;
  bmi_status: string | null;
  fat_percent: number | null;

  // Manually entered by the partner
  gender: string;
  age: number;
  patient_name: string;
  mobile: string;

  // Context — who saved this, and from which kiosk
  partner_auth_id: string;
  org_id: string;
  bt_device_address: string | null;
  bt_device_name: string | null;

  // Sync state machine
  sync_status: SyncStatus;
  retry_count: number;
  last_error: string | null;
  server_report_id: string | null; // RPTMMYY-XXXXXXX after server inserts

  // Timestamps (unix millis — easy compare, no TZ ambiguity)
  created_at: number; // when partner tapped SAVE
  updated_at: number;
  synced_at: number | null;
}

// ─── Singleton state ───────────────────────────────────────────────────────
let dbInstance: DB | null = null;
let isInitialised = false;

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Open the local SQLite DB and run any pending schema migrations.
 * Idempotent — safe to call more than once. Call once on app boot,
 * BEFORE the sync manager starts.
 */
export async function initLocalDb(): Promise<void> {
  if (isInitialised && dbInstance) {
    console.log('🗄️ initLocalDb: already initialised — skipping');
    return;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🗄️ INITIALISING LOCAL SQLITE');
  console.log('DB:', DB_NAME, '| Target schema: v' + DB_SCHEMA_VERSION);

  try {
    dbInstance = open({ name: DB_NAME });

    // Performance pragmas:
    //   journal_mode=WAL → multi-reader + single-writer concurrency
    //                       (sync loop reads while UI inserts)
    //   synchronous=NORMAL → fsync only on commit, not every write
    //   foreign_keys=ON   → defensive, even though we don't use FKs yet
    await dbInstance.execute('PRAGMA journal_mode = WAL');
    await dbInstance.execute('PRAGMA synchronous = NORMAL');
    await dbInstance.execute('PRAGMA foreign_keys = ON');

    await runMigrations(dbInstance);

    isInitialised = true;
    console.log('✅ Local SQLite ready');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error: any) {
    console.log('❌ initLocalDb failed:', error.message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    dbInstance = null;
    isInitialised = false;
    throw error;
  }
}

/**
 * Return the active DB handle. Throws if init hasn't run yet, so callers
 * never silently no-op against a missing DB.
 */
export function getDb(): DB {
  if (!dbInstance || !isInitialised) {
    throw new Error(
      'Local DB not initialised — call initLocalDb() at app boot first',
    );
  }
  return dbInstance;
}

/**
 * Has init succeeded? Used by the sync manager to skip cycles that fire
 * before init completes (e.g. interval tick during cold start).
 */
export function isLocalDbReady(): boolean {
  return isInitialised && dbInstance !== null;
}

/**
 * Close the DB. Use during teardown / tests only.
 * Production code never calls this — the OS reclaims handles on exit.
 */
export async function closeLocalDb(): Promise<void> {
  if (!dbInstance) return;

  console.log('🗄️ Closing local SQLite');
  try {
    await dbInstance.close();
  } catch (error: any) {
    console.log('⚠️ closeLocalDb error:', error.message);
  } finally {
    dbInstance = null;
    isInitialised = false;
  }
}

/**
 * NUCLEAR — drop & recreate the bmi_reports table. Use only for debug
 * or full local reset. ALL local reports (including unsynced) are lost.
 */
export async function resetLocalReports(): Promise<void> {
  if (!dbInstance || !isInitialised) {
    throw new Error('Cannot reset — DB not initialised');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💣 RESETTING bmi_reports TABLE — all rows will be lost');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await dbInstance.execute(`DROP TABLE IF EXISTS ${TABLE_BMI_REPORTS}`);
  await createBmiReportsTable(dbInstance);
}

// ─── Internal: migrations ──────────────────────────────────────────────────

async function runMigrations(db: DB): Promise<void> {
  const versionResult = await db.execute('PRAGMA user_version');
  const currentVersion = Number(
    (versionResult.rows?.[0] as any)?.user_version ?? 0,
  );

  console.log(
    `🗄️ Schema check — current: v${currentVersion}, target: v${DB_SCHEMA_VERSION}`,
  );

  if (currentVersion >= DB_SCHEMA_VERSION) {
    console.log('🗄️ Schema up to date');
    return;
  }

  // Wrap migration in a transaction so a partial failure (e.g. CREATE
  // INDEX fails after CREATE TABLE) doesn't leave us with a wedged DB.
  try {
    await db.execute('BEGIN TRANSACTION');

    // ── v0 → v1: create bmi_reports table + indexes ──
    if (currentVersion < 1) {
      console.log('🔄 Migrating v0 → v1: bmi_reports');
      await createBmiReportsTable(db);
    }

    // ── Future migrations go here ──
    // if (currentVersion < 2) { await migrateToV2(db); }

    await db.execute(`PRAGMA user_version = ${DB_SCHEMA_VERSION}`);
    await db.execute('COMMIT');
    console.log(`✅ Schema migrated to v${DB_SCHEMA_VERSION}`);
  } catch (error: any) {
    console.log('❌ Migration failed — rolling back:', error.message);
    await db.execute('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function createBmiReportsTable(db: DB): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${TABLE_BMI_REPORTS} (
      client_uuid        TEXT PRIMARY KEY NOT NULL,

      height_cm          REAL NOT NULL,
      weight_kg          REAL NOT NULL,
      bmi                REAL NOT NULL,
      bmi_status         TEXT,
      fat_percent        REAL,

      gender             TEXT NOT NULL,
      age                INTEGER NOT NULL,
      patient_name       TEXT NOT NULL,
      mobile             TEXT NOT NULL,

      partner_auth_id    TEXT NOT NULL,
      org_id             TEXT NOT NULL,
      bt_device_address  TEXT,
      bt_device_name     TEXT,

      sync_status        TEXT NOT NULL DEFAULT 'pending'
                           CHECK (sync_status IN ('pending','syncing','synced','failed')),
      retry_count        INTEGER NOT NULL DEFAULT 0,
      last_error         TEXT,
      server_report_id   TEXT,

      created_at         INTEGER NOT NULL,
      updated_at         INTEGER NOT NULL,
      synced_at          INTEGER
    )
  `);

  // Index strategy:
  //   sync_status      → sync manager filters pending rows every cycle
  //   partner_auth_id  → only show / sync current partner's rows
  //   created_at DESC  → chronological history view (future use)
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_bmi_reports_sync_status
       ON ${TABLE_BMI_REPORTS}(sync_status)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_bmi_reports_partner
       ON ${TABLE_BMI_REPORTS}(partner_auth_id)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_bmi_reports_created_at
       ON ${TABLE_BMI_REPORTS}(created_at DESC)`,
  );

  console.log('✅ bmi_reports table + indexes created');
}
