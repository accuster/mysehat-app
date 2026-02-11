// utils/apiClient.ts
// 🌐 GLOBAL API CLIENT - Single source of truth for all API calls
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { storage } from './storage';
import { API_BASE_URL } from '../store/constant';

/**
 * Custom error class for network-related errors
 */
export class NetworkError extends Error {
  constructor(message: string, public isRetryable: boolean = true) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string, 
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Network state manager
 */
class NetworkManager {
  private isOnline: boolean = true;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Listen for network state changes
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
      
      // Notify listeners if state changed
      if (wasOnline !== this.isOnline) {
        console.log(`📡 Network state changed: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
        this.notifyListeners();
      }
    });

    // Check initial state
    NetInfo.fetch().then(state => {
      this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
      console.log(`📡 Initial network state: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
    });
  }

  public async checkConnectivity(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected === true && state.isInternetReachable !== false;
      return this.isOnline;
    } catch (error) {
      console.log('⚠️ Error checking network:', error);
      return false;
    }
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  public subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }
}

// Singleton instance
export const networkManager = new NetworkManager();

/**
 * Global API Client with smart error handling
 */
class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // ✅ REQUEST INTERCEPTOR
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📤 API REQUEST');
        console.log('URL:', config.url);
        console.log('Method:', config.method?.toUpperCase());
        
        // 1. Check network connectivity BEFORE making request
        const isOnline = await networkManager.checkConnectivity();
        if (!isOnline) {
          console.log('❌ No internet connection - aborting request');
          throw new NetworkError(
            'No internet connection. Please check your WiFi or mobile data.',
            true
          );
        }

        // 2. Attach auth token
        const token = await storage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔑 Token attached');
        }

        return config;
      },
      (error) => {
        console.log('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // ✅ RESPONSE INTERCEPTOR
    this.instance.interceptors.response.use(
      (response) => {
        console.log('✅ API SUCCESS');
        console.log('Status:', response.status);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('❌ API ERROR');
        console.log('URL:', originalRequest?.url);
        console.log('Status:', error.response?.status);
        console.log('Message:', error.message);

        // Handle different error types
        if (!error.response) {
          // Network error (no response from server)
          console.log('⚠️ Network error - no response received');
          throw new NetworkError(
            'Unable to reach server. Please check your internet connection.',
            true
          );
        }

        const status = error.response.status;

        // Handle 401 Unauthorized - Token expired
        if (status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(token => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.instance(originalRequest);
              })
              .catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            console.log('🔄 Token expired - attempting refresh...');
            const refreshToken = await storage.getRefreshToken();
            
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            // Call refresh token endpoint
            const response = await axios.post(`${API_BASE_URL}/wa-auth/refresh-token`, {
              refreshToken,
            });

            const newToken = response.data.accessToken;
            await storage.saveToken(newToken);

            console.log('✅ Token refreshed successfully');

            // Process queued requests
            this.failedQueue.forEach(({ resolve }) => resolve(newToken));
            this.failedQueue = [];

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            console.log('❌ Token refresh failed');
            
            // Clear auth and reject queued requests
            await storage.clearAuth();
            this.failedQueue.forEach(({ reject }) => reject(refreshError));
            this.failedQueue = [];

            throw new ApiError(
              'Your session has expired. Please login again.',
              401,
              false
            );
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other HTTP errors
        const errorMessage = this.extractErrorMessage(error);
        
        throw new ApiError(
          errorMessage,
          status,
          status >= 500 // Server errors are retryable
        );
      }
    );
  }

  private extractErrorMessage(error: AxiosError): string {
    const data = error.response?.data as any;
    
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    
    // Default messages based on status code
    const status = error.response?.status;
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Make a GET request
   */
  public async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  /**
   * Make a POST request
   */
  public async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a PUT request
   */
  public async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a PATCH request
   */
  public async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request
   */
  public async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }

  /**
   * Get raw axios instance for advanced usage
   */
  public getAxiosInstance(): AxiosInstance {
    return this.instance;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export default axios instance for backward compatibility
export default apiClient.getAxiosInstance();