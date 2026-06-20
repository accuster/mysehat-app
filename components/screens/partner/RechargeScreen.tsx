/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-native/no-inline-styles */
/**
 * MySehat – BMI Kiosk Recharge Screen (PRODUCTION-GRADE)
 *
 * Wired to:
 *  - partnerWallet slice (balance, top-up via Razorpay)
 *  - machineRecharge slice (initiate → BT exchange → confirm/fail state machine)
 *
 * Flow (Add Credit):
 *  1. User enters amount → dispatch createPartnerRechargeOrder
 *  2. Server returns Razorpay order_id + key_id
 *  3. Open RazorpayCheckout → user pays via UPI/card
 *  4. On success → dispatch verifyPartnerRechargePayment → wallet auto-updates
 *
 * Flow (Kiosk Recharge):
 *  1. Header BT icon → opens device picker (off · connecting · connected)
 *  2. Initiate recharge → BT 'R' command (opens picker if not connected)
 *  3. Enter amount → dispatch initiateMachineRecharge (server creates row)
 *  4. Send BT encrypted amount → wait for ACK
 *  5a. ACK → dispatch confirmMachineRecharge → wallet debited atomically
 *  5b. Timeout/error → dispatch failMachineRecharge (no debit)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
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
  Zap,
  ChevronRight,
  AlertCircle,
  X,
  Lock,
  CheckCircle2,
  XCircle,
  Bluetooth,
  BluetoothConnected,
  BluetoothSearching,
  BluetoothOff,
} from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';

// Hooks
import { useBluetooth } from '../../../hooks/useBluetooth';
import { useToast } from '../../../contexts/ToastContext';
import { COLORS } from '../../../theme/colors';

// Redux
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import {
  fetchPartnerWalletBalance,
  createPartnerRechargeOrder,
  verifyPartnerRechargePayment,
} from '../../../store/slices/partnerWalletSlice';
import {
  initiateMachineRecharge,
  confirmMachineRecharge,
  failMachineRecharge,
} from '../../../store/slices/machineRechargeSlice';

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const MAX_CREDIT = 50_000;
const LOW_BAL_WARN = 500;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const BT_OFF = COLORS.textMuted;
const BT_CONNECTING = '#F59E0B';
const BT_CONNECTED = '#10B981';

// Razorpay error code for user-cancellation (varies by SDK version, handle both)
const RZP_CANCELLED_CODES = ['PAYMENT_CANCELLED', 2, '2'];

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
type Stage =
  | 'idle'
  | 'initiating'
  | 'awaitAmount'
  | 'sending'
  | 'success'
  | 'error';

type RechargeNavigation = {
  goBack: () => void;
  navigate: (screen: string, params?: object) => void;
};
type Props = { navigation: RechargeNavigation };

type BTDevice = Parameters<ReturnType<typeof useBluetooth>['connect']>[0];

// ─────────────────────────────────────────────
//  Header Bluetooth button
// ─────────────────────────────────────────────
type BTButtonProps = {
  onPress: () => void;
  isConnected: boolean;
  isConnecting: boolean;
};

const HeaderBluetoothButton = ({
  onPress,
  isConnected,
  isConnecting,
}: BTButtonProps) => {
  const renderIcon = () => {
    if (isConnecting) {
      return <BluetoothSearching size={20} color={BT_CONNECTING} />;
    }
    if (isConnected) {
      return <BluetoothConnected size={20} color={BT_CONNECTED} />;
    }
    return <BluetoothOff size={20} color={BT_OFF} />;
  };

  const a11yLabel = isConnecting
    ? 'Bluetooth connecting'
    : isConnected
    ? 'Bluetooth connected, tap to manage device'
    : 'Bluetooth disconnected, tap to select a device';

  return (
    <Pressable
      onPress={onPress}
      style={styles.headerBtBtn}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      {renderIcon()}
    </Pressable>
  );
};

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────
export default function RechargeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  // ── Bluetooth ──
  const {
    isConnected,
    isConnecting,
    currentDevice,
    requestPermissions,
    getPairedDevices,
    connect,
    sendRechargeCommand,
    sendEncryptedAmount,
    setBMIMode,
  } = useBluetooth();

  const { showError, showWarning } = useToast();

  // ── Redux ──
  const dispatch = useAppDispatch();
  const walletBalance = useAppSelector(s => s.partnerWallet.walletBalance);
  const walletStatus = useAppSelector(s => s.partnerWallet.status);
  const balanceLoading = useAppSelector(s => s.partnerWallet.balanceLoading);
  const createOrderLoading = useAppSelector(
    s => s.partnerWallet.createOrderLoading,
  );
  const verifyLoading = useAppSelector(s => s.partnerWallet.verifyLoading);

  // Combined "Add credit in progress" — covers create-order → Razorpay → verify
  const [addingCredit, setAddingCredit] = useState(false);

  // ── Add-credit modal ──
  const [addCreditVisible, setAddCreditVisible] = useState(false);
  const [topUpInput, setTopUpInput] = useState('');

  // ── Recharge stage ──
  const [stage, setStage] = useState<Stage>('idle');
  const [amount, setAmount] = useState('');
  const [confirmed, setConfirmed] = useState<number | null>(null);
  const [confirmedUnits, setConfirmedUnits] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Device picker state ──
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pairedDevices, setPairedDevices] = useState<BTDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  // ── Bottom sheet animation ──
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const isMounted = useRef(true);

  // ── On mount: fetch wallet balance ──
  useEffect(() => {
    isMounted.current = true;
    dispatch(fetchPartnerWalletBalance());
    return () => {
      isMounted.current = false;
      setBMIMode();
    };
  }, [dispatch, setBMIMode]);

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
  //  Open BT device picker
  // ─────────────────────────────────────────────
  const handleOpenPicker = async () => {
    const ok = await requestPermissions();
    if (!ok) {
      showWarning('Bluetooth permission is required to connect a kiosk');
      return;
    }
    setPairedDevices([]);
    setDevicesLoading(true);
    openSheet();
    try {
      const devices = await getPairedDevices();
      if (isMounted.current) setPairedDevices(devices);
    } catch (err: any) {
      if (isMounted.current) {
        showError(err?.message ?? 'Could not fetch paired devices');
        closeSheet();
      }
    } finally {
      if (isMounted.current) setDevicesLoading(false);
    }
  };

  const handleDeviceSelect = (device: BTDevice) => {
    closeSheet(async () => {
      if (!isMounted.current) return;
      try {
        await connect(device);
      } catch (err: any) {
        showError(err?.message ?? 'Could not connect to the kiosk', {
          label: 'Retry',
          onPress: () => handleDeviceSelect(device),
        });
      }
    });
  };

  // ─────────────────────────────────────────────
  //  Initiate recharge → Send "R" command
  // ─────────────────────────────────────────────
  const handleInitiateRecharge = async () => {
    if (!isConnected) {
      showWarning('Connect a kiosk first using the Bluetooth icon above');
      return;
    }
    setStage('initiating');
    setErrorMsg('');
    try {
      await sendRechargeCommand();
      if (isMounted.current) setStage('awaitAmount');
    } catch (err: any) {
      if (isMounted.current) {
        setErrorMsg(err?.message ?? 'Failed to initiate recharge');
        setStage('error');
      }
    }
  };

  // ─────────────────────────────────────────────
  //  Send amount → /initiate → BT → /confirm or /fail
  // ─────────────────────────────────────────────
  const handleSendAmount = async () => {
    const parsed = parseInt(amount, 10);

    if (isNaN(parsed) || parsed <= 0 || parsed > MAX_CREDIT) {
      Alert.alert(
        'Invalid Amount',
        `Enter a value between 1 and ${MAX_CREDIT.toLocaleString('en-IN')}.`,
      );
      return;
    }

    if (parsed > walletBalance) {
      Alert.alert(
        'Insufficient Balance',
        `Your wallet balance (₹${walletBalance.toLocaleString(
          'en-IN',
        )}) is less than ₹${parsed}. Please add credit first.`,
        [
          { text: 'Add Credit', onPress: handleAddCredit },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    if (!currentDevice) {
      setErrorMsg('No device connected');
      setStage('error');
      return;
    }

    setStage('sending');

    let serverRechargeId: string | null = null;

    try {
      // ── Step 1: Server-side initiate (creates 'initiated' row, no debit) ──
      const initRes = await dispatch(
        initiateMachineRecharge({
          bt_device_address: currentDevice.address,
          bt_device_name: currentDevice.name ?? undefined,
          amount_rupees: parsed,
        }),
      ).unwrap();
      serverRechargeId = initRes.rechargeId;

      // ── Step 2: Send BT encrypted amount, wait for ACK ──
      const confirmedAmt = await sendEncryptedAmount(parsed);

      // ── Step 3: Server-side confirm (atomic debit + ledger entry) ──
      const confirmRes = await dispatch(
        confirmMachineRecharge({ rechargeId: serverRechargeId }),
      ).unwrap();
      // Note: confirmMachineRecharge thunk auto-dispatches setWalletBalance
      // on partnerWallet slice — balance updates instantly across the app.

      if (isMounted.current) {
        setConfirmed(confirmedAmt);
        setConfirmedUnits(confirmRes.unitsSent);
        setStage('success');
      }
    } catch (err: any) {
      // ── Failure handling ──
      // If we got past /initiate, mark the row failed on server (best-effort)
      if (serverRechargeId) {
        const errStr = String(err?.message ?? '').toLowerCase();
        const btStatus: 'ack_timeout' | 'failed' =
          errStr.includes('timeout') || errStr.includes('ack')
            ? 'ack_timeout'
            : 'failed';

        try {
          await dispatch(
            failMachineRecharge({
              rechargeId: serverRechargeId,
              btStatus,
              errorMessage: String(err?.message ?? 'Unknown').substring(0, 500),
            }),
          ).unwrap();
        } catch (failErr) {
          console.warn('Failed to mark recharge failed on server:', failErr);
        }
      }

      if (isMounted.current) {
        setErrorMsg(err?.message ?? err ?? 'Recharge failed');
        setStage('error');
      }
    }
  };

  // ─────────────────────────────────────────────
  //  Add Credit (Razorpay)
  // ─────────────────────────────────────────────
  const handleAddCredit = () => {
    setTopUpInput('');
    setAddCreditVisible(true);
  };

  const handleConfirmAddCredit = async () => {
    const topUp = parseInt(topUpInput, 10);

    if (isNaN(topUp) || topUp <= 0) {
      Alert.alert(
        'Invalid amount',
        'Please enter a valid number greater than 0.',
      );
      return;
    }

    if (topUp > MAX_CREDIT) {
      Alert.alert(
        'Amount too high',
        `Maximum top-up is ₹${MAX_CREDIT.toLocaleString(
          'en-IN',
        )} per transaction.`,
      );
      return;
    }

    setAddCreditVisible(false);
    setAddingCredit(true);

    try {
      // ── Step 1: Create Razorpay order on server ──
      const order = await dispatch(
        createPartnerRechargeOrder({ amount: topUp }),
      ).unwrap();

      // ── Step 2: Open Razorpay checkout ──
      const rzpResult = await RazorpayCheckout.open({
        key: order.key_id,
        amount: order.amount, // already in paise from server
        currency: order.currency,
        order_id: order.razorpay_order_id,
        name: 'MySehat',
        description: `Wallet top-up ₹${order.cash_amount.toLocaleString(
          'en-IN',
        )}`,
        theme: { color: COLORS.primary },
      });

      // ── Step 3: Verify payment on server (credits wallet atomically) ──
      // Note: verifyPartnerRechargePayment thunk auto-updates walletBalance
      // in Redux. No need to re-fetch /balance.
      await dispatch(
        verifyPartnerRechargePayment({
          razorpay_order_id: rzpResult.razorpay_order_id,
          razorpay_payment_id: rzpResult.razorpay_payment_id,
          razorpay_signature: rzpResult.razorpay_signature,
          cash_amount: order.cash_amount,
        }),
      ).unwrap();

      if (isMounted.current) {
        Alert.alert(
          'Success',
          `₹${topUp.toLocaleString('en-IN')} added to your wallet!`,
        );
      }
    } catch (err: any) {
      // Razorpay returns its own error shape; thunk rejects return strings
      const errCode = err?.code;
      const errDesc = String(err?.description ?? '').toLowerCase();
      const isUserCancelled =
        RZP_CANCELLED_CODES.includes(errCode) || errDesc.includes('cancel');

      if (!isUserCancelled) {
        const msg =
          err?.description ??
          err?.message ??
          (typeof err === 'string' ? err : 'Payment failed. Please try again.');
        showError(msg);
      }
    } finally {
      if (isMounted.current) setAddingCredit(false);
    }
  };

  // ─────────────────────────────────────────────
  //  Reset
  // ─────────────────────────────────────────────
  const handleReset = async () => {
    setAmount('');
    setConfirmed(null);
    setConfirmedUnits(null);
    setErrorMsg('');
    setStage('idle');
    setBMIMode();
  };

  // ─────────────────────────────────────────────
  //  Derived
  // ─────────────────────────────────────────────
  const parsedAmount = parseInt(amount, 10);
  const isInsufficient = !isNaN(parsedAmount) && parsedAmount > walletBalance;
  const isLowBalance = walletBalance > 0 && walletBalance <= LOW_BAL_WARN;
  const isWalletFrozen = walletStatus !== 'active';

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>BMI Kiosk Recharge</Text>

        <HeaderBluetoothButton
          onPress={handleOpenPicker}
          isConnected={isConnected}
          isConnecting={isConnecting}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 24 + (insets.bottom > 0 ? insets.bottom : 0) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── WALLET HERO CARD ── */}
        <View style={styles.walletCard}>
          <View style={styles.walletTop}>
            <Wallet size={15} color="rgba(255,255,255,0.9)" strokeWidth={2.5} />
            <Text style={styles.walletLabel}>AVAILABLE CREDIT</Text>
            {balanceLoading && (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
            )}
          </View>

          <Text style={styles.walletAmount}>
            {balanceLoading ? '—' : `₹${walletBalance.toLocaleString('en-IN')}`}
          </Text>

          <View style={styles.walletBottom}>
            {isWalletFrozen ? (
              <View style={styles.lowBalRow}>
                <AlertCircle size={13} color="#FFFFFF" />
                <Text style={styles.walletSubLabel}>Wallet {walletStatus}</Text>
              </View>
            ) : isLowBalance ? (
              <View style={styles.lowBalRow}>
                <AlertCircle size={13} color="#FFFFFF" />
                <Text style={styles.walletSubLabel}>Low balance</Text>
              </View>
            ) : (
              <Text style={styles.walletSubLabel}>Wallet balance</Text>
            )}

            <TouchableOpacity
              style={[
                styles.addCreditBtn,
                (addingCredit || isWalletFrozen) && { opacity: 0.6 },
              ]}
              onPress={handleAddCredit}
              disabled={addingCredit || isWalletFrozen}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Add credit to wallet"
            >
              {addingCredit ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Plus
                    size={14}
                    color={COLORS.buttonPrimaryHover}
                    strokeWidth={3}
                  />
                  <Text style={styles.addCreditText}>Add credit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── KIOSK RECHARGE CARD ── */}
        <View style={styles.rechargeCard}>
          <View style={styles.rechargeCardHeader}>
            <View style={styles.iconWrap}>
              <Zap size={17} color={COLORS.primary} strokeWidth={2.5} />
            </View>
            <Text style={styles.rechargeCardTitle}>Kiosk recharge</Text>
          </View>

          {/* ── idle ── */}
          {stage === 'idle' && (
            <>
              <Text style={styles.rechargeHint}>
                {isConnected
                  ? 'Device is ready. Tap below to start the recharge.'
                  : 'Connect a kiosk using the Bluetooth icon above, then start the recharge.'}
              </Text>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (walletBalance === 0 || isWalletFrozen) &&
                    styles.primaryBtnDisabled,
                ]}
                onPress={handleInitiateRecharge}
                disabled={walletBalance === 0 || isWalletFrozen}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Initiate recharge"
              >
                <Text style={styles.primaryBtnText}>Initiate recharge</Text>
                <ChevronRight size={16} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>

              {walletBalance === 0 && !isWalletFrozen && (
                <Text style={styles.noBalHint}>
                  Add credit to your wallet to recharge the kiosk.
                </Text>
              )}
              {isWalletFrozen && (
                <Text style={styles.noBalHint}>
                  Your wallet is {walletStatus}. Please contact support.
                </Text>
              )}
            </>
          )}

          {/* ── initiating ── */}
          {stage === 'initiating' && (
            <View style={styles.statusRow}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.statusText}>Initializing recharge mode…</Text>
            </View>
          )}

          {/* ── awaitAmount ── */}
          {stage === 'awaitAmount' && (
            <View style={styles.amountSection}>
              <Text style={styles.inputLabel}>Recharge amount (₹)</Text>
              <TextInput
                style={[
                  styles.amountInput,
                  isInsufficient && styles.amountInputError,
                ]}
                keyboardType="numeric"
                placeholder="e.g. 500"
                placeholderTextColor={COLORS.textMuted}
                value={amount}
                onChangeText={setAmount}
                maxLength={5}
                autoFocus
                accessibilityLabel="Recharge amount in rupees"
              />

              {amount.length > 0 && (
                <View style={styles.balFeedbackRow}>
                  {isInsufficient ? (
                    <>
                      <AlertCircle size={13} color={COLORS.error} />
                      <Text style={styles.balFeedbackError}>
                        Insufficient · ₹{walletBalance.toLocaleString('en-IN')}{' '}
                        available
                      </Text>
                    </>
                  ) : (
                    !isNaN(parsedAmount) &&
                    parsedAmount > 0 && (
                      <Text style={styles.balFeedbackOk}>
                        Balance after: ₹
                        {(walletBalance - parsedAmount).toLocaleString('en-IN')}
                      </Text>
                    )
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (isInsufficient || amount === '') &&
                    styles.primaryBtnDisabled,
                ]}
                onPress={handleSendAmount}
                disabled={isInsufficient || amount === ''}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Send amount to kiosk"
              >
                <Text style={styles.primaryBtnText}>Send amount</Text>
                <ChevronRight size={16} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleReset}
                accessibilityRole="button"
                accessibilityLabel="Cancel recharge"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── sending ── */}
          {stage === 'sending' && (
            <View style={styles.statusRow}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.statusText}>
                Sending to kiosk, please wait…
              </Text>
            </View>
          )}

          {/* ── success ── */}
          {stage === 'success' && confirmed !== null && (
            <View style={styles.resultBox}>
              <View style={styles.resultIconWrapOk}>
                <CheckCircle2
                  size={34}
                  color={COLORS.primary}
                  strokeWidth={2}
                />
              </View>
              <Text style={styles.resultTitle}>Recharge successful</Text>
              <Text style={styles.resultSub}>
                {confirmedUnits !== null
                  ? `${confirmedUnits} units delivered`
                  : 'Kiosk confirmed'}
              </Text>
              <Text style={styles.resultAmount}>
                ₹{confirmed.toLocaleString('en-IN')}
              </Text>
              <View style={styles.resultBalRow}>
                <Text style={styles.resultBalLabel}>Wallet balance</Text>
                <Text style={styles.resultBalValue}>
                  ₹{walletBalance.toLocaleString('en-IN')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleReset}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Start a new recharge"
              >
                <Text style={styles.primaryBtnText}>New recharge</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── error ── */}
          {stage === 'error' && (
            <View style={styles.resultBox}>
              <View style={styles.resultIconWrapErr}>
                <XCircle size={34} color={COLORS.error} strokeWidth={2} />
              </View>
              <Text style={[styles.resultTitle, { color: COLORS.error }]}>
                Recharge failed
              </Text>
              <Text style={styles.errorDetail}>{errorMsg}</Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleReset}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Try recharge again"
              >
                <Text style={styles.primaryBtnText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footnote}>
          <Lock size={13} color={COLORS.textMuted} strokeWidth={2} />
          <Text style={styles.footnoteText}>Encrypted device connection</Text>
        </View>
      </ScrollView>

      {/* ── BT DEVICE PICKER BOTTOM SHEET ── */}
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
              <Text style={styles.sheetTitle}>Select kiosk device</Text>
              <Text style={styles.sheetSubtitle}>
                {devicesLoading
                  ? 'Scanning paired devices…'
                  : `${pairedDevices.length} paired device${
                      pairedDevices.length !== 1 ? 's' : ''
                    } found`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => closeSheet()}
              accessibilityRole="button"
              accessibilityLabel="Close device picker"
            >
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {devicesLoading ? (
            <View style={styles.sheetLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.sheetLoadingText}>
                Fetching paired devices…
              </Text>
            </View>
          ) : pairedDevices.length === 0 ? (
            <View style={styles.sheetEmpty}>
              <Bluetooth size={40} color="#3F3F46" strokeWidth={1.5} />
              <Text style={styles.sheetEmptyTitle}>No paired devices</Text>
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
              ItemSeparatorComponent={() => (
                <View style={styles.deviceSeparator} />
              )}
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
                    accessibilityRole="button"
                    accessibilityLabel={`Connect to ${
                      item.name ?? 'unknown device'
                    }`}
                  >
                    <View
                      style={[
                        styles.deviceIconWrap,
                        isSelected && styles.deviceIconWrapSelected,
                      ]}
                    >
                      <Bluetooth
                        size={18}
                        color={isSelected ? COLORS.primary : COLORS.textMuted}
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
                        {item.name ?? 'Unknown Device'}
                      </Text>
                      <Text style={styles.deviceAddress}>{item.address}</Text>
                    </View>

                    <View style={styles.deviceRight}>
                      <View style={styles.pairedBadge}>
                        <Text style={styles.pairedBadgeText}>Paired</Text>
                      </View>
                      <ChevronRight
                        size={16}
                        color={COLORS.textMuted}
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

      {/* ── ADD CREDIT MODAL ── */}
      <Modal
        visible={addCreditVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAddCreditVisible(false)}
      >
        <TouchableOpacity
          style={styles.addCreditOverlay}
          activeOpacity={1}
          onPress={() => setAddCreditVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.addCreditDialog}>
            <Text style={styles.addCreditTitle}>Add credit</Text>
            <Text style={styles.addCreditSub}>
              Enter amount to add (₹{MAX_CREDIT.toLocaleString('en-IN')} max)
            </Text>

            <TextInput
              style={styles.addCreditInput}
              keyboardType="numeric"
              placeholder="e.g. 1000"
              placeholderTextColor={COLORS.textMuted}
              value={topUpInput}
              onChangeText={setTopUpInput}
              maxLength={6}
              autoFocus
              accessibilityLabel="Credit amount in rupees"
            />

            <View style={styles.addCreditActions}>
              <TouchableOpacity
                style={styles.addCreditCancel}
                onPress={() => setAddCreditVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel adding credit"
              >
                <Text style={styles.addCreditCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addCreditConfirm}
                onPress={handleConfirmAddCredit}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Confirm adding credit"
              >
                <Text style={styles.addCreditConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
//  Styles (unchanged from original)
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.appBackground },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.appBackground,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerBtBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scroll: { padding: 16, gap: 14 },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  walletCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
  },
  walletTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  walletAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 8,
  },
  walletBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  walletSubLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  lowBalRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addCreditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addCreditText: {
    color: COLORS.buttonPrimaryHover,
    fontSize: 13,
    fontWeight: '800',
  },

  rechargeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  rechargeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rechargeCardTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  rechargeHint: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  noBalHint: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    gap: 6,
  },
  primaryBtnDisabled: { backgroundColor: COLORS.buttonDisabled },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  statusText: { color: COLORS.textSecondary, fontSize: 14 },

  amountSection: { gap: 12 },
  inputLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  amountInput: {
    backgroundColor: COLORS.appBackground,
    color: COLORS.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  amountInputError: { borderColor: COLORS.error },
  balFeedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balFeedbackError: { color: COLORS.error, fontSize: 13, fontWeight: '600' },
  balFeedbackOk: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  resultBox: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  resultIconWrapOk: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultIconWrapErr: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239,68,68,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultTitle: { color: COLORS.primary, fontSize: 19, fontWeight: '800' },
  resultSub: { color: COLORS.textMuted, fontSize: 13 },
  resultAmount: {
    color: COLORS.textPrimary,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 4,
  },
  resultBalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: COLORS.appBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultBalLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  resultBalValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  errorDetail: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },

  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingTop: 2,
  },
  footnoteText: { color: COLORS.textMuted, fontSize: 11 },

  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
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
    borderBottomColor: COLORS.divider,
  },
  sheetTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  sheetSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetLoading: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  sheetLoadingText: { color: COLORS.textMuted, fontSize: 14 },
  sheetEmpty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  sheetEmptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  sheetEmptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  deviceList: { paddingHorizontal: 16, paddingTop: 8 },
  deviceSeparator: {
    height: 1,
    backgroundColor: COLORS.divider,
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
  deviceRowSelected: { backgroundColor: COLORS.primarySoft },
  deviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceIconWrapSelected: { backgroundColor: COLORS.primarySoft },
  deviceInfo: { flex: 1 },
  deviceName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  deviceNameSelected: { color: COLORS.primary },
  deviceAddress: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  deviceRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pairedBadge: {
    backgroundColor: COLORS.divider,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pairedBadgeText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },

  addCreditOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  addCreditDialog: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  addCreditTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  addCreditSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  addCreditInput: {
    backgroundColor: COLORS.appBackground,
    color: COLORS.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
  },
  addCreditActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  addCreditCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addCreditCancelText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  addCreditConfirm: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addCreditConfirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
