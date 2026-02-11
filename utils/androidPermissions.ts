// utils/androidPermissions.ts - Request storage permissions for PDF download
import { PermissionsAndroid, Platform, Alert } from 'react-native';

/**
 * Request WRITE_EXTERNAL_STORAGE permission for Android
 * Required to save PDFs to public Downloads folder
 */
export async function requestStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.log('✅ iOS - No storage permission needed');
    return true;
  }

  // ✅ Android 13+ (API 33+) - No WRITE_EXTERNAL_STORAGE needed for Downloads
  if (Platform.Version >= 33) {
    console.log('✅ Android 13+ - Scoped storage, no permission needed');
    return true;
  }

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 Requesting WRITE_EXTERNAL_STORAGE permission...');
    
    // Check if already granted
    const checkResult = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );

    if (checkResult) {
      console.log('✅ Permission already granted');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return true;
    }

    // Request permission
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission Required',
        message: 'MySehat needs storage access to save health reports to your Downloads folder.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow',
      }
    );

    console.log('Permission result:', granted);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('✅ Storage permission granted');
      return true;
    }

    if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      console.log('⚠️ User selected "Never ask again"');
      showPermissionSettingsAlert();
      return false;
    }

    console.log('❌ Storage permission denied');
    return false;
  } catch (err) {
    console.error('❌ Permission request error:', err);
    return false;
  }
}

/**
 * Show alert to guide user to app settings if permission was permanently denied
 */
function showPermissionSettingsAlert() {
  Alert.alert(
    'Storage Permission Required',
    'MySehat needs storage permission to save health reports. Please enable it in app settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          // User needs to manually enable in Settings
          console.log('👉 User should go to: Settings > Apps > MySehat > Permissions');
        },
      },
    ]
  );
}

/**
 * Check if storage permission is granted (without requesting)
 */
export async function hasStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (Platform.Version >= 33) {
    return true; // Android 13+ doesn't need WRITE_EXTERNAL_STORAGE for Downloads
  }

  try {
    const result = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );
    return result;
  } catch {
    return false;
  }
}