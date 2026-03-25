//  store/slices/paymentSlice.ts
// ═══════════════════════════════════════════════════════════════
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { paymentApi } from '../services/paymentApi';

export const MAX_VERIFY_RETRIES = 3;
export const MAX_PAYMENT_RETRIES = 3;

interface VerifiedOrder {
  reportId: string;
  paymentId: string;
  paymentMethod: string;
  amount: number;
  verifiedAt: string;
  alreadyProcessed: boolean;
}

interface PendingVerification {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  attemptedAt: string;
  retryCount: number;
}

export interface PaymentState {
  // ✅ FIX 4: Removed isCreatingPayment — handled locally in PayScreen
  isVerifyingPayment: boolean;
  paymentError: string | null;
  verifiedOrders: Record<string, VerifiedOrder>;
  pendingVerification: PendingVerification | null;
  // ✅ FIX 1+2: Single source of truth for retry count
  verifyRetryCount: number;
}

const initialState: PaymentState = {
  isVerifyingPayment: false,
  paymentError: null,
  verifiedOrders: {},
  pendingVerification: null,
  verifyRetryCount: 0,
};

export const verifyPayment = createAsyncThunk(
  'payment/verify',
  async (
    payload: {
      orderId: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = (getState() as any).payment as PaymentState;

      // Return cached result if already verified — idempotent
      if (state.verifiedOrders[payload.orderId]) {
        console.log('⚠️ Already verified — returning cached result');
        return {
          ...state.verifiedOrders[payload.orderId],
          orderId: payload.orderId,
          alreadyProcessed: true,
        };
      }

      console.log(
        '🔐 Verifying — Order:', payload.orderId,
        '| Attempt:', state.verifyRetryCount + 1,
      );

      const response = await paymentApi.verifyPayment(payload.orderId, {
        razorpay_order_id: payload.razorpay_order_id,
        razorpay_payment_id: payload.razorpay_payment_id,
        razorpay_signature: payload.razorpay_signature,
      });

      if (!response.success) {
        return rejectWithValue(response.message || 'Payment verification failed');
      }

      console.log('✅ Verified — Report:', response.data?.report_id);

      return {
        orderId: payload.orderId,
        reportId: response.data?.report_id,
        paymentId: payload.razorpay_payment_id,
        paymentMethod: response.data?.payment_method,
        amount: response.data?.amount,
        alreadyProcessed: response.data?.already_processed || false,
        verifiedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.log('❌ Verification failed:', error.message);
      return rejectWithValue(error.message || 'Payment verification failed');
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    clearPaymentError: (state) => {
      state.paymentError = null;
    },

    // ✅ FIX 1: savePendingVerification no longer resets verifyRetryCount
    // retryCount lives ONLY in local PayScreen state — Redux just persists the data
    savePendingVerification: (
      state,
      action: PayloadAction<PendingVerification>
    ) => {
      state.pendingVerification = action.payload;
      // ❌ REMOVED: state.verifyRetryCount = 0  ← was incorrectly resetting
    },

    clearPendingVerification: (state) => {
      state.pendingVerification = null;
      state.verifyRetryCount = 0; // Safe to reset here — verification is done
    },

    markOrderVerified: (
      state,
      action: PayloadAction<{
        orderId: string;
        reportId: string;
        paymentId: string;
        paymentMethod: string;
        amount: number;
        alreadyProcessed?: boolean;
      }>
    ) => {
      const { orderId, ...rest } = action.payload;
      state.verifiedOrders[orderId] = {
        ...rest,
        alreadyProcessed: rest.alreadyProcessed || false,
        verifiedAt: new Date().toISOString(),
      };
    },

    // ✅ Call on logout to free memory
    clearVerifiedOrders: (state) => {
      state.verifiedOrders = {};
      state.pendingVerification = null;
      state.verifyRetryCount = 0;
    },

    // ✅ FIX 5: Removed incrementRetryCount — no longer needed
    // retryCount is managed locally in PayScreen via param
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyPayment.pending, (state) => {
        state.isVerifyingPayment = true;
        state.paymentError = null;
      })
      .addCase(verifyPayment.fulfilled, (state, action) => {
        state.isVerifyingPayment = false;
        state.verifyRetryCount = 0;
        state.pendingVerification = null;
        state.verifiedOrders[action.payload.orderId] = {
          reportId: action.payload.reportId,
          paymentId: action.payload.paymentId,
          paymentMethod: action.payload.paymentMethod,
          amount: action.payload.amount,
          alreadyProcessed: action.payload.alreadyProcessed,
          verifiedAt: action.payload.verifiedAt,
        };
      })
      .addCase(verifyPayment.rejected, (state, action) => {
        state.isVerifyingPayment = false;
        state.paymentError = action.payload as string;
        state.verifyRetryCount += 1; // Track in Redux for crash recovery
      });
  },
});

export const {
  clearPaymentError,
  markOrderVerified,
  clearVerifiedOrders,
  savePendingVerification,
  clearPendingVerification,
} = paymentSlice.actions;

export default paymentSlice.reducer;