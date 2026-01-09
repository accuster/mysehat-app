/* eslint-disable @typescript-eslint/no-unused-vars */
// store/slices/authSlice.ts - LOGOUT FIX
import { persistor } from '../index';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, CompleteProfileRequest } from '../../types/auth.types';
import { authApi } from '../services/authApi';
import { storage } from '../../utils/storage';

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  otpSent: false,
};

// Async thunks

/**
 * Verify login with MSG91 access token
 */
export const verifyLogin = createAsyncThunk(
  'auth/verifyLogin',
  async (
    { accessToken, mobile }: { accessToken: string; mobile: string },
    { rejectWithValue },
  ) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔐 Redux: Calling authApi.verifyLogin');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Mobile:', mobile);
      console.log(
        'Access Token (first 20):',
        accessToken.substring(0, 20) + '...',
      );

      const response = await authApi.verifyLogin(accessToken, mobile);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📥 Redux: API Response');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Success:', response.success);
      console.log('Message:', response.message);
      console.log('Has accessToken:', !!response.accessToken);
      console.log('Has refreshToken:', !!response.refreshToken);
      console.log('User ID:', response.user?.user_id);
      console.log('Requires profile setup:', response.requiresProfileSetup);

      if (response.success) {
        // ✅ CORRECTED: Use direct properties, not nested data
        await storage.saveToken(response.accessToken);
        await storage.saveRefreshToken(response.refreshToken);

        // Save user data
        await storage.saveUser({
          userId: response.user.user_id,
          mobile: response.user.mobile_number,
          name: response.user.full_name,
          age: response.user.age,
          gender: response.user.gender,
          isNewUser: false,
          requiresProfileSetup: response.requiresProfileSetup,
        });

        console.log('✅ Redux: Tokens and user data saved to storage');

        // Return data for Redux state
        return {
          userId: response.user.user_id,
          mobile: response.user.mobile_number,
          name: response.user.full_name,
          age: response.user.age,
          gender: response.user.gender,
          token: response.accessToken,
          refreshToken: response.refreshToken,
          isNewUser: false,
          requiresProfileSetup: response.requiresProfileSetup,
        };
      }

      console.error('❌ Redux: Response not successful');
      return rejectWithValue(response.message || 'Login failed');
    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ Redux: Error in verifyLogin');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);

      // Log full error details
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error(
          'Response data:',
          JSON.stringify(error.response.data, null, 2),
        );
      } else if (error.request) {
        console.error('No response received from server');
        console.error('Request:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }

      // Return the actual error message from backend
      const errorMessage = error.message || 'An error occurred during login';
      return rejectWithValue(errorMessage);
    }
  },
);

/**
 * Complete user profile
 */
