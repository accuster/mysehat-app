// hooks/useApiErrorHandler.ts
// 🎯 React Hook for handling API errors with automatic toast notifications
// ✅ FIXED: Don't show toast for network errors OR session expired errors

import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { NetworkError, ApiError, SessionExpiredError } from '../utils/apiClient';

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
 * Features:
 * - Automatic error type detection (Network, API, Session)
 * - Smart toast display (skips network and session errors)
 * - Retry callbacks for retryable errors
 * - Success/error callbacks
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
        console.log('🚀 useApiErrorHandler: Executing API call...');
        const result = await apiCall();

        // Show success toast if requested
        if (showSuccessToast) {
          console.log('✅ useApiErrorHandler: Showing success toast');
          showSuccess(successMessage);
        }

        // Call success callback
        if (onSuccess) {
          console.log('✅ useApiErrorHandler: Calling success callback');
          onSuccess(result);
        }

        return result;
      } catch (error: any) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('❌ useApiErrorHandler: API call failed');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // ✅ Handle both Error objects AND strings from Redux thunks
        const errorMessage = typeof error === 'string' 
          ? error 
          : (error.message || 'An unexpected error occurred');
        
        console.log('Error message:', errorMessage);
        console.log('Error type:', typeof error);
        console.log('Error name:', error.name || 'N/A');
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ERROR TYPE DETECTION (Works with both Error objects and strings)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        const isNetworkError = 
          error instanceof NetworkError || 
          error.name === 'NetworkError' ||
          errorMessage.toLowerCase().includes('network') ||
          errorMessage.toLowerCase().includes('internet') ||
          errorMessage.toLowerCase().includes('connection') ||
          errorMessage.toLowerCase().includes('reach server') ||
          errorMessage.toLowerCase().includes('no internet') ||
          errorMessage.toLowerCase().includes('unable to reach');

        const isSessionExpiredError = 
          error instanceof SessionExpiredError ||
          error.name === 'SessionExpiredError' ||
          (typeof error === 'object' && error.statusCode === 401) ||
          errorMessage.toLowerCase().includes('session expired') ||
          errorMessage.toLowerCase().includes('session has expired') ||
          errorMessage.toLowerCase().includes('unauthorized') ||
          errorMessage.toLowerCase().includes('invalid token') ||
          errorMessage.toLowerCase().includes('token expired');

        const isApiError = 
          error instanceof ApiError || 
          error.name === 'ApiError' ||
          (typeof error === 'object' && error.statusCode !== undefined);

        console.log('Detected as NetworkError?', isNetworkError);
        console.log('Detected as SessionExpiredError?', isSessionExpiredError);
        console.log('Detected as ApiError?', isApiError);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // HANDLE DIFFERENT ERROR TYPES
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // ✅ CASE 1: Network Error - Don't show toast (Network Banner handles it)
        if (isNetworkError) {
          console.log('🔕 Network error detected - skipping toast (Network Banner shows it)');
          
          // Call error callback but don't show toast
          if (onError) {
            onError(error);
          }
          
          return null;
        }

        // ✅ CASE 2: Session Expired - Don't show toast (Auto-logout in progress)
        if (isSessionExpiredError) {
          console.log('🔒 Session expired error - skipping toast (auto-logout in progress)');
          
          // Call error callback but don't show toast
          if (onError) {
            onError(error);
          }
          
          return null;
        }

        // ✅ CASE 3: Retryable API Error - Show toast with retry button
        if (showErrorToast && isApiError && error.isRetryable && retryCallback) {
          console.log('🔄 Showing retryable API error toast with retry button');
          showError(customErrorMessage || errorMessage, {
            label: 'Retry',
            onPress: retryCallback,
          });
          
          // Call error callback
          if (onError) {
            onError(error);
          }
          
          return null;
        }

        // ✅ CASE 4: Generic Error - Show toast
        if (showErrorToast) {
          console.log('⚠️ Showing generic error toast');
          showError(customErrorMessage || errorMessage);
        }

        // Call error callback
        if (onError) {
          onError(error);
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return null;
      }
    },
    [showError, showSuccess]
  );

  /**
   * Execute multiple API calls in parallel with error handling
   * 
   * @example
   * const { executeParallelCalls } = useApiErrorHandler();
   * 
   * const [users, reports, transactions] = await executeParallelCalls([
   *   () => userApi.getAll(),
   *   () => reportApi.getAll(),
   *   () => transactionApi.getAll(),
   * ]);
   */
  const executeParallelCalls = useCallback(
    async <T = any>(
      apiCalls: Array<() => Promise<T>>,
      options: ApiCallOptions = {}
    ): Promise<(T | null)[]> => {
      console.log(`🚀 useApiErrorHandler: Executing ${apiCalls.length} parallel calls`);
      
      const results = await Promise.all(
        apiCalls.map(call => executeApiCall(call, options))
      );
      
      console.log('✅ useApiErrorHandler: Parallel calls completed');
      return results;
    },
    [executeApiCall]
  );

  /**
   * Execute API calls in sequence with error handling
   * Stops on first failure
   * 
   * @example
   * const { executeSequentialCalls } = useApiErrorHandler();
   * 
   * await executeSequentialCalls([
   *   () => step1Api.execute(),
   *   () => step2Api.execute(),
   *   () => step3Api.execute(),
   * ]);
   */
  const executeSequentialCalls = useCallback(
    async <T = any>(
      apiCalls: Array<() => Promise<T>>,
      options: ApiCallOptions = {}
    ): Promise<(T | null)[]> => {
      console.log(`🚀 useApiErrorHandler: Executing ${apiCalls.length} sequential calls`);
      const results: (T | null)[] = [];
      
      for (let i = 0; i < apiCalls.length; i++) {
        console.log(`📍 Executing call ${i + 1}/${apiCalls.length}`);
        const result = await executeApiCall(apiCalls[i], options);
        results.push(result);
        
        // Stop if a call fails
        if (result === null) {
          console.log(`❌ Call ${i + 1} failed - stopping sequence`);
          break;
        }
      }
      
      console.log('✅ useApiErrorHandler: Sequential calls completed');
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
