// components/screens/user/PayScreen.tsx
/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  BackHandler,
  AppState,
  AppStateStatus,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetFooter,
} from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Hash,
  User,
  Calendar,
  Wallet,
  CreditCard,
  AlertCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';

import { useAppDispatch, useAppSelector } from '../../../store/hook';
import {
  verifyPayment,
  savePendingVerification,
  clearPendingVerification,
  MAX_VERIFY_RETRIES,
  MAX_PAYMENT_RETRIES,
} from '../../../store/slices/paymentSlice';
import {
  fetchWalletBalance,
  payBMIWithWallet,
} from '../../../store/slices/walletSlice';
import { markOrderPaid } from '../../../store/slices/orderSlice';
import { paymentApi } from '../../../store/services/paymentApi';
import type { CreatePaymentData } from '../../../store/services/paymentApi';
import ErrorToast from '../../common/ErrorToast';
import { useErrorToast } from '../../../hooks/useErrorToast';

type Props = { route: any; navigation: any };

const formatINR = (n: number) => {
  try {
    return n.toLocaleString('en-IN');
  } catch {
    return String(n);
  }
};

export default function PayScreen({ route, navigation }: Props) {
  const { selectedUserName, user, orderId, qrData } = route.params;
  const dispatch = useAppDispatch();

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const bottomSheetRef = useRef<BottomSheet>(null);
  const isMounted = useRef(true);
  const isPaymentInProgress = useRef(false);
  const paymentRetryCount = useRef(0);

  const focusListenerRef = useRef<(() => void) | null>(null);

  const lastAppState = useRef<AppStateStatus>(AppState.currentState);

  // ─── State ─────────────────────────────────────────────────────────────────
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [topUpCompleted, setTopUpCompleted] = useState(false);
  const [refreshedAfterTopUp, setRefreshedAfterTopUp] = useState(false);

  const { toast, showError, showWarning, hideToast } = useErrorToast();
  const insets = useSafeAreaInsets();

  // ─── Redux ─────────────────────────────────────────────────────────────────
  const { balance, isLoadingBalance, isPayingWithWallet } = useAppSelector(
    s => s.wallet,
  );

  // ─── Order details ─────────────────────────────────────────────────────────
  const orderDetails = useMemo(
    () => ({
      orderId: orderId || `ORD${Date.now()}`,
      timestamp: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      amount: qrData?.test_fee || 10,
      height: qrData?.height,
      weight: qrData?.weight,
      bmi: qrData?.bmi,
      machine_id: qrData?.machine_id,
    }),
    [orderId, qrData],
  );

  // ─── Wallet balance ─────────────────────────────────────────────────────────
  const walletBalance = balance?.wallet_balance ?? 0;
  const hasSufficientBal = walletBalance >= orderDetails.amount;

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    console.log(
      '💳 PayScreen mounted — Order:',
      orderDetails.orderId,
      '| Fee: ₹',
      orderDetails.amount,
    );

    // Initial balance fetch on mount
    dispatch(fetchWalletBalance());

    return () => {
      isMounted.current = false;
      console.log('🧹 PayScreen unmounted');

      if (focusListenerRef.current) {
        console.log('🧹 Cleaning up focus listener');
        focusListenerRef.current();
        focusListenerRef.current = null;
      }
    };
  }, [dispatch, orderDetails.orderId, orderDetails.amount]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      console.log('📱 AppState:', lastAppState.current, '→', nextState);

      if (
        lastAppState.current !== 'active' &&
        nextState === 'active' &&
        isMounted.current &&
        !isPaymentInProgress.current // ← don't fetch during active Razorpay session
      ) {
        console.log('🔄 App foregrounded — refreshing wallet balance');
        dispatch(fetchWalletBalance());
      }

      lastAppState.current = nextState;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [dispatch]);

  // ─── Footer height ──────────────────────────────────────────────────────────
  const footerHeight = useMemo(() => {
    const safeBot = insets.bottom > 0 ? insets.bottom : 0;
    return 8 + (16 * 2 + 17) + 12 + (16 * 2 + 17) + 20 + safeBot;
  }, [insets.bottom]);

  const contentBottomPadding = useMemo(() => footerHeight + 24, [footerHeight]);

  // ─── Navigation guards ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (isPaymentInProgress.current) {
        e.preventDefault();
        showWarning(
          'Payment is in progress. Please complete or cancel it first.',
        );
      }
    });
    return unsub;
  }, [navigation, showWarning]);

  useEffect(() => {
    const onBack = () => {
      if (isPaymentInProgress.current) {
        showWarning(
          'Please complete or cancel the payment in the Razorpay window.',
        );
        return true;
      }
      if (isVerifyingPayment || isPayingWithWallet) {
        showWarning('Verifying payment. Please wait...');
        return true;
      }
      if (isMounted.current && navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => handler.remove();
  }, [navigation, isVerifyingPayment, isPayingWithWallet, showWarning]);

  const snapPoints = useMemo(() => ['85%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.6}
        onPress={() => {
          if (
            isPaymentInProgress.current ||
            isVerifyingPayment ||
            isPayingWithWallet
          ) {
            showWarning('Please wait for the current operation to complete.');
            return;
          }
          if (
            !isProcessingPayment &&
            isMounted.current &&
            navigation.canGoBack()
          ) {
            navigation.goBack();
          }
        }}
      />
    ),
    [
      navigation,
      isProcessingPayment,
      isVerifyingPayment,
      isPayingWithWallet,
      showWarning,
    ],
  );

  useEffect(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  // ─── Navigate to success ────────────────────────────────────────────────────
  const goToSuccess = useCallback(
    (
      paymentMethod: string,
      reportId: string,
      paymentId: string,
      amount: number,
    ) => {
      navigation.navigate('PaymentSuccess', {
        amountLabel: `₹${amount}`,
        refNumber: orderDetails.orderId,
        paymentTime: orderDetails.timestamp,
        paymentMethod,
        senderName: user?.name || selectedUserName,
        reportId,
        paymentId,
      });
    },
    [navigation, orderDetails, user, selectedUserName],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PAY WITH WALLET
  // ═══════════════════════════════════════════════════════════════════════════
  const handleWalletPay = useCallback(async () => {
    if (!isMounted.current) return;
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💸 PAY WITH WALLET — Order:', orderDetails.orderId);

      const result = await dispatch(
        payBMIWithWallet(orderDetails.orderId),
      ).unwrap();
      dispatch(markOrderPaid({ orderId: orderDetails.orderId }));

      console.log('✅ Wallet payment success. Report:', result.report_id);
      goToSuccess(
        'Wallet',
        result.report_id,
        result.transaction_id,
        result.amount_paid,
      );
    } catch (error: any) {
      console.log('❌ Wallet payment error:', error.message);
      if (!isMounted.current) return;

      if (error.message?.includes('Insufficient')) {
        showWarning(
          `Insufficient balance. Need ₹${
            orderDetails.amount
          }, have ₹${formatINR(walletBalance)}.`,
        );
      } else {
        showError(error.message || 'Wallet payment failed. Please try again.');
      }
    }
  }, [
    dispatch,
    orderDetails.orderId,
    orderDetails.amount,
    walletBalance,
    goToSuccess,
    showError,
    showWarning,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ P1 FIX #6: TOP UP WALLET — fixed focus listener leak
  // ═══════════════════════════════════════════════════════════════════════════
  const handleTopUpWallet = useCallback(() => {
    // ── Clean up any existing focus listener before creating a new one ────────
    // Prevents stacking multiple listeners if user taps "Top Up" more than once
    if (focusListenerRef.current) {
      console.log(
        '🧹 Removing previous focus listener before creating new one',
      );
      focusListenerRef.current();
      focusListenerRef.current = null;
    }

    // Navigate to WalletStack
    navigation.navigate('WalletStack');

    // ✅ Store the unsubscribe function in a ref so it can be cleaned up:
    //   a) When a new focus listener is created (user taps Top Up again)
    //   b) When component unmounts (useEffect cleanup above)
    focusListenerRef.current = navigation.addListener('focus', async () => {
      // ── Remove listener immediately — only fire once ───────────────────────
      if (focusListenerRef.current) {
        focusListenerRef.current();
        focusListenerRef.current = null;
      }

      console.log('🔄 Returned from WalletStack — refreshing balance');

      if (!isMounted.current) return;

      // Re-fetch balance to check if top-up was successful
      await dispatch(fetchWalletBalance());

      if (isMounted.current) {
        setTopUpCompleted(true);
        setRefreshedAfterTopUp(true);
      }
    });
  }, [navigation, dispatch]);

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFY RAZORPAY PAYMENT (unchanged logic)
  // ═══════════════════════════════════════════════════════════════════════════
  const verifyPaymentWithBackend = useCallback(
    async (razorpayResponse: any, retryCount = 0) => {
      if (retryCount >= MAX_VERIFY_RETRIES) {
        console.log(`❌ Max verify retries (${MAX_VERIFY_RETRIES}) reached`);
        if (isMounted.current) {
          showError(
            `Verification failed after ${MAX_VERIFY_RETRIES} attempts. ` +
              'Please check Reports tab. Payment ID: ' +
              razorpayResponse.razorpay_payment_id,
          );
          setIsVerifyingPayment(false);
        }
        return;
      }

      try {
        if (isMounted.current) setIsVerifyingPayment(true);

        dispatch(
          savePendingVerification({
            orderId: orderDetails.orderId,
            razorpay_order_id: razorpayResponse.razorpay_order_id,
            razorpay_payment_id: razorpayResponse.razorpay_payment_id,
            razorpay_signature: razorpayResponse.razorpay_signature,
            attemptedAt: new Date().toISOString(),
            retryCount,
          }),
        );

        const result = await dispatch(
          verifyPayment({
            orderId: orderDetails.orderId,
            razorpay_order_id: razorpayResponse.razorpay_order_id,
            razorpay_payment_id: razorpayResponse.razorpay_payment_id,
            razorpay_signature: razorpayResponse.razorpay_signature,
          }),
        ).unwrap();

        dispatch(clearPendingVerification());
        dispatch(markOrderPaid({ orderId: orderDetails.orderId }));
        dispatch(fetchWalletBalance());

        goToSuccess(
          result.paymentMethod,
          result.reportId,
          razorpayResponse.razorpay_payment_id,
          orderDetails.amount,
        );
      } catch (error: any) {
        console.log(
          `❌ Verify attempt ${retryCount + 1} failed:`,
          error.message,
        );
        const nextRetry = retryCount + 1;
        const attemptsLeft = MAX_VERIFY_RETRIES - nextRetry;

        if (isMounted.current) {
          showError(
            attemptsLeft > 0
              ? `Verification failed. ${attemptsLeft} attempt(s) left.`
              : `Verification failed after ${MAX_VERIFY_RETRIES} attempts. Contact support.`,
            attemptsLeft > 0
              ? {
                  label: `Retry (${attemptsLeft} left)`,
                  onPress: () =>
                    verifyPaymentWithBackend(razorpayResponse, nextRetry),
                }
              : undefined,
          );
        }
      } finally {
        if (isMounted.current) setIsVerifyingPayment(false);
      }
    },
    [
      dispatch,
      orderDetails.orderId,
      orderDetails.amount,
      goToSuccess,
      showError,
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PAY WITH RAZORPAY (unchanged logic)
  // ═══════════════════════════════════════════════════════════════════════════
  const handleRazorpayPayment = useCallback(async () => {
    try {
      if (!isMounted.current) return;

      if (paymentRetryCount.current >= MAX_PAYMENT_RETRIES) {
        showError(
          `Payment failed after ${MAX_PAYMENT_RETRIES} attempts. Please contact support.`,
        );
        return;
      }

      setIsProcessingPayment(true);

      const paymentResponse = await paymentApi.createPayment(
        orderDetails.orderId,
      );
      if (!isMounted.current) return;

      if (!paymentResponse.success) {
        throw new Error(paymentResponse.message || 'Failed to create payment');
      }

      const paymentData: CreatePaymentData = paymentResponse.data;

      const rzpOptions = {
        description: 'BMI Report Payment',
        currency: paymentData.currency,
        key: paymentData.key_id,
        amount: paymentData.amount,
        order_id: paymentData.razorpay_order_id,
        name: 'MySehat',
        prefill: {
          email: '',
          contact: user?.mobile || '',
          name: user?.name || selectedUserName || '',
        },
        theme: { color: '#7C3AED' },
      };

      isPaymentInProgress.current = true;
      paymentRetryCount.current = 0;

      const rzpResponse = await RazorpayCheckout.open(rzpOptions);
      isPaymentInProgress.current = false;

      await verifyPaymentWithBackend(rzpResponse);
    } catch (error: any) {
      isPaymentInProgress.current = false;
      if (!isMounted.current) return;

      paymentRetryCount.current += 1;
      const payAttemptsLeft = MAX_PAYMENT_RETRIES - paymentRetryCount.current;

      if (error.code === 0 || error.code === 5) {
        showWarning(
          'You cancelled the payment.',
          payAttemptsLeft > 0
            ? {
                label: `Try Again (${payAttemptsLeft} left)`,
                onPress: () => isMounted.current && handleRazorpayPayment(),
              }
            : undefined,
        );
      } else if (error.code === 2) {
        showError(
          'Payment failed. Please try a different method.',
          payAttemptsLeft > 0
            ? {
                label: `Retry (${payAttemptsLeft} left)`,
                onPress: () => isMounted.current && handleRazorpayPayment(),
              }
            : undefined,
        );
      } else {
        showError(
          error.description ||
            error.message ||
            'An error occurred during payment',
          payAttemptsLeft > 0
            ? {
                label: `Retry (${payAttemptsLeft} left)`,
                onPress: () => isMounted.current && handleRazorpayPayment(),
              }
            : undefined,
        );
      }
    } finally {
      if (isMounted.current) setIsProcessingPayment(false);
    }
  }, [
    orderDetails.orderId,
    user,
    selectedUserName,
    showWarning,
    showError,
    verifyPaymentWithBackend,
  ]);

  // ─── Any operation in progress ─────────────────────────────────────────────
  const isAnyLoading =
    isProcessingPayment ||
    isVerifyingPayment ||
    isPayingWithWallet ||
    isPaymentInProgress.current ||
    isLoadingBalance;

  // ─── Render footer ─────────────────────────────────────────────────────────
  const renderFooter = useCallback(
    (props: any) => {
      const botInset = insets.bottom > 0 ? insets.bottom : 0;

      return (
        <BottomSheetFooter {...props} bottomInset={botInset}>
          <View style={[styles.footerWrapper, { paddingBottom: botInset }]}>
            <View style={styles.footer}>
              {isLoadingBalance ? (
                <View style={styles.balanceLoadingRow}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text style={styles.balanceLoadingText}>
                    Checking wallet balance...
                  </Text>
                </View>
              ) : hasSufficientBal ? (
                <>
                  <View style={styles.walletInfoRow}>
                    <Wallet size={14} color="#6EE7B7" />
                    <Text style={styles.walletInfoText}>
                      Wallet Balance: ₹{formatINR(walletBalance)}
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.payBtn,
                      styles.payBtnWallet,
                      isAnyLoading && styles.payBtnDisabled,
                    ]}
                    onPress={handleWalletPay}
                    disabled={isAnyLoading}
                  >
                    {isPayingWithWallet ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.payText}>
                          Paying from Wallet...
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.loadingRow}>
                        <Wallet size={18} color="#FFFFFF" />
                        <Text style={styles.payText}>
                          Pay ₹{orderDetails.amount} from Wallet
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  <Pressable
                    style={[
                      styles.payBtnSecondary,
                      isAnyLoading && styles.payBtnDisabled,
                    ]}
                    onPress={handleRazorpayPayment}
                    disabled={isAnyLoading}
                  >
                    {isProcessingPayment || isVerifyingPayment ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#C4B5FD" />
                        <Text style={styles.payTextSecondary}>
                          {isVerifyingPayment
                            ? 'Verifying...'
                            : 'Processing...'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.loadingRow}>
                        <CreditCard size={16} color="#C4B5FD" />
                        <Text style={styles.payTextSecondary}>
                          Pay with Razorpay instead
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </>
              ) : topUpCompleted && refreshedAfterTopUp && hasSufficientBal ? (
                <>
                  <View style={styles.walletInfoRow}>
                    <Wallet size={14} color="#6EE7B7" />
                    <Text style={styles.walletInfoText}>
                      Wallet topped up! Balance: ₹{formatINR(walletBalance)}
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.payBtn,
                      styles.payBtnWallet,
                      isAnyLoading && styles.payBtnDisabled,
                    ]}
                    onPress={handleWalletPay}
                    disabled={isAnyLoading}
                  >
                    {isPayingWithWallet ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.payText}>
                          Paying from Wallet...
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.loadingRow}>
                        <Wallet size={18} color="#FFFFFF" />
                        <Text style={styles.payText}>
                          Confirm — Pay ₹{orderDetails.amount} from Wallet
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.shortfallRow}>
                    <AlertCircle size={14} color="#FCD34D" />
                    <Text style={styles.shortfallText}>
                      Wallet: ₹{formatINR(walletBalance)} · Need ₹
                      {formatINR(orderDetails.amount - walletBalance)} more
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.payBtn,
                      isAnyLoading && styles.payBtnDisabled,
                    ]}
                    onPress={handleRazorpayPayment}
                    disabled={isAnyLoading}
                  >
                    {isProcessingPayment || isVerifyingPayment ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.payText}>
                          {isVerifyingPayment
                            ? 'Verifying...'
                            : 'Processing...'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.loadingRow}>
                        <CreditCard size={18} color="#FFFFFF" />
                        <Text style={styles.payText}>
                          Pay ₹{orderDetails.amount} instantly
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  <Pressable
                    style={[
                      styles.payBtnSecondary,
                      isAnyLoading && styles.payBtnDisabled,
                    ]}
                    onPress={handleTopUpWallet}
                    disabled={isAnyLoading}
                  >
                    <View style={styles.loadingRow}>
                      <Wallet size={16} color="#C4B5FD" />
                      <Text style={styles.payTextSecondary}>
                        Top up Wallet & pay after
                      </Text>
                    </View>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </BottomSheetFooter>
      );
    },
    [
      insets.bottom,
      isLoadingBalance,
      hasSufficientBal,
      walletBalance,
      orderDetails.amount,
      isAnyLoading,
      isPayingWithWallet,
      isProcessingPayment,
      isVerifyingPayment,
      topUpCompleted,
      refreshedAfterTopUp,
      handleWalletPay,
      handleRazorpayPayment,
      handleTopUpWallet,
    ],
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={styles.container}>
      <ErrorToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
        action={toast.action}
      />

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={
          !isProcessingPayment &&
          !isVerifyingPayment &&
          !isPayingWithWallet &&
          !isPaymentInProgress.current
        }
        backdropComponent={renderBackdrop}
        footerComponent={renderFooter}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        onClose={() => {
          if (
            !isProcessingPayment &&
            !isVerifyingPayment &&
            !isPayingWithWallet &&
            !isPaymentInProgress.current &&
            isMounted.current &&
            navigation.canGoBack()
          ) {
            navigation.goBack();
          }
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: contentBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Click & Pay</Text>
            <Text style={styles.subtitle}>
              Complete payment for report generation
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Hash size={18} color="#7C3AED" />
              <Text style={styles.cardTitle}>Order Details</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order ID</Text>
              <Text style={styles.detailValue}>{orderDetails.orderId}</Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <User size={14} color="#94A3B8" />
                <Text style={styles.detailLabel}>User</Text>
              </View>
              <Text style={styles.detailValue}>
                {user?.name || selectedUserName}, {user?.age || 'N/A'}/
                {user?.gender || 'N/A'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <Calendar size={14} color="#94A3B8" />
                <Text style={styles.detailLabel}>Timestamp</Text>
              </View>
              <Text style={styles.detailValue}>{orderDetails.timestamp}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <View style={styles.detailLabelRow}>
                <Wallet size={14} color="#94A3B8" />
                <Text style={styles.detailLabel}>Amount</Text>
              </View>
              <Text style={styles.amount}>₹{orderDetails.amount}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              🔒 Secure payment powered by Razorpay
            </Text>
            <Text style={styles.infoSubtext}>
              Your payment details are encrypted and secure
            </Text>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  sheetBackground: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: { backgroundColor: '#475569', width: 40 },
  contentContainer: { paddingHorizontal: 16 },
  header: { paddingVertical: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  card: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#CBD5E1' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: 13, color: '#94A3B8' },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    maxWidth: '55%',
    textAlign: 'right',
  },
  amount: { fontSize: 14, fontWeight: '800', color: '#7C3AED' },
  infoCard: {
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C4B5FD',
    marginBottom: 4,
  },
  infoSubtext: { fontSize: 11, color: '#94A3B8' },
  footerWrapper: {
    backgroundColor: '#0F172A',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    elevation: 20,
  },
  footer: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  balanceLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  balanceLoadingText: { color: '#94A3B8', fontSize: 13 },
  walletInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  walletInfoText: { color: '#6EE7B7', fontSize: 12, fontWeight: '600' },
  shortfallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  shortfallText: { color: '#FCD34D', fontSize: 12, fontWeight: '600' },
  payBtn: {
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    alignItems: 'center',
  },
  payBtnWallet: { backgroundColor: '#059669' },
  payBtnDisabled: { opacity: 0.45 },
  payText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  payBtnSecondary: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.4)',
    backgroundColor: 'rgba(124,58,237,0.1)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  payTextSecondary: { color: '#C4B5FD', fontSize: 15, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
