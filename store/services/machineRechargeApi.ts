// store/services/machineRechargeApi.ts
import { apiClient } from '../../utils/apiClient';

// ─── Response Types ───────────────────────────────────────────────────────────

interface MachineRechargeResponse {
  success: boolean;
  message?: string;
  count?: number;
  data: any;
}

export interface InitiateRechargeRequest {
  bt_device_address: string;
  bt_device_name?: string;
  amount_rupees: number;
}

export interface InitiateRechargeResult {
  recharge_id: string;
  amount_rupees: number;
  unit_price_snapshot: number;
  units_sent: number;
  bt_status: 'initiated';
}

export interface ConfirmRechargeResult {
  recharge_id: string;
  transaction_id: string;
  amount_debited: number;
  units_sent: number;
  wallet_balance: number;
  bt_status: 'ack_received';
}

export type BTFailureStatus = 'ack_timeout' | 'failed';

export interface FailRechargeRequest {
  bt_status: BTFailureStatus;
  error_message?: string;
}

export interface FailRechargeResult {
  recharge_id: string;
  bt_status: BTFailureStatus;
  wallet_balance_unchanged: boolean;
}

export type BTRechargeStatus =
  | 'initiated'
  | 'ack_received'
  | 'ack_timeout'
  | 'failed';

export interface MachineRecharge {
  recharge_id: string;
  bt_device_address: string;
  bt_device_name: string | null;
  amount_rupees: number;
  unit_price_snapshot: number;
  units_sent: number;
  bt_status: BTRechargeStatus;
  bt_ack_at: string | null;
  error_message: string | null;
  wallet_transaction_id: string | null;
  created_at: string;
}

/** Returned in `data` when initiate fails with 400 due to insufficient balance. */
export interface InsufficientBalanceData {
  required: number;
  available: number;
  shortfall: number;
}

// ─── Service Class ────────────────────────────────────────────────────────────

class MachineRechargeApiService {
  /**
   * POST /api/v1/machine-recharge/initiate
   * Body: { bt_device_address, bt_device_name?, amount_rupees }
   * Logs the recharge attempt. NO wallet debit yet.
   * Returns recharge_id — used by /confirm or /fail to complete the state machine.
   */
  async initiate(
    partnerToken: string,
    data: InitiateRechargeRequest,
  ): Promise<MachineRechargeResponse> {
    console.log('📡 API Call: POST /machine-recharge/initiate');
    console.log(
      'Device:',
      data.bt_device_address,
      '| Amount: ₹',
      data.amount_rupees,
    );
    const response = await apiClient.post<MachineRechargeResponse>(
      '/machine-recharge/initiate',
      data,
      {
        headers: {
          Authorization: `Bearer ${partnerToken}`,
        },
      },
    );
    console.log(
      '📥 Recharge initiated:',
      response.data?.recharge_id,
      '|',
      response.data?.units_sent,
      'units',
    );
    return response;
  }

  /**
   * POST /api/v1/machine-recharge/:rechargeId/confirm
   * Called after BT ACK received from the kiosk.
   * Atomic: marks ack_received + inserts ledger debit + decrements wallet balance.
   */
  async confirm(
    partnerToken: string,
    rechargeId: string,
  ): Promise<MachineRechargeResponse> {
    console.log(`📡 API Call: POST /machine-recharge/${rechargeId}/confirm`);
    const response = await apiClient.post<MachineRechargeResponse>(
      `/machine-recharge/${rechargeId}/confirm`,
      {}, // empty body
      {
        headers: {
          Authorization: `Bearer ${partnerToken}`,
        },
      },
    );
    console.log(
      '📥 Recharge confirmed. New balance: ₹',
      response.data?.wallet_balance,
    );
    return response;
  }

  /**
   * POST /api/v1/machine-recharge/:rechargeId/fail
   * Body: { bt_status: 'ack_timeout' | 'failed', error_message? }
   * Marks recharge failed. NO wallet debit — partner protected.
   */
  async fail(
    partnerToken: string,
    rechargeId: string,
    data: FailRechargeRequest,
  ): Promise<MachineRechargeResponse> {
    console.log(`📡 API Call: POST /machine-recharge/${rechargeId}/fail`);
    console.log('Status:', data.bt_status, '| Error:', data.error_message);
    const response = await apiClient.post<MachineRechargeResponse>(
      `/machine-recharge/${rechargeId}/fail`,
      data,
      {
        headers: {
          Authorization: `Bearer ${partnerToken}`,
        },
      },
    );
    console.log('📥 Recharge marked', data.bt_status);
    return response;
  }

  /**
   * GET /api/v1/machine-recharge?limit=20&offset=0
   * Paginated recharge history (all statuses).
   */
  async list(
    partnerToken: string,
    limit = 20,
    offset = 0,
  ): Promise<MachineRechargeResponse> {
    console.log(
      `📡 API Call: GET /machine-recharge?limit=${limit}&offset=${offset}`,
    );
    const response = await apiClient.get<MachineRechargeResponse>(
      `/machine-recharge?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${partnerToken}`,
        },
      },
    );
    console.log('📥 Machine recharges count:', response.data?.length);
    return response;
  }

  /**
   * GET /api/v1/machine-recharge/:rechargeId
   * Single recharge detail. Ownership-checked server-side.
   */
  async getById(
    partnerToken: string,
    rechargeId: string,
  ): Promise<MachineRechargeResponse> {
    console.log(`📡 API Call: GET /machine-recharge/${rechargeId}`);
    const response = await apiClient.get<MachineRechargeResponse>(
      `/machine-recharge/${rechargeId}`,
      {
        headers: {
          Authorization: `Bearer ${partnerToken}`,
        },
      },
    );
    console.log('📥 Recharge details:', response.data?.bt_status);
    return response;
  }
}

export const machineRechargeApi = new MachineRechargeApiService();
