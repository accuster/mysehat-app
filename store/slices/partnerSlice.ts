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
  
  // Reports pagination
  reportsLoadingMore: boolean;
  reportsAllLoaded: boolean;

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

  // Transactions pagination
  transactionsLoadingMore: boolean;
  transactionsAllLoaded: boolean;
}

const initialState: PartnerState = {
  profile: null,
  profileLoading: false,
  profileError: null,

  reports: [],
  reportsPagination: null,
  reportsLoading: false,
  reportsError: null,
  reportsLoadingMore: false,
  reportsAllLoaded: false,

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

  transactionsLoadingMore: false,
  transactionsAllLoaded: false,
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
      console.log('❌ fetchPartnerProfile error:', err.message);
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
      dispatch(fetchPartnerProfile(authId));
      return true;
    } catch (err: any) {
      console.log('❌ updatePartnerProfile error:', err.message);
      return rejectWithValue(err.message || 'Failed to update profile.');
    }
  },
);

/** Fetch paginated reports (replaces existing list) */
export const fetchPartnerReports = createAsyncThunk(
  'partner/fetchReports',
  async (filters: ReportFilters = {}, { rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Redux: fetchPartnerReports (fresh load)', filters);
      const response = await partnerApi.getReports({
        ...filters,
        page: 1, // ✅ Always start from page 1 for fresh load
      });
      return response;
    } catch (err: any) {
      console.log('❌ fetchPartnerReports error:', err.message);
      return rejectWithValue(err.message || 'Failed to load reports.');
    }
  },
);

/** ✅ NEW: Load more reports (append to existing list) */
export const loadMorePartnerReports = createAsyncThunk(
  'partner/loadMoreReports',
  async (filters: ReportFilters = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { partner: PartnerState };
      const currentPage = state.partner.reportsPagination?.page || 1;
      const totalPages = state.partner.reportsPagination?.totalPages || 1;

      // ✅ Don't load if already on last page
      if (currentPage >= totalPages) {
        console.log('📄 Already on last page — no more to load');
        return null;
      }

      const nextPage = currentPage + 1;
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(
        `📋 Redux: loadMoreReports — loading page ${nextPage}/${totalPages}`,
      );

      const response = await partnerApi.getReports({
        ...filters,
        page: nextPage,
      });
      return response;
    } catch (err: any) {
      console.log('❌ loadMoreReports error:', err.message);
      return rejectWithValue(err.message || 'Failed to load more.');
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
      console.log('❌ fetchPartnerReportById error:', err.message);
      return rejectWithValue(err.message || 'Failed to load report.');
    }
  },
);

/** Fetch paginated transactions (replaces existing list) */
export const fetchPartnerTransactions = createAsyncThunk(
  'partner/fetchTransactions',
  async (filters: TransactionFilters = {}, { rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💳 Redux: fetchPartnerTransactions (fresh load)', filters);
      const response = await partnerApi.getTransactions({
        ...filters,
        page: 1,
      });
      return response;
    } catch (err: any) {
      console.log('❌ fetchPartnerTransactions error:', err.message);
      return rejectWithValue(err.message || 'Failed to load transactions.');
    }
  },
);

