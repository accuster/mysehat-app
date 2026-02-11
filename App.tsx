// App.tsx - WITH GLOBAL TOAST PROVIDER
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import AppNavigator from './components/navigation/AppNavigator';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { ToastProvider } from './contexts/ToastContext';

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
  }, [isDarkMode]);

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