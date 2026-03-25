// App.tsx - WITH GLOBAL TOAST PROVIDER AND SESSION HANDLER
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { AppDispatch } from './store';
import AppNavigator from './components/navigation/AppNavigator';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { ToastProvider } from './contexts/ToastContext';

// ✅ NEW: Import session handler utilities
import { setGlobalSessionExpiredHandler, clearGlobalSessionExpiredHandler } from './utils/apiClient';
import { forceLogoutOnSessionExpired } from './store/slices/authSlice';

import {
  createNotificationChannel,
  setupNotificationHandlers,
} from './utils/notificationService';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
  'ViewPropTypes will be removed',
  'Sending `onAnimatedValueUpdate`',
]);

function AppContent() {
  const isDarkMode = useColorScheme() === 'dark';
  const dispatch = useDispatch<AppDispatch>(); // ✅ ADD THIS
  useNetworkStatus();

  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 APP INITIALIZED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Dark Mode:', isDarkMode);
    console.log('Redux Store:', store ? '✅ Connected' : '❌ Not Connected');
    console.log('Network Monitoring:', '✅ Active');
    console.log('Global Toast:', '✅ Enabled');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ✅ NEW: Register session expired handler
    console.log('🔧 Registering global session expired handler');
    setGlobalSessionExpiredHandler(() => {
      console.log('🔒 Global session expired handler triggered');
      dispatch(forceLogoutOnSessionExpired());
    });

    const initNotifications = async () => {
      try {
        console.log('🔔 Starting notification initialization...');
        await createNotificationChannel();
        setupNotificationHandlers();
        console.log('✅ Notifications ready!');
      } catch (error) {
        console.log('❌ Notification setup FAILED:', error);
      }
    };

    initNotifications();

    // ✅ Cleanup on unmount
    return () => {
      console.log('🧹 App unmounting - clearing session handler');
      clearGlobalSessionExpiredHandler();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]); 

  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="#0A0A0A"
      />
      <AppNavigator />
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;