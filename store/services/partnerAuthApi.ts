// store/services/partnerAuthApi.ts
import { apiClient } from '../../utils/apiClient';

export interface PartnerLoginRequest {
  email: string;
  password: string;
}

export interface PartnerInfo {
  auth_id: string;
  username: string;
  email: string;
  role: string;
  org_id: string | null;
  status: string;
}

export interface PartnerLoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  partner: PartnerInfo;
}

export interface PartnerRefreshResponse {
  success: boolean;
  message: string;
  accessToken: string;
}

export interface PartnerResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

class PartnerAuthApiService {
  /**
   * POST /api/v1/partner-auth/login
   */
  async login(data: PartnerLoginRequest): Promise<PartnerLoginResponse> {
    console.log('🔐 PartnerAuthAPI: Login → ', data.email);
    const response = await apiClient.post<PartnerLoginResponse>(
      '/partner-auth/login',
      data,
    );
    console.log(
      '✅ PartnerAuthAPI: Login success →',
      response.partner?.auth_id,
    );
    return response;
  }

  /**
   * POST /api/v1/partner-auth/refresh-token
   */
  async refreshToken(refreshToken: string): Promise<PartnerRefreshResponse> {
    console.log('🔄 PartnerAuthAPI: Refreshing token...');
    const response = await apiClient.post<PartnerRefreshResponse>(
      '/partner-auth/refresh-token',
      { refreshToken },
    );
    console.log('✅ PartnerAuthAPI: Token refreshed');
    return response;
  }

  /**
   * POST /api/v1/partner-auth/reset-password
   */
  async resetPassword(
    data: PartnerResetPasswordRequest,
  ): Promise<{ success: boolean; message: string }> {
    console.log('🔑 PartnerAuthAPI: Resetting password...');
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>('/partner-auth/reset-password', data);
    console.log('✅ PartnerAuthAPI: Password reset success');
    return response;
  }

  /**
   * GET /api/v1/partner-auth/partner-validate
   * Validates partner token — called from SplashScreen
   * Manually passes partner token since apiClient uses user token key
   */
  async validateToken(partnerToken: string): Promise<{ success: boolean }> {
    console.log('🔍 PartnerAuthAPI: Validating token...');
    const response = await apiClient.get<{ success: boolean }>(
      '/partner-auth/partner-validate',
      {
        headers: {
          Authorization: `Bearer ${partnerToken}`,
        },
      },
    );
    console.log('✅ PartnerAuthAPI: Token valid');
    return response;
  }

  /**
   * POST /api/v1/partner-auth/logout
   */
  async logout(partnerToken: string): Promise<void> {
    console.log('👋 PartnerAuthAPI: Logout...');
    try {
      await apiClient.post(
        '/partner-auth/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${partnerToken}`, // ✅ use partner token explicitly
          },
        },
      );
      console.log('✅ PartnerAuthAPI: Logout success');
    } catch (err) {
      console.warn(
        '⚠️ PartnerAuthAPI: Logout API failed, continuing local cleanup',
      );
      console.warn('Error:', err);
    }
  }
}

export const partnerAuthApi = new PartnerAuthApiService();
