// contexts/ToastContext.tsx
// 🌐 Global Toast Context - UPDATED with Network Banner Support

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ErrorToast from '../components/common/ErrorToast';
import NetworkBanner from '../components/common/NetworkBanner';

export type ToastType = 'error' | 'warning' | 'info' | 'success';

export interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextValue {
  // ✅ Original toast methods
  showError: (message: string, action?: { label: string; onPress: () => void }) => void;
  showWarning: (message: string, action?: { label: string; onPress: () => void }) => void;
  showInfo: (message: string, action?: { label: string; onPress: () => void }) => void;
  showSuccess: (message: string, action?: { label: string; onPress: () => void }) => void;
  hideToast: () => void;
  
  // ✅ NEW: Network banner methods
  showNetworkBanner: (message?: string) => void;
  hideNetworkBanner: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  // ✅ Original toast state
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'error',
  });

  // ✅ NEW: Network banner state
  const [networkBanner, setNetworkBanner] = useState({
    visible: false,
    message: 'Could not connect to internet',
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ORIGINAL TOAST METHODS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const showToast = useCallback(
    (message: string, type: ToastType, action?: { label: string; onPress: () => void }) => {
      console.log('🔥 GLOBAL TOAST: showToast called');
      console.log('Message:', message);
      console.log('Type:', type);
      
      setToast({
        visible: true,
        message,
        type,
        action,
      });
    },
    []
  );

  const hideToast = useCallback(() => {
    console.log('🔥 GLOBAL TOAST: hideToast called');
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const showError = useCallback(
    (message: string, action?: { label: string; onPress: () => void }) => {
      showToast(message, 'error', action);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, action?: { label: string; onPress: () => void }) => {
      showToast(message, 'warning', action);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, action?: { label: string; onPress: () => void }) => {
      showToast(message, 'info', action);
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string, action?: { label: string; onPress: () => void }) => {
      showToast(message, 'success', action);
    },
    [showToast]
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NEW: NETWORK BANNER METHODS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const showNetworkBanner = useCallback((message?: string) => {
    console.log('🔴 NETWORK BANNER: Showing');
    setNetworkBanner({
      visible: true,
      message: message || 'Could not connect to internet',
    });
  }, []);

  const hideNetworkBanner = useCallback(() => {
    console.log('🟢 NETWORK BANNER: Hiding');
    setNetworkBanner(prev => ({ ...prev, visible: false }));
  }, []);

  const value: ToastContextValue = {
    showError,
    showWarning,
    showInfo,
    showSuccess,
    hideToast,
    showNetworkBanner,
    hideNetworkBanner,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* ✅ Global ErrorToast - Modal style */}
      <ErrorToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
        action={toast.action}
      />

      {/* ✅ NEW: Global NetworkBanner - Top banner style */}
      <NetworkBanner
        visible={networkBanner.visible}
        message={networkBanner.message}
      />
    </ToastContext.Provider>
  );
}

/**
 * Hook to access global toast from anywhere in the app
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}