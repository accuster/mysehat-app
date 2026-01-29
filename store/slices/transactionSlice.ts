// store/slices/transactionSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { transactionApi } from '../services/transactionApi';

// Types
export interface Transaction {
  transaction_id: string;
  report_date: string;
  fee: number;
  payment_method: string;
}

export interface TransactionState {
  transactions: Transaction[];
  selectedTransaction: Transaction | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
}

// Initial state
const initialState: TransactionState = {
  transactions: [],
  selectedTransaction: null,
  isLoading: false,
  error: null,
  lastFetch: null,
};

// Async thunks

/**
 * Fetch all transactions for authenticated user
 */
export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async (_, { rejectWithValue }) => {
    try {
      console.log('💳 Redux: Fetching transactions...');
      const response = await transactionApi.getAllTransactions();
      
      if (response.success) {
        console.log(`✅ Redux: Fetched ${response.count} transactions`);
        return response.data;
      }
      
      return rejectWithValue(response.message || 'Failed to fetch transactions');
    } catch (error: any) {
      console.log('❌ Redux: Error fetching transactions:', error.message);
      return rejectWithValue(error.message || 'An error occurred while fetching transactions');
    }
  }
);

/**
 * Fetch single transaction by ID
 */
export const fetchTransactionById = createAsyncThunk(
  'transactions/fetchTransactionById',
  async (transactionId: string, { rejectWithValue }) => {
    try {
      console.log('💳 Redux: Fetching transaction:', transactionId);
      const response = await transactionApi.getTransactionById(transactionId);
      
      if (response.success) {
        console.log('✅ Redux: Transaction fetched successfully');
        return response.data;
      }
      
      return rejectWithValue(response.message || 'Failed to fetch transaction');
    } catch (error: any) {
      console.log('❌ Redux: Error fetching transaction:', error.message);
      return rejectWithValue(error.message || 'An error occurred while fetching transaction');
    }
  }
);

// Slice
const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedTransaction: (state) => {
      state.selectedTransaction = null;
    },
    resetTransactions: (state) => {
      state.transactions = [];
      state.selectedTransaction = null;
      state.error = null;
      state.lastFetch = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all transactions
    builder
      .addCase(fetchTransactions.pending, (state) => {
        console.log('🔄 fetchTransactions: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action: PayloadAction<Transaction[]>) => {
        console.log('✅ fetchTransactions: fulfilled');
        state.isLoading = false;
        state.transactions = action.payload;
        state.lastFetch = Date.now();
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        console.log('❌ fetchTransactions: rejected');
        console.log('Error:', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch transaction by ID
    builder
      .addCase(fetchTransactionById.pending, (state) => {
        console.log('🔄 fetchTransactionById: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactionById.fulfilled, (state, action: PayloadAction<Transaction>) => {
        console.log('✅ fetchTransactionById: fulfilled');
        state.isLoading = false;
        state.selectedTransaction = action.payload;
      })
      .addCase(fetchTransactionById.rejected, (state, action) => {
        console.log('❌ fetchTransactionById: rejected');
        console.log('Error:', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedTransaction, resetTransactions } = transactionSlice.actions;
export default transactionSlice.reducer;