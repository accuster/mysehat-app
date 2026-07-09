/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
// components/screens/partner/PartnerHomeScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  AppState,
  Vibration,
  Platform,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Bluetooth,
  BluetoothConnected,
  BluetoothSearching,
  BluetoothOff,
  Save,
  ChevronDown,
  User,
  Phone,
  X,
  ChevronRight,
  QrCode,
  Flashlight,
  FlashlightOff,
  Search,
} from 'lucide-react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import LinearGradient from 'react-native-linear-gradient';

// ✅ Import centralized Bluetooth hook
import { useBluetooth } from '../../../hooks/useBluetooth';

import AppHeader from '../../common/AppHeader';
import AppDrawer from '../../common/AppDrawer';
import { decrypt } from '../../../utils/encryption';
import { saveBMIRecord } from '../../../utils/partnerStorage';
import {
  calculateHealthMetrics,
  logHealthMetrics,
} from '../../../utils/healthMetricsCalculator';
import { useToast } from '../../../contexts/ToastContext';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { insertReport } from '../../../utils/localReportRepository';
import { bmiReportSyncManager } from '../../../store/services/BmiReportSyncManager';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// ─── Types ───────────────────────────────────────────────────────────────────
type Mode = 'bluetooth' | 'qr';
type Props = { navigation: any };
type Gender = 'Male' | 'Female' | 'Other';
type BluetoothButtonProps = {
  onPress: () => void;
  isConnected: boolean;
  isConnecting: boolean;
};

const BluetoothButton = ({
  onPress,
  isConnected,
  isConnecting,
}: BluetoothButtonProps) => {
  const getIcon = () => {
    if (isConnecting) {
      return <BluetoothSearching size={20} color="#F59E0B" />;
    }
    if (isConnected) {
      return <BluetoothConnected size={20} color="#10B981" />;
    }
    return <BluetoothOff size={20} color="#71717A" />;
  };

  return <Pressable onPress={onPress}>{getIcon()}</Pressable>;
};

