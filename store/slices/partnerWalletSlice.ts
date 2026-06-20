// store/slices/partnerWalletSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootState } from '../index';
import {
  partnerWalletApi,
  PartnerWalletTransaction,
  VerifyPartnerRechargeRequest,
} from '../services/partnerWalletApi';

// ─── State Shape ──────────────────────────────────────────────────────────────

export type PartnerWalletStatus = 'active' | 'frozen' | 'closed';

export interface PartnerWalletState {
  // ── Wallet data ──────────────────────────────────────────────────────────
  partnerWalletId: string | null;
  walletBalance: number;
  status: PartnerWalletStatus;
  hasWallet: boolean;

  // ── Transactions (paginated) ─────────────────────────────────────────────
  transactions: PartnerWalletTransaction[];
  transactionsOffset: number;
  transactionsHasMore: boolean;

  // ── Loading flags (per-operation, prevents UI flicker) ───────────────────
  balanceLoading: boolean;
  transactionsLoading: boolean;
  createOrderLoading: boolean;
  verifyLoading: boolean;

  // ── Error (last error, cleared on next op or via clearPartnerWalletError) ─
  error: string | null;

  // ── Hydration tracking ──────────────────────────────────────────────────
  lastBalanceFetch: number | null;
}

const initialState: PartnerWalletState = {
  partnerWalletId: null,
  walletBalance: 0,
  status: 'active',
  hasWallet: false,

  transactions: [],
  transactionsOffset: 0,
  transactionsHasMore: true,

  balanceLoading: false,
  transactionsLoading: false,
  createOrderLoading: false,
  verifyLoading: false,

  error: null,
  lastBalanceFetch: null,
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Read partner token from AsyncStorage. Same source apiClient uses,
 * so they stay in sync regardless of Redux state field naming.
 */
async function getPartnerToken(): Promise<string> {
  const token = await AsyncStorage.getItem('partner_token');
  if (!token) {
    throw new Error('Not logged in as partner');
  }
  return token;
}

function extractErrorMessage(err: any, fallback: string): string {
  return err?.response?.data?.message ?? err?.message ?? fallback;
}

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * GET /partner-wallet/balance
 */
export const fetchPartnerWalletBalance = createAsyncThunk<
  {
    partnerWalletId: string | null;
    walletBalance: number;
    status: PartnerWalletStatus;
    hasWallet: boolean;
  },
  void,
  { state: RootState; rejectValue: string }
>('partnerWallet/fetchBalance', async (_, { rejectWithValue }) => {
  try {
    const token = await getPartnerToken();
    const res = await partnerWalletApi.getBalance(token);
    return {
      partnerWalletId: res.data?.partner_wallet_id ?? null,
      walletBalance: Number(res.data?.wallet_balance ?? 0),
      status: (res.data?.status ?? 'active') as PartnerWalletStatus,
      hasWallet: !!res.data?.has_wallet,
    };
  } catch (err: any) {
    console.error('❌ fetchPartnerWalletBalance error:', err?.message);
    return rejectWithValue(
      extractErrorMessage(err, 'Failed to fetch wallet balance'),
    );
  }
});

/**
 * POST /partner-wallet/recharge/create-order
 * Returns Razorpay metadata so caller can open RazorpayCheckout.
 */
export const createPartnerRechargeOrder = createAsyncThunk<
  {
    razorpay_order_id: string;
    recharge_order_id: string;
    amount: number; // paise
    currency: string;
    key_id: string;
    cash_amount: number; // rupees
  },
  { amount: number },
  { state: RootState; rejectValue: string }
>(
  'partnerWallet/createRechargeOrder',
  async ({ amount }, { rejectWithValue }) => {
    try {
      const token = await getPartnerToken();
      const res = await partnerWalletApi.createRechargeOrder(token, amount);
      if (!res.data?.razorpay_order_id) {
        return rejectWithValue('Server returned no razorpay_order_id');
      }
      return res.data;
    } catch (err: any) {
      console.error('❌ createPartnerRechargeOrder error:', err?.message);
      return rejectWithValue(
        extractErrorMessage(err, 'Failed to create recharge order'),
      );
    }
  },
);

/**
 * POST /partner-wallet/recharge/verify-payment
 * Server credits wallet, returns new balance.
 */
export const verifyPartnerRechargePayment = createAsyncThunk<
  {
    transactionId: string;
    cashCredited: number;
    walletBalance: number;
    alreadyCredited: boolean;
  },
  VerifyPartnerRechargeRequest,
  { state: RootState; rejectValue: string }
>(
  'partnerWallet/verifyRechargePayment',
  async (payload, { rejectWithValue }) => {
    try {
      const token = await getPartnerToken();
      const res = await partnerWalletApi.verifyRechargePayment(token, payload);
      return {
        transactionId: res.data?.transaction_id ?? '',
        cashCredited: Number(res.data?.cash_credited ?? payload.cash_amount),
        walletBalance: Number(res.data?.wallet_balance ?? 0),
        alreadyCredited: !!res.already_credited,
      };
    } catch (err: any) {
      console.error('❌ verifyPartnerRechargePayment error:', err?.message);
      return rejectWithValue(
        extractErrorMessage(err, 'Failed to verify recharge payment'),
      );
    }
  },
);

/**
 * GET /partner-wallet/transactions
 * `reset=true` replaces (pull-to-refresh), `reset=false` appends (infinite scroll).
 */
export const fetchPartnerWalletTransactions = createAsyncThunk<
  {
    transactions: PartnerWalletTransaction[];
    reset: boolean;
    pageSize: number;
  },
  { limit?: number; reset?: boolean },
  { state: RootState; rejectValue: string }
>(
  'partnerWallet/fetchTransactions',
  async ({ limit = 20, reset = false }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = await getPartnerToken();
      const offset = reset ? 0 : state.partnerWallet.transactionsOffset;
      const res = await partnerWalletApi.getTransactions(token, limit, offset);
      return {
        transactions: (res.data ?? []) as PartnerWalletTransaction[],
        reset,
        pageSize: limit,
      };
    } catch (err: any) {
      console.error('❌ fetchPartnerWalletTransactions error:', err?.message);
      return rejectWithValue(
        extractErrorMessage(err, 'Failed to fetch transactions'),
      );
    }
  },
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const partnerWalletSlice = createSlice({
  name: 'partnerWallet',
  initialState,
  reducers: {
    /**
     * Update balance locally (no API call). Used after machineRechargeApi.confirm()
     * — the API returns the new balance, no need to re-fetch.
     */
    setWalletBalance: (state, action: PayloadAction<number>) => {
      state.walletBalance = action.payload;
    },

    /**
     * Optimistic debit — apply locally before server confirm.
     * Not used by default; available if you want snappier UX.
     */
    debitLocally: (state, action: PayloadAction<number>) => {
      state.walletBalance = Math.max(0, state.walletBalance - action.payload);
    },

    /**
     * Clears the last error.
     */
    clearPartnerWalletError: state => {
      state.error = null;
    },

    /**
     * Resets to initial state. Use on manual partner logout.
     * Auto-reset on session expiry is handled in extraReducers.
     */
    resetPartnerWallet: () => initialState,
  },
  extraReducers: builder => {
    builder
      // ── fetchBalance ──────────────────────────────────────────────────────
      .addCase(fetchPartnerWalletBalance.pending, state => {
        state.balanceLoading = true;
        state.error = null;
      })
      .addCase(fetchPartnerWalletBalance.fulfilled, (state, action) => {
        state.balanceLoading = false;
        state.partnerWalletId = action.payload.partnerWalletId;
        state.walletBalance = action.payload.walletBalance;
        state.status = action.payload.status;
        state.hasWallet = action.payload.hasWallet;
        state.lastBalanceFetch = Date.now();
      })
      .addCase(fetchPartnerWalletBalance.rejected, (state, action) => {
        state.balanceLoading = false;
        state.error = action.payload ?? 'Failed to fetch balance';
      })

      // ── createRechargeOrder ───────────────────────────────────────────────
      .addCase(createPartnerRechargeOrder.pending, state => {
        state.createOrderLoading = true;
        state.error = null;
      })
      .addCase(createPartnerRechargeOrder.fulfilled, state => {
        state.createOrderLoading = false;
      })
      .addCase(createPartnerRechargeOrder.rejected, (state, action) => {
        state.createOrderLoading = false;
        state.error = action.payload ?? 'Failed to create recharge order';
      })

      // ── verifyRechargePayment ─────────────────────────────────────────────
      .addCase(verifyPartnerRechargePayment.pending, state => {
        state.verifyLoading = true;
        state.error = null;
      })
      .addCase(verifyPartnerRechargePayment.fulfilled, (state, action) => {
        state.verifyLoading = false;
        state.walletBalance = action.payload.walletBalance;
      })
      .addCase(verifyPartnerRechargePayment.rejected, (state, action) => {
        state.verifyLoading = false;
        state.error = action.payload ?? 'Failed to verify payment';
      })

      // ── fetchTransactions ─────────────────────────────────────────────────
      .addCase(fetchPartnerWalletTransactions.pending, state => {
        state.transactionsLoading = true;
        state.error = null;
      })
      .addCase(fetchPartnerWalletTransactions.fulfilled, (state, action) => {
        state.transactionsLoading = false;
        const { transactions, reset, pageSize } = action.payload;
        if (reset) {
          state.transactions = transactions;
          state.transactionsOffset = transactions.length;
        } else {
          state.transactions = [...state.transactions, ...transactions];
          state.transactionsOffset += transactions.length;
        }
        state.transactionsHasMore = transactions.length >= pageSize;
      })
      .addCase(fetchPartnerWalletTransactions.rejected, (state, action) => {
        state.transactionsLoading = false;
        state.error = action.payload ?? 'Failed to fetch transactions';
      });
  },
});

export const {
  setWalletBalance,
  debitLocally,
  clearPartnerWalletError,
  resetPartnerWallet,
} = partnerWalletSlice.actions;

export default partnerWalletSlice.reducer;