/** Load more transactions (append to existing list) */
export const loadMorePartnerTransactions = createAsyncThunk(
  'partner/loadMoreTransactions',
  async (filters: TransactionFilters = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { partner: PartnerState };
      const currentPage = state.partner.transactionsPagination?.page || 1;
      const totalPages = state.partner.transactionsPagination?.totalPages || 1;

      if (currentPage >= totalPages) {
        console.log('📄 Already on last page — no more to load');
        return null;
      }

      const nextPage = currentPage + 1;
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(
        `💳 Redux: loadMoreTransactions — loading page ${nextPage}/${totalPages}`,
      );

      const response = await partnerApi.getTransactions({
        ...filters,
        page: nextPage,
      });
      return response;
    } catch (err: any) {
      console.log('❌ loadMoreTransactions error:', err.message);
      return rejectWithValue(err.message || 'Failed to load more.');
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
      console.log('❌ fetchPartnerTransactionById error:', err.message);
      return rejectWithValue(err.message || 'Failed to load transaction.');
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const partnerSlice = createSlice({
  name: 'partner',
  initialState,
  reducers: {
    clearSelectedReport: state => {
      state.selectedReport = null;
      state.selectedReportError = null;
    },
    clearSelectedTransaction: state => {
      state.selectedTransaction = null;
      state.selectedTransactionError = null;
    },
    resetPartnerData: () => initialState,
    clearProfileError: state => {
      state.profileError = null;
    },
    clearReportsError: state => {
      state.reportsError = null;
    },
    clearTransactionsError: state => {
      state.transactionsError = null;
    },
    resetTransactionsPagination: state => {
      state.transactions = [];
      state.transactionsPagination = null;
      state.transactionsAllLoaded = false;
    },
    // Reset reports pagination
    resetReportsPagination: state => {
      state.reports = [];
      state.reportsPagination = null;
      state.reportsAllLoaded = false;
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
        state.reportsAllLoaded = false; // ✅ Reset
      })
      .addCase(fetchPartnerReports.fulfilled, (state, action) => {
        state.reportsLoading = false;
        state.reports = action.payload.reports; // ✅ Replace (fresh load)
        state.reportsPagination = action.payload.pagination;
        // ✅ Check if all pages loaded
        const { page, totalPages } = action.payload.pagination;
        state.reportsAllLoaded = page >= totalPages;
      })
      .addCase(fetchPartnerReports.rejected, (state, action) => {
        state.reportsLoading = false;
        state.reportsError = action.payload as string;
      });

    // ── loadMorePartnerReports (NEW) ──────────────────────────────────────
    builder
      .addCase(loadMorePartnerReports.pending, state => {
        state.reportsLoadingMore = true;
      })
      .addCase(loadMorePartnerReports.fulfilled, (state, action) => {
        state.reportsLoadingMore = false;

        if (action.payload === null) {
          state.reportsAllLoaded = true;
          return;
        }

        // ✅ Append new reports to existing list
        state.reports = [...state.reports, ...action.payload.reports];
        state.reportsPagination = action.payload.pagination;

        // ✅ Check if we loaded all pages
        const { page, totalPages } = action.payload.pagination;
        state.reportsAllLoaded = page >= totalPages;

        console.log(
          `✅ Loaded page ${page}/${totalPages} — total in state: ${state.reports.length}`,
        );
      })
      .addCase(loadMorePartnerReports.rejected, (state, action) => {
        state.reportsLoadingMore = false;
        console.warn('⚠️ Load more failed (silent):', action.payload);
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
        state.transactionsAllLoaded = false;
      })
      .addCase(fetchPartnerTransactions.fulfilled, (state, action) => {
        state.transactionsLoading = false;
        state.transactions = action.payload.transactions;
        state.transactionsPagination = action.payload.pagination;
        const { page, totalPages } = action.payload.pagination;
        state.transactionsAllLoaded = page >= totalPages;
      })
      .addCase(fetchPartnerTransactions.rejected, (state, action) => {
        state.transactionsLoading = false;
        state.transactionsError = action.payload as string;
      });

    // ── loadMorePartnerTransactions ───────────────────────────────────────
    builder
      .addCase(loadMorePartnerTransactions.pending, state => {
        state.transactionsLoadingMore = true;
      })
      .addCase(loadMorePartnerTransactions.fulfilled, (state, action) => {
        state.transactionsLoadingMore = false;

        if (action.payload === null) {
          state.transactionsAllLoaded = true;
          return;
        }

        state.transactions = [
          ...state.transactions,
          ...action.payload.transactions,
        ];
        state.transactionsPagination = action.payload.pagination;

        const { page, totalPages } = action.payload.pagination;
        state.transactionsAllLoaded = page >= totalPages;

        console.log(
          `✅ Loaded page ${page}/${totalPages} — total in state: ${state.transactions.length}`,
        );
      })
      .addCase(loadMorePartnerTransactions.rejected, (state, action) => {
        state.transactionsLoadingMore = false;
        console.warn('⚠️ Load more failed (silent):', action.payload);
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
  resetTransactionsPagination,
  resetReportsPagination,
} = partnerSlice.actions;

export default partnerSlice.reducer;