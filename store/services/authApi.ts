/* eslint-disable @typescript-eslint/no-unused-vars */
// store/services/authApi.ts
// ✅ UPDATED: Using global apiClient for consistent error handling
import { apiClient } from '../../utils/apiClient';
import { storage } from '../../utils/storage';
import { 
  LoginResponse, 
  CompleteProfileRequest, 
  CompleteProfileResponse 
} from '../../types/auth.types';

/**
 * Service for authentication-related API calls
 * Now using global apiClient for consistent error handling
 */
class AuthApiService {
  /**
   * Verify login with MSG91 access token
   * POST /api/wa-auth/verify-login
   */
  async verifyLogin(accessToken: string, mobile: string): Promise<LoginResponse> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 AuthAPI: Verify Login');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Mobile:', mobile);
    console.log('Access Token (first 20):', accessToken.substring(0, 20) + '...');

    const response = await apiClient.post<LoginResponse>(
      '/wa-auth/verify-login',
      {
        accessToken,
        mobile,
      }
    );

    console.log('✅ Login verified successfully');
    console.log('User ID:', response.user?.user_id);
    console.log('Requires profile setup:', response.requiresProfileSetup);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return response;
  }

  /**
   * Complete user profile
   * POST /api/wa-auth/complete-profile
   */
  async completeProfile(data: CompleteProfileRequest): Promise<CompleteProfileResponse> {
    console.log('📝 AuthAPI: Complete Profile');
    console.log('Data:', {
      fullName: data.fullName,
      age: data.age,
      gender: data.gender,
    });

    const response = await apiClient.post<CompleteProfileResponse>(
      '/wa-auth/complete-profile',
      data
    );

    console.log('✅ Profile completed successfully');

    return response;
  }

  /**
   * Refresh access token
   * POST /api/wa-auth/refresh-token
   * 
   * NOTE: This is called automatically by apiClient interceptor
   * You typically don't need to call this manually
   */
  async refreshToken(refreshToken: string): Promise<any> {
    console.log('🔄 AuthAPI: Refresh Token');

    const response = await apiClient.post('/wa-auth/refresh-token', {
      refreshToken,
    });

    console.log('✅ Token refreshed successfully');

    return response;
  }

  /**
   * Logout
   * POST /api/wa-auth/logout
   */
  async logout(): Promise<void> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👋 AuthAPI: Logout');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      // Call logout API
      await apiClient.post('/wa-auth/logout');
      console.log('✅ Logout API call successful');
    } catch (error) {
      console.log('❌ Logout API call failed:', error);
      console.log('⚠️ Logout API failed, but continuing with local cleanup');
    } 
  }
}

export const authApi = new AuthApiService();