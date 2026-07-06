// utils/localReportRepository.ts
// 📦 LOCAL REPORT REPOSITORY — CRUD over the bmi_reports SQLite table.
//
// This is the ONLY file that should issue SQL against bmi_reports.
//   • SAVE button → insertReport()
//   • Sync manager → getPendingForPartner / markSyncing / markSynced /
//                    markRetryable / markFailed
//   • Boot       → resetStuckSyncing (clears 'syncing' left from a crash)
//   • UI badges  → getCountsByStatus

import { v4 as uuidv4 } from 'uuid';
import {
  getDb,
  TABLE_BMI_REPORTS,
  type BmiReportRow,
  type SyncStatus,
} from './localDb';

// ─── Input shape for new reports ───────────────────────────────────────────
export interface InsertReportInput {
  // From BMI kiosk
  height_cm: number;
  weight_kg: number;
  bmi: number;
  bmi_status: string | null;
  fat_percent: number | null;

  // From partner form
  gender: string;
  age: number;
  patient_name: string;
  mobile: string;

  // Context — pulled from Redux at SAVE time
  partner_auth_id: string;
  org_id: string;
  bt_device_address: string | null;
  bt_device_name: string | null;
}

export interface ReportCounts {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  total: number;
}

// ─── Internal: row mapper ──────────────────────────────────────────────────

/**
 * SQLite returns rows as plain Record<string, any>. Coerce to our typed
 * row shape so the rest of the app gets real numbers, not stringy ones.
 */
function rowToBmiReport(raw: any): BmiReportRow {
  return {
    client_uuid: String(raw.client_uuid),

    height_cm: Number(raw.height_cm),
    weight_kg: Number(raw.weight_kg),
    bmi: Number(raw.bmi),
    bmi_status: raw.bmi_status ?? null,
    fat_percent: raw.fat_percent != null ? Number(raw.fat_percent) : null,

    gender: String(raw.gender),
    age: Number(raw.age),
    patient_name: String(raw.patient_name),
    mobile: String(raw.mobile),

    partner_auth_id: String(raw.partner_auth_id),
    org_id: String(raw.org_id),
    bt_device_address: raw.bt_device_address ?? null,
    bt_device_name: raw.bt_device_name ?? null,

    sync_status: raw.sync_status as SyncStatus,
    retry_count: Number(raw.retry_count),
    last_error: raw.last_error ?? null,
    server_report_id: raw.server_report_id ?? null,

    created_at: Number(raw.created_at),
    updated_at: Number(raw.updated_at),
    synced_at: raw.synced_at != null ? Number(raw.synced_at) : null,
  };
}

// ─── Public: writes ────────────────────────────────────────────────────────

/**
 * Insert a new report — partner just tapped SAVE.
 * Generates client_uuid on the phone (server uses it as idempotency key).
 * Row starts in 'pending' state — sync manager picks it up immediately.
 */
export async function insertReport(
  input: InsertReportInput,
): Promise<BmiReportRow> {
  const db = getDb();
  const now = Date.now();
  const clientUuid = uuidv4();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 INSERT LOCAL REPORT');
  console.log('uuid:', clientUuid, '| partner:', input.partner_auth_id);
  console.log('patient:', input.patient_name, '| BMI:', input.bmi);

  await db.execute(
    `INSERT INTO ${TABLE_BMI_REPORTS} (
      client_uuid,
      height_cm, weight_kg, bmi, bmi_status, fat_percent,
      gender, age, patient_name, mobile,
      partner_auth_id, org_id, bt_device_address, bt_device_name,
      sync_status, retry_count, last_error, server_report_id,
      created_at, updated_at, synced_at
    ) VALUES (
      ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      'pending', 0, NULL, NULL,
      ?, ?, NULL
    )`,
    [
      clientUuid,
      input.height_cm,
      input.weight_kg,
      input.bmi,
      input.bmi_status,
      input.fat_percent,
      input.gender,
      input.age,
      input.patient_name,
      input.mobile,
      input.partner_auth_id,
      input.org_id,
      input.bt_device_address,
      input.bt_device_name,
      now,
      now,
    ],
  );

  console.log('✅ Local row inserted as pending');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Construct in-memory rather than re-querying — INSERT already
  // committed, no need for an extra SELECT roundtrip.
  return {
    client_uuid: clientUuid,
    height_cm: input.height_cm,
    weight_kg: input.weight_kg,
    bmi: input.bmi,
    bmi_status: input.bmi_status,
    fat_percent: input.fat_percent,
    gender: input.gender,
    age: input.age,
    patient_name: input.patient_name,
    mobile: input.mobile,
    partner_auth_id: input.partner_auth_id,
    org_id: input.org_id,
    bt_device_address: input.bt_device_address,
    bt_device_name: input.bt_device_name,
    sync_status: 'pending',
    retry_count: 0,
    last_error: null,
    server_report_id: null,
    created_at: now,
    updated_at: now,
    synced_at: null,
  };
}

