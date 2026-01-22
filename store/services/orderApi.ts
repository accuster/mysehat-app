// store/services/orderApi.ts
import axios, { AxiosInstance } from 'axios';
import { storage } from '../../utils/storage';
import { API_BASE_URL } from '../constant';


interface OrderResponse {
  success: boolean;
  message?: string;
  count?: number;
  data: any;
}

interface CreateOrderPayload {
  timestamp: string;
  user_id?: string; // ✅ Optional
  raw_payload: string;
  mobile_number: string;
}

class OrderApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000, // 15 seconds for QR processing
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
          console.log('🔑 Order API: Token attached to request');
        } else {
          console.warn('⚠️ Order API: No token found');
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
          console.log('🔄 Order API: Token expired, attempting refresh...');

          try {
            const refreshToken = await storage.getRefreshToken();
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/wa-auth/refresh-token`, {
                refreshToken,
              });
              
              const newToken = response.data.accessToken;
              await storage.saveToken(newToken);
              
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              console.log('✅ Order API: Token refreshed successfully');
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            console.error('❌ Order API: Token refresh failed');
            await storage.clearAuth();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Create order from QR scan
   * POST /api/orders/create
   */
  async createOrder(payload: CreateOrderPayload): Promise<OrderResponse> {
    try {
      console.log('📡 API Call: POST /orders/create');
      console.log('User ID:', payload.user_id || 'NOT SET');
      console.log('Mobile:', payload.mobile_number);
      console.log('Payload length:', payload.raw_payload?.length);
      
      // ✅ Convert undefined to null for MySQL
      const requestData = {
        ...payload,
        user_id: payload.user_id || null, // Convert undefined to null
      };
      
      const response = await this.api.post<OrderResponse>('/orders/create', requestData);
      
      console.log('📥 API Response:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ API Error (createOrder):', error.message);
      
      if (error.response) {
        console.error('Server Error:', {
          status: error.response.status,
          message: error.response.data?.message,
          data: error.response.data,
        });
      }
      
      throw this.handleError(error);
    }
  }

  /**
   * Get order by ID
   * GET /api/orders/:orderId
   */
  async getOrderById(orderId: string): Promise<OrderResponse> {
    try {
      console.log(`📡 API Call: GET /orders/${orderId}`);
      
      const response = await this.api.get<OrderResponse>(`/orders/${orderId}`);
      
      console.log('📥 API Response:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ API Error (getOrderById):', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Get all orders for a user
   * GET /api/orders/user/:userId
   */
  async getUserOrders(userId: string): Promise<OrderResponse> {
    try {
      console.log(`📡 API Call: GET /orders/user/${userId}`);
      
      const response = await this.api.get<OrderResponse>(`/orders/user/${userId}`);
      
      console.log('📥 API Response:', response.data);
      console.log(`Found ${response.data.count} orders`);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ API Error (getUserOrders):', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Update order with selected user_id
   * PUT /api/orders/:orderId/user
   */
  async updateOrderUser(orderId: string, userId: string): Promise<OrderResponse> {
    try {
      console.log(`📡 API Call: PUT /orders/${orderId}/user`);
      console.log('User ID:', userId);
      
      const response = await this.api.put<OrderResponse>(`/orders/${orderId}/user`, {
        user_id: userId
      });
      
      console.log('📥 API Response:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ API Error (updateOrderUser):', error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.message || 
                     error.response.data?.error || 
                     'An error occurred';
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

export const orderApi = new OrderApiService();