// components/screens/user/PayScreen.tsx - FIXED: Dynamic Footer + Prevent unmounting on payment cancel
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
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetFooter,
} from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Hash, User, Calendar, Wallet } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import { paymentApi } from '../../../store/services/paymentApi';
import type { CreatePaymentData } from '../../../store/services/paymentApi';
import ErrorToast from '../../common/ErrorToast';
import { useErrorToast } from '../../../hooks/useErrorToast';

type Props = {
  route: any;
  navigation: any;
};

export default function PayScreen({ route, navigation }: Props) {
  const { selectedUserName, user, orderId, qrData } = route.params;
  const bottomSheetRef = useRef<BottomSheet>(null);

  const isMounted = useRef(true);
  const isPaymentInProgress = useRef(false);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const { toast, showError, showWarning, hideToast } = useErrorToast();

  const insets = useSafeAreaInsets();

  /* 🎯 DYNAMIC CALCULATIONS FOR FOOTER */
  const footerHeight = useMemo(() => {
    const BUTTON_HEIGHT = 16 * 2 + 17; // paddingVertical (16 * 2) + font height (17)
    const FOOTER_TOP_PADDING = 8;
    const FOOTER_BOTTOM_PADDING = 12;
    const safeAreaBottom = insets.bottom > 0 ? insets.bottom : 0;

    return (
      FOOTER_TOP_PADDING +
      BUTTON_HEIGHT +
      FOOTER_BOTTOM_PADDING +
      safeAreaBottom
    );
  }, [insets.bottom]);

  // Calculate scroll content bottom padding (footer height + extra breathing room)
  const contentBottomPadding = useMemo(() => {
    return footerHeight + 24; // Extra 24px space
  }, [footerHeight]);

  /* Order details from backend */
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

  // ✅ Setup and cleanup
  useEffect(() => {
    isMounted.current = true;

    console.log('💳 PayScreen: Component mounted');
    console.log('Order ID:', orderDetails.orderId);
    console.log('Amount:', orderDetails.amount);
    console.log('User:', user?.name || selectedUserName);

    return () => {
      console.log('🧹 PayScreen: Unmounting...');
      isMounted.current = false;

      if (isPaymentInProgress.current) {
        console.log('⚠️ Component unmounted while payment was in progress');
      }
    };
  }, [orderDetails.orderId, orderDetails.amount, user?.name, selectedUserName]);

  // ✅ Prevent navigation when payment is in progress
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (isPaymentInProgress.current) {
        console.log('🚫 Preventing navigation - payment in Razorpay modal');
        e.preventDefault();

        showWarning(
          'Payment is in progress. Please complete or cancel the payment first.',
        );
      }
    });

    return unsubscribe;
  }, [navigation, showWarning]);

  // ✅ Handle AppState changes (when Razorpay opens/closes)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('📱 AppState changed:', nextAppState);

      if (nextAppState === 'active' && isPaymentInProgress.current) {
        console.log('✅ App became active with payment in progress');
        console.log(
          '💡 User probably closed Razorpay - waiting for SDK callback',
        );
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // ✅ Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: PayScreen');

      if (isPaymentInProgress.current) {
        showWarning(
          'Payment is in progress. Please complete or cancel the payment in the Razorpay window.',
        );
        return true;
      }

      if (isVerifyingPayment) {
        showWarning('Verifying payment. Please wait...');
        return true;
      }

      if (isProcessingPayment && !isPaymentInProgress.current) {
        console.log('⚠️ Back pressed while creating payment order');
        return false;
      }

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
  }, [navigation, isProcessingPayment, isVerifyingPayment, showWarning]);

  const snapPoints = useMemo(() => ['80%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.6}
        onPress={() => {
          if (isPaymentInProgress.current) {
            showWarning(
              'Payment is in progress. Please complete or cancel in the Razorpay window.',
            );
            return;
          }

          if (isVerifyingPayment) {
            showWarning('Verifying payment. Please wait...');
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
    [navigation, isProcessingPayment, isVerifyingPayment, showWarning],
  );

  useEffect(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  /**
   * Verify payment with backend
   */
  const verifyPaymentWithBackend = useCallback(
    async (razorpayResponse: any) => {
      try {
        if (!isMounted.current) {
          console.log('⚠️ Component unmounted, aborting verification');
          return;
        }

        setIsVerifyingPayment(true);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔐 VERIFYING PAYMENT');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Order ID:', orderDetails.orderId);
        console.log('Payment ID:', razorpayResponse.razorpay_payment_id);

        const verifyResponse = await paymentApi.verifyPayment(
          orderDetails.orderId,
          {
            razorpay_order_id: razorpayResponse.razorpay_order_id,
            razorpay_payment_id: razorpayResponse.razorpay_payment_id,
            razorpay_signature: razorpayResponse.razorpay_signature,
          },
        );

        if (!isMounted.current) {
          console.log('⚠️ Component unmounted after verification');
          return;
        }

        if (!verifyResponse.success) {
          throw new Error(
            verifyResponse.message || 'Payment verification failed',
          );
        }

        console.log('✅ Payment verified successfully!');
        console.log('Report ID:', verifyResponse.data.report_id);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
          navigation.navigate('PaymentSuccess', {
            amountLabel: `₹${orderDetails.amount}`,
            refNumber: orderDetails.orderId,
            paymentTime: orderDetails.timestamp,
            paymentMethod: verifyResponse.data.payment_method,
            senderName: user?.name || selectedUserName,
            reportId: verifyResponse.data.report_id,
            paymentId: razorpayResponse.razorpay_payment_id,
          });
        } catch (navError) {
          console.log('❌ Navigation error:', navError);
          showError(
            'Payment completed successfully! Please check your reports.',
          );
        }
      } catch (error: any) {
        console.log('❌ Payment verification failed:', error.message);

        if (isMounted.current) {
          showError(
            'Payment completed but verification failed. Please contact support with your payment ID.',
            {
              label: 'Contact Support',
              onPress: () => {
                try {
                  navigation.navigate('Support');
                } catch (err) {
                  console.log('Navigation error:', err);
                }
              },
            },
          );
        }
      } finally {
        if (isMounted.current) {
          setIsVerifyingPayment(false);
        }
      }
    },
    [
      orderDetails.orderId,
      orderDetails.amount,
      orderDetails.timestamp,
      user?.name,
      selectedUserName,
      navigation,
      showError,
    ],
  );

  /**
   * Handle Razorpay Payment with SDK
   */
  const handlePayment = useCallback(async () => {
    try {
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted, aborting payment');
        return;
      }

      setIsProcessingPayment(true);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💳 INITIATING RAZORPAY PAYMENT');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Order ID:', orderDetails.orderId);
      console.log('Amount: ₹', orderDetails.amount);

      const paymentResponse = await paymentApi.createPayment(
        orderDetails.orderId,
      );

      if (!isMounted.current) {
        console.log('⚠️ Component unmounted after creating payment');
        return;
      }

      if (!paymentResponse.success) {
        if (paymentResponse.message?.includes('Payment already initiated')) {
          console.log('⚠️ Backend says payment already initiated');

          showWarning(
            'This order already has a pending payment. Please wait a few minutes and try again, or contact support if the issue persists.',
            {
              label: 'Contact Support',
              onPress: () => {
                try {
                  navigation.navigate('Support');
                } catch (err) {
                  console.log('Navigation error:', err);
                }
              },
            },
          );

          if (isMounted.current) {
            setIsProcessingPayment(false);
          }
          return;
        }

        throw new Error(paymentResponse.message || 'Failed to create payment');
      }

      const paymentData: CreatePaymentData = paymentResponse.data;

      console.log('✅ Razorpay order created');
      console.log('Razorpay Order ID:', paymentData.razorpay_order_id);

      const razorpayOptions = {
        description: 'BMI Report Payment',
        image: 'https://your-logo-url.com/logo.png',
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

      console.log('🌐 Opening Razorpay checkout...');

      isPaymentInProgress.current = true;

      try {
        const razorpayResponse = await RazorpayCheckout.open(razorpayOptions);

        isPaymentInProgress.current = false;

        if (!isMounted.current) {
          console.log('⚠️ Component unmounted after Razorpay success');
          return;
        }

        console.log('✅ Payment successful!');
        console.log('Payment ID:', razorpayResponse.razorpay_payment_id);

        await verifyPaymentWithBackend(razorpayResponse);
      } catch (razorpayError: any) {
        isPaymentInProgress.current = false;
        throw razorpayError;
      }
    } catch (error: any) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ PAYMENT ERROR');
      console.log('Error:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      isPaymentInProgress.current = false;

      if (!isMounted.current) {
        console.log('⚠️ Component unmounted, skipping error toast');
        return;
      }

      if (error.code === 0) {
        console.log('⚠️ User cancelled payment');
        showWarning('You cancelled the payment. Your order is still pending.', {
          label: 'Try Again',
          onPress: () => {
            if (isMounted.current) {
              handlePayment();
            }
          },
        });
      } else if (error.code === 2) {
        console.log('❌ Payment failed');
        showError(
          'Your payment failed. Please try again or use a different payment method.',
          {
            label: 'Retry',
            onPress: () => {
              if (isMounted.current) {
                handlePayment();
              }
            },
          },
        );
      } else if (error.code === 5) {
        console.log('⚠️ User cancelled payment (code 5)');
        showError('You cancelled the payment. Your order is still pending.', {
          label: 'Retry',
          onPress: () => {
            if (isMounted.current) {
              handlePayment();
            }
          },
        });
      } else {
        showError(
          error.description ||
            error.message ||
            'An error occurred during payment',
        );
      }

      if (isMounted.current) {
        setIsProcessingPayment(false);
      }
    }
  }, [
    orderDetails.orderId,
    orderDetails.amount,
    user?.mobile,
    user?.name,
    selectedUserName,
    showWarning,
    showError,
    navigation,
    verifyPaymentWithBackend,
  ]);

  /* 🎯 STICKY FOOTER WITH DYNAMIC BOTTOM INSET */
  const renderFooter = useCallback(
    (props: any) => {
      const bottomInset = insets.bottom > 0 ? insets.bottom : 0;

      return (
        <BottomSheetFooter {...props} bottomInset={bottomInset}>
          <View style={[styles.footerWrapper, { paddingBottom: bottomInset }]}>
            <View style={styles.footer}>
              <Pressable
                style={[
                  styles.payBtn,
                  (isProcessingPayment ||
                    isVerifyingPayment ||
                    isPaymentInProgress.current) &&
                    styles.payBtnDisabled,
                ]}
                onPress={handlePayment}
                disabled={
                  isProcessingPayment ||
                  isVerifyingPayment ||
                  isPaymentInProgress.current
                }
              >
                {isProcessingPayment || isVerifyingPayment ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.payText}>
                      {isVerifyingPayment
                        ? 'Verifying...'
                        : isPaymentInProgress.current
                        ? 'In Razorpay...'
                        : 'Processing...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.payText}>Pay ₹{orderDetails.amount}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </BottomSheetFooter>
      );
    },
    [
      orderDetails.amount,
      isProcessingPayment,
      isVerifyingPayment,
      insets.bottom,
      handlePayment,
    ],
  );

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
            !isPaymentInProgress.current
          ) {
            if (isMounted.current && navigation.canGoBack()) {
              navigation.goBack();
            }
          }
        }}
      >
        {/* SCROLLABLE CONTENT */}
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: contentBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Click & Pay</Text>
            <Text style={styles.subtitle}>
              Complete payment for report generation
            </Text>
          </View>

          {/* Order Card */}
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
                <Text style={styles.detailLabel}>User Details</Text>
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

          {/* Payment Info */}
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

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  sheetBackground: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  handleIndicator: {
    backgroundColor: '#475569',
    width: 40,
  },

  contentContainer: {
    paddingHorizontal: 16,
    // paddingBottom is now dynamic - applied inline
  },

  header: {
    paddingVertical: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },

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

  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CBD5E1',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },

  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  detailLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },

  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    maxWidth: '55%',
    textAlign: 'right',
  },

  amount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7C3AED',
  },

  infoCard: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },

  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C4B5FD',
    marginBottom: 4,
  },

  infoSubtext: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // 🎯 FIXED: Solid background with proper z-index to block scroll content
  footerWrapper: {
    backgroundColor: '#0F172A',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 20,
  },

  footer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  payBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },

  payBtnDisabled: {
    backgroundColor: '#475569',
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  payText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});