export const completeProfile = createAsyncThunk(
  'auth/completeProfile',
  async (data: CompleteProfileRequest, { rejectWithValue }) => {
    try {
      console.log('📝 Redux: Completing profile...');
      const response = await authApi.completeProfile(data);

      if (response.success) {
        // Update stored user data
        const currentUser = await storage.getUser();
        const updatedUser = {
          ...currentUser,
          name: data.fullName,
          age: data.age,
          gender: data.gender,
          requiresProfileSetup: false,
        };
        await storage.saveUser(updatedUser);

        console.log('✅ Profile completed successfully');
        return updatedUser;
      }

      return rejectWithValue(response.message);
    } catch (error: any) {
      console.error('❌ Error completing profile:', error.message);
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Load user from storage (on app start)
 */
export const loadUserFromStorage = createAsyncThunk(
  'auth/loadUserFromStorage',
  async (_, { rejectWithValue }) => {
    try {
      console.log('📂 Loading user from storage...');

      const token = await storage.getToken();
      const refreshToken = await storage.getRefreshToken();
      const user = await storage.getUser();

      if (token && user) {
        console.log('✅ Found stored auth data');
        console.log('User ID:', user.userId);
        return { token, refreshToken, user };
      }

      console.log('ℹ️ No stored auth data found');
      return rejectWithValue('No stored auth data');
    } catch (error: any) {
      console.error('❌ Error loading from storage:', error.message);
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Refresh user profile
 */
export const refreshProfile = createAsyncThunk(
  'auth/refreshProfile',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Refreshing profile...');
      const response = await authApi.getProfile();

      if (response.success) {
        await storage.saveUser(response.data);
        console.log('✅ Profile refreshed');
        return response.data;
      }

      return rejectWithValue('Failed to refresh profile');
    } catch (error: any) {
      console.error('❌ Error refreshing profile:', error.message);
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Logout - FIXED VERSION
 */
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👋 LOGOUT PROCESS STARTED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // 1. Call logout API
      console.log('1️⃣ Calling logout API...');
      await authApi.logout();
      console.log('✅ API logout successful');
      
      // 2. Clear AsyncStorage completely
      console.log('2️⃣ Clearing AsyncStorage...');
      await storage.clearAuth();
      console.log('✅ AsyncStorage cleared');
      
      // 3. Pause writes and flush pending operations
      console.log('3️⃣ Pausing and flushing persistor...');
      await persistor.pause();
      await persistor.flush();
      console.log('✅ Persistor flushed');
      
      // 4. Purge all persisted state
      console.log('4️⃣ Purging persisted state...');
      await persistor.purge();
      console.log('✅ Persisted state purged');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ LOGOUT COMPLETED SUCCESSFULLY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return null;
    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('⚠️ LOGOUT ERROR - FORCING CLEANUP');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Error:', error.message);
      
      // Even if API fails, force clear everything
      try {
        await storage.clearAuth();
        await persistor.pause();
        await persistor.flush();
        await persistor.purge();
        console.log('✅ Forced cleanup completed');
      } catch (cleanupError: any) {
        console.error('❌ Cleanup error:', cleanupError.message);
      }
      
      console.warn('⚠️ Logout API failed but local data cleared');
      return rejectWithValue(error.message);
    }
  },
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setOtpSent: (state, action: PayloadAction<boolean>) => {
      state.otpSent = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
    resetAuth: state => {
      // ✅ Explicitly reset to initialState
      Object.assign(state, initialState);
    },
  },
  extraReducers: builder => {
    // Verify Login
    builder
      .addCase(verifyLogin.pending, state => {
        console.log('🔄 verifyLogin: pending');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyLogin.fulfilled, (state, action) => {
        console.log('✅ verifyLogin: fulfilled');
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = {
          userId: action.payload.userId,
          mobile: action.payload.mobile,
          name: action.payload.name,
          age: action.payload.age,
          gender: action.payload.gender,
          userType: 'SuperUser',
          isNewUser: action.payload.isNewUser,
          requiresProfileSetup: action.payload.requiresProfileSetup,
        };
        state.otpSent = false;
      })
      .addCase(verifyLogin.rejected, (state, action) => {
        console.error('❌ verifyLogin: rejected');
        console.error('Error:', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Complete Profile
    builder
      .addCase(completeProfile.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.user) {
          state.user.name = action.payload.name;
          state.user.age = action.payload.age;
          state.user.gender = action.payload.gender;
          state.user.requiresProfileSetup = false;
        }
      })
      .addCase(completeProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Load from Storage
    builder
      .addCase(loadUserFromStorage.pending, state => {
        state.isLoading = true;
      })
      .addCase(loadUserFromStorage.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = {
          ...action.payload.user,
          userType: 'SuperUser',
        };
      })
      .addCase(loadUserFromStorage.rejected, state => {
        state.isLoading = false;
        state.isAuthenticated = false;
      });

    // Refresh Profile
    builder.addCase(refreshProfile.fulfilled, (state, action) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
        };
      }
    });

    // Logout - CRITICAL FIX
    builder
      .addCase(logout.pending, state => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, () => {
        // ✅ Return initialState (complete reset)
        return initialState;
      })
      .addCase(logout.rejected, () => {
        // ✅ Return initialState even on error
        return initialState;
      });
  },
});

export const { setOtpSent, clearError, resetAuth } = authSlice.actions;
export default authSlice.reducer;