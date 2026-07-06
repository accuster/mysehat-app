// App.tsx - WITH GLOBAL TOAST PROVIDER, SESSION HANDLER, IN-APP UPDATE BANNER
//          & BMI REPORT OFFLINE SYNC ENGINE
import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  useColorScheme,
  LogBox,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { AppDispatch, RootState } from './store';
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

// ✅ NEW: Offline-first BMI report sync engine
import { initLocalDb } from './utils/localDb';
import { bmiReportSyncManager } from './store/services/BmiReportSyncManager';

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

  // ✅ NEW: Watch partner auth state — drives sync engine lifecycle.
  // ⚠️  VERIFY this selector path against store/slices/partnerAuthSlice.ts.
  //     If your slice puts the auth_id elsewhere (e.g. state.partnerAuth.user.auth_id
  //     or state.partnerAuth.admin.auth_id), update the path here.
  // ✅ Watch partner auth — drives sync engine lifecycle
  const partnerAuthId = useSelector(
    (state: RootState) => state.partnerAuth.partner?.auth_id ?? null,
  );

  // ✅ NEW: Local SQLite ready flag — sync engine waits for this
  const [dbReady, setDbReady] = useState(false);

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

  // ✅ NEW: One-time local SQLite init at app boot.
  // Sync engine waits for this to finish before doing anything.
  useEffect(() => {
    let cancelled = false;
    console.log('🗄️ Bootstrapping local SQLite...');
    initLocalDb()
      .then(() => {
        if (!cancelled) {
          setDbReady(true);
          console.log('✅ Local DB ready — sync engine can start');
        }
      })
      .catch(err => {
        console.log(
          '❌ Local DB init failed (offline saves will not work):',
          err?.message ?? err,
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ NEW: Start / stop the BMI report sync engine based on:
  //   • DB readiness (no point starting before SQLite is up)
  //   • Partner auth state (no partner → no sync target)
  // start() is idempotent for the same partner; if partnerAuthId changes
  // mid-session the manager internally stops + restarts.
  useEffect(() => {
    if (!dbReady) return;

    if (partnerAuthId) {
      bmiReportSyncManager.start(partnerAuthId);
    } else {
      bmiReportSyncManager.stop();
    }
  }, [dbReady, partnerAuthId]);

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
