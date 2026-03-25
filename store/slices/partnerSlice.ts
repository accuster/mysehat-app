// store/slices/partnerSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  partnerApi,
  PartnerProfile,
  PartnerReport,
  PartnerTransaction,
  PaginationMeta,
  ReportFilters,
  TransactionFilters,
  UpdateProfileRequest,
} from '../services/partnerApi';

// ─── State ────────────────────────────────────────────────────────────────────

export interface PartnerState {
  // Profile
  profile: PartnerProfile | null;
  profileLoading: boolean;
  profileError: string | null;

  // Reports list
  reports: PartnerReport[];
  reportsPagination: PaginationMeta | null;
  reportsLoading: boolean;
  reportsError: string | null;

  // Single report
  selectedReport: PartnerReport | null;
  selectedReportLoading: boolean;
  selectedReportError: string | null;

  // Transactions list
  transactions: PartnerTransaction[];
  transactionsPagination: PaginationMeta | null;
  transactionsLoading: boolean;
  transactionsError: string | null;

  // Single transaction
  selectedTransaction: PartnerTransaction | null;
  selectedTransactionLoading: boolean;
  selectedTransactionError: string | null;
}

const initialState: PartnerState = {
  profile: null,
  profileLoading: false,
  profileError: null,

  reports: [],
  reportsPagination: null,
  reportsLoading: false,
  reportsError: null,

  selectedReport: null,
  selectedReportLoading: false,
  selectedReportError: null,

  transactions: [],
  transactionsPagination: null,
  transactionsLoading: false,
  transactionsError: null,

  selectedTransaction: null,
  selectedTransactionLoading: false,
  selectedTransactionError: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

/** Fetch partner profile by auth_id */
export const fetchPartnerProfile = createAsyncThunk(
  'partner/fetchProfile',
  async (authId: string, { rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 Redux: fetchPartnerProfile');
      const response = await partnerApi.getProfile(authId);
      return response.profile;
    } catch (err: any) {
      console.error('❌ fetchPartnerProfile error:', err.message);
      return rejectWithValue(err.message || 'Failed to load profile.');
    }
  },
);

/** Update partner profile */
export const updatePartnerProfile = createAsyncThunk(
  'partner/updateProfile',
  async (
    { authId, data }: { authId: string; data: UpdateProfileRequest },
    { rejectWithValue, dispatch },
  ) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✏️ Redux: updatePartnerProfile');
      await partnerApi.updateProfile(authId, data);
      // Re-fetch profile to get fresh data after update
      dispatch(fetchPartnerProfile(authId));
      return true;
    } catch (err: any) {
      console.error('❌ updatePartnerProfile error:', err.message);
      return rejectWithValue(err.message || 'Failed to update profile.');
    }
  },
);

/** Fetch paginated reports */
export const fetchPartnerReports = createAsyncThunk(
  'partner/fetchReports',
  async (filters: ReportFilters = {}, { rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Redux: fetchPartnerReports', filters);
      const response = await partnerApi.getReports(filters);
      return response;
    } catch (err: any) {
      console.error('❌ fetchPartnerReports error:', err.message);
      return rejectWithValue(err.message || 'Failed to load reports.');
    }
  },
);

/** Fetch single report by ID */
export const fetchPartnerReportById = createAsyncThunk(
  'partner/fetchReportById',
  async (reportId: string, { rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📄 Redux: fetchPartnerReportById →', reportId);
      const response = await partnerApi.getReportById(reportId);
      return response.report;
    } catch (err: any) {
      console.error('❌ fetchPartnerReportById error:', err.message);
      return rejectWithValue(err.message || 'Failed to load report.');
    }
  },
);

/** Fetch paginated transactions */
export const fetchPartnerTransactions = createAsyncThunk(
  'partner/fetchTransactions',
  async (filters: TransactionFilters = {}, { rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💳 Redux: fetchPartnerTransactions', filters);
      const response = await partnerApi.getTransactions(filters);
      return response;
    } catch (err: any) {
      console.error('❌ fetchPartnerTransactions error:', err.message);
      return rejectWithValue(err.message || 'Failed to load transactions.');
    }
  },
);

