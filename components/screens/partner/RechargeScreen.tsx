/* eslint-disable react-native/no-inline-styles */
/**
 * MySehaat – BMI Kiosk Recharge Screen
 *
 * Flow:
 *  1. User taps BT icon (top-right of Kiosk Recharge card)
 *  2. Bottom sheet slides up → shows all paired BT devices
 *  3. User taps a device → sheet closes → auto-connects + sends "R"
 *  4. Amount input appears
 *  5. Pre-deduction wallet check → encrypt & send amount → wait for ACK
 *  6. ACK received → deduct wallet → show success
 */

import React, {
  useState,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Wallet,
  Plus,
  Bluetooth,
  ChevronRight,
  AlertCircle,
  X,
  Smartphone,
  BluetoothSearching,
} from 'lucide-react-native';
import { BluetoothDevice } from 'react-native-bluetooth-classic';

import {
  encryptAmount,
  decryptAck,
  getPairedDevices,
  connectToDevice,
  waitForAck,
} from '../../../store/services/KioskBluetoothService';

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const RECHARGE_CMD   = 'R';
const MAX_CREDIT     = 50_000;
const LOW_BAL_WARN   = 500;
const SCREEN_HEIGHT  = Dimensions.get('window').height;

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
type Stage =
  | 'idle'
  | 'connecting'
  | 'awaitAmount'
  | 'sending'
  | 'success'
  | 'error';

