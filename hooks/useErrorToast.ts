// hooks/useErrorToast.ts
import { useState, useCallback } from 'react';

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

export interface ShowToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function useErrorToast() {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'error',
  });

  const showToast = useCallback(
    ({ message, type = 'error', action }: ShowToastOptions) => {
      setToast({
        visible: true,
        message,
        type,
        action,
      });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  // Convenience methods
  const showError = useCallback(
    (message: string, action?: { label: string; onPress: () => void }) => {
      showToast({ message, type: 'error', action });
    },
    [showToast],
  );

  const showWarning = useCallback(
    (message: string, action?: { label: string; onPress: () => void }) => {
      showToast({ message, type: 'warning', action });
    },
    [showToast],
  );

  const showInfo = useCallback(
    (message: string, action?: { label: string; onPress: () => void }) => {
      showToast({ message, type: 'info', action });
    },
    [showToast],
  );

  const showSuccess = useCallback(
    (message: string, action?: { label: string; onPress: () => void }) => {
      showToast({ message, type: 'success', action });
    },
    [showToast],
  );

  return {
    toast,
    showToast,
    hideToast,
    showError,
    showWarning,
    showInfo,
    showSuccess,
  };
}
