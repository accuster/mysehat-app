// hooks/useNetworkStatus.ts
// 🌐 Network Status Hook - UPDATED to use NetworkBanner instead of modal toast

import { useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useToast } from '../contexts/ToastContext';

export function useNetworkStatus() {
  const { showNetworkBanner, hideNetworkBanner } = useToast();
  const previousConnectionState = useRef<boolean | null>(null);
  const hasShownInitialBanner = useRef(false);

  const handleConnectionChange = useCallback(
    (state: any) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;

      console.log('📡 Network state changed:', {
        isConnected,
        previous: previousConnectionState.current,
        hasShownInitial: hasShownInitialBanner.current,
      });

      // ✅ Only handle banner if connection state ACTUALLY changed
      if (previousConnectionState.current !== null) {
        if (!isConnected && previousConnectionState.current === true) {
          // ❌ Lost connection - SHOW RED BANNER
          console.log('🔴 Network LOST - showing banner');
          showNetworkBanner();
        } else if (isConnected && previousConnectionState.current === false) {
          // ✅ Connection restored - HIDE RED BANNER (no green banner)
          console.log('🟢 Network RESTORED - hiding banner');
          hideNetworkBanner();
        }
      } else if (!isConnected && !hasShownInitialBanner.current) {
        // ✅ Show banner ONCE on initial mount if no connection
        console.log('🔴 Initial mount - no internet');
        showNetworkBanner();
        hasShownInitialBanner.current = true;
      }

      previousConnectionState.current = isConnected;
    },
    [showNetworkBanner, hideNetworkBanner]
  );

  useEffect(() => {
    console.log('📡 useNetworkStatus: Setting up network listener');

    // Check initial connection state
    NetInfo.fetch().then((state) => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      previousConnectionState.current = isConnected;
      
      // ✅ Show banner only if no connection on mount
      if (!isConnected && !hasShownInitialBanner.current) {
        console.log('🔴 No internet on mount - showing banner');
        showNetworkBanner();
        hasShownInitialBanner.current = true;
      }
    });

    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener(handleConnectionChange);

    return () => {
      console.log('📡 useNetworkStatus: Cleaning up network listener');
      unsubscribe();
    };
  }, [handleConnectionChange, showNetworkBanner]);
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
    console.log('❌ Error checking network connectivity:', error);
    return false;
  }
}