type Props = { navigation: any };

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────
export default function RechargeScreen({ navigation }: Props) {
  const insets   = useSafeAreaInsets();


  // ── Wallet state ──
  const [walletBalance, setWalletBalance] = useState<number>(10000); // ← replace with Redux
  const [walletLoading, setWalletLoading] = useState(false);
  const [addingCredit, setAddingCredit]   = useState(false);

  // ── Recharge stage ──
  const [stage, setStage]         = useState<Stage>('idle');
  const [amount, setAmount]       = useState('');
  const [confirmed, setConfirmed] = useState<number | null>(null);
  const [errorMsg, setErrorMsg]   = useState('');

  // ── Device picker state ──
  const [pickerVisible, setPickerVisible]     = useState(false);
  const [pairedDevices, setPairedDevices]     = useState<BluetoothDevice[]>([]);
  const [devicesLoading, setDevicesLoading]   = useState(false);
  const [selectedDevice, setSelectedDevice]   = useState<BluetoothDevice | null>(null);

  // ── Bottom sheet animation ──
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // ── Active BT connection ──
  const deviceRef  = useRef<BluetoothDevice | null>(null);
  const isMounted  = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ─────────────────────────────────────────────
  //  Bottom sheet helpers
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  //  BT Permissions
  // ─────────────────────────────────────────────
  const requestBTPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 31) {
      const r = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ]);
      return (
        r[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted' &&
        r[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]    === 'granted'
      );
    }
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return r === 'granted';
  };

  const disconnectDevice = async () => {
    try {
      if (deviceRef.current) {
        await deviceRef.current.disconnect();
        deviceRef.current = null;
      }
    } catch (_) {}
  };

  // ─────────────────────────────────────────────
  //  Open BT device picker
  // ─────────────────────────────────────────────
  const handleOpenPicker = async () => {
    const ok = await requestBTPermission();
    if (!ok) {
      Alert.alert('Permission Denied', 'Bluetooth permission is required.');
      return;
    }

    // Reset sheet list and open
    setPairedDevices([]);
    setDevicesLoading(true);
    openSheet();

    try {
      const devices = await getPairedDevices();
      if (isMounted.current) setPairedDevices(devices);
    } catch (err: any) {
      if (isMounted.current) {
        Alert.alert('Error', err?.message ?? 'Could not fetch paired devices');
        closeSheet();
      }
    } finally {
      if (isMounted.current) setDevicesLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  //  Device selected → auto-connect + send "R"
  // ─────────────────────────────────────────────
  const handleDeviceSelect = (device: BluetoothDevice) => {
    // Close sheet first, then start connecting
    closeSheet(async () => {
      if (!isMounted.current) return;

      setSelectedDevice(device);
      setStage('connecting');
      setErrorMsg('');

      try {
        const connected = await connectToDevice(device);
        deviceRef.current = connected;

        // Send "R" initiation command
        await connected.write(RECHARGE_CMD);

        if (isMounted.current) setStage('awaitAmount');
      } catch (err: any) {
        await disconnectDevice();
        if (isMounted.current) {
          setErrorMsg(err?.message ?? 'Connection failed');
          setStage('error');
        }
      }
    });
  };

  // ─────────────────────────────────────────────
  //  Send encrypted amount → wait for ACK → deduct
  // ─────────────────────────────────────────────
  const handleSendAmount = async () => {
    const parsed = parseInt(amount, 10);

    if (isNaN(parsed) || parsed <= 0 || parsed > MAX_CREDIT) {
      Alert.alert('Invalid Amount', `Enter a value between 1 and ${MAX_CREDIT}.`);
      return;
    }

    if (parsed > walletBalance) {
      Alert.alert(
        'Insufficient Balance',
        `Your wallet balance (₹${walletBalance.toLocaleString('en-IN')}) is less than ₹${parsed}. Please add credit first.`,
        [
          { text: 'Add Credit', onPress: handleAddCredit },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    if (!deviceRef.current) {
      setErrorMsg('Kiosk connection lost. Please select the device again.');
      setStage('error');
      return;
    }

    setStage('sending');

    try {
      const device  = deviceRef.current;
      const payload = encryptAmount(parsed);
      await device.write(payload);

      // Wait for kiosk ACK
      const rawAck       = await waitForAck(device);
      const confirmedAmt = decryptAck(rawAck);

      // ✅ ACK received — deduct from wallet
      // await dispatch(deductWalletCredit({ amount: confirmedAmt })).unwrap();
      setWalletBalance(prev => prev - confirmedAmt); // ← stub

      if (isMounted.current) {
        setConfirmed(confirmedAmt);
        setStage('success');
      }
    } catch (err: any) {
      if (isMounted.current) {
        setErrorMsg(err?.message ?? 'Recharge failed');
        setStage('error');
      }
    } finally {
      await disconnectDevice();
    }
  };

  // ─────────────────────────────────────────────
  //  Add Credit via Razorpay
  // ─────────────────────────────────────────────
  const handleAddCredit = async () => {
    Alert.prompt(
      'Add Credit',
      'Enter amount to add (₹)',
      async input => {
        const topUp = parseInt(input, 10);
        if (isNaN(topUp) || topUp <= 0) { Alert.alert('Invalid amount'); return; }
        setAddingCredit(true);
        try {
          // await RazorpayCheckout.open({ ... });
          // await dispatch(addWalletCredit({ amount: topUp, ...paymentIds })).unwrap();
          setWalletBalance(prev => prev + topUp);
          Alert.alert('Success', `₹${topUp.toLocaleString('en-IN')} added!`);
        } catch (err: any) {
          if (err?.code !== 'PAYMENT_CANCELLED') {
            Alert.alert('Payment Failed', err?.description ?? 'Try again.');
          }
        } finally {
          if (isMounted.current) setAddingCredit(false);
        }
      },
      'plain-text', '', 'numeric',
    );
  };

  // ─────────────────────────────────────────────
  //  Reset everything
  // ─────────────────────────────────────────────
  const handleReset = async () => {
    await disconnectDevice();
    setAmount('');
    setConfirmed(null);
    setErrorMsg('');
    setSelectedDevice(null);
    setStage('idle');
  };

  // ─────────────────────────────────────────────
  //  Derived
  // ─────────────────────────────────────────────
  const parsedAmount   = parseInt(amount, 10);
  const isInsufficient = !isNaN(parsedAmount) && parsedAmount > walletBalance;
  const isLowBalance   = walletBalance > 0 && walletBalance <= LOW_BAL_WARN;

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BMI Kiosk Recharge</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 24 + (insets.bottom > 0 ? insets.bottom : 0) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ══════════════════════════════════════════ */}
        {/* WALLET CREDIT BANNER                       */}
        {/* ══════════════════════════════════════════ */}
        <View style={styles.walletCard}>
          <View style={styles.walletTop}>
            <View style={styles.iconWrap}>
              <Wallet size={20} color="#10B981" strokeWidth={2.5} />
            </View>
            <Text style={styles.walletLabel}>Available Credit</Text>
            {walletLoading && <ActivityIndicator size="small" color="#10B981" style={{ marginLeft: 8 }} />}
          </View>

          <View style={styles.walletBottom}>
            <View>
              <Text style={styles.walletAmount}>
                {walletLoading ? '—' : `₹${walletBalance.toLocaleString('en-IN')}`}
              </Text>
              {isLowBalance && (
                <View style={styles.lowBalRow}>
                  <AlertCircle size={12} color="#F59E0B" />
                  <Text style={styles.lowBalText}>Low balance</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.addCreditBtn, addingCredit && { opacity: 0.6 }]}
              onPress={handleAddCredit}
              disabled={addingCredit}
            >
              {addingCredit
                ? <ActivityIndicator size="small" color="#0A0A0A" />
                : <>
                    <Plus size={16} color="#0A0A0A" strokeWidth={3} />
                    <Text style={styles.addCreditText}>Add Credit</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════════════════════════════════════════ */}
        {/* KIOSK RECHARGE CARD                        */}
        {/* ══════════════════════════════════════════ */}
        <View style={styles.rechargeCard}>

          {/* Card header — title left, BT icon right */}
          <View style={styles.rechargeCardHeader}>
            <View style={styles.rechargeCardHeaderLeft}>
              <View style={styles.iconWrap}>
                <Bluetooth size={18} color="#10B981" strokeWidth={2.5} />
              </View>
              <View>
                <Text style={styles.rechargeCardTitle}>Kiosk Recharge</Text>
                {/* Show selected device name when one is picked */}
                {selectedDevice && stage !== 'idle' && (
                  <Text style={styles.selectedDeviceName} numberOfLines={1}>
                    {selectedDevice.name ?? selectedDevice.address}
                  </Text>
                )}
              </View>
            </View>

            {/* ✅ BT picker icon — only shown in idle stage */}
            {stage === 'idle' && (
              <TouchableOpacity
                style={styles.btPickerBtn}
                onPress={handleOpenPicker}
                activeOpacity={0.7}
              >
                <BluetoothSearching size={20} color="#10B981" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── idle ── */}
          {stage === 'idle' && (
            <>
              {selectedDevice ? (
                // Device selected — show connect button
                <>
                  <View style={styles.selectedDeviceBadge}>
                    <Smartphone size={14} color="#10B981" strokeWidth={2.5} />
                    <Text style={styles.selectedDeviceBadgeText} numberOfLines={1}>
                      {selectedDevice.name ?? selectedDevice.address}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryBtn, walletBalance === 0 && styles.primaryBtnDisabled]}
                    onPress={() => handleDeviceSelect(selectedDevice)}
                    disabled={walletBalance === 0}
                  >
                    <Text style={styles.primaryBtnText}>Initiate Recharge</Text>
                    <ChevronRight size={18} color="#0A0A0A" strokeWidth={3} />
                  </TouchableOpacity>
                </>
              ) : (
                // No device selected yet
                <>
                  <Text style={styles.rechargeHint}>
                    Tap the{' '}
                    <Text style={{ color: '#10B981', fontWeight: '700' }}>
                      Bluetooth icon
                    </Text>{' '}
                    above to select your BMI kiosk and start recharging.
                  </Text>
                  <TouchableOpacity
                    style={styles.btSelectBtn}
                    onPress={handleOpenPicker}
                  >
                    <BluetoothSearching size={18} color="#10B981" strokeWidth={2.5} />
                    <Text style={styles.btSelectBtnText}>Select Kiosk Device</Text>
                  </TouchableOpacity>
                </>
              )}

              {walletBalance === 0 && (
                <Text style={styles.noBalHint}>
                  Add credit to your wallet to recharge the kiosk.
                </Text>
              )}
            </>
          )}

          {/* ── connecting ── */}
          {stage === 'connecting' && (
            <View style={styles.statusRow}>
              <ActivityIndicator color="#10B981" />
              <Text style={styles.statusText}>
                Connecting to {selectedDevice?.name ?? 'device'}...
              </Text>
            </View>
          )}

          {/* ── awaitAmount ── */}
          {stage === 'awaitAmount' && (
            <View style={styles.amountSection}>
              <View style={styles.connectedBadge}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>
                  {selectedDevice?.name ?? 'Device'} connected
                </Text>
              </View>

              <Text style={styles.inputLabel}>Recharge Amount (₹)</Text>
              <TextInput
                style={[styles.amountInput, isInsufficient && styles.amountInputError]}
                keyboardType="numeric"
                placeholder="e.g. 500"
                placeholderTextColor="#52525B"
                value={amount}
                onChangeText={setAmount}
                maxLength={5}
                autoFocus
              />

              {amount.length > 0 && (
                <View style={styles.balFeedbackRow}>
                  {isInsufficient ? (
                    <>
                      <AlertCircle size={13} color="#EF4444" />
                      <Text style={styles.balFeedbackError}>
                        Insufficient · ₹{walletBalance.toLocaleString('en-IN')} available
                      </Text>
                    </>
                  ) : (
                    !isNaN(parsedAmount) && parsedAmount > 0 && (
                      <Text style={styles.balFeedbackOk}>
                        Balance after: ₹{(walletBalance - parsedAmount).toLocaleString('en-IN')}
                      </Text>
                    )
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (isInsufficient || amount === '') && styles.primaryBtnDisabled,
                ]}
                onPress={handleSendAmount}
                disabled={isInsufficient || amount === ''}
              >
                <Text style={styles.primaryBtnText}>Send Amount</Text>
                <ChevronRight size={18} color="#0A0A0A" strokeWidth={3} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={handleReset}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── sending ── */}
          {stage === 'sending' && (
            <View style={styles.statusRow}>
              <ActivityIndicator color="#10B981" />
              <Text style={styles.statusText}>Sending to kiosk, please wait...</Text>
            </View>
          )}

          {/* ── success ── */}
          {stage === 'success' && confirmed !== null && (
            <View style={styles.resultBox}>
              <Text style={styles.resultIcon}>✅</Text>
              <Text style={styles.resultTitle}>Recharge Successful</Text>
              <Text style={styles.resultSub}>Kiosk confirmed</Text>
              <Text style={styles.resultAmount}>
                ₹{confirmed.toLocaleString('en-IN')}
              </Text>
              <View style={styles.resultBalRow}>
                <Text style={styles.resultBalLabel}>Wallet balance</Text>
                <Text style={styles.resultBalValue}>
                  ₹{walletBalance.toLocaleString('en-IN')}
                </Text>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleReset}>
                <Text style={styles.primaryBtnText}>New Recharge</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── error ── */}
          {stage === 'error' && (
            <View style={styles.resultBox}>
              <Text style={styles.resultIcon}>❌</Text>
              <Text style={[styles.resultTitle, { color: '#EF4444' }]}>
                Recharge Failed
              </Text>
              <Text style={styles.errorDetail}>{errorMsg}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleReset}>
                <Text style={styles.primaryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════ */}
      {/* BT DEVICE PICKER BOTTOM SHEET                      */}
      {/* ══════════════════════════════════════════════════ */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closeSheet()}
      >
        {/* Dim overlay — tap to dismiss */}
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
          {/* Sheet handle */}
          <View style={styles.sheetHandle} />

          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Select Kiosk Device</Text>
              <Text style={styles.sheetSubtitle}>
                {devicesLoading
                  ? 'Scanning paired devices...'
                  : `${pairedDevices.length} paired device${pairedDevices.length !== 1 ? 's' : ''} found`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => closeSheet()}
            >
              <X size={20} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Device list */}
          {devicesLoading ? (
            <View style={styles.sheetLoading}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.sheetLoadingText}>Fetching paired devices...</Text>
            </View>
          ) : pairedDevices.length === 0 ? (
            <View style={styles.sheetEmpty}>
              <Bluetooth size={40} color="#3F3F46" strokeWidth={1.5} />
              <Text style={styles.sheetEmptyTitle}>No Paired Devices</Text>
              <Text style={styles.sheetEmptyText}>
                Go to phone Settings → Bluetooth and pair your BMI kiosk first.
              </Text>
            </View>
          ) : (
            <FlatList
              data={pairedDevices}
              keyExtractor={item => item.address}
              style={styles.deviceList}
              // eslint-disable-next-line react/no-unstable-nested-components
              ItemSeparatorComponent={() => <View style={styles.deviceSeparator} />}
              renderItem={({ item }) => {
                const isSelected = selectedDevice?.address === item.address;
                return (
                  <TouchableOpacity
                    style={[styles.deviceRow, isSelected && styles.deviceRowSelected]}
                    onPress={() => handleDeviceSelect(item)}
                    activeOpacity={0.7}
                  >
                    {/* Device icon */}
                    <View style={[
                      styles.deviceIconWrap,
                      isSelected && styles.deviceIconWrapSelected,
                    ]}>
                      <Bluetooth
                        size={18}
                        color={isSelected ? '#10B981' : '#71717A'}
                        strokeWidth={2.5}
                      />
                    </View>

                    {/* Device info */}
                    <View style={styles.deviceInfo}>
                      <Text style={[styles.deviceName, isSelected && styles.deviceNameSelected]}>
                        {item.name ?? 'Unknown Device'}
                      </Text>
                      <Text style={styles.deviceAddress}>{item.address}</Text>
                    </View>

                    {/* Paired badge + chevron */}
                    <View style={styles.deviceRight}>
                      <View style={styles.pairedBadge}>
                        <Text style={styles.pairedBadgeText}>Paired</Text>
                      </View>
                      <ChevronRight size={16} color="#52525B" strokeWidth={2.5} />
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

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },

  // Header
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#27272A', backgroundColor: '#09090B',
  },
  headerBtn:   { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FAFAFA' },

  scroll: { padding: 16, gap: 16 },

  // Shared icon wrap
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Wallet card ──
  walletCard: {
    backgroundColor: '#18181B', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#27272A', gap: 16,
  },
  walletTop:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletLabel:  { color: '#A1A1AA', fontSize: 14, fontWeight: '600', flex: 1 },
  walletBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  walletAmount: { color: '#FAFAFA', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  lowBalRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  lowBalText:   { color: '#F59E0B', fontSize: 12, fontWeight: '600' },
  addCreditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#10B981', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  addCreditText: { color: '#0A0A0A', fontSize: 14, fontWeight: '800' },

  // ── Recharge card ──
  rechargeCard: {
    backgroundColor: '#18181B', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#27272A', gap: 16,
  },
  rechargeCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  rechargeCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rechargeCardTitle:      { color: '#FAFAFA', fontSize: 16, fontWeight: '700' },
  selectedDeviceName:     { color: '#71717A', fontSize: 12, fontWeight: '500', marginTop: 2 },

  // BT picker icon button (top-right of card)
  btPickerBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.12)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
  },

  rechargeHint: { color: '#71717A', fontSize: 14, lineHeight: 20 },

  // "Select Kiosk Device" button (idle, no device selected)
  btSelectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#10B981', borderRadius: 14,
    paddingVertical: 14, borderStyle: 'dashed',
  },
  btSelectBtnText: { color: '#10B981', fontSize: 15, fontWeight: '700' },

  // Selected device badge (idle, device already chosen)
  selectedDeviceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
  },
  selectedDeviceBadgeText: { color: '#10B981', fontSize: 14, fontWeight: '600', flex: 1 },

  noBalHint: { color: '#52525B', fontSize: 13, textAlign: 'center' },

  // Primary button
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 16, gap: 6,
  },
  primaryBtnDisabled: { backgroundColor: '#27272A' },
  primaryBtnText:     { color: '#0A0A0A', fontSize: 16, fontWeight: '800' },

  cancelBtn: {
    borderWidth: 1, borderColor: '#27272A', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { color: '#71717A', fontSize: 15, fontWeight: '600' },

  // Status
  statusRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 12, paddingVertical: 8,
  },
  statusText: { color: '#A1A1AA', fontSize: 15 },

  // Amount input
  amountSection:    { gap: 12 },
  connectedBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connectedDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  connectedText:    { color: '#10B981', fontSize: 13, fontWeight: '600' },
  inputLabel:       { color: '#A1A1AA', fontSize: 14, fontWeight: '600' },
  amountInput: {
    backgroundColor: '#0A0A0A', color: '#FAFAFA', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 22, fontWeight: '800',
    borderWidth: 1, borderColor: '#27272A',
  },
  amountInputError:  { borderColor: '#EF4444' },
  balFeedbackRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balFeedbackError:  { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  balFeedbackOk:     { color: '#10B981', fontSize: 13, fontWeight: '600' },

  // Result
  resultBox:      { alignItems: 'center', gap: 8, paddingVertical: 8 },
  resultIcon:     { fontSize: 44 },
  resultTitle:    { color: '#10B981', fontSize: 20, fontWeight: '800' },
  resultSub:      { color: '#71717A', fontSize: 14 },
  resultAmount:   { color: '#FAFAFA', fontSize: 36, fontWeight: '900', letterSpacing: -1, marginBottom: 4 },
  resultBalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', backgroundColor: '#0A0A0A', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#27272A',
  },
  resultBalLabel: { color: '#71717A', fontSize: 14, fontWeight: '600' },
  resultBalValue: { color: '#FAFAFA', fontSize: 15, fontWeight: '800' },
  errorDetail:    { color: '#A1A1AA', fontSize: 13, textAlign: 'center' },

  // ── Bottom sheet ──
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.72,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#3F3F46', alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#27272A',
  },
  sheetTitle:    { color: '#FAFAFA', fontSize: 18, fontWeight: '800' },
  sheetSubtitle: { color: '#71717A', fontSize: 13, fontWeight: '500', marginTop: 2 },
  sheetCloseBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#27272A', justifyContent: 'center', alignItems: 'center',
  },

  // Loading / empty states inside sheet
  sheetLoading: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  sheetLoadingText: { color: '#71717A', fontSize: 14 },
  sheetEmpty:    { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 12 },
  sheetEmptyTitle: { color: '#FAFAFA', fontSize: 17, fontWeight: '700' },
  sheetEmptyText:  { color: '#71717A', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Device list
  deviceList:      { paddingHorizontal: 16, paddingTop: 8 },
  deviceSeparator: { height: 1, backgroundColor: '#27272A', marginHorizontal: 4 },
  deviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4, borderRadius: 12,
  },
  deviceRowSelected: { backgroundColor: 'rgba(16,185,129,0.06)' },
  deviceIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#27272A',
    justifyContent: 'center', alignItems: 'center',
  },
  deviceIconWrapSelected: { backgroundColor: 'rgba(16,185,129,0.15)' },
  deviceInfo:    { flex: 1 },
  deviceName:    { color: '#FAFAFA', fontSize: 15, fontWeight: '700' },
  deviceNameSelected: { color: '#10B981' },
  deviceAddress: { color: '#71717A', fontSize: 12, fontWeight: '500', marginTop: 2 },
  deviceRight:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pairedBadge: {
    backgroundColor: '#27272A', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pairedBadgeText: { color: '#71717A', fontSize: 11, fontWeight: '700' },
});