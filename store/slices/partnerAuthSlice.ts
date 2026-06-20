// store/slices/partnerAuthSlice.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  partnerAuthApi,
  PartnerInfo,
  PartnerLoginRequest,
} from '../services/partnerAuthApi';

// ─── AsyncStorage Keys (separate from user auth) ──────────────────────────────
const KEYS = {
  TOKEN: 'partner_token',
  REFRESH_TOKEN: 'partner_refresh_token',
  PARTNER: 'partner_user',
} as const;

// ─── Storage Helpers ──────────────────────────────────────────────────────────
const partnerStorage = {
  async save(token: string, refreshToken: string, partner: PartnerInfo) {
    await AsyncStorage.multiSet([
      [KEYS.TOKEN, token],
      [KEYS.REFRESH_TOKEN, refreshToken],
      [KEYS.PARTNER, JSON.stringify(partner)],
    ]);
  },
  async clear() {
    await AsyncStorage.multiRemove([
      KEYS.TOKEN,
      KEYS.REFRESH_TOKEN,
      KEYS.PARTNER,
    ]);
  },
  async load(): Promise<{
    token: string;
    refreshToken: string;
    partner: PartnerInfo;
  } | null> {
    const pairs = await AsyncStorage.multiGet([
      KEYS.TOKEN,
      KEYS.REFRESH_TOKEN,
      KEYS.PARTNER,
    ]);
    const token = pairs[0][1];
    const refreshToken = pairs[1][1];
    const partnerRaw = pairs[2][1];
    if (!token || !partnerRaw) return null;
    return {
      token,
      refreshToken: refreshToken ?? '',
      partner: JSON.parse(partnerRaw),
    };
  },
  async saveToken(token: string) {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  },
};

// ─── State ────────────────────────────────────────────────────────────────────
export interface PartnerAuthState {
  partner: PartnerInfo | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: PartnerAuthState = {
  partner: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

/** Login with email + password */
export const partnerLogin = createAsyncThunk(
  'partnerAuth/login',
  async (data: PartnerLoginRequest, { rejectWithValue }) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔐 Redux: partnerLogin');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const response = await partnerAuthApi.login(data);

      if (response.success) {
        await partnerStorage.save(
          response.accessToken,
          response.refreshToken,
          response.partner,
        );
        console.log('✅ Partner tokens saved to AsyncStorage');
        return response;
      }

      return rejectWithValue(response.message || 'Login failed');
    } catch (err: any) {
      console.log('❌ Redux partnerLogin error:', err.message);
      return rejectWithValue(err.message || 'Login failed. Please try again.');
    }
  },
);

/** Load partner session from AsyncStorage on app start */
export const loadPartnerFromStorage = createAsyncThunk(
  'partnerAuth/loadFromStorage',
  async (_, { rejectWithValue }) => {
    try {
      console.log('📂 Loading partner session from storage...');
      const data = await partnerStorage.load();
      if (data) {
        console.log('✅ Partner session found:', data.partner.auth_id);
        return data;
      }
      console.log('ℹ️ No partner session found');
      return rejectWithValue('No partner session');
    } catch (err: any) {
      console.log('❌ loadPartnerFromStorage error:', err.message);
      return rejectWithValue(err.message);
    }
  },
);

/** Logout */
export const partnerLogout = createAsyncThunk(
  'partnerAuth/logout',
  async (partnerToken: string, { rejectWithValue }) => {
    // ✅ accept token as argument
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👋 Redux: partnerLogout');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      await partnerAuthApi.logout(partnerToken); // ✅ pass it through
      await partnerStorage.clear();
      console.log('✅ Partner session cleared');
      return null;
    } catch (err: any) {
      await partnerStorage.clear();
      console.warn('⚠️ partnerLogout error — forced clear:', err.message);
      return rejectWithValue(err.message);
    }
  },
);

/** Reset password using resetToken */
export const partnerResetPassword = createAsyncThunk(
  'partnerAuth/resetPassword',
  async (
    data: { resetToken: string; newPassword: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await partnerAuthApi.resetPassword(data);
      if (response.success) return response.message;
      return rejectWithValue(response.message || 'Reset failed');
    } catch (err: any) {
      return rejectWithValue(err.message || 'Reset failed. Please try again.');
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────
const partnerAuthSlice = createSlice({
  name: 'partnerAuth',
  initialState,
  reducers: {
    clearPartnerError: state => {
      state.error = null;
    },
    resetPartnerAuth: () => initialState,
  },
  extraReducers: builder => {
    // ── partnerLogin ──────────────────────────────────────────────────────
    builder
      .addCase(partnerLogin.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(partnerLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.partner = action.payload.partner;
      })
      .addCase(partnerLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ── loadPartnerFromStorage ────────────────────────────────────────────
    builder
      .addCase(loadPartnerFromStorage.pending, state => {
        state.isLoading = true;
      })
      .addCase(loadPartnerFromStorage.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.partner = action.payload.partner;
      })
      .addCase(loadPartnerFromStorage.rejected, state => {
        state.isLoading = false;
        state.isAuthenticated = false;
      });

    // ── partnerLogout ─────────────────────────────────────────────────────
    builder
      .addCase(partnerLogout.pending, state => {
        state.isLoading = true;
      })
      .addCase(partnerLogout.fulfilled, () => {
        console.log('✅ partnerLogout fulfilled — reset state');
        return initialState;
      })
      .addCase(partnerLogout.rejected, () => {
        console.log('⚠️ partnerLogout rejected — reset state anyway');
        return initialState;
      });

    // ── partnerResetPassword ──────────────────────────────────────────────
    builder
      .addCase(partnerResetPassword.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(partnerResetPassword.fulfilled, state => {
        state.isLoading = false;
      })
      .addCase(partnerResetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPartnerError, resetPartnerAuth } = partnerAuthSlice.actions;
export default partnerAuthSlice.reducer;
