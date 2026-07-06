// App.tsx - WITH GLOBAL TOAST PROVIDER, SESSION HANDLER & IN-APP UPDATE BANNER
import React, { useEffect } from 'react';
import {
  StatusBar,
  useColorScheme,
  LogBox,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { AppDispatch } from './store';
import AppNavigator from './components/navigation/AppNavigator';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { ToastProvider } from './contexts/ToastContext';

// ✅ NEW: In-App Update
import InAppUpdateBanner from './components/common/InAppUpdateBanner';
import { useInAppUpdate } from './hooks/useInAppUpdate';

import BluetoothEventBridge from './components/common/BluetoothEventBridge';

// ✅ Session handler utilities
import {
  setGlobalSessionExpiredHandler,
  clearGlobalSessionExpiredHandler,
} from './utils/apiClient';
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
  const dispatch = useDispatch<AppDispatch>();
  useNetworkStatus();

  // ✅ NEW: In-App Update hook
  const { status, progress, startUpdate, installUpdate, dismissBanner } =
    useInAppUpdate();

  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 APP INITIALIZED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Dark Mode:', isDarkMode);
    console.log('Redux Store:', store ? '✅ Connected' : '❌ Not Connected');
    console.log('Network Monitoring:', '✅ Active');
    console.log('Global Toast:', '✅ Enabled');
    console.log('In-App Updates:', '✅ Enabled');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ✅ Register session expired handler
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
    <View style={styles.root}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="#0A0A0A"
      />

      {/* ── Main App ── */}
      <AppNavigator />

      {/* ── In-App Update Banner (floats above everything) ── */}
      <InAppUpdateBanner
        status={status}
        progress={progress}
        onUpdate={startUpdate}
        onInstall={installUpdate}
        onDismiss={dismissBanner}
      />
    </View>
  );
}

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <ToastProvider>
            <BluetoothEventBridge />
            <AppContent />
          </ToastProvider>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