/**
 * Claim a row for syncing — called RIGHT BEFORE the POST goes out.
 * The conditional UPDATE (status = 'pending') prevents a concurrent sync
 * cycle from grabbing the same row twice.
 *
 * Returns true if claim succeeded, false if the row wasn't pending
 * anymore (race lost / already synced / etc.).
 */
export async function markSyncing(clientUuid: string): Promise<boolean> {
  const db = getDb();
  const now = Date.now();

  const result = await db.execute(
    `UPDATE ${TABLE_BMI_REPORTS}
       SET sync_status = 'syncing', updated_at = ?
       WHERE client_uuid = ? AND sync_status = 'pending'`,
    [now, clientUuid],
  );

  const claimed = (result.rowsAffected ?? 0) > 0;
  if (!claimed) {
    console.log(`⚠️ markSyncing skipped: ${clientUuid} not in 'pending'`);
  }
  return claimed;
}

/**
 * Server accepted the row → terminal success.
 * Stores RPTMMYY-XXXXXXX from server for cross-reference in debugging.
 */
export async function markSynced(
  clientUuid: string,
  serverReportId: string | null,
): Promise<void> {
  const db = getDb();
  const now = Date.now();

  await db.execute(
    `UPDATE ${TABLE_BMI_REPORTS}
       SET sync_status = 'synced',
           server_report_id = ?,
           last_error = NULL,
           synced_at = ?,
           updated_at = ?
       WHERE client_uuid = ?`,
    [serverReportId, now, now, clientUuid],
  );

  console.log(`✅ markSynced: ${clientUuid} → server_id=${serverReportId}`);
}

/**
 * POST failed but the error is RETRYABLE (network down, 5xx, timeout).
 * Row goes back to 'pending', retry_count++, last_error captured.
 * The next trigger will pick it up.
 */
export async function markRetryable(
  clientUuid: string,
  errorMessage: string,
): Promise<void> {
  const db = getDb();
  const now = Date.now();

  await db.execute(
    `UPDATE ${TABLE_BMI_REPORTS}
       SET sync_status = 'pending',
           retry_count = retry_count + 1,
           last_error = ?,
           updated_at = ?
       WHERE client_uuid = ?`,
    [errorMessage.slice(0, 500), now, clientUuid],
  );

  console.log(`🔁 markRetryable: ${clientUuid} — ${errorMessage.slice(0, 80)}`);
}

/**
 * Server rejected the row (4xx — validation / forbidden / not found).
 * No point retrying. Terminal state — debug screen surfaces these for
 * manual review later.
 */
export async function markFailed(
  clientUuid: string,
  errorMessage: string,
): Promise<void> {
  const db = getDb();
  const now = Date.now();

  await db.execute(
    `UPDATE ${TABLE_BMI_REPORTS}
       SET sync_status = 'failed',
           last_error = ?,
           updated_at = ?
       WHERE client_uuid = ?`,
    [errorMessage.slice(0, 500), now, clientUuid],
  );

  console.log(`❌ markFailed: ${clientUuid} — ${errorMessage.slice(0, 80)}`);
}

