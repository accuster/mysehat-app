// hooks/useApiErrorHandler.ts
// 🎯 React Hook for handling API errors with automatic toast notifications
// ✅ FIXED: Don't show toast for network errors (Network Banner handles it)

import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { NetworkError, ApiError } from '../utils/apiClient';

export interface ApiCallOptions {
  showSuccessToast?: boolean;
  successMessage?: string;
  showErrorToast?: boolean;
  customErrorMessage?: string;
  retryCallback?: () => void;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for handling API calls with automatic error handling and toast notifications
 * 
 * @example
 * const { executeApiCall } = useApiErrorHandler();
 * 
 * const fetchData = async () => {
 *   return executeApiCall(
 *     () => reportApi.getAllReports(),
 *     {
 *       showSuccessToast: false,
 *       showErrorToast: true,
 *       retryCallback: fetchData
 *     }
 *   );
 * };
 */
export function useApiErrorHandler() {
  const { showError, showSuccess } = useToast();

  /**
   * Execute an API call with automatic error handling
   */
  const executeApiCall = useCallback(
    async <T = any>(
      apiCall: () => Promise<T>,
      options: ApiCallOptions = {}
    ): Promise<T | null> => {
      const {
        showSuccessToast = false,
        successMessage = 'Operation completed successfully',
        showErrorToast = true,
        customErrorMessage,
        retryCallback,
        onSuccess,
        onError,
      } = options;

      try {
        console.log('🚀 Executing API call...');
        const result = await apiCall();

        // Show success toast if requested
        if (showSuccessToast) {
          showSuccess(successMessage);
        }

        // Call success callback
        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (error: any) {
        // ✅ FIX: Handle both Error objects AND strings from Redux thunks
        const errorMessage = typeof error === 'string' 
          ? error 
          : (error.message || 'An unexpected error occurred');
        
        console.log('❌ API call failed:', errorMessage);
        console.log('Error type:', typeof error);
        console.log('Is NetworkError?', error instanceof NetworkError);
        console.log('Is ApiError?', error instanceof ApiError);

        // ✅ FIX: Check error type more reliably (works with strings too!)
        const isNetworkError = 
          error instanceof NetworkError || 
          error.name === 'NetworkError' ||
          errorMessage.toLowerCase().includes('network') ||
          errorMessage.toLowerCase().includes('internet') ||
          errorMessage.toLowerCase().includes('connection') ||
          errorMessage.toLowerCase().includes('reach server');

        const isApiError = 
          error instanceof ApiError || 
          error.name === 'ApiError' ||
          (typeof error === 'object' && error.statusCode !== undefined);

        const isSessionExpired = 
          (typeof error === 'object' && error.statusCode === 401) ||
          errorMessage.toLowerCase().includes('session') ||
          errorMessage.toLowerCase().includes('expired') ||
          errorMessage.toLowerCase().includes('unauthorized');

        console.log('Detected as network error?', isNetworkError);
        console.log('Detected as API error?', isApiError);
        console.log('Detected as session expired?', isSessionExpired);

        // ✅ NEW: Don't show toast for network errors (Network Banner already shows it)
        if (isNetworkError) {
          console.log('🔕 Network error detected - skipping toast (Network Banner will show it)');
          
          // Call error callback but don't show toast
          if (onError) {
            onError(error);
          }
          
          return null;
        }

        // Handle other errors based on type
        if (showErrorToast) {
          if (isSessionExpired) {
            // Session expired
            console.log('🔒 Showing session expired toast');
            showError('Your session has expired. Please login again.');
          } else if (isApiError && error.isRetryable && retryCallback) {
            // Retryable API error - offer retry
            console.log('🔄 Showing retryable API error toast');
            showError(customErrorMessage || errorMessage, {
              label: 'Retry',
              onPress: retryCallback,
            });
          } else {
            // Generic error
            console.log('⚠️ Showing generic error toast');
            showError(customErrorMessage || errorMessage);
          }
        }

        // Call error callback
        if (onError) {
          onError(error);
        }

        return null;
      }
    },
    [showError, showSuccess]
  );

  /**
   * Execute multiple API calls in parallel with error handling
   */
  const executeParallelCalls = useCallback(
    async <T = any>(
      apiCalls: Array<() => Promise<T>>,
      options: ApiCallOptions = {}
    ): Promise<(T | null)[]> => {
      const results = await Promise.all(
        apiCalls.map(call => executeApiCall(call, options))
      );
      return results;
    },
    [executeApiCall]
  );

  /**
   * Execute API calls in sequence with error handling
   */
  const executeSequentialCalls = useCallback(
    async <T = any>(
      apiCalls: Array<() => Promise<T>>,
      options: ApiCallOptions = {}
    ): Promise<(T | null)[]> => {
      const results: (T | null)[] = [];
      
      for (const call of apiCalls) {
        const result = await executeApiCall(call, options);
        results.push(result);
        
        // Stop if a call fails
        if (result === null) {
          break;
        }
      }
      
      return results;
    },
    [executeApiCall]
  );

  return {
    executeApiCall,
    executeParallelCalls,
    executeSequentialCalls,
  };
}