/** Fetch single transaction by order_id */
export const fetchPartnerTransactionById = createAsyncThunk(
  'partner/fetchTransactionById',
  async (orderId: string, { rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 Redux: fetchPartnerTransactionById →', orderId);
      const response = await partnerApi.getTransactionById(orderId);
      return response.transaction;
    } catch (err: any) {
      console.error('❌ fetchPartnerTransactionById error:', err.message);
      return rejectWithValue(err.message || 'Failed to load transaction.');
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const partnerSlice = createSlice({
  name: 'partner',
  initialState,
  reducers: {
    /** Clear selected report (e.g. on screen unmount) */
    clearSelectedReport: state => {
      state.selectedReport = null;
      state.selectedReportError = null;
    },
    /** Clear selected transaction (e.g. on screen unmount) */
    clearSelectedTransaction: state => {
      state.selectedTransaction = null;
      state.selectedTransactionError = null;
    },
    /** Clear all partner data on logout */
    resetPartnerData: () => initialState,
    /** Clear profile error */
    clearProfileError: state => {
      state.profileError = null;
    },
    /** Clear reports error */
    clearReportsError: state => {
      state.reportsError = null;
    },
    /** Clear transactions error */
    clearTransactionsError: state => {
      state.transactionsError = null;
    },
  },
  extraReducers: builder => {

    // ── fetchPartnerProfile ───────────────────────────────────────────────
    builder
      .addCase(fetchPartnerProfile.pending, state => {
        state.profileLoading = true;
        state.profileError = null;
      })
      .addCase(fetchPartnerProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchPartnerProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.profileError = action.payload as string;
      });

    // ── updatePartnerProfile ──────────────────────────────────────────────
    builder
      .addCase(updatePartnerProfile.pending, state => {
        state.profileLoading = true;
        state.profileError = null;
      })
      .addCase(updatePartnerProfile.fulfilled, state => {
        state.profileLoading = false;
        // Profile data refreshed via fetchPartnerProfile dispatch inside thunk
      })
      .addCase(updatePartnerProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.profileError = action.payload as string;
      });

    // ── fetchPartnerReports ───────────────────────────────────────────────
    builder
      .addCase(fetchPartnerReports.pending, state => {
        state.reportsLoading = true;
        state.reportsError = null;
      })
      .addCase(fetchPartnerReports.fulfilled, (state, action) => {
        state.reportsLoading = false;
        state.reports = action.payload.reports;           // replace on each fetch
        state.reportsPagination = action.payload.pagination;
      })
      .addCase(fetchPartnerReports.rejected, (state, action) => {
        state.reportsLoading = false;
        state.reportsError = action.payload as string;
      });

    // ── fetchPartnerReportById ────────────────────────────────────────────
    builder
      .addCase(fetchPartnerReportById.pending, state => {
        state.selectedReportLoading = true;
        state.selectedReportError = null;
        state.selectedReport = null;
      })
      .addCase(fetchPartnerReportById.fulfilled, (state, action) => {
        state.selectedReportLoading = false;
        state.selectedReport = action.payload;
      })
      .addCase(fetchPartnerReportById.rejected, (state, action) => {
        state.selectedReportLoading = false;
        state.selectedReportError = action.payload as string;
      });

    // ── fetchPartnerTransactions ──────────────────────────────────────────
    builder
      .addCase(fetchPartnerTransactions.pending, state => {
        state.transactionsLoading = true;
        state.transactionsError = null;
      })
      .addCase(fetchPartnerTransactions.fulfilled, (state, action) => {
        state.transactionsLoading = false;
        state.transactions = action.payload.transactions; // replace on each fetch
        state.transactionsPagination = action.payload.pagination;
      })
      .addCase(fetchPartnerTransactions.rejected, (state, action) => {
        state.transactionsLoading = false;
        state.transactionsError = action.payload as string;
      });

    // ── fetchPartnerTransactionById ───────────────────────────────────────
    builder
      .addCase(fetchPartnerTransactionById.pending, state => {
        state.selectedTransactionLoading = true;
        state.selectedTransactionError = null;
        state.selectedTransaction = null;
      })
      .addCase(fetchPartnerTransactionById.fulfilled, (state, action) => {
        state.selectedTransactionLoading = false;
        state.selectedTransaction = action.payload;
      })
      .addCase(fetchPartnerTransactionById.rejected, (state, action) => {
        state.selectedTransactionLoading = false;
        state.selectedTransactionError = action.payload as string;
      });
  },
});

export const {
  clearSelectedReport,
  clearSelectedTransaction,
  resetPartnerData,
  clearProfileError,
  clearReportsError,
  clearTransactionsError,
} = partnerSlice.actions;

export default partnerSlice.reducer;