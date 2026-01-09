// store/services/transactionApi.ts
import axios, { AxiosInstance } from 'axios';
import { storage } from '../../utils/storage';

// Your backend API URL - SAME AS REPORTS API
const API_BASE_URL = 'https://sandbox.mysehat.ai/api';

interface TransactionResponse {
  success: boolean;
  message?: string;
  count?: number;
  data: any;
}

class TransactionApiService {
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
          console.log('🔑 Transaction API: Token attached to request');
        } else {
          console.warn('⚠️ Transaction API: No token found');
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
          console.log('🔄 Transaction API: Token expired, attempting refresh...');

          try {
            const refreshToken = await storage.getRefreshToken();
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/wa-auth/refresh-token`, {
                refreshToken,
              });
              
              const newToken = response.data.data.token;
              await storage.saveToken(newToken);
              
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              console.log('✅ Transaction API: Token refreshed successfully');
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            console.error('❌ Transaction API: Token refresh failed');
            await storage.clearAuth();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all transactions for authenticated user
   */
  async getAllTransactions(): Promise<TransactionResponse> {
    try {
      console.log('📡 API Call: GET /transactions');
      const response = await this.api.get<TransactionResponse>('/transactions');
      console.log('📥 API Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ API Error (getAllTransactions):', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Get single transaction by ID
   */
  async getTransactionById(transactionId: string): Promise<TransactionResponse> {
    try {
      console.log(`📡 API Call: GET /transactions/${transactionId}`);
      const response = await this.api.get<TransactionResponse>(`/transactions/${transactionId}`);
      console.log('📥 API Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ API Error (getTransactionById):', error.message);
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

export const transactionApi = new TransactionApiService();