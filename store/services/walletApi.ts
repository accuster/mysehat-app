// store/services/walletApi.ts
import { apiClient } from '../../utils/apiClient';

// ─── Response Types ───────────────────────────────────────────────────────────

interface WalletResponse {
  success: boolean;
  message?: string;
  data: any;
}

export interface WalletBalance {
  wallet_id: string | null;
  mysehat_cash: number;
  rewards_points: number;
  wallet_balance: number;
  has_wallet: boolean;
}

export interface RechargeOrderData {
  razorpay_order_id: string;
  amount: number; // paise
  currency: string;
  key_id: string;
  cash_amount: number; // rupees
  reward_amount: number; // rupees
}

export interface VerifyRechargeData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  cash_amount: number;
  reward_amount: number;
}

export interface RechargeResult {
  transaction_id: string;
  cash_credited: number;
  reward_credited: number;
  mysehat_cash: number;
  rewards_points: number;
  wallet_balance: number;
  already_credited?: boolean;
}

export interface WalletTransaction {
  id: number;
  transaction_id: string;
  type: 'credit_purchase' | 'credit_usage';
  amount_rupees: number;
  credits: number;
  balance_after: number;
  description: string;
  razorpay_payment_id: string | null;
  created_at: string;
}

export interface WalletPayResult {
  order_id: string;
  report_id: string;
  payment_method: string;
  amount_paid: number;
  transaction_id: string;
  wallet: {
    mysehat_cash: number;
    rewards_points: number;
    wallet_balance: number;
  };
}

// ─── Service Class ────────────────────────────────────────────────────────────

class WalletApiService {
  /**
   * GET /api/v1/wallet/balance
   * Returns mysehat_cash, rewards_points, wallet_balance
   */
  async getWalletBalance(): Promise<WalletResponse> {
    console.log('📡 API Call: GET /wallet/balance');
    const response = await apiClient.get<WalletResponse>('/wallet/balance');
    console.log('📥 Wallet balance received:', response.data?.wallet_balance);
    return response;
  }

  /**
   * POST /api/v1/wallet/recharge/create-order
   * Body: { amount }
   * Creates Razorpay order for wallet top-up
   */
  async createRechargeOrder(amount: number): Promise<WalletResponse> {
    console.log(
      `📡 API Call: POST /wallet/recharge/create-order | Amount: ₹${amount}`,
    );
    const response = await apiClient.post<WalletResponse>(
      '/wallet/recharge/create-order',
      { amount },
    );
    console.log('📥 Recharge order created:', response.data?.razorpay_order_id);
    return response;
  }

  /**
   * POST /api/v1/wallet/recharge/verify-payment
   * Verifies Razorpay signature and credits wallet
   */
  async verifyRechargePayment(
    data: VerifyRechargeData,
  ): Promise<WalletResponse> {
    console.log('📡 API Call: POST /wallet/recharge/verify-payment');
    console.log('Payment ID:', data.razorpay_payment_id);
    const response = await apiClient.post<WalletResponse>(
      '/wallet/recharge/verify-payment',
      data,
    );
    console.log(
      '📥 Recharge verified. New balance:',
      response.data?.wallet_balance,
    );
    return response;
  }

  /**
   * GET /api/v1/wallet/transactions?limit=20&offset=0
   * Paginated wallet transaction history
   */
  async getWalletTransactions(limit = 20, offset = 0): Promise<WalletResponse> {
    console.log(
      `📡 API Call: GET /wallet/transactions?limit=${limit}&offset=${offset}`,
    );
    const response = await apiClient.get<WalletResponse>(
      `/wallet/transactions?limit=${limit}&offset=${offset}`,
    );
    console.log('📥 Wallet transactions count:', response.data?.length);
    return response;
  }

  /**
   * POST /api/v1/orders/:orderId/pay-with-wallet
   * Deducts test_fee from wallet and generates BMI report
   */
  async payWithWallet(orderId: string): Promise<WalletResponse> {
    console.log(`📡 API Call: POST /orders/${orderId}/pay-with-wallet`);
    const response = await apiClient.post<WalletResponse>(
      `/orders/${orderId}/pay-with-wallet`,
    );
    console.log('📥 Wallet payment result:', response.success);
    console.log('Report ID:', response.data?.report_id);
    return response;
  }
}

export const walletApi = new WalletApiService();
