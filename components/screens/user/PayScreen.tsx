/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetFooter,
} from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Hash, User, Calendar, Wallet } from 'lucide-react-native';
// ✅ ADD THIS IMPORT
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import { paymentApi } from '../../../store/services/paymentApi';
import type { CreatePaymentData } from '../../../store/services/paymentApi';

type Props = {
  route: any;
  navigation: any;
};

export default function PayScreen({ route, navigation }: Props) {
  const { selectedUserName, user, orderId, qrData } = route.params;
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  
  // ✅ ADD THIS: Get safe area insets
  const insets = useSafeAreaInsets();

  /* ✅ Order details from backend */
  const orderDetails = useMemo(
    () => ({
      orderId: orderId || `ORD${Date.now()}`,
      timestamp: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      amount: qrData?.test_fee || 199,
      height: qrData?.height,
      weight: qrData?.weight,
      bmi: qrData?.bmi,
      machine_id: qrData?.machine_id,
    }),
    [orderId, qrData],
  );

  useEffect(() => {
    console.log('💳 PayScreen: Order Details');
    console.log('Order ID:', orderDetails.orderId);
    console.log('Amount:', orderDetails.amount);
    console.log('User:', user?.name || selectedUserName);
  }, []);

  const snapPoints = useMemo(() => ['80%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.6}
        onPress={() => !isProcessingPayment && navigation.goBack()}
      />
    ),
    [navigation, isProcessingPayment],
  );

  useEffect(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  /**
   * Verify payment with backend
   */
  const verifyPaymentWithBackend = async (razorpayResponse: any) => {
    try {
      setIsVerifyingPayment(true);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔐 VERIFYING PAYMENT');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Order ID:', orderDetails.orderId);
      console.log('Payment ID:', razorpayResponse.razorpay_payment_id);
      
      const verifyResponse = await paymentApi.verifyPayment(orderDetails.orderId, {
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
      });
      
      if (!verifyResponse.success) {
        throw new Error(verifyResponse.message || 'Payment verification failed');
      }
      
      console.log('✅ Payment verified successfully!');
      console.log('Report ID:', verifyResponse.data.report_id);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Navigate to success screen with real data
      navigation.navigate('PaymentSuccess', {
        amountLabel: `₹${orderDetails.amount}`,
        refNumber: orderDetails.orderId,
        paymentTime: orderDetails.timestamp,
        paymentMethod: 'Razorpay',
        senderName: user?.name || selectedUserName,
        reportId: verifyResponse.data.report_id,
        paymentId: razorpayResponse.razorpay_payment_id,
      });
      
    } catch (error: any) {
      console.error('❌ Payment verification failed:', error.message);
      
      Alert.alert(
        'Verification Failed',
        'Payment completed but verification failed. Please contact support with your payment ID.',
        [
          {
            text: 'Contact Support',
            onPress: () => navigation.navigate('Support')
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  /**
   * Handle Razorpay Payment with SDK
   */
  const handlePayment = async () => {
    try {
      setIsProcessingPayment(true);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💳 INITIATING RAZORPAY PAYMENT');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Order ID:', orderDetails.orderId);
      console.log('Amount: ₹', orderDetails.amount);
      
      // 1. Create Razorpay order from backend
      const paymentResponse = await paymentApi.createPayment(orderDetails.orderId);
      
      if (!paymentResponse.success) {
        throw new Error(paymentResponse.message || 'Failed to create payment');
      }
      
      const paymentData: CreatePaymentData = paymentResponse.data;
      
      console.log('✅ Razorpay order created');
      console.log('Razorpay Order ID:', paymentData.razorpay_order_id);
      
      // 2. Open Razorpay checkout using SDK
      const razorpayOptions = {
        description: 'BMI Report Payment',
        image: 'https://your-logo-url.com/logo.png', // Optional: Add your logo
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
        theme: { color: '#7C3AED' }
      };
      
      console.log('🌐 Opening Razorpay checkout...');
      
      // Open Razorpay modal
      const razorpayResponse = await RazorpayCheckout.open(razorpayOptions);
      
      console.log('✅ Payment successful!');
      console.log('Payment ID:', razorpayResponse.razorpay_payment_id);
      
      // 3. Verify payment with backend
      await verifyPaymentWithBackend(razorpayResponse);
      
    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ PAYMENT ERROR');
      console.error('Error:', error);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Handle different error types
      if (error.code === 0) {
        // User cancelled payment
        console.log('⚠️ User cancelled payment');
        Alert.alert(
          'Payment Cancelled',
          'You cancelled the payment. Your order is still pending.',
          [
            {
              text: 'Try Again',
              onPress: () => handlePayment()
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else if (error.code === 2) {
        // Payment failed
        console.error('❌ Payment failed');
        Alert.alert(
          'Payment Failed',
          'Your payment failed. Please try again or use a different payment method.',
          [
            {
              text: 'Retry',
              onPress: () => handlePayment()
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else {
        // Other errors
        Alert.alert(
          'Error',
          error.description || error.message || 'An error occurred during payment',
          [{ text: 'OK' }]
        );
      }
      
      setIsProcessingPayment(false);
    }
  };

  /* ✅ STICKY FOOTER WITH DYNAMIC SAFE AREA */
  const renderFooter = useCallback(
    (props: any) => {
      // ✅ Calculate dynamic bottom inset
      const bottomInset = insets.bottom > 0 ? insets.bottom + 8 : 20;
      
      return (
        <BottomSheetFooter {...props} bottomInset={bottomInset}>
          {/* ✅ Wrapper with solid background */}
          <View style={styles.footerWrapper}>
            <View style={styles.footer}>
              <Pressable 
                style={[
                  styles.payBtn, 
                  (isProcessingPayment || isVerifyingPayment) && styles.payBtnDisabled
                ]} 
                onPress={handlePayment}
                disabled={isProcessingPayment || isVerifyingPayment}
              >
                {isProcessingPayment || isVerifyingPayment ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.payText}>
                      {isVerifyingPayment ? 'Verifying...' : 'Processing...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.payText}>
                    Pay ₹{orderDetails.amount}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </BottomSheetFooter>
      );
    },
    [orderDetails.amount, isProcessingPayment, isVerifyingPayment, insets.bottom], // ✅ Add insets.bottom to dependencies
  );

  // ✅ Calculate dynamic spacer height
  const spacerHeight = 100 + (insets.bottom > 0 ? insets.bottom : 0);

  return (
    <GestureHandlerRootView style={styles.container}>
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={!isProcessingPayment && !isVerifyingPayment}
        backdropComponent={renderBackdrop}
        footerComponent={renderFooter}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        onClose={() => {
          if (!isProcessingPayment && !isVerifyingPayment) {
            navigation.goBack();
          }
        }}
      >
        {/* SCROLLABLE CONTENT */}
        <BottomSheetScrollView
          contentContainerStyle={styles.contentContainer}
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
                {user?.name || selectedUserName},{' '}
                {user?.age || 'N/A'}/{user?.gender || 'N/A'}
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

          {/* ✅ Dynamic spacer - adapts to device safe area */}
          <View style={{ height: spacerHeight }} />
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

  // ✅ NEW: Wrapper to ensure solid background
  footerWrapper: {
    backgroundColor: '#0F172A',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
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