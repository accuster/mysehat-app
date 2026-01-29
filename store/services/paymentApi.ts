// store/services/paymentApi.ts
import axios, { AxiosInstance } from 'axios';
import { storage } from '../../utils/storage';
import { API_BASE_URL } from '../constant';


interface PaymentResponse {
  success: boolean;
  message?: string;
  data: any;
}

interface CreatePaymentData {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  order_id: string;
  test_fee: number;
}

interface VerifyPaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

class PaymentApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
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
          console.log('🔑 Payment API: Token attached');
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
              const response = await axios.post(`${API_BASE_URL}/wa-auth/refresh-token`, {
                refreshToken,
              });
              
              const newToken = response.data.accessToken;
              await storage.saveToken(newToken);
              
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            await storage.clearAuth();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Create Razorpay payment order
   * POST /api/orders/:orderId/create-payment
   */
  async createPayment(orderId: string): Promise<PaymentResponse> {
    try {
      console.log(`📡 API Call: POST /orders/${orderId}/create-payment`);
      
      const response = await this.api.post<PaymentResponse>(
        `/orders/${orderId}/create-payment`
      );
      
      console.log('📥 API Response:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.log('❌ API Error (createPayment):', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Verify Razorpay payment
   * POST /api/orders/:orderId/verify-payment
   */
  async verifyPayment(orderId: string, paymentData: VerifyPaymentData): Promise<PaymentResponse> {
    try {
      console.log(`📡 API Call: POST /orders/${orderId}/verify-payment`);
      console.log('Payment data:', {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        signature: paymentData.razorpay_signature.substring(0, 20) + '...'
      });
      
      const response = await this.api.post<PaymentResponse>(
        `/orders/${orderId}/verify-payment`,
        paymentData
      );
      
      console.log('📥 API Response:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.log('❌ API Error (verifyPayment):', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (error.response) {
      const message = error.response.data?.message || 
                     error.response.data?.error || 
                     'An error occurred';
      const status = error.response.status;
      
      console.log('Server Error:', {
        status,
        message,
        data: error.response.data,
      });
      
      return new Error(message);
    } else if (error.request) {
      console.log('No response from server:', error.request);
      return new Error('No response from server. Please check your connection.');
    } else {
      console.log('Request Error:', error.message);
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export const paymentApi = new PaymentApiService();
export type { CreatePaymentData, VerifyPaymentData };