const DeviceSeparator = () => {
  return <View style={styles.deviceSeparator} />;
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function PartnerHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { showError } = useToast();
  const partner = useSelector((state: RootState) => state.partnerAuth.partner);

  // ═══════════════════════════════════════════════════════════════════════════
  // BLUETOOTH HOOK - Centralized management
  // ═══════════════════════════════════════════════════════════════════════════
  const {
    status: btStatus,
    isConnected,
    isConnecting,
    currentDevice,
    lastData: btLastData,
    requestPermissions: requestBTPermissions,
    getPairedDevices,
    connect: connectToBTDevice,
    disconnect: disconnectBTDevice,
    clearData: clearBTData,
  } = useBluetooth();

  // Mode selection
  const [mode, setMode] = useState<Mode>('bluetooth');
  const [qrScanned, setQrScanned] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // QR Scanner states
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  // Device picker
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pairedDevices, setPairedDevices] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Bluetooth received data
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Calculated fields
  const [bmi, setBmi] = useState('');
  const [idealWeight, setIdealWeight] = useState('');
  const [fatPercentage, setFatPercentage] = useState('');

  // Extended health metrics
  const [bodyFatPercentage, setBodyFatPercentage] = useState('');
  const [fatMass, setFatMass] = useState('');
  const [leanBodyMass, setLeanBodyMass] = useState('');
  const [healthScore, setHealthScore] = useState('');

  // Manual entry
  const [gender, setGender] = useState<Gender>('Male');
  const [age, setAge] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');

  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  const isMounted = useRef(true);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const ageDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Camera setup - MUST be called unconditionally
  const [cameraReady, setCameraReady] = useState(false);
  const device = useCameraDevice('back', {
    physicalDevices: ['wide-angle-camera'],
  });
  const hasTorch = device?.hasTorch ?? false;

  // Interpolation for scan line
  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-110, 110],
  });

  // QR Code scanner - MUST be before conditional returns
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
          handleQRCodeDetected(data);
        }
      }
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE & EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    isMounted.current = true;
    console.log('🏠 PartnerHomeScreen: Mounted (BT managed by hook)');

    return () => {
      console.log('🧹 PartnerHomeScreen: Unmounting (BT stays connected)');
      isMounted.current = false;
      // ✅ Don't disconnect - hook manages persistence
    };
  }, []);

  // ✅ Auto-fill from Bluetooth data (Height + Weight only)
  // BMI, ideal weight, fat %, health score all calculated app-side
  // in the useEffect below and in calculateMetrics().
  useEffect(() => {
    if (btLastData.height) {
      console.log('📏 Auto-filling height from BT:', btLastData.height);
      setHeight(btLastData.height.toString());
    }
    if (btLastData.weight) {
      console.log('⚖️ Auto-filling weight from BT:', btLastData.weight);
      setWeight(btLastData.weight.toString());
    }
  }, [btLastData]);

  // ✅ Auto-calculate BMI + Ideal Weight the moment we have Height and Weight.
  // BMI formula doesn't need age or gender — compute it directly here.
  // Advanced metrics (fat %, health score) DO need age; they're handled in
  // the [age, height, weight, bmi, gender] effect below when age is entered.
  useEffect(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w || h <= 0 || w <= 0) return;

    // BMI = weight(kg) / (height(m))². Same formula the kiosk uses,
    // so results will match the kiosk's B.M.I. value.
    const heightM = h / 100;
    const bmiCalc = w / (heightM * heightM);
    const bmiRounded = Math.round(bmiCalc * 10) / 10; // 1 decimal

    setBmi(bmiRounded.toString());

    // Ideal weight range using BMI 18.5 – 24.9 bracket.
    // Displayed as a single midpoint number to fit the existing UI.
    const idealLow = 18.5 * heightM * heightM;
    const idealHigh = 24.9 * heightM * heightM;
    const idealMid = Math.round(((idealLow + idealHigh) / 2) * 10) / 10;
    setIdealWeight(idealMid.toString());

    console.log(
      '📊 App-calculated BMI:',
      bmiRounded,
      '| Ideal Weight (mid):',
      idealMid,
    );
  }, [height, weight]);

  // Re-check camera permission when app becomes active
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        const status = await Camera.getCameraPermissionStatus();
        setHasPermission(status === 'granted');
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, []);

  // ✅ Calculate Fat % ONLY when age changes (and we have height, weight, bmi)
  useEffect(() => {
    // Clear previous timeout
    if (ageDebounceRef.current) {
      clearTimeout(ageDebounceRef.current);
    }

    if (height && weight && bmi && age) {
      // Wait 300ms after last keystroke
      ageDebounceRef.current = setTimeout(() => {
        console.log('🔄 Age entered, calculating fat %...');
        calculateMetrics();
      }, 300);
    } else if (!age) {
      // Clear immediately when age is removed
      console.log('⚠️ No age - clearing fat % fields');
      setBodyFatPercentage('');
      setFatMass('');
      setLeanBodyMass('');
      setHealthScore('');
      setFatPercentage('');
    }

    // Cleanup timeout on unmount
    return () => {
      if (ageDebounceRef.current) {
        clearTimeout(ageDebounceRef.current);
      }
    };
  }, [age, height, weight, bmi, gender]);

  // Scan line animation
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
    return () => animation.stop();
  }, [isActive]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const calculateMetrics = () => {
    const heightInCm = parseFloat(height);
    const weightInKg = parseFloat(weight);
    const bmiValue = parseFloat(bmi);
    const ageNum = parseFloat(age);

    if (!ageNum || !heightInCm || !weightInKg || !bmiValue) {
      console.log('⚠️ Skipping fat % calculation - missing age or data');
      return;
    }

    try {
      const metrics = calculateHealthMetrics({
        height: heightInCm,
        weight: weightInKg,
        age: ageNum || 0,
        gender: gender,
      });

      logHealthMetrics(
        { height: heightInCm, weight: weightInKg, age: ageNum, gender },
        metrics,
      );

      setBmi(metrics.bmi.toString());
      setIdealWeight(metrics.idealWeight.toString());

      // ✅ ONLY if age available → advanced metrics
      if (ageNum) {
        setBodyFatPercentage(metrics.bodyFatPercentage.toString());
        setFatMass(metrics.fatMass.toString());
        setLeanBodyMass(metrics.leanBodyMass.toString());
        setHealthScore(metrics.healthScore.toString());
        setFatPercentage(metrics.bodyFatPercentage.toString());
      }
    } catch (error) {
      console.log('Error calculating health metrics:', error);
    }
  };

  const handleModeSwitch = (newMode: Mode) => {
    if (newMode === mode) return; // no-op on same tab

    setMode(newMode);

    // ✅ Symmetric clear — every tab switch resets captured data,
    // regardless of direction. Manual entry (gender/age/name/mobile) is preserved.
    setQrScanned(false);
    setHeight('');
    setWeight('');
    setBmi('');
    setIdealWeight('');
    setBodyFatPercentage('');
    setFatMass('');
    setLeanBodyMass('');
    setHealthScore('');
    setFatPercentage('');

    // Also flush the useBluetooth hook's cached last-data. Without this,
    // if the kiosk pushed data before the switch, btLastData still holds
    // it in memory — but since the [btLastData] useEffect only fires on
    // *change*, cleared fields wouldn't re-populate anyway. Clearing the
    // cache is belt-and-braces so any next kiosk push definitely triggers
    // a fresh useEffect run.
    clearBTData();

    console.log(
      '🔄 Mode switched to:',
      newMode,
      '(fields cleared, BT connection maintained)',
    );
  };

  const handleQRScan = async () => {
    try {
      // ✅ Ensure app is active
      if (AppState.currentState !== 'active') {
        return;
      }

      // ✅ small delay to ensure Activity is ready
      await new Promise(resolve => setTimeout(resolve, 300));

      let status = await Camera.getCameraPermissionStatus();

      // ✅ HANDLE "DENIED" FIRST (IMPORTANT UX FIX)
      if (status === 'denied') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permission from settings',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      if (status === 'not-determined') {
        status = await Camera.requestCameraPermission();
      }

      if (status === 'granted') {
        if (!isMounted.current) return;
        setHasPermission(true);
        setIsActive(true);
        setScannedData(null);
        setShowQRScanner(true);
      } else {
        Alert.alert(
          'Camera Permission Required',
          'Enable camera permission in settings',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      }
    } catch (e) {
      console.log('Camera permission error:', e);
    }
  };

  const toggleTorch = () => {
    if (hasTorch && isActive) {
      setTorchOn(!torchOn);
    } else if (!hasTorch) {
      Alert.alert('Info', 'Your device does not have a flashlight.');
    }
  };

  const handleQRCodeDetected = async (data: string) => {
    console.log('📱 QR CODE SCANNED (Partner)');

    try {
      const decryptedData = decrypt(data);
      if (!isMounted.current) return;

      setShowQRScanner(false);
      setIsActive(false);

      if (!isMounted.current) return;
      setHeight(decryptedData.height.toString());
      setWeight(decryptedData.weight.toString());
      setBmi(decryptedData.bmi.toString());
      setQrScanned(true);

      Alert.alert('Success', 'QR Code scanned successfully!');
    } catch (error: any) {
      console.log('❌ QR DECRYPTION ERROR:', error);

      setShowQRScanner(false);
      setIsActive(false);
      setScannedData(null);

      Alert.alert('Error', 'Invalid QR code. Please scan a valid BMI QR code.');
    }
  };

  const getBMIStatus = (bmiValue: string): string => {
    if (!bmiValue || bmiValue === '---') return 'Normal';
    const bmiNum = parseFloat(bmiValue);
    if (bmiNum < 18.5) return 'Underweight';
    if (bmiNum >= 18.5 && bmiNum < 25) return 'Normal';
    if (bmiNum >= 25 && bmiNum < 30) return 'Overweight';
    return 'Obese';
  };

  const openSheet = () => {
    setPickerVisible(true);
    Animated.spring(sheetAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const closeSheet = (callback?: () => void) => {
    Animated.timing(sheetAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setPickerVisible(false);
      callback?.();
    });
  };

  // ✅ Updated: Use hook's requestPermissions
  const handleOpenPicker = async () => {
    try {
      if (AppState.currentState !== 'active') return;

      await new Promise(resolve => setTimeout(resolve, 300));

      const btPermission = await requestBTPermissions();

      if (!btPermission) {
        Alert.alert('Permission Denied', 'Bluetooth permission required');
        return;
      }

      setPairedDevices([]);
      setDevicesLoading(true);
      openSheet();

      const devices = await getPairedDevices();
      if (!isMounted.current) return;
      setPairedDevices(devices);
    } catch (error) {
      console.log('BT permission error:', error);
    } finally {
      if (isMounted.current) {
        setDevicesLoading(false);
      }
    }
  };

  // ✅ Updated: Handle connection with hook
  const handleBluetoothClick = () => {
    if (isConnected) {
      Alert.alert(
        'Disconnect Device',
        `Do you want to disconnect ${currentDevice?.name || 'this device'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              try {
                await disconnectBTDevice();
                if (!isMounted.current) return;
                setHeight('');
                setWeight('');
                clearBTData();
              } catch (error) {
                console.log('Disconnect error:', error);
              }
            },
          },
        ],
      );
    } else {
      handleOpenPicker();
    }
  };

  // ✅ Updated: Device selection with hook
  const handleDeviceSelect = (selectedDevice: any) => {
    closeSheet(async () => {
      try {
        await connectToBTDevice(selectedDevice);
      } catch (error: any) {
        showError(error?.message ?? 'Could not connect to the BMI machine', {
          label: 'Retry',
          onPress: () => handleDeviceSelect(selectedDevice),
        });
      }
    });
  };

  // ✅ NEW: Handle Search Button Click
  const handleSearchClick = () => {
    navigation.navigate('PartnerSearch');
  };

  const handleSave = async () => {
    // Validation (same as before)
    if (!height || !weight) {
      Alert.alert(
        'Error',
        'Please receive data from BMI machine or scan QR code first',
      );
      return;
    }
    if (!name || !mobile || !age) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    // ✅ NEW: partner must be authenticated — auth_id + org_id go into the
    // local row so the sync manager knows which partner owns it.
    if (!partner?.auth_id || !partner?.org_id) {
      Alert.alert('Error', 'Partner session missing. Please log in again.');
      return;
    }

    try {
      const heightInCm = parseFloat(height);
      const weightInKg = parseFloat(weight);
      const ageNum = parseFloat(age);

      // Compute display metrics (unchanged — used for Alert + Preview)
      const metrics = calculateHealthMetrics({
        height: heightInCm,
        weight: weightInKg,
        age: ageNum,
        gender: gender,
      });

      logHealthMetrics(
        { height: heightInCm, weight: weightInKg, age: ageNum, gender },
        metrics,
      );

      // ✅ NEW: write to local SQLite (offline-first).
      // insertReport() generates client_uuid on the phone — that UUID is
      // the idempotency key the server uses to dedupe retries.
      const savedRow = await insertReport({
        // From the BMI kiosk (Bluetooth or QR)
        height_cm: heightInCm,
        weight_kg: weightInKg,
        bmi: metrics.bmi,
        bmi_status: metrics.bmiStatus,
        fat_percent: metrics.bodyFatPercentage,

        // Partner-entered
        gender,
        age: ageNum,
        patient_name: name,
        mobile,

        // Context (partner_auth_id + org_id are also in the JWT — sent here
        // for local lookups / debugging without decoding the token)
        partner_auth_id: partner.auth_id,
        org_id: partner.org_id,
        bt_device_address:
          mode === 'qr' ? null : currentDevice?.address ?? null,
        bt_device_name: mode === 'qr' ? 'QR-SCAN' : currentDevice?.name ?? null,
      });

      console.log('✅ Local row saved:', savedRow.client_uuid);

      // ✅ NEW: fire immediate sync attempt.
      // No-op if offline — the row stays 'pending' and the sync manager
      // will catch it on the next trigger (net-online / foreground / 2-min).
      bmiReportSyncManager.triggerNow();

      if (!isMounted.current) return;

      Alert.alert(
        '✅ Report Saved',
        `Patient: ${name}\n` +
          `BMI: ${metrics.bmi} (${metrics.bmiStatus})\n` +
          `Health Score: ${metrics.healthScore}/100\n\n` +
          `If offline, it will sync automatically once connected.\n\n` +
          `Preview the report?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => clearForm(),
          },
          {
            text: 'Preview Report',
            onPress: () => {
              try {
                // Compat shape for the existing PartnerReportPreview screen.
                // Combines persisted row + freshly computed display metrics.
                // Once PartnerReportPreview reads directly from
                // localReportRepository, this mapping goes away.
                navigation.navigate('PartnerReportPreview', {
                  record: {
                    id: savedRow.client_uuid,
                    height,
                    weight,
                    bmi: metrics.bmi.toString(),
                    bmiStatus: metrics.bmiStatus,
                    idealWeight: metrics.idealWeight.toString(),
                    bodyFatPercentage: metrics.bodyFatPercentage.toString(),
                    fatMass: metrics.fatMass.toString(),
                    leanBodyMass: metrics.leanBodyMass.toString(),
                    healthScore: metrics.healthScore.toString(),
                    gender,
                    age,
                    name,
                    mobile,
                    dataSource: mode,
                    machineId:
                      mode === 'qr' ? 'QR-SCAN' : currentDevice?.address,
                    timestamp: new Date(savedRow.created_at).toISOString(),
                  },
                });
                clearForm();
              } catch (error) {
                console.log('❌ Navigation error:', error);
                Alert.alert('Error', 'Could not open report preview');
              }
            },
          },
        ],
      );
    } catch (error: any) {
      console.log('❌ Error saving BMI record:', error);
      Alert.alert('Error', 'Failed to save BMI record. Please try again.');
    }
  };

  const handleClear = () => {
    Alert.alert('Clear Data', 'Are you sure you want to clear all data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearForm();
        },
      },
    ]);
  };

  const clearForm = () => {
    setHeight('');
    setWeight('');
    setBmi('');
    setIdealWeight('');
    setBodyFatPercentage('');
    setFatMass('');
    setLeanBodyMass('');
    setHealthScore('');
    setFatPercentage('');
    setAge('');
    setName('');
    setMobile('');
    setGender('Male');
    setQrScanned(false);
    clearBTData();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        onMenuClick={() => setDrawerOpen(true)}
        rightSlot={
          <BluetoothButton
            onPress={handleBluetoothClick}
            isConnected={isConnected}
            isConnecting={isConnecting}
          />
        }
      />

      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Bluetooth Mode - Extended Sheet ── */}
        {mode === 'bluetooth' && (
          <View style={styles.dataSheet}>
            <View style={styles.modeToggleContainer}>
              <View style={styles.modeTogglePill}>
                <Pressable
                  style={[styles.modeBtn, styles.modeBtnActive]}
                  onPress={() => handleModeSwitch('bluetooth')}
                >
                  <Bluetooth size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.modeBtnTextActive}>Bluetooth</Text>
                </Pressable>
                <Pressable
                  style={styles.modeBtn}
                  onPress={() => handleModeSwitch('qr')}
                >
                  <QrCode size={18} color="#71717A" strokeWidth={2.5} />
                  <Text style={styles.modeBtnText}>QR Code</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.dataFieldsContainer}>
              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.autoLabel}>Height (cm)</Text>
                  <View style={styles.autoInputWrapper}>
                    <Text
                      style={
                        height ? styles.autoInput : styles.autoInputPlaceholder
                      }
                    >
                      {height || '172 cm'}
                    </Text>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.autoLabel}>Weight (kg)</Text>
                  <View style={styles.autoInputWrapper}>
                    <Text
                      style={
                        weight ? styles.autoInput : styles.autoInputPlaceholder
                      }
                    >
                      {weight || '68.5 kg'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.calculatedRow}>
                <View style={styles.fieldThirdSmall}>
                  <Text style={styles.autoLabel}>BMI</Text>
                  <View style={styles.autoResultBox}>
                    <Text
                      style={
                        bmi
                          ? styles.autoResultValue
                          : styles.autoResultPlaceholder
                      }
                    >
                      {bmi || '23.1'}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldThirdLarge}>
                  <Text style={styles.autoLabel}>BMI Status</Text>
                  <View style={styles.autoResultBox}>
                    <Text
                      style={[
                        bmi
                          ? styles.autoResultValue
                          : styles.autoResultPlaceholder,
                        styles.bmiStatusText,
                      ]}
                    >
                      {getBMIStatus(bmi)}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldThirdSmaller}>
                  <Text style={styles.autoLabel}>Fat %age</Text>
                  <View style={styles.autoResultBox}>
                    <Text
                      style={
                        fatPercentage
                          ? styles.autoResultValue
                          : styles.autoResultPlaceholder
                      }
                    >
                      {fatPercentage ? fatPercentage : '18.5'}
                    </Text>
                    <Text
                      style={
                        fatPercentage
                          ? styles.autoResultUnit
                          : [styles.autoResultUnit, { opacity: 0.4 }]
                      }
                    >
                      %
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── QR Mode - NEW REDESIGNED SCANNER (Before Scan) ── */}
        {mode === 'qr' && !qrScanned && (
          <View style={styles.dataSheet}>
            <View style={styles.modeToggleContainer}>
              <View style={styles.modeTogglePill}>
                <Pressable
                  style={styles.modeBtn}
                  onPress={() => handleModeSwitch('bluetooth')}
                >
                  <Bluetooth size={18} color="#71717A" strokeWidth={2.5} />
                  <Text style={styles.modeBtnText}>Bluetooth</Text>
                </Pressable>
                <Pressable
                  style={[styles.modeBtn, styles.modeBtnActive]}
                  onPress={() => handleModeSwitch('qr')}
                >
                  <QrCode size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.modeBtnTextActive}>QR Code</Text>
                </Pressable>
              </View>
            </View>

            {/* NEW REDESIGNED QR SCANNER */}
            <View style={styles.qrScannerContainerNew}>
              <Pressable style={styles.qrScanAreaNew} onPress={handleQRScan}>
                <LinearGradient
                  colors={['#7C3AED', '#6366F1', '#5B4FE8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.qrGradientBg}
                >
                  {/* QR Code Icon with Corner Brackets */}
                  <View style={styles.qrIconWrapperNew}>
                    {/* Corner Brackets around QR Code */}
                    <View style={styles.qrCornerTL} />
                    <View style={styles.qrCornerTR} />
                    <View style={styles.qrCornerBL} />
                    <View style={styles.qrCornerBR} />

                    <QrCode
                      size={125}
                      color="rgba(255, 255, 255, 0.35)"
                      strokeWidth={2}
                    />

                    {/* Tap to Scan Text - Centered */}
                    <Text style={styles.qrTapText}>Tap to scan</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── QR Mode - Data Sheet (After Scan) ── */}
        {mode === 'qr' && qrScanned && (
          <View style={styles.dataSheet}>
            <View style={styles.modeToggleContainer}>
              <View style={styles.modeTogglePill}>
                <Pressable
                  style={styles.modeBtn}
                  onPress={() => handleModeSwitch('bluetooth')}
                >
                  <Bluetooth size={18} color="#71717A" strokeWidth={2.5} />
                  <Text style={styles.modeBtnText}>Bluetooth</Text>
                </Pressable>
                <Pressable
                  style={[styles.modeBtn, styles.modeBtnActive]}
                  onPress={() => handleModeSwitch('qr')}
                >
                  <QrCode size={18} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.modeBtnTextActive}>QR Code</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.successBanner}>
              <Save size={20} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.successText}>
                QR Code scanned successfully!
              </Text>
            </View>

            <View style={styles.dataFieldsContainer}>
              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.autoLabel}>Height (cm)</Text>
                  <View style={styles.autoInputWrapper}>
                    <Text style={styles.autoInput}>{height || '172 cm'}</Text>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.autoLabel}>Weight (kg)</Text>
                  <View style={styles.autoInputWrapper}>
                    <Text style={styles.autoInput}>{weight || '68.5 kg'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.calculatedRow}>
                <View style={styles.fieldThirdSmall}>
                  <Text style={styles.autoLabel}>BMI</Text>
                  <View style={styles.autoResultBox}>
                    <Text
                      style={
                        bmi
                          ? styles.autoResultValue
                          : styles.autoResultPlaceholder
                      }
                    >
                      {bmi || '23.1'}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldThirdLarge}>
                  <Text style={styles.autoLabel}>BMI Status</Text>
                  <View style={styles.autoResultBox}>
                    <Text
                      style={[
                        bmi
                          ? styles.autoResultValue
                          : styles.autoResultPlaceholder,
                        styles.bmiStatusText,
                      ]}
                    >
                      {getBMIStatus(bmi)}
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldThirdSmaller}>
                  <Text style={styles.autoLabel}>Fat %age</Text>
                  <View style={styles.autoResultBox}>
                    <Text
                      style={
                        fatPercentage
                          ? styles.autoResultValue
                          : styles.autoResultPlaceholder
                      }
                    >
                      {fatPercentage ? fatPercentage : '18.5'}
                    </Text>
                    <Text
                      style={
                        fatPercentage
                          ? styles.autoResultUnit
                          : [styles.autoResultUnit, { opacity: 0.4 }]
                      }
                    >
                      %
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Manual Entry Section - ALWAYS VISIBLE ── */}
        <View style={styles.manualSection}>
          {/* ✅ SIMPLE SEARCH INPUT FIELD */}
          <View style={styles.searchInputContainer}>
            <Search size={18} color="#71717A" strokeWidth={2.5} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search records..."
              placeholderTextColor="#52525B"
              onFocus={handleSearchClick}
              // value={searchQuery}
              // onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.staticLabel}>Gender *</Text>
              <Pressable
                style={styles.staticDropdownBtn}
                onPress={() => setShowGenderDropdown(!showGenderDropdown)}
              >
                <Text style={styles.staticDropdownText}>{gender}</Text>
                <ChevronDown size={18} color="#71717A" />
              </Pressable>

              {showGenderDropdown && (
                <View style={styles.dropdown}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <Pressable
                      key={g}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setGender(g as Gender);
                        setShowGenderDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{g}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.staticLabel}>Age *</Text>
              <View style={styles.staticInputWrapper}>
                <TextInput
                  style={styles.staticInput}
                  value={age}
                  onChangeText={setAge}
                  placeholder="Enter age"
                  placeholderTextColor="#52525B"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={styles.fieldFull}>
            <Text style={styles.staticLabel}>Name *</Text>
            <View style={styles.staticInputWrapperWithIcon}>
              <User size={18} color="#71717A" />
              <TextInput
                style={styles.staticInputWithIcon}
                value={name}
                onChangeText={setName}
                placeholder="Enter patient name"
                placeholderTextColor="#52525B"
              />
            </View>
          </View>

          <View style={styles.fieldFull}>
            <Text style={styles.staticLabel}>Mobile *</Text>
            <View style={styles.staticInputWrapperWithIcon}>
              <Phone size={18} color="#71717A" />
              <TextInput
                style={styles.staticInputWithIcon}
                value={mobile}
                onChangeText={setMobile}
                placeholder="Enter mobile number"
                placeholderTextColor="#52525B"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>
          {/* Action Buttons - CLEAR left, SAVE REPORT right */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleClear}
            >
              <Text style={styles.clearButtonText}>CLEAR</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.saveReportButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>SAVE REPORT</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* QR SCANNER MODAL */}
      {showQRScanner && device && hasPermission && (
        <Modal
          visible={showQRScanner}
          animationType="slide"
          onRequestClose={() => {
            setShowQRScanner(false);
            setIsActive(false);
            setScannedData(null);
          }}
        >
          <SafeAreaView style={styles.scanRoot} edges={['top']}>
            <View style={styles.cameraContainer}>
              <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive && showQRScanner}
                codeScanner={codeScanner}
                torch={torchOn ? 'on' : 'off'}
                onInitialized={() => setCameraReady(true)}
                onError={error => {
                  console.log('Camera error:', error);
                  Alert.alert('Camera Error', 'Failed to initialize camera');
                }}
              />

              {/* Rest of the overlay remains the same */}
              <View style={styles.overlay}>
                <View style={styles.container}>
                  <View style={styles.frameWrapper}>
                    <View style={styles.frame}>
                      <View style={[styles.corner, styles.tl]} />
                      <View style={[styles.corner, styles.tr]} />
                      <View style={[styles.corner, styles.bl]} />
                      <View style={[styles.corner, styles.br]} />

                      <Animated.View
                        style={[
                          styles.scanLine,
                          { transform: [{ translateY }] },
                        ]}
                      />
                    </View>

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

                    <View style={styles.textBlock}>
                      <Text style={styles.title}>Scan Patient QR Code</Text>
                      <Text style={styles.subtitle}>
                        {isActive ? 'Scanning…' : 'Processing…'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.qrCloseBtn}
                onPress={() => {
                  setShowQRScanner(false);
                  setIsActive(false);
                  setScannedData(null);
                }}
              >
                <X size={24} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* DEVICE PICKER BOTTOM SHEET */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closeSheet()}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => closeSheet()}
        />

        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: sheetAnim }] },
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
          ]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Select BMI Device</Text>
              <Text style={styles.sheetSubtitle}>
                {devicesLoading
                  ? 'Scanning paired devices...'
                  : `${pairedDevices.length} paired device${
                      pairedDevices.length !== 1 ? 's' : ''
                    } found`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => closeSheet()}
            >
              <X size={20} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {devicesLoading ? (
            <View style={styles.sheetLoading}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.sheetLoadingText}>
                Fetching paired devices...
              </Text>
            </View>
          ) : pairedDevices.length === 0 ? (
            <View style={styles.sheetEmpty}>
              <Bluetooth size={40} color="#3F3F46" strokeWidth={1.5} />
              <Text style={styles.sheetEmptyTitle}>No Paired Devices</Text>
              <Text style={styles.sheetEmptyText}>
                Go to phone Settings → Bluetooth and pair your BMI machine
                first.
              </Text>
            </View>
          ) : (
            <FlatList
              data={pairedDevices}
              keyExtractor={item => item.address}
              style={styles.deviceList}
              ItemSeparatorComponent={DeviceSeparator}
              renderItem={({ item }) => {
                const isSelected = currentDevice?.address === item.address;
                return (
                  <TouchableOpacity
                    style={[
                      styles.deviceRow,
                      isSelected && styles.deviceRowSelected,
                    ]}
                    onPress={() => handleDeviceSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.deviceIconWrap,
                        isSelected && styles.deviceIconWrapSelected,
                      ]}
                    >
                      <Bluetooth
                        size={18}
                        color={isSelected ? '#10B981' : '#71717A'}
                        strokeWidth={2.5}
                      />
                    </View>

                    <View style={styles.deviceInfo}>
                      <Text
                        style={[
                          styles.deviceName,
                          isSelected && styles.deviceNameSelected,
                        ]}
                      >
                        {item.name || 'Unknown Device'}
                      </Text>
                      <Text style={styles.deviceAddress}>{item.address}</Text>
                    </View>

                    <View style={styles.deviceRight}>
                      <View style={styles.pairedBadge}>
                        <Text style={styles.pairedBadgeText}>Paired</Text>
                      </View>
                      <ChevronRight
                        size={16}
                        color="#52525B"
                        strokeWidth={2.5}
                      />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },

  bluetoothBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  bluetoothBtnOff: {
    backgroundColor: 'rgba(113,113,122,0.12)',
    borderColor: 'rgba(113,113,122,0.25)',
  },
  bluetoothBtnConnecting: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  bluetoothBtnConnected: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.3)',
  },

  scroll: { paddingBottom: 10 },

  dataSheet: {
    backgroundColor: '#1C1C21',
    borderRadius: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginHorizontal: 0,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },

  clearButton: {
    flex: 0.38,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E24B4A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modeToggleContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },
  modeTogglePill: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 4,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(127, 119, 221, 0.2)',
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeBtnActive: { backgroundColor: '#7F77DD' },
  modeBtnText: { color: '#71717A', fontSize: 13, fontWeight: '500' },
  modeBtnTextActive: { color: '#fff', fontSize: 13, fontWeight: '500' },

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ NEW: SIMPLE SEARCH INPUT FIELD STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#E4E4E7',
    fontSize: 15,
    fontWeight: '500',
  },
  // ═══════════════════════════════════════════════════════════════════════════

  dataFieldsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },

  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  calculatedRow: { flexDirection: 'row', gap: 8 },
  field: { flex: 1 },
  fieldThirdSmall: { flex: 0.8 },
  fieldThirdLarge: { flex: 1.3 },
  fieldThirdSmaller: { flex: 0.9 },
  fieldFull: { marginBottom: 12 },

  autoLabel: {
    color: '#AFA9EC',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  autoInputWrapper: {
    backgroundColor: 'rgba(127, 119, 221, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(127, 119, 221, 0.4)',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    shadowColor: 'rgba(127, 119, 221, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    paddingHorizontal: 14,
  },
  autoInput: {
    color: '#E4E4E7',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'left',
    opacity: 1,
  },
  autoInputPlaceholder: {
    color: '#52525B',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'left',
    opacity: 0.4,
  },
  autoResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(127, 119, 221, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(127, 119, 221, 0.4)',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    shadowColor: 'rgba(127, 119, 221, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  autoResultPlaceholder: {
    color: '#52525B',
    fontSize: 18,
    fontWeight: '800',
    opacity: 0.4,
  },
  autoResultValue: { color: '#E4E4E7', fontSize: 18, fontWeight: '800' },
  autoResultUnit: {
    color: '#E4E4E7',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  bmiStatusText: { fontSize: 14 },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW QR SCANNER STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  qrScannerContainerNew: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    alignItems: 'center',
  },

  qrScanAreaNew: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },

  qrGradientBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 20,
  },

  // Corner Brackets (Top-Left)
  qrCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderLeftWidth: 5,
    borderTopWidth: 5,
    borderColor: '#B4F34A',
    borderTopLeftRadius: 14,
  },

  // Corner Brackets (Top-Right)
  qrCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderColor: '#B4F34A',
    borderTopRightRadius: 14,
  },

  // Corner Brackets (Bottom-Left)
  qrCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderLeftWidth: 5,
    borderBottomWidth: 5,
    borderColor: '#B4F34A',
    borderBottomLeftRadius: 14,
  },

  // Corner Brackets (Bottom-Right)
  qrCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderColor: '#B4F34A',
    borderBottomRightRadius: 14,
  },

  qrIconWrapperNew: {
    position: 'relative',
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  qrTapText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  qrInstructions: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    lineHeight: 14,
  },
  // ═══════════════════════════════════════════════════════════════════════════

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: 'rgba(16, 185, 129, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  successText: { color: '#10B981', fontSize: 14, fontWeight: '600' },

  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.9 }],
  },

  manualSection: { paddingHorizontal: 20, paddingTop: 16 },
  staticLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  staticInputWrapper: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
  },
  staticInput: {
    color: '#E4E4E7',
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 14,
  },
  staticInputWrapperWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    gap: 10,
  },
  staticInputWithIcon: {
    flex: 1,
    color: '#E4E4E7',
    fontSize: 15,
    fontWeight: '500',
  },
  staticDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
  },
  staticDropdownText: { color: '#E4E4E7', fontSize: 15, fontWeight: '500' },

  saveReportButton: {
    flex: 0.62,
    backgroundColor: '#7c3aed',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  dropdown: {
    position: 'absolute',
    top: 22,
    left: 0,
    right: 0,
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  dropdownItemText: { color: '#E4E4E7', fontSize: 15, fontWeight: '500' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  saveBtnText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingBottom: 20,
  },

  scanRoot: { flex: 1, backgroundColor: '#0A0A0A' },
  cameraContainer: { flex: 1, backgroundColor: '#020617' },
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
  frameWrapper: { alignItems: 'center', marginBottom: 80 },
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
  textBlock: { marginTop: 20, alignItems: 'center' },
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
  qrCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.72,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3F3F46',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  sheetTitle: { color: '#FAFAFA', fontSize: 18, fontWeight: '800' },
  sheetSubtitle: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetLoading: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  sheetLoadingText: { color: '#71717A', fontSize: 14 },
  sheetEmpty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  sheetEmptyTitle: { color: '#FAFAFA', fontSize: 17, fontWeight: '700' },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  clearButtonText: {
    color: '#E24B4A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sheetEmptyText: {
    color: '#71717A',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  deviceList: { paddingHorizontal: 16, paddingTop: 8 },
  deviceSeparator: {
    height: 1,
    backgroundColor: '#27272A',
    marginHorizontal: 4,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  deviceRowSelected: { backgroundColor: 'rgba(16,185,129,0.06)' },
  deviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceIconWrapSelected: { backgroundColor: 'rgba(16,185,129,0.15)' },
  deviceInfo: { flex: 1 },
  deviceName: { color: '#FAFAFA', fontSize: 15, fontWeight: '700' },
  deviceNameSelected: { color: '#10B981' },
  deviceAddress: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  deviceRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pairedBadge: {
    backgroundColor: '#27272A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pairedBadgeText: { color: '#71717A', fontSize: 11, fontWeight: '700' },
});
