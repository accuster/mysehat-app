// store/slices/reportSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { reportApi } from '../services/reportApi';

// Types
export interface Report {
  report_id: string;
  user_id: string;
  user_name: string;
  age: number;
  gender: string;
  user_type: 'SuperUser' | 'FamilyUser';
  report_date: string;
  machine_id: string;
  payment_details: {
    fee: number;
    transaction_id: string | null;
    payment_method: string;
  };
  vitals: {
    height: number;
    weight: number;
    bmi: number;
    bmi_status: string;
    ideal_weight: number;
    body_fat_pct: number;
    fat_mass: number;
    lean_body_mass: number;
    health_score: number;
  };
  created_at: string;
  updated_at: string;
}

export interface ReportState {
  reports: Report[];
  selectedReport: Report | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
}

// Initial state
const initialState: ReportState = {
  reports: [],
  selectedReport: null,
  isLoading: false,
  error: null,
  lastFetch: null,
};

// Async thunks

/**
 * Fetch all reports for authenticated user
 */
export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (_, { rejectWithValue }) => {
    try {
      console.log('📊 Redux: Fetching reports...');
      const response = await reportApi.getAllReports();
      
      if (response.success) {
        console.log(`✅ Redux: Fetched ${response.count} reports`);
        return response.data;
      }
      
      return rejectWithValue(response.message || 'Failed to fetch reports');
    } catch (error: any) {
      console.error('❌ Redux: Error fetching reports:', error.message);
      return rejectWithValue(error.message || 'An error occurred while fetching reports');
    }
  }
);

/**
 * Fetch single report by ID
 */
export const fetchReportById = createAsyncThunk(
  'reports/fetchReportById',
  async (reportId: string, { rejectWithValue }) => {
    try {
      console.log('📄 Redux: Fetching report:', reportId);
      const response = await reportApi.getReportById(reportId);
      
      if (response.success) {
        console.log('✅ Redux: Report fetched successfully');
        return response.data;
      }
      
      return rejectWithValue(response.message || 'Failed to fetch report');
    } catch (error: any) {
      console.error('❌ Redux: Error fetching report:', error.message);
      return rejectWithValue(error.message || 'An error occurred while fetching report');
    }
  }
);

// Slice
const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedReport: (state) => {
      state.selectedReport = null;
    },
    resetReports: (state) => {
      state.reports = [];
      state.selectedReport = null;
      state.error = null;
      state.lastFetch = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all reports
    builder
      .addCase(fetchReports.pending, (state) => {
        console.log('🔄 fetchReports: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action: PayloadAction<Report[]>) => {
        console.log('✅ fetchReports: fulfilled');
        state.isLoading = false;
        state.reports = action.payload;
        state.lastFetch = Date.now();
      })
      .addCase(fetchReports.rejected, (state, action) => {
        console.error('❌ fetchReports: rejected');
        console.error('Error:', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch report by ID
    builder
      .addCase(fetchReportById.pending, (state) => {
        console.log('🔄 fetchReportById: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReportById.fulfilled, (state, action: PayloadAction<Report>) => {
        console.log('✅ fetchReportById: fulfilled');
        state.isLoading = false;
        state.selectedReport = action.payload;
      })
      .addCase(fetchReportById.rejected, (state, action) => {
        console.error('❌ fetchReportById: rejected');
        console.error('Error:', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedReport, resetReports } = reportSlice.actions;
export default reportSlice.reducer;