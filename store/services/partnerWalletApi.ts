// store/services/partnerWalletApi.ts
import { apiClient } from '../../utils/apiClient';

// ─── Response Types ───────────────────────────────────────────────────────────

interface PartnerWalletResponse {
  success: boolean;
  message?: string;
  already_credited?: boolean;
  credited_via?: 'webhook' | 'verify_api';
  count?: number;
  data: any;
}

export interface PartnerWalletBalance {
  partner_wallet_id: string | null;
  wallet_balance: number;
  status: 'active' | 'frozen' | 'closed';
  has_wallet: boolean;
}

export interface PartnerRechargeOrderData {
  razorpay_order_id: string;
  recharge_order_id: string;
  amount: number; // paise
  currency: string;
  key_id: string;
  cash_amount: number; // rupees
}

export interface VerifyPartnerRechargeRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  cash_amount: number;
}

export interface PartnerRechargeResult {
  transaction_id: string;
  cash_credited: number;
  wallet_balance: number;
}

export interface PartnerWalletTransaction {
  id: number;
  transaction_id: string;
  type: 'credit_purchase' | 'kiosk_recharge' | 'adjustment';
  amount_rupees: number;
  balance_after: number;
  reference_id: string | null;
  description: string;
  razorpay_payment_id: string | null;
  created_at: string;
}

// ─── Service Class ────────────────────────────────────────────────────────────

class PartnerWalletApiService {
  /**
   * GET /api/v1/partner-wallet/balance
   * Returns wallet_balance, status, has_wallet
   */
  async getBalance(partnerToken: string): Promise<PartnerWalletResponse> {
    console.log('📡 API Call: GET /partner-wallet/balance');
    const response = await apiClient.get<PartnerWalletResponse>(
      '/partner-wallet/balance',
      {
        headers: {
          Authorization: `Bearer ${partnerToken}`,
        },
      },
    );
    console.log('📥 Partner wallet balance:', response.data?.wallet_balance);
    return response;
  }

  /**
   * POST /api/v1/partner-wallet/recharge/create-order
   * Body: { amount }
   * Creates Razorpay order for partner wallet top-up.
   */
  async createRechargeOrder(
    partnerToken: string,
    amount: number,
  ): Promise<PartnerWalletResponse> {
    console.log(
      `📡 API Call: POST /partner-wallet/recharge/create-order | Amount: ₹${amount}`,
    );
    const response = await apiClient.post<PartnerWalletResponse>(
      '/partner-wallet/recharge/create-order',
      { amount },
      {
        headers: {
          Authorization: `Bearer ${partnerToken}`,
        },
      },
    );
    console.log(
      '📥 Partner recharge order created:',
      response.data?.razorpay_order_id,
    );
    return response;
  }

  /**
   * POST /api/v1/partner-wallet/recharge/verify-payment
   * Verifies Razorpay signature and credits partner wallet.
   */
  async verifyRechargePayment(
    partnerToken: string,
    data: VerifyPartnerRechargeRequest,
  ): Promise<PartnerWalletResponse> {
    console.log('📡 API Call: POST /partner-wallet/recharge/verify-payment');
    console.log('Payment ID:', data.razorpay_payment_id);
    const response = await apiClient.post<PartnerWalletResponse>(
      '/partner-wallet/recharge/verify-payment',
      data,
      {
        headers: {
          Authorization: `Bearer ${partnerToken}`,
        },
      },
    );
    console.log(
      '📥 Partner recharge verified. New balance:',
      response.data?.wallet_balance,
    );
    return response;
  }

  /**
   * GET /api/v1/partner-wallet/transactions?limit=20&offset=0
   * Paginated ledger history (credit_purchase + kiosk_recharge rows).
   */
  async getTransactions(
    partnerToken: string,
    limit = 20,
    offset = 0,
  ): Promise<PartnerWalletResponse> {
    console.log(
      `📡 API Call: GET /partner-wallet/transactions?limit=${limit}&offset=${offset}`,
    );
    const response = await apiClient.get<PartnerWalletResponse>(
      `/partner-wallet/transactions?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${partnerToken}`,
        },
      },
    );
    console.log('📥 Partner wallet transactions count:', response.data?.length);
    return response;
  }
}

export const partnerWalletApi = new PartnerWalletApiService();
