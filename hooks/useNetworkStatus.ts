// hooks/useNetworkStatus.ts
import { useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useErrorToast } from './useErrorToast';

export function useNetworkStatus() {
  const { showError, showInfo } = useErrorToast();
  const previousConnectionState = useRef<boolean | null>(null);

  const handleConnectionChange = useCallback(
    (state: any) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;

      // Only show toast if connection state actually changed
      // This prevents duplicate toasts on mount
      if (previousConnectionState.current !== null) {
        if (!isConnected && previousConnectionState.current === true) {
          // Lost connection
          showError('No internet connection. Please check your network.');
        } else if (isConnected && previousConnectionState.current === false) {
          // Connection restored
          showInfo('Internet connection restored.');
        }
      }

      previousConnectionState.current = isConnected;
    },
    [showError, showInfo]
  );

  useEffect(() => {
    // Check initial connection state
    NetInfo.fetch().then((state) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      previousConnectionState.current = isConnected;
      
      // Only show error on mount if no connection
      if (!isConnected) {
        showError('No internet connection. Please check your network.');
      }
    });

    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener(handleConnectionChange);

    return () => {
      unsubscribe();
    };
  }, [handleConnectionChange, showError]);
}

/**
 * Utility function to check network connectivity before making API calls
 * Usage: const isOnline = await checkNetworkConnectivity();
 */
export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch (error) {
    console.log('Error checking network connectivity:', error);
    return false;
  }
}