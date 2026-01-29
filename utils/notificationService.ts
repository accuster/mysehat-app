// utils/notificationService.ts - FIXED VERSION
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';

/**
 * Request notification permissions (Android 13+)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1;
  } catch (error) {
    console.log('Notification permission error:', error);
    return false;
  }
}

/**
 * Create notification channel (required for Android 8+)
 */
export async function createNotificationChannel(): Promise<void> {
  try {
    await notifee.createChannel({
      id: 'mysehat_downloads',
      name: 'MySehat Downloads',
      description: 'Notifications for downloaded health reports',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
    console.log('✅ Notification channel created successfully');
  } catch (error) {
    console.log('❌ Failed to create notification channel:', error);
  }
}

/**
 * ✅ FIXED: Open PDF file using system file manager or PDF viewer
 */
export async function openPdfFile(pdfPath: string) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📂 Opening PDF from notification...');
    console.log('PDF Path:', pdfPath);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ✅ Check if file exists
    const exists = await RNFS.exists(pdfPath);
    console.log('File exists:', exists);
    
    if (!exists) {
      console.log('❌ PDF file not found at:', pdfPath);
      Alert.alert('File Not Found', 'PDF does not exist at the specified location.');
      return;
    }

    if (Platform.OS === 'android') {
      const SendIntentAndroid = require('react-native-send-intent');

      console.log('🔄 Calling SendIntent.openFileChooser...');
      
      // ✅ FIXED: Use 'fileUrl' instead of 'filePath'
      await SendIntentAndroid.openFileChooser(
        {
          fileUrl: pdfPath, // ✅ Correct parameter name
          type: 'application/pdf',
        },
        'Open PDF with'
      );

      console.log('✅ PDF opened successfully');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  } catch (error: any) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ Failed to open PDF');
    console.log('Error:', error);
    console.log('Error message:', error.message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const fileName = pdfPath.split('/').pop() || 'report.pdf';
    Alert.alert(
      'Cannot Open PDF',
      `The PDF was saved to:\n\nDownloads/${fileName}\n\nPlease open it manually from your Downloads folder.`,
      [{ text: 'OK' }]
    );
  }
}

/**
 * Setup notification event handlers (handles tap on notification)
 * NOTE: Background handler is registered in index.js
 */
export function setupNotificationHandlers(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔔 setupNotificationHandlers: CALLED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // ✅ TEST: Check if notifee is available
  console.log('notifee available:', typeof notifee !== 'undefined');
  console.log('EventType available:', typeof EventType !== 'undefined');
  console.log('EventType.PRESS:', EventType.PRESS);
  console.log('EventType.ACTION_PRESS:', EventType.ACTION_PRESS);
  
  try {
    // ✅ Handle notification tap when app is in FOREGROUND
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔔🔔🔔 FOREGROUND EVENT TRIGGERED! 🔔🔔🔔');
      console.log('Event Type Number:', type);
      console.log('Is PRESS?', type === EventType.PRESS);
      console.log('Is ACTION_PRESS?', type === EventType.ACTION_PRESS);
      console.log('EventType.PRESS value:', EventType.PRESS);
      console.log('EventType.ACTION_PRESS value:', EventType.ACTION_PRESS);
      console.log('Full detail object:', JSON.stringify(detail, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // ✅ Handle ALL event types to see what we're getting
      console.log('Processing event type:', type);
      
      if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
        const pdfPath = detail.notification?.data?.pdfPath as string;
        const actionId = detail.pressAction?.id;
        
        console.log('✅ Matched PRESS or ACTION_PRESS event');
        console.log('📱 User tapped notification (foreground)');
        console.log('Action ID:', actionId);
        console.log('PDF Path from notification:', pdfPath);
        
        if (pdfPath) {
          console.log('🚀 Calling openPdfFile...');
          await openPdfFile(pdfPath);
        } else {
          console.log('⚠️ No PDF path in notification data');
          Alert.alert('Error', 'Cannot open PDF - file path not found.');
        }
      } else {
        console.log('❌ Event type did NOT match PRESS or ACTION_PRESS');
        console.log('Event type received:', type);
        console.log('Expected PRESS:', EventType.PRESS);
        console.log('Expected ACTION_PRESS:', EventType.ACTION_PRESS);
      }
    });
    
    console.log('✅ Foreground notification handler registered successfully');
    console.log('Unsubscribe function:', typeof unsubscribe);
  } catch (error) {
    console.log('❌ Error setting up foreground handler:', error);
  }

  console.log('ℹ️ Background handler should be registered in index.js');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Show download notification with PDF filename
 * @param pdfPath - Full path to the downloaded PDF
 */
export async function showDownloadNotification(pdfPath: string): Promise<void> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔔 Showing Download Notification');
    console.log('PDF Path:', pdfPath);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ✅ Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('⚠️ Notification permission denied');
      return;
    }

    // ✅ Extract filename from path
    const fileName = pdfPath.split('/').pop() || 'MySehat_Report.pdf';
    console.log('📄 Filename:', fileName);

    // ✅ Verify file exists before showing notification
    const fileExists = await RNFS.exists(pdfPath);
    console.log('File exists before notification:', fileExists);
    
    if (!fileExists) {
      console.log('❌ Cannot show notification - file does not exist');
      return;
    }

    // ✅ SOLUTION: Open PDF immediately instead of waiting for notification tap
    // This is more reliable than using notifee events
    console.log('📱 Opening PDF immediately after download...');
    
    try {
      await openPdfFile(pdfPath);
      console.log('✅ PDF opened successfully');
    } catch (openError) {
      console.log('⚠️ Could not auto-open PDF:', openError);
      // Continue to show notification as fallback
    }

    // ✅ Display notification as confirmation (not for opening)
    const notificationId = await notifee.displayNotification({
      title: '✅ PDF Downloaded',
      body: `${fileName}`,
      android: {
        channelId: 'mysehat_downloads',
        smallIcon: 'ic_launcher',
        color: '#111827',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [300, 500],
        autoCancel: true,
        onlyAlertOnce: true,
      },
    });

    console.log('✅ Notification displayed with ID:', notificationId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ Failed to show notification');
    console.log('Error:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

/**
 * Cancel all notifications (cleanup)
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await notifee.cancelAllNotifications();
    console.log('✅ All notifications cancelled');
  } catch (error) {
    console.log('❌ Failed to cancel notifications:', error);
  }
}