// store/slices/walletSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { walletApi } from '../services/walletApi';
import type {
  WalletBalance,
  WalletTransaction,
  RechargeResult,
  WalletPayResult,
  VerifyRechargeData,
} from '../services/walletApi';

// ─── State Shape ──────────────────────────────────────────────────────────────

export interface WalletState {
  // Balance
  balance: WalletBalance | null;
  isLoadingBalance: boolean;
  balanceError: string | null;

  // Transactions history
  transactions: WalletTransaction[];
  isLoadingTxns: boolean;
  txnsError: string | null;
  lastFetch: number | null;

  // Recharge flow
  isRecharging: boolean;
  rechargeError: string | null;

  // Wallet-pay for BMI
  isPayingWithWallet: boolean;
  walletPayError: string | null;
}

const initialState: WalletState = {
  balance: null,
  isLoadingBalance: false,
  balanceError: null,

  transactions: [],
  isLoadingTxns: false,
  txnsError: null,
  lastFetch: null,

  isRecharging: false,
  rechargeError: null,

  isPayingWithWallet: false,
  walletPayError: null,
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * Fetch wallet balance
 * Called on: WalletScreen mount, PayScreen mount
 */
export const fetchWalletBalance = createAsyncThunk(
  'wallet/fetchBalance',
  async (_, { rejectWithValue }) => {
    try {
      console.log('💰 Redux: Fetching wallet balance...');
      const response = await walletApi.getWalletBalance();

      if (response.success) {
        console.log('✅ Redux: Balance fetched:', response.data.wallet_balance);
        return response.data as WalletBalance;
      }

      return rejectWithValue(
        response.message || 'Failed to fetch wallet balance',
      );
    } catch (error: any) {
      console.log('❌ Redux: fetchWalletBalance error:', error.message);
      return rejectWithValue(error.message || 'Failed to fetch wallet balance');
    }
  },
);

/**
 * Fetch wallet transaction history
 */
export const fetchWalletTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async (
    { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      console.log('📋 Redux: Fetching wallet transactions...');
      const response = await walletApi.getWalletTransactions(limit, offset);

      if (response.success) {
        console.log(`✅ Redux: ${response.data.length} wallet transactions fetched`);
        return response.data as WalletTransaction[];
      }

      return rejectWithValue(
        response.message || 'Failed to fetch transactions',
      );
    } catch (error: any) {
      console.log('❌ Redux: fetchWalletTransactions error:', error.message);
      return rejectWithValue(error.message || 'Failed to fetch transactions');
    }
  },
);

/**
 * Verify wallet recharge after Razorpay SDK success
 * Credits wallet and returns new balance
 */
export const verifyWalletRecharge = createAsyncThunk(
  'wallet/verifyRecharge',
  async (data: VerifyRechargeData, { rejectWithValue }) => {
    try {
      console.log('🔐 Redux: Verifying wallet recharge...');
      console.log('Payment ID:', data.razorpay_payment_id);

      const response = await walletApi.verifyRechargePayment(data);

      if (response.success) {
        console.log(
          '✅ Redux: Recharge verified. New balance:',
          response.data.wallet_balance,
        );
        return response.data as RechargeResult;
      }

      return rejectWithValue(
        response.message || 'Recharge verification failed',
      );
    } catch (error: any) {
      console.log('❌ Redux: verifyWalletRecharge error:', error.message);
      return rejectWithValue(error.message || 'Recharge verification failed');
    }
  },
);

/**
 * Pay BMI test fee with wallet
 * Deducts balance and generates report in one backend call
 */
