// components/screens/user/ScanScreen.tsx - FIXED: Variable naming conflict resolved
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  ActivityIndicator,
  AppState,
  BackHandler,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';

import { Animated, Easing } from 'react-native';
import { useRef } from 'react';
import { Vibration, Platform } from 'react-native';
import { Flashlight, FlashlightOff, ArrowLeft } from 'lucide-react-native';

// ✅ Redux imports
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import { createOrder } from '../../../store/slices/orderSlice';
import { storage } from '../../../utils/storage';

// ✅ CHANGED: Use global error handler instead of local toast
import { useApiErrorHandler } from '../../../hooks/useApiErrorHandler';

type Props = {
  navigation: any;
};

export default function ScanScreen({ navigation }: Props) {
  // ✅ ALL STATE HOOKS FIRST
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  const isMounted = useRef(true);

  // ✅ REDUX HOOKS
  const dispatch = useAppDispatch();
  const { isLoading: orderLoading } = useAppSelector(state => state.orders);
  const { user } = useAppSelector(state => state.auth);

  // ✅ CHANGED: Use global error handler
  const { executeApiCall } = useApiErrorHandler();

  // ✅ REFS AND ANIMATIONS
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // ✅ DEVICE HOOKS (Must be called unconditionally!)
  const device = useCameraDevice('back');
  const hasTorch = device?.hasTorch ?? false;

  // ✅ INTERPOLATION
  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-110, 110],
  });

  const getUserData = async () => {
    // Try Redux first
    if (user?.mobile && user?.userId) {
      console.log('📱 Using user data from Redux');
      return {
        mobile: user.mobile,
        userId: user.userId,
      };
    }

    // Fallback: Get from storage
    try {
      const storedUser = await storage.getUser();
      console.log('📱 Retrieved from storage:', storedUser);

      if (storedUser?.mobile && storedUser?.userId) {
        console.log('✅ Using user data from storage');
        console.log('User ID:', storedUser.userId);
        console.log('Mobile:', storedUser.mobile);
        return {
          mobile: storedUser.mobile,
          userId: storedUser.userId,
        };
      }

      console.log('❌ Storage user data incomplete:', storedUser);
    } catch (error) {
      console.log('❌ Failed to get user from storage:', error);
    }

    throw new Error('User data not found. Please log in again.');
  };

  // ✅ ALL useEffect HOOKS MUST BE BEFORE CONDITIONAL RETURNS
  // ✅ Verify user data on mount
  useEffect(() => {
    const checkUser = async () => {
      const userResult = await executeApiCall(() => getUserData(), {
        showSuccessToast: false,
        showErrorToast: true,
        customErrorMessage: 'Please log in again to scan QR codes.',
        onError: () => {
          // Navigate to login if user data not found
          navigation.replace('Auth');
        },
      });

      if (userResult) {
        console.log('✅ ScanScreen: User verified on mount');
        console.log('User ID:', userResult.userId);
        console.log('Mobile:', userResult.mobile);
      }
    };

    checkUser();
  }, []);

  // ✅ Request camera permission
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');

      if (status === 'denied') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permission in settings to scan QR codes.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      }
    })();
  }, []);

  // ✅ Re-check camera permission when app becomes active
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active - checking camera permission...');
        const status = await Camera.getCameraPermissionStatus();
        console.log('📷 Camera permission status:', status);
        setHasPermission(status === 'granted');

        if (status === 'granted') {
          console.log('✅ Camera permission granted!');
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      console.log('🧹 ScanScreen: Unmounting...');
      isMounted.current = false;
    };
  }, []);

  // ✅ Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: ScanScreen');
      if (isMounted.current && navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, [navigation]);

  // ✅ Scan line animation
  useEffect(() => {
    if (!isActive) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isActive]);

  // Handle screen focus/blur
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      setIsActive(true);
      setScannedData(null);
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      setIsActive(false);
      setTorchOn(false);
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  // ✅ Toggle torch function
  const toggleTorch = () => {
    if (hasTorch && isActive) {
      setTorchOn(!torchOn);
    } else if (!hasTorch) {
      Alert.alert('Info', 'Your device does not have a flashlight.');
    }
  };

  // ✅ QR Code scanner - MUST be before conditional returns
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: codes => {
      if (codes.length > 0 && isActive && !scannedData) {
        const code = codes[0];
        const data = code.value;

        if (data) {
          if (Platform.OS === 'android') {
            Vibration.vibrate(80);
          } else {
            Vibration.vibrate();
          }
          setScannedData(data);
          setIsActive(false);
          handleQRCodeScanned(data);
        }
      }
    },
  });

  // ✅ FIXED: Handle QR code scan with proper variable naming
  const handleQRCodeScanned = async (data: string) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 QR CODE SCANNED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Raw QR Data (first 80 chars):', data.substring(0, 80) + '...');
    console.log('Data length:', data.length);
    console.log('Full data:', data);

    const result = await executeApiCall(
      async () => {
        const userData = await getUserData();

        let encryptedPayload = data;

        if (data.includes('SEHAT_BMI')) {
          const match = data.match(/SEHAT_BMI(.+)/);
          if (match && match[1]) {
            encryptedPayload = decodeURIComponent(match[1]);
            console.log('✅ Extracted payload from WhatsApp URL');
            console.log('Encrypted payload length:', encryptedPayload.length); 
            console.log('Encrypted payload:', encryptedPayload);
          } else {
            throw new Error('Could not extract payload from WhatsApp URL');
          }
        } else {
          console.log('ℹ️ Direct encrypted payload (not WhatsApp URL)');
        }

        console.log('🚀 Sending to backend...');
        console.log('User ID:', userData.userId);
        console.log('Mobile:', userData.mobile);
        console.log('Payload length:', encryptedPayload.length);

        // ✅ FIXED: Renamed to orderResult to avoid conflict with outer 'result'
        const orderResult = await dispatch(
          createOrder({
            timestamp: new Date().toISOString(),
            raw_payload: encryptedPayload,
            mobile_number: userData.mobile,
          }),
        ).unwrap();

        return orderResult;
      },
      {
        showSuccessToast: false,
        showErrorToast: true,
        customErrorMessage:
          'Invalid QR code. Please scan a valid QR code and try again.',
        onSuccess: orderResult => {
          // ✅ CHECK BEFORE navigation
          if (!isMounted.current) {
            console.log('⚠️ Component unmounted, skipping navigation');
            return;
          }

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ Order created successfully!');
          console.log('Order ID:', orderResult.order_id);
          console.log('Height:', orderResult.height, 'cm');
          console.log('Weight:', orderResult.weight, 'kg');
          console.log('BMI:', orderResult.bmi);
          console.log('Machine ID:', orderResult.machine_id);
          console.log('Test Fee: ₹', orderResult.test_fee);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          navigation.navigate('SelectUser', {
            qrData: {
              height: orderResult.height,
              weight: orderResult.weight,
              bmi: orderResult.bmi,
              machine_id: orderResult.machine_id,
              test_fee: orderResult.test_fee,
              order_id: orderResult.order_id,
            },
            rawData: data,
            orderId: orderResult.order_id,
          });
        },
        onError: (error: any) => {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('❌ ERROR PROCESSING QR CODE');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('Error:', error);
          console.log('Message:', error.message || error);

          // ✅ CHECK BEFORE setState
          if (!isMounted.current) return;

          setScannedData(null);
          setIsActive(true);
        },
      },
    );

    // ✅ Reset scanner if API call failed
    if (!result && isMounted.current) {
      setScannedData(null);
      setIsActive(true);
    }
  };

  const handleBack = () => {
    if (isMounted.current && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // Loading state
  if (device == null) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#FAFAFA" />
          </Pressable>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading Camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#FAFAFA" />
          </Pressable>
        </View>

        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            Please enable camera permission in settings to scan QR codes.
          </Text>
          <Pressable
            style={styles.settingsButton}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ✅ Solid Header Bar */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </Pressable>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isActive}
          codeScanner={codeScanner}
          torch={torchOn ? 'on' : 'off'}
        />

        {/* Overlay UI */}
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Scan Frame */}
            <View style={styles.frameWrapper}>
              <View style={styles.frame}>
                {/* Corner brackets */}
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
                <Animated.View
                  style={[styles.scanLine, { transform: [{ translateY }] }]}
                />
              </View>

              {/* ✅ Torch Button */}
              {hasTorch && (
                <Pressable
                  style={[
                    styles.torchButton,
                    torchOn && styles.torchButtonActive,
                  ]}
                  onPress={toggleTorch}
                  disabled={!isActive}
                >
                  {torchOn ? (
                    <Flashlight
                      size={24}
                      color="#FFFFFF"
                      strokeWidth={2.5}
                      fill="#FFFFFF"
                    />
                  ) : (
                    <FlashlightOff
                      size={24}
                      color="#FFFFFF"
                      strokeWidth={2.5}
                    />
                  )}
                </Pressable>
              )}

              {/* Text */}
              <View style={styles.textBlock}>
                <Text style={styles.title}>
                  Scan the QR Code displayed on MySehat BMI
                </Text>
                <Text style={styles.subtitle}>
                  {isActive ? 'Scanning…' : 'Processing…'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ✅ Loading Overlay */}
        {orderLoading && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.processingTitle}>Processing QR Code...</Text>
              <Text style={styles.processingSubtext}>
                Decrypting and validating data
              </Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    backgroundColor: '#09090B',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cameraContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  frameWrapper: {
    alignItems: 'center',
    marginBottom: 80,
  },

  frame: {
    width: 260,
    height: 260,
    borderRadius: 28,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },

  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: 'rgba(255,255,255,0.9)',
  },

  tl: {
    top: 0,
    left: 0,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderTopLeftRadius: 20,
  },
  tr: {
    top: 0,
    right: 0,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderTopRightRadius: 20,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderBottomLeftRadius: 20,
  },
  br: {
    bottom: 0,
    right: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderBottomRightRadius: 20,
  },

  torchButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  torchButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },

  textBlock: {
    marginTop: 20,
    alignItems: 'center',
  },

  title: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLine: {
    position: 'absolute',
    width: '85%',
    height: 2,
    backgroundColor: '#7C3AED',
    borderRadius: 2,
    shadowColor: '#5712cfff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
  },

  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },

  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },

  permissionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },

  settingsButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  processingBox: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    minWidth: 240,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  processingTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },

  processingSubtext: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
