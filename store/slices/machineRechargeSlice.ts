// store/slices/machineRechargeSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootState } from '../index';
import {
  machineRechargeApi,
  MachineRecharge,
  InitiateRechargeRequest,
  BTFailureStatus,
} from '../services/machineRechargeApi';
import { setWalletBalance } from './partnerWalletSlice';

// ─── State Shape ──────────────────────────────────────────────────────────────

export interface ActiveRecharge {
  rechargeId: string;
  amountRupees: number;
  unitsSent: number;
  unitPriceSnapshot: number;
  btDeviceAddress: string;
  btDeviceName: string | null;
  createdAt: number;
}

export interface MachineRechargeState {
  // ── Active recharge (post-initiate, pre-confirm/fail) ────────────────────
  active: ActiveRecharge | null;

  // ── Recharge history (paginated) ─────────────────────────────────────────
  recharges: MachineRecharge[];
  rechargesOffset: number;
  rechargesHasMore: boolean;

  // ── Loading flags (per-operation) ────────────────────────────────────────
  initiateLoading: boolean;
  confirmLoading: boolean;
  failLoading: boolean;
  rechargesLoading: boolean;

  // ── Last error ───────────────────────────────────────────────────────────
  error: string | null;
}

const initialState: MachineRechargeState = {
  active: null,
  recharges: [],
  rechargesOffset: 0,
  rechargesHasMore: true,
  initiateLoading: false,
  confirmLoading: false,
  failLoading: false,
  rechargesLoading: false,
  error: null,
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

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
 * POST /machine-recharge/initiate
 * Creates the recharge row in 'initiated' state. NO wallet debit yet.
 * Stores `active` in state so the screen can read recharge_id later.
 */
export const initiateMachineRecharge = createAsyncThunk<
  ActiveRecharge,
  InitiateRechargeRequest,
  { state: RootState; rejectValue: string }
>('machineRecharge/initiate', async (payload, { rejectWithValue }) => {
  try {
    const token = await getPartnerToken();
    const res = await machineRechargeApi.initiate(token, payload);
    const data = res.data;
    return {
      rechargeId: data?.recharge_id ?? '',
      amountRupees: Number(data?.amount_rupees ?? payload.amount_rupees),
      unitsSent: Number(data?.units_sent ?? 0),
      unitPriceSnapshot: Number(data?.unit_price_snapshot ?? 0),
      btDeviceAddress: payload.bt_device_address,
      btDeviceName: payload.bt_device_name ?? null,
      createdAt: Date.now(),
    };
  } catch (err: any) {
    console.error('❌ initiateMachineRecharge error:', err?.message);
    return rejectWithValue(
      extractErrorMessage(err, 'Failed to initiate recharge'),
    );
  }
});

/**
 * POST /machine-recharge/:rechargeId/confirm
 * Called after BT ACK. Server debits wallet atomically.
 * ALSO dispatches setWalletBalance on partnerWallet slice so balance updates
 * automatically without the caller having to coordinate.
 */
export const confirmMachineRecharge = createAsyncThunk<
  {
    rechargeId: string;
    transactionId: string;
    amountDebited: number;
    unitsSent: number;
    walletBalance: number;
  },
  { rechargeId: string },
  { state: RootState; rejectValue: string }
>(
  'machineRecharge/confirm',
  async ({ rechargeId }, { dispatch, rejectWithValue }) => {
    try {
      const token = await getPartnerToken();
      const res = await machineRechargeApi.confirm(token, rechargeId);
      const newBalance = Number(res.data?.wallet_balance ?? 0);

      // Sync the new balance into partnerWallet slice (single source of truth)
      dispatch(setWalletBalance(newBalance));

      return {
        rechargeId,
        transactionId: res.data?.transaction_id ?? '',
        amountDebited: Number(res.data?.amount_debited ?? 0),
        unitsSent: Number(res.data?.units_sent ?? 0),
        walletBalance: newBalance,
      };
    } catch (err: any) {
      console.error('❌ confirmMachineRecharge error:', err?.message);
      return rejectWithValue(
        extractErrorMessage(err, 'Failed to confirm recharge'),
      );
    }
  },
);

/**
 * POST /machine-recharge/:rechargeId/fail
 * No wallet impact. Just marks recharge ack_timeout / failed.
 */
export const failMachineRecharge = createAsyncThunk<
  { rechargeId: string; btStatus: BTFailureStatus },
  { rechargeId: string; btStatus: BTFailureStatus; errorMessage?: string },
  { state: RootState; rejectValue: string }
>(
  'machineRecharge/fail',
  async ({ rechargeId, btStatus, errorMessage }, { rejectWithValue }) => {
    try {
      const token = await getPartnerToken();
      await machineRechargeApi.fail(token, rechargeId, {
        bt_status: btStatus,
        error_message: errorMessage,
      });
      return { rechargeId, btStatus };
    } catch (err: any) {
      console.error('❌ failMachineRecharge error:', err?.message);
      return rejectWithValue(
        extractErrorMessage(err, 'Failed to mark recharge failed'),
      );
    }
  },
);

/**
 * GET /machine-recharge?limit=20&offset=N
 * Paginated recharge history (all statuses).
 */
export const fetchMachineRecharges = createAsyncThunk<
  { recharges: MachineRecharge[]; reset: boolean; pageSize: number },
  { limit?: number; reset?: boolean },
  { state: RootState; rejectValue: string }
>(
  'machineRecharge/fetchList',
  async ({ limit = 20, reset = false }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = await getPartnerToken();
      const offset = reset ? 0 : state.machineRecharge.rechargesOffset;
      const res = await machineRechargeApi.list(token, limit, offset);
      return {
        recharges: (res.data ?? []) as MachineRecharge[],
        reset,
        pageSize: limit,
      };
    } catch (err: any) {
      console.error('❌ fetchMachineRecharges error:', err?.message);
      return rejectWithValue(
        extractErrorMessage(err, 'Failed to fetch recharges'),
      );
    }
  },
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const machineRechargeSlice = createSlice({
  name: 'machineRecharge',
  initialState,
  reducers: {
    /**
     * Manually clear active recharge — useful if the screen handles error UI
     * dismissal and wants to reset.
     */
    clearActiveRecharge: state => {
      state.active = null;
    },

    /**
     * Set active recharge from outside (e.g. if you reload from /getById).
     */
    setActiveRecharge: (
      state,
      action: PayloadAction<ActiveRecharge | null>,
    ) => {
      state.active = action.payload;
    },

    clearMachineRechargeError: state => {
      state.error = null;
    },

    resetMachineRecharge: () => initialState,
  },
  extraReducers: builder => {
    builder
      // ── initiate ─────────────────────────────────────────────────────────
      .addCase(initiateMachineRecharge.pending, state => {
        state.initiateLoading = true;
        state.error = null;
      })
      .addCase(initiateMachineRecharge.fulfilled, (state, action) => {
        state.initiateLoading = false;
        state.active = action.payload;
      })
      .addCase(initiateMachineRecharge.rejected, (state, action) => {
        state.initiateLoading = false;
        state.error = action.payload ?? 'Failed to initiate recharge';
      })

      // ── confirm ──────────────────────────────────────────────────────────
      .addCase(confirmMachineRecharge.pending, state => {
        state.confirmLoading = true;
        state.error = null;
      })
      .addCase(confirmMachineRecharge.fulfilled, state => {
        state.confirmLoading = false;
        state.active = null; // clear active after successful confirm
      })
      .addCase(confirmMachineRecharge.rejected, (state, action) => {
        state.confirmLoading = false;
        state.error = action.payload ?? 'Failed to confirm recharge';
        // NOTE: do NOT clear active here — server-side state may still be
        // 'initiated', user might want to retry or call /fail explicitly.
      })

      // ── fail ─────────────────────────────────────────────────────────────
      .addCase(failMachineRecharge.pending, state => {
        state.failLoading = true;
        state.error = null;
      })
      .addCase(failMachineRecharge.fulfilled, state => {
        state.failLoading = false;
        state.active = null; // recharge ended, clear it
      })
      .addCase(failMachineRecharge.rejected, (state, action) => {
        state.failLoading = false;
        state.error = action.payload ?? 'Failed to mark recharge failed';
      })

      // ── fetch list ───────────────────────────────────────────────────────
      .addCase(fetchMachineRecharges.pending, state => {
        state.rechargesLoading = true;
        state.error = null;
      })
      .addCase(fetchMachineRecharges.fulfilled, (state, action) => {
        state.rechargesLoading = false;
        const { recharges, reset, pageSize } = action.payload;
        if (reset) {
          state.recharges = recharges;
          state.rechargesOffset = recharges.length;
        } else {
          state.recharges = [...state.recharges, ...recharges];
          state.rechargesOffset += recharges.length;
        }
        state.rechargesHasMore = recharges.length >= pageSize;
      })
      .addCase(fetchMachineRecharges.rejected, (state, action) => {
        state.rechargesLoading = false;
        state.error = action.payload ?? 'Failed to fetch recharges';
      });
  },
});

export const {
  clearActiveRecharge,
  setActiveRecharge,
  clearMachineRechargeError,
  resetMachineRecharge,
} = machineRechargeSlice.actions;

export default machineRechargeSlice.reducer;
