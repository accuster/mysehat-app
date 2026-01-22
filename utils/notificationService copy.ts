// utils/notificationService.ts - FIXED VERSION
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform, Linking, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { NativeModules } from 'react-native';

const { RNFileViewer } = NativeModules;

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
    console.error('Notification permission error:', error);
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
    console.error('❌ Failed to create notification channel:', error);
  }
}

/**
 * Open PDF file using system file manager or PDF viewer
 */
async function openPdfFile(pdfPath: string): Promise<void> {
  try {
    console.log('📂 Attempting to open PDF:', pdfPath);

    // Check if file exists
    const fileExists = await RNFS.exists(pdfPath);
    if (!fileExists) {
      console.error('❌ PDF file not found:', pdfPath);
      Alert.alert(
        'File Not Found',
        'The PDF file could not be found. It may have been moved or deleted.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (Platform.OS === 'android') {
      // ✅ METHOD 1: Use Android Intent to open PDF directly
      try {
        const SendIntentAndroid = require('react-native-send-intent');
        
        // This opens the file with the system's default PDF viewer
        await SendIntentAndroid.openFileChooser(
          {
            filePath: pdfPath,
            type: 'application/pdf',
            subject: 'Open PDF'
          },
          'Open with'
        );
        
        console.log('✅ PDF opened successfully with Intent');
      } catch (intentError) {
        console.error('❌ Intent method failed:', intentError);
        
        // ✅ FALLBACK: Show user instructions to open manually
        const fileName = pdfPath.split('/').pop() || 'report.pdf';
        Alert.alert(
          'Open PDF',
          `Your report has been saved to:\n\nDownloads/${fileName}\n\nPlease open it from your Downloads folder or File Manager.`,
          [
            { 
              text: 'Open Downloads Folder', 
              onPress: () => {
                // Try to open downloads folder
                Linking.openURL('content://com.android.externalstorage.documents/document/primary:Download')
                  .catch(() => {
                    console.log('Could not open Downloads folder');
                  });
              }
            },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
    } else {
      // iOS: Can use file:// URLs
      const fileUrl = `file://${pdfPath}`;
      await Linking.openURL(fileUrl);
    }
  } catch (error: any) {
    console.error('❌ Error opening PDF:', error);
    const fileName = pdfPath.split('/').pop() || 'report.pdf';
    Alert.alert(
      'Cannot Open PDF',
      `The PDF was saved successfully to:\n\nDownloads/${fileName}\n\nPlease open it manually from your Downloads folder.`,
      [{ text: 'OK' }]
    );
  }
}

/**
 * Setup notification event handlers (handles tap on notification)
 */
export function setupNotificationHandlers(): void {
  // ✅ Handle notification tap (when user taps notification)
  notifee.onForegroundEvent(async ({ type, detail }) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔔 Foreground Notification Event:', type);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (type === EventType.PRESS) {
      const pdfPath = detail.notification?.data?.pdfPath as string;
      
      if (pdfPath) {
        console.log('📱 User tapped notification, opening PDF:', pdfPath);
        await openPdfFile(pdfPath);
      } else {
        console.warn('⚠️ No PDF path in notification data');
      }
    }
  });

  // ✅ Handle notification when app is in background/killed
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔔 Background Notification Event:', type);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (type === EventType.PRESS) {
      const pdfPath = detail.notification?.data?.pdfPath as string;
      
      if (pdfPath) {
        console.log('📱 User tapped notification, opening PDF:', pdfPath);
        await openPdfFile(pdfPath);
      }
    }
  });

  console.log('✅ Notification handlers registered');
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
      console.warn('⚠️ Notification permission denied');
      return;
    }

    // ✅ Extract filename from path
    const fileName = pdfPath.split('/').pop() || 'MySehat_Report.pdf';
    console.log('📄 Filename:', fileName);

    // ✅ Display notification
    const notificationId = await notifee.displayNotification({
      title: fileName,
      body: 'Tap to open',
      android: {
        channelId: 'mysehat_downloads',
        smallIcon: 'ic_launcher',
        color: '#111827',
        pressAction: {
          id: 'open_pdf',
          launchActivity: 'default',
        },
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [300, 500],
        autoCancel: true,
      },
      data: {
        pdfPath,
      },
    });

    console.log('✅ Notification displayed with ID:', notificationId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ Failed to show notification:', error);
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
    console.error('❌ Failed to cancel notifications:', error);
  }
}