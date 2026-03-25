// utils/apiClient.ts
// 🌐 GLOBAL API CLIENT - FIXED: Token rotation + proper refresh token save
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
 * Session expired error - Triggers automatic logout
 */
export class SessionExpiredError extends Error {
  constructor(message: string = 'Session expired') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

/**
 * Global session expired callback
 * Set from App.tsx to handle logout
 */
let globalSessionExpiredHandler: (() => void) | null = null;

export function setGlobalSessionExpiredHandler(handler: () => void) {
  console.log('🔧 Setting global session expired handler');
  globalSessionExpiredHandler = handler;
}

export function clearGlobalSessionExpiredHandler() {
  console.log('🔧 Clearing global session expired handler');
  globalSessionExpiredHandler = null;
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
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline =
        state.isConnected === true && state.isInternetReachable !== false;

      if (wasOnline !== this.isOnline) {
        console.log(
          `📡 Network state changed: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`
        );
        this.notifyListeners();
      }
    });

    NetInfo.fetch().then(state => {
      this.isOnline =
        state.isConnected === true && state.isInternetReachable !== false;
      console.log(
        `📡 Initial network state: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`
      );
    });
  }

  public async checkConnectivity(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      this.isOnline =
        state.isConnected === true && state.isInternetReachable !== false;
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

export const networkManager = new NetworkManager();

/**
 * Global API Client with proper session handling and token rotation
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
    // ─── REQUEST INTERCEPTOR ──────────────────────────────────────────────
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📤 API REQUEST');
        console.log('URL:', config.url);
        console.log('Method:', config.method?.toUpperCase());

        // 1. Check network connectivity
        const isOnline = await networkManager.checkConnectivity();
        if (!isOnline) {
          console.log('❌ No internet connection - aborting request');
          throw new NetworkError(
            'No internet connection. Please check your WiFi or mobile data.',
            true
          );
        }

        // 2. Attach auth token (skip for refresh endpoint)
        if (!config.url?.includes('/wa-auth/refresh-token')) {
          const token = await storage.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('🔑 Token attached');
          }
        }

        return config;
      },
      error => {
        console.log('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // ─── RESPONSE INTERCEPTOR ─────────────────────────────────────────────
    this.instance.interceptors.response.use(
      response => {
        console.log('✅ API SUCCESS');
        console.log('Status:', response.status);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('❌ API ERROR');
        console.log('URL:', originalRequest?.url);
        console.log('Status:', error.response?.status);
        console.log('Message:', error.message);

        // Handle network errors (no response from server)
        if (!error.response) {
          console.log('⚠️ Network error - no response received');
          throw new NetworkError(
            'Unable to reach server. Please check your internet connection.',
            true
          );
        }

        const status = error.response.status;

        // ─── Handle 401 Unauthorized ───────────────────────────────────────
        if (status === 401 && originalRequest && !originalRequest._retry) {

          // Don't retry if this IS the refresh token endpoint - session is dead  ---> remember to clear tokens and force logout
          if (originalRequest.url?.includes('/wa-auth/refresh-token')) {
            console.log('❌ Refresh token endpoint returned 401 - session expired');
            await this.handleSessionExpired();
            throw new SessionExpiredError();
          }

          // Queue concurrent requests while a refresh is already in progress
          if (this.isRefreshing) {
            console.log('🔄 Already refreshing - queueing request');
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
              console.log('❌ No refresh token available');
              throw new Error('No refresh token available');
            }

            // Use raw axios (not this.instance) to prevent interceptor loop
            const response = await axios.post(
              `${API_BASE_URL}/wa-auth/refresh-token`,
              { refreshToken },
              {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000,
              }
            );

            if (!response.data?.accessToken) {
              throw new Error('No access token received from refresh');
            }

            const newAccessToken = response.data.accessToken;

            // ✅ FIX: Save new access token
            await storage.saveToken(newAccessToken);
            console.log('✅ New access token saved');

            // ✅ FIX: Save rotated refresh token if server returned one
            if (response.data.refreshToken) {
              await storage.saveRefreshToken(response.data.refreshToken);
              console.log('✅ Rotated refresh token saved');
            }

            console.log('✅ Token refresh successful');

            // Flush queued requests with new token
            this.failedQueue.forEach(({ resolve }) => resolve(newAccessToken));
            this.failedQueue = [];

            // Retry the original failed request with new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.instance(originalRequest);

          } catch (refreshError: any) {
            console.log('❌ Token refresh failed:', refreshError.message);

            // Reject all queued requests
            this.failedQueue.forEach(({ reject }) => reject(refreshError));
            this.failedQueue = [];

            await this.handleSessionExpired();
            throw new SessionExpiredError();
          } finally {
            this.isRefreshing = false;
          }
        }

        // ─── Handle other HTTP errors ──────────────────────────────────────
        const errorMessage = this.extractErrorMessage(error);
        throw new ApiError(
          errorMessage,
          status,
          status >= 500 // Server errors are retryable
        );
      }
    );
  }

  /**
   * Handle session expiration - clear storage and notify app
   */
  private async handleSessionExpired() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔒 SESSION EXPIRED - CLEANING UP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await storage.clearAuth();

    if (globalSessionExpiredHandler) {
      console.log('📢 Calling global session expired handler');
      globalSessionExpiredHandler();
    } else {
      console.log('⚠️ No global session expired handler registered!');
    }
  }

  private extractErrorMessage(error: AxiosError): string {
    const data = error.response?.data as any;

    if (data?.message) return data.message;
    if (data?.error) return data.error;

    switch (error.response?.status) {
      case 400: return 'Invalid request. Please check your input.';
      case 403: return 'You do not have permission to perform this action.';
      case 404: return 'The requested resource was not found.';
      case 500: return 'Server error. Please try again later.';
      case 503: return 'Service temporarily unavailable. Please try again.';
      default:  return 'An unexpected error occurred. Please try again.';
    }
  }

  // ─── HTTP Methods ──────────────────────────────────────────────────────

  public async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  public async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  public async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  public async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  public async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }

  public getAxiosInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiClient = new ApiClient();
export default apiClient.getAxiosInstance();