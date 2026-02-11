// store/services/authApi.ts
import axios, { AxiosInstance } from 'axios';
import { LoginResponse, CompleteProfileRequest, CompleteProfileResponse } from '../../types/auth.types';
import { storage } from '../../utils/storage';
import { API_BASE_URL } from '../constant';

// Service for authentication-related API calls
class AuthApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await storage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If token expired, try to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await storage.getRefreshToken();
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              await storage.saveToken(response.data.token);
              originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            await storage.clearAuth();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Verify login with MSG91 access token
   */
  async verifyLogin(accessToken: string, mobile: string): Promise<LoginResponse> {
    try {
      const response = await this.api.post<LoginResponse>('/wa-auth/verify-login', {
        accessToken,
        mobile,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Complete user profile
   */
  async completeProfile(data: CompleteProfileRequest): Promise<CompleteProfileResponse> {
    try {
      const response = await this.api.post<CompleteProfileResponse>('/wa-auth/complete-profile', data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<any> {
    try {
      const response = await this.api.post('/wa-auth/refresh-token', {
        refreshToken,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await this.api.post('/wa-auth/logout');
      await storage.clearAuth();
    } catch (error: any) {
      // Even if API call fails, clear local storage
      await storage.clearAuth();
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.message || 'An error occurred';
      return new Error(message);
    } else if (error.request) {
      // Request made but no response
      return new Error('No response from server. Please check your connection.');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export const authApi = new AuthApiService();