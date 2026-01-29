// App.tsx - WITH ENHANCED NOTIFICATION DEBUGGING
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import AppNavigator from './components/navigation/AppNavigator';

import {
  createNotificationChannel,
  setupNotificationHandlers,
} from './utils/notificationService';

// ✅ Ignore non-critical warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
  'ViewPropTypes will be removed',
  'Sending `onAnimatedValueUpdate`',
]);

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // ✅ Enhanced app initialization with notification setup
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 APP INITIALIZED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Dark Mode:', isDarkMode);
    console.log('Redux Store:', store ? '✅ Connected' : '❌ Not Connected');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ✅ Initialize notifications with extensive logging
    const initNotifications = async () => {
      try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔔 Starting notification initialization...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        console.log('Step 1: Creating notification channel...');
        await createNotificationChannel();
        console.log('✅ Step 1 complete');
        
        console.log('Step 2: Setting up notification handlers...');
        setupNotificationHandlers();
        console.log('✅ Step 2 complete');
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Notifications ready!');
        console.log('Handlers should now be listening for events');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } catch (error) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('❌ Notification setup FAILED');
        console.log('Error:', error);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
    };

    initNotifications();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }, [isDarkMode]);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor="#0A0A0A"
          />
          <AppNavigator />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;