/**
 * On app boot — if the previous session was killed mid-POST, rows can
 * be stuck in 'syncing'. Reset them to 'pending' so the sync engine
 * picks them up. Returns the count reset (useful for debug logs).
 */
export async function resetStuckSyncing(
  partnerAuthId: string,
): Promise<number> {
  const db = getDb();
  const now = Date.now();

  const result = await db.execute(
    `UPDATE ${TABLE_BMI_REPORTS}
       SET sync_status = 'pending', updated_at = ?
       WHERE sync_status = 'syncing' AND partner_auth_id = ?`,
    [now, partnerAuthId],
  );

  const count = result.rowsAffected ?? 0;
  if (count > 0) {
    console.log(`🔧 resetStuckSyncing: ${count} row(s) → pending`);
  }
  return count;
}

// ─── Public: reads ─────────────────────────────────────────────────────────

/**
 * Fetch a single row by client_uuid. Returns null if not found.
 */
export async function getReportByUuid(
  clientUuid: string,
): Promise<BmiReportRow | null> {
  const db = getDb();
  const result = await db.execute(
    `SELECT * FROM ${TABLE_BMI_REPORTS} WHERE client_uuid = ? LIMIT 1`,
    [clientUuid],
  );
  const raw = result.rows?.[0];
  return raw ? rowToBmiReport(raw) : null;
}

/**
 * Sync manager's main query — oldest pending rows for the current
 * partner (FIFO so retries don't starve fresh saves).
 *
 * @param partnerAuthId  Only fetch rows owned by this partner.
 * @param limit          Max rows per cycle. Default 25 keeps a cycle
 *                       short even on a long-offline phone catching up.
 */
export async function getPendingForPartner(
  partnerAuthId: string,
  limit: number = 25,
): Promise<BmiReportRow[]> {
  const db = getDb();
  const result = await db.execute(
    `SELECT * FROM ${TABLE_BMI_REPORTS}
       WHERE sync_status = 'pending' AND partner_auth_id = ?
       ORDER BY created_at ASC
       LIMIT ?`,
    [partnerAuthId, limit],
  );

  const rows = result.rows ?? [];
  return rows.map(rowToBmiReport);
}

/**
 * Counts per status for the current partner. Single query, one index
 * scan — cheap enough to call on every UI refresh.
 */
export async function getCountsByStatus(
  partnerAuthId: string,
): Promise<ReportCounts> {
  const db = getDb();
  const result = await db.execute(
    `SELECT
       SUM(CASE WHEN sync_status = 'pending' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN sync_status = 'syncing' THEN 1 ELSE 0 END) AS syncing,
       SUM(CASE WHEN sync_status = 'synced'  THEN 1 ELSE 0 END) AS synced,
       SUM(CASE WHEN sync_status = 'failed'  THEN 1 ELSE 0 END) AS failed,
       COUNT(*) AS total
     FROM ${TABLE_BMI_REPORTS}
     WHERE partner_auth_id = ?`,
    [partnerAuthId],
  );

  const r = result.rows?.[0] as any | undefined;
  return {
    pending: Number(r?.pending ?? 0),
    syncing: Number(r?.syncing ?? 0),
    synced: Number(r?.synced ?? 0),
    failed: Number(r?.failed ?? 0),
    total: Number(r?.total ?? 0),
  };
}

// ─── Public: cleanup (future use) ──────────────────────────────────────────

/**
 * Delete synced rows older than the given cutoff (unix millis). Stub for
 * a future daily cleanup job — keeps the local DB small over time.
 * Not wired up yet; contract is here so the sync manager can call it later.
 */
export async function deleteSyncedOlderThan(
  cutoffMillis: number,
): Promise<number> {
  const db = getDb();
  const result = await db.execute(
    `DELETE FROM ${TABLE_BMI_REPORTS}
       WHERE sync_status = 'synced' AND synced_at < ?`,
    [cutoffMillis],
  );
  const count = result.rowsAffected ?? 0;
  if (count > 0) {
    console.log(`🧹 deleteSyncedOlderThan: removed ${count} row(s)`);
  }
  return count;
}
