/**
 * @format
 */
import 'react-native-get-random-values';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee, { EventType } from '@notifee/react-native';
import { openPdfFile } from './utils/notificationService';

// ✅ CRITICAL: Register background notification handler BEFORE app registration
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔔 BACKGROUND EVENT (index.js)');
  console.log('Event Type Number:', type);
  console.log('Is PRESS?', type === EventType.PRESS);
  console.log('Is ACTION_PRESS?', type === EventType.ACTION_PRESS);
  console.log('Detail:', JSON.stringify(detail));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // ✅ Handle both PRESS and ACTION_PRESS events
  if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
    const pdfPath = detail.notification?.data?.pdfPath;
    const actionId = detail.pressAction?.id;
    
    console.log('📱 Notification tapped in background/killed state');
    console.log('Action ID:', actionId);
    console.log('PDF Path:', pdfPath);
    
    if (pdfPath) {
      await openPdfFile(pdfPath);
    } else {
      console.log('⚠️ No PDF path in notification data');
    }
  }
});

console.log('✅ Background notification handler registered in index.js');

AppRegistry.registerComponent(appName, () => App);