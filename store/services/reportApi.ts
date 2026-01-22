// store/services/reportApi.ts
import axios, { AxiosInstance } from 'axios';
import { storage } from '../../utils/storage';
import { API_BASE_URL } from '../constant';


interface ReportResponse {
  success: boolean;
  message?: string;
  count?: number;
  data: any;
}

class ReportApiService {
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
          console.log('🔑 Report API: Token attached to request');
        } else {
          console.warn('⚠️ Report API: No token found');
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
          console.log('🔄 Report API: Token expired, attempting refresh...');

          try {
            const refreshToken = await storage.getRefreshToken();
            if (refreshToken) {
              // You can import authApi here or create a refresh endpoint
              const response = await axios.post(`${API_BASE_URL}/wa-auth/refresh-token`, {
                refreshToken,
              });
              
              const newToken = response.data.data.token;
              await storage.saveToken(newToken);
              
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              console.log('✅ Report API: Token refreshed successfully');
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            console.error('❌ Report API: Token refresh failed');
            await storage.clearAuth();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all reports for authenticated user
   */
  async getAllReports(): Promise<ReportResponse> {
    try {
      console.log('📡 API Call: GET /reports');
      const response = await this.api.get<ReportResponse>('/reports');
      console.log('📥 API Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ API Error (getAllReports):', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Get single report by ID
   */
  async getReportById(reportId: string): Promise<ReportResponse> {
    try {
      console.log(`📡 API Call: GET /reports/${reportId}`);
      const response = await this.api.get<ReportResponse>(`/reports/${reportId}`);
      console.log('📥 API Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ API Error (getReportById):', error.message);
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
      const status = error.response.status;
      
      console.error('Server Error:', {
        status,
        message,
        data: error.response.data,
      });
      
      return new Error(message);
    } else if (error.request) {
      // Request made but no response
      console.error('No response from server:', error.request);
      return new Error('No response from server. Please check your connection.');
    } else {
      // Something else happened
      console.error('Request Error:', error.message);
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export const reportApi = new ReportApiService();