export const payBMIWithWallet = createAsyncThunk(
  'wallet/payBMI',
  async (orderId: string, { rejectWithValue }) => {
    try {
      console.log('💸 Redux: Paying BMI with wallet. Order:', orderId);
      const response = await walletApi.payWithWallet(orderId);

      if (response.success) {
        console.log(
          '✅ Redux: Wallet payment success. Report:',
          response.data.report_id,
        );
        return response.data as WalletPayResult;
      }

      return rejectWithValue(response.message || 'Wallet payment failed');
    } catch (error: any) {
      console.log('❌ Redux: payBMIWithWallet error:', error.message);
      return rejectWithValue(error.message || 'Wallet payment failed');
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearWalletErrors: state => {
      state.balanceError = null;
      state.rechargeError = null;
      state.walletPayError = null;
      state.txnsError = null;
    },

    // Called after successful recharge to update balance in-place
    // without needing a fresh API call
    updateBalanceAfterRecharge: (
      state,
      action: PayloadAction<RechargeResult>,
    ) => {
      if (state.balance) {
        state.balance.mysehat_cash = action.payload.mysehat_cash;
        state.balance.rewards_points = action.payload.rewards_points;
        state.balance.wallet_balance = action.payload.wallet_balance;
        state.balance.has_wallet = true;
      }
    },

    // Called on logout — wipe all wallet data
    resetWallet: () => initialState,
  },
  extraReducers: builder => {
    // ── fetchWalletBalance ──────────────────────────────────────────────────
    builder
      .addCase(fetchWalletBalance.pending, state => {
        console.log('🔄 fetchWalletBalance: pending');
        state.isLoadingBalance = true;
        state.balanceError = null;
      })
      .addCase(fetchWalletBalance.fulfilled, (state, action) => {
        console.log('✅ fetchWalletBalance: fulfilled');
        state.isLoadingBalance = false;
        state.balance = action.payload;
      })
      .addCase(fetchWalletBalance.rejected, (state, action) => {
        console.log('❌ fetchWalletBalance: rejected:', action.payload);
        state.isLoadingBalance = false;
        state.balanceError = action.payload as string;
      });

    // ── fetchWalletTransactions ─────────────────────────────────────────────
    builder
      .addCase(fetchWalletTransactions.pending, state => {
        console.log('🔄 fetchWalletTransactions: pending');
        state.isLoadingTxns = true;
        state.txnsError = null;
      })
      .addCase(fetchWalletTransactions.fulfilled, (state, action) => {
        console.log('✅ fetchWalletTransactions: fulfilled');
        state.isLoadingTxns = false;
        state.transactions = action.payload;
        state.lastFetch = Date.now();
      })
      .addCase(fetchWalletTransactions.rejected, (state, action) => {
        console.log('❌ fetchWalletTransactions: rejected:', action.payload);
        state.isLoadingTxns = false;
        state.txnsError = action.payload as string;
      });

    // ── verifyWalletRecharge ────────────────────────────────────────────────
    builder
      .addCase(verifyWalletRecharge.pending, state => {
        console.log('🔄 verifyWalletRecharge: pending');
        state.isRecharging = true;
        state.rechargeError = null;
      })
      .addCase(verifyWalletRecharge.fulfilled, (state, action) => {
        console.log('✅ verifyWalletRecharge: fulfilled');
        state.isRecharging = false;
        // Update balance buckets immediately — no need for fresh fetch
        if (state.balance) {
          state.balance.mysehat_cash = action.payload.mysehat_cash;
          state.balance.rewards_points = action.payload.rewards_points;
          state.balance.wallet_balance = action.payload.wallet_balance;
          state.balance.has_wallet = true;
        } else {
          // First ever recharge — wallet didn't exist before
          state.balance = {
            wallet_id: null,
            mysehat_cash: action.payload.mysehat_cash,
            rewards_points: action.payload.rewards_points,
            wallet_balance: action.payload.wallet_balance,
            has_wallet: true,
          };
        }
      })
      .addCase(verifyWalletRecharge.rejected, (state, action) => {
        console.log('❌ verifyWalletRecharge: rejected:', action.payload);
        state.isRecharging = false;
        state.rechargeError = action.payload as string;
      });

    // ── payBMIWithWallet ────────────────────────────────────────────────────
    builder
      .addCase(payBMIWithWallet.pending, state => {
        console.log('🔄 payBMIWithWallet: pending');
        state.isPayingWithWallet = true;
        state.walletPayError = null;
      })
      .addCase(payBMIWithWallet.fulfilled, (state, action) => {
        console.log('✅ payBMIWithWallet: fulfilled');
        state.isPayingWithWallet = false;
        // Update balance from response
        if (state.balance) {
          state.balance.mysehat_cash = action.payload.wallet.mysehat_cash;
          state.balance.rewards_points = action.payload.wallet.rewards_points;
          state.balance.wallet_balance = action.payload.wallet.wallet_balance;
        }
      })
      .addCase(payBMIWithWallet.rejected, (state, action) => {
        console.log('❌ payBMIWithWallet: rejected:', action.payload);
        state.isPayingWithWallet = false;
        state.walletPayError = action.payload as string;
      });
  },
});

export const { clearWalletErrors, updateBalanceAfterRecharge, resetWallet } =
  walletSlice.actions;

export default walletSlice.reducer;
