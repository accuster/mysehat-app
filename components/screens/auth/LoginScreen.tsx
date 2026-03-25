/* eslint-disable react-native/no-inline-styles */
// components/screens/auth/LoginScreen.tsx
// ✅ COMPLETE VERSION: Network Detection + OTP Session Reset + ErrorToast

import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Image,
  BackHandler,
  Linking,
  Animated,
  AppState,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { Edit2 } from 'lucide-react-native';
import Loader from '../../common/Loader';
import ErrorToast from '../../common/ErrorToast';
import { useErrorToast } from '../../../hooks/useErrorToast';
import { checkNetworkConnectivity } from '../../../hooks/useNetworkStatus';
import { isValidIndianMobile } from '../../../utils/validators';
import {
  verifyLogin,
  setOtpSent,
  clearError,
} from '../../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../../store';

const packageJson = require('../../../package.json');

const MSG91_WIDGET_ID = '356a676a4159343638343132';
const MSG91_TOKEN_AUTH = '442931TIzX7UoX8cUH68ee3e82P1';

const TEST_MOBILE = '9876543210';
const TEST_OTP = '654321';
const TEST_MODE_ENABLED = true;

type Props = {
  navigation: any;
};

export default function LoginScreen({ navigation }: Props) {
  const isMounted = useRef(true);
  const appState = useRef(AppState.currentState);
  const isVerifying = useRef(false);

  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, otpSent } = useSelector(
    (state: RootState) => state.auth,
  );

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [reqId, setReqId] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  const { toast, showError, showSuccess, showInfo, hideToast } =
    useErrorToast();

  const otpSectionHeight = useRef(new Animated.Value(0)).current;
  const otpSectionOpacity = useRef(new Animated.Value(0)).current;

  const canSendOtp = useMemo(() => isValidIndianMobile(phone), [phone]);

  useEffect(() => {
    console.log('🔍 Checking OTP session validity...');
    if (otpSent && !reqId) {
      console.log('⚠️ Invalid OTP session detected - resetting to phone input');
      dispatch(setOtpSent(false));
      setOtp('');
      setOtpError('');
      setPhoneError('');
      setResendTimer(0);
      setIsEditingPhone(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 App came to foreground');
        if (otpSent && !reqId) {
          console.log('⚠️ OTP session lost after backgrounding - resetting');
          dispatch(setOtpSent(false));
          setOtp('');
          setOtpError('');
          setResendTimer(0);
          showInfo('OTP session expired. Please request a new OTP.');
        }
      }
      appState.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenURL = useCallback(
    async (url: string, title: string) => {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          showError(
            `Cannot open ${title}. Please check your internet connection.`,
          );
        }
      } catch (err) {
        console.log('Error opening URL:', err);
        showError(`Failed to open ${title}. Please try again later.`);
      }
    },
    [showError],
  );

  const slideInOtpSection = useCallback(() => {
    Animated.parallel([
      Animated.timing(otpSectionHeight, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(otpSectionOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [otpSectionHeight, otpSectionOpacity]);

  const slideOutOtpSection = useCallback(() => {
    Animated.parallel([
      Animated.timing(otpSectionHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(otpSectionOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [otpSectionHeight, otpSectionOpacity]);

  useEffect(() => {
    if (otpSent && !isEditingPhone) {
      slideInOtpSection();
    } else {
      slideOutOtpSection();
    }
  }, [otpSent, isEditingPhone, slideInOtpSection, slideOutOtpSection]);

  const handleEditPhone = useCallback(() => {
    console.log('✏️ User wants to edit phone number');
    dispatch(setOtpSent(false));
    setOtp('');
    setOtpError('');
    setPhoneError('');
    setResendTimer(0);
    setReqId(null);
    setIsEditingPhone(true);
  }, [dispatch]);

  useEffect(() => {
    isMounted.current = true;
    console.log('🔐 LoginScreen: Component mounted');
    try {
      OTPWidget.initializeWidget(MSG91_WIDGET_ID, MSG91_TOKEN_AUTH);
      console.log('✅ MSG91 Widget initialized successfully');
    } catch (err) {
      console.log('❌ Failed to initialize MSG91 Widget:', err);
      showError('Failed to initialize OTP service. Please restart the app.');
    }
    return () => {
      console.log('🧹 LoginScreen: Unmounting...');
      isMounted.current = false;
    };
  }, [showError]);

  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: LoginScreen');
      if (otpSent && !isLoading) {
        console.log('📱 Going back to phone number editing');
        handleEditPhone();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, [otpSent, isLoading, handleEditPhone]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (error) {
      console.log('Redux error:', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (TEST_MODE_ENABLED && phone === TEST_MOBILE) {
      setIsTestMode(true);
    } else {
      setIsTestMode(false);
    }
  }, [phone]);

  const handleTestModeSendOtp = () => {
    if (!isMounted.current) return;
    const testReqId = 'TEST_' + Date.now();
    setReqId(testReqId);
    dispatch(setOtpSent(true));
    setIsEditingPhone(false);
    setResendTimer(60);
    showInfo(
      `🧪 Test Mode Active\n\nTest OTP: ${TEST_OTP}\n\nEnter this OTP to login.`,
    );
  };

  const handleSendOtp = async () => {
    if (!isMounted.current) return;
    setPhoneError('');
    setOtpError('');
    if (!phone.trim()) {
      setPhoneError('Please enter your mobile number');
      return;
    }
    if (!isValidIndianMobile(phone)) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      return;
    }
    const isOnline = await checkNetworkConnectivity();
    if (!isOnline) {
      showError(
        'No internet connection. Please check your WiFi or mobile data and try again.',
        { label: 'Retry', onPress: () => handleSendOtp() },
      );
      return;
    }
    if (isTestMode) {
      handleTestModeSendOtp();
      return;
    }
    try {
      const response = await OTPWidget.sendOTP({ identifier: `91${phone}` });
      if (!isMounted.current) return;
      if (response.type === 'success') {
        setReqId(response.message);
        dispatch(setOtpSent(true));
        setIsEditingPhone(false);
        setResendTimer(60);
        showSuccess('OTP sent successfully! Please check your WhatsApp.');
      } else {
        throw new Error(response.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      if (isMounted.current) {
        if (err.message?.toLowerCase().includes('network')) {
          showError(
            'Network error. Please check your internet connection and try again.',
            { label: 'Retry', onPress: () => handleSendOtp() },
          );
        } else {
          setPhoneError(err.message || 'Failed to send OTP. Please try again.');
        }
      }
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || !isMounted.current) return;
    setOtpError('');
    setOtp('');
    setReqId(null);
    const isOnline = await checkNetworkConnectivity();
    if (!isOnline) {
      showError(
        'No internet connection. Please check your WiFi or mobile data and try again.',
        { label: 'Retry', onPress: () => handleResendOtp() },
      );
      return;
    }
    if (isTestMode) {
      handleTestModeSendOtp();
      return;
    }
    try {
      const response = await OTPWidget.sendOTP({ identifier: `91${phone}` });
      if (!isMounted.current) return;
      if (response.type === 'success') {
        setReqId(response.message);
        setResendTimer(60);
        showSuccess('New OTP sent! Please check your WhatsApp.');
      } else {
        throw new Error(response.message || 'Failed to resend OTP');
      }
    } catch (err: any) {
      if (isMounted.current) {
        if (err.message?.toLowerCase().includes('network')) {
          showError(
            'Network error. Please check your internet connection and try again.',
            { label: 'Retry', onPress: () => handleResendOtp() },
          );
        } else {
          setOtpError(err.message || 'Failed to resend OTP. Please try again.');
        }
      }
    }
  };

  const handleVerifyTestOtp = async () => {
    if (!isMounted.current) return;
    if (otp !== TEST_OTP) {
      setOtpError(`Invalid OTP. Test OTP is: ${TEST_OTP}`);
      return;
    }
    const testAccessToken = `test_token_${phone}_${Date.now()}`;
    const resultAction = await dispatch(
      verifyLogin({ accessToken: testAccessToken, mobile: phone }),
    );
    if (!isMounted.current) return;
    if (verifyLogin.fulfilled.match(resultAction)) {
      const userData = resultAction.payload;
      navigation.replace(
        userData.requiresProfileSetup ? 'CompleteProfile' : 'App',
      );
    } else {
      setOtpError('Login failed. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (isVerifying.current) return;
    isVerifying.current = true;
    if (!isMounted.current) return;
    setOtpError('');
    if (!otp.trim()) {
      setOtpError('Please enter the OTP');
      isVerifying.current = false;
      return;
    }
    if (otp.length < 4) {
      setOtpError('Please enter a valid OTP (4-6 digits)');
      isVerifying.current = false;
      return;
    }
    if (isTestMode) {
      await handleVerifyTestOtp();
      isVerifying.current = false;
      return;
    }
    if (!reqId) {
      setOtpError('Session expired. Please resend OTP.');
      isVerifying.current = false;
      return;
    }
    const isOnline = await checkNetworkConnectivity();
    if (!isOnline) {
      showError('No internet connection.', {
        label: 'Retry',
        onPress: () => handleVerifyOtp(),
      });
      isVerifying.current = false;
      return;
    }
    try {
      const verifyResponse = await OTPWidget.verifyOTP({ reqId, otp });
      if (!isMounted.current) return;
      if (verifyResponse.type === 'success') {
        const accessToken =
          verifyResponse.message ||
          verifyResponse.accessToken ||
          verifyResponse['access-token'] ||
          verifyResponse.data?.accessToken ||
          verifyResponse.data?.['access-token'];
        if (!accessToken) {
          setOtpError('No access token received. Please try again.');
          return;
        }
        const resultAction = await dispatch(
          verifyLogin({ accessToken, mobile: phone }),
        );
        if (!isMounted.current) return;
        if (verifyLogin.fulfilled.match(resultAction)) {
          const userData = resultAction.payload;
          navigation.replace(
            userData.requiresProfileSetup ? 'CompleteProfile' : 'App',
          );
        } else {
          setOtpError('Login failed. Please try again.');
        }
      } else {
        if (verifyResponse.code === 708) {
          setOtpError('OTP session expired. Please request a new OTP.');
        } else if (verifyResponse.message?.toLowerCase().includes('invalid')) {
          setOtpError('Invalid OTP. Please check and try again.');
        } else {
          setOtpError(
            verifyResponse.message || 'Verification failed. Please try again.',
          );
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        if (err.message?.toLowerCase().includes('network')) {
          showError('Network error.', {
            label: 'Retry',
            onPress: () => handleVerifyOtp(),
          });
        } else if (err.message?.toLowerCase().includes('invalid')) {
          setOtpError('Invalid OTP. Please check and try again.');
        } else if (err.message?.toLowerCase().includes('expired')) {
          setOtpError('OTP expired. Please request a new one.');
        } else {
          setOtpError('Verification failed. Please try again.');
        }
      }
    } finally {
      isVerifying.current = false;
    }
  };

  const handlePhoneChange = (text: string) => {
    setPhone(text);
    if (phoneError) setPhoneError('');
  };
  const handleOtpChange = (text: string) => {
    setOtp(text);
    if (otpError) setOtpError('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      <ErrorToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
        action={toast.action}
      />

      <Modal transparent visible={isLoading} animationType="fade">
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderCard}>
            <Loader label={otpSent ? 'Verifying OTP...' : 'Logging in...'} />
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <View style={styles.header}>
            <Image
              source={require('../../../assets/images/mysehat_icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              {isTestMode
                ? '🧪 Test Mode - Google Play Testing'
                : 'Login with WhatsApp OTP'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>WhatsApp Number</Text>
            <View
              style={[
                styles.phoneRow,
                phoneError && styles.inputError,
                isTestMode && styles.testModeInput,
              ]}
            >
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder="98765XXXXX"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
                style={styles.inputPhone}
                maxLength={10}
                editable={!otpSent || isEditingPhone}
              />
              {otpSent && !isEditingPhone && (
                <Pressable
                  onPress={handleEditPhone}
                  style={styles.editIconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Edit2 size={18} color="#7C3AED" />
                </Pressable>
              )}
            </View>

            {phoneError ? (
              <Text style={styles.errorText}>{phoneError}</Text>
            ) : null}

            {isTestMode && !otpSent && (
              <View style={styles.testModeAlert}>
                <Text style={styles.testModeAlertText}>
                  🧪 Test Mode Active{'\n'}For Google Play Console testing
                </Text>
              </View>
            )}

            <Animated.View
              style={[
                styles.otpSectionContainer,
                {
                  maxHeight: otpSectionHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 500],
                  }),
                  opacity: otpSectionOpacity,
                },
              ]}
            >
              <Text style={[styles.label, { marginTop: 14 }]}>Enter OTP</Text>
              <TextInput
                value={otp}
                onChangeText={handleOtpChange}
                placeholder={
                  isTestMode ? 'Enter test OTP (654321)' : 'Enter 4-6 digit OTP'
                }
                placeholderTextColor="#6B7280"
                keyboardType="number-pad"
                style={[
                  styles.input,
                  otpError && styles.inputError,
                  isTestMode && styles.testModeInput,
                ]}
                maxLength={6}
                autoFocus={otpSent && !isEditingPhone}
              />
              {otpError ? (
                <Text style={styles.errorText}>{otpError}</Text>
              ) : null}
              {isTestMode && (
                <View style={styles.testOtpHint}>
                  <Text style={styles.testOtpHintText}>
                    💡 Test OTP: {TEST_OTP}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={handleResendOtp}
                disabled={resendTimer > 0 || isLoading}
                style={styles.resendBtn}
              >
                <Text
                  style={[
                    styles.resendText,
                    (resendTimer > 0 || isLoading) && styles.resendTextDisabled,
                  ]}
                >
                  {resendTimer > 0
                    ? `Resend OTP in ${resendTimer}s`
                    : isTestMode
                    ? '🧪 Resend Test OTP'
                    : 'Resend OTP'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleVerifyOtp}
                disabled={
                  otp.length < 4 || isLoading || (!isTestMode && !reqId)
                }
                style={[
                  styles.primaryBtn,
                  isTestMode && styles.testModeButton,
                  (otp.length < 4 || isLoading || (!isTestMode && !reqId)) &&
                    styles.btnDisabled,
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {isTestMode ? '🧪 Verify Test OTP' : 'Verify & Login'}
                </Text>
              </Pressable>
            </Animated.View>

            {(!otpSent || isEditingPhone) && (
              <Pressable
                onPress={handleSendOtp}
                disabled={!canSendOtp || isLoading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  isTestMode && styles.testModeButton,
                  (!canSendOtp || isLoading) && styles.btnDisabled,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {isTestMode ? '🧪 Send Test OTP' : 'Send OTP via WhatsApp'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          {/* ✅ NEW: Partner Login Link */}
          <Pressable
            onPress={() => navigation.navigate('PartnerLogin')}
            style={styles.partnerLoginBtn}
          >
            <Text style={styles.partnerLoginText}>
              Are you a Partner?{' '}
              <Text style={styles.partnerLoginLink}>Login as Partner →</Text>
            </Text>
          </Pressable>

          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.footerLink}
              onPress={() =>
                handleOpenURL('https://mysehat.ai/terms', 'Terms of Service')
              }
            >
              Terms of Service
            </Text>
            {' and '}
            <Text
              style={styles.footerLink}
              onPress={() =>
                handleOpenURL('https://mysehat.ai/privacy', 'Privacy Policy')
              }
            >
              Privacy Policy
            </Text>
          </Text>

          <Text style={styles.versionText}>Version v{packageJson.version}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0F' },
  scrollContent: { flexGrow: 1, justifyContent: 'space-between', padding: 20 },
  mainContent: { flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '800', marginTop: 16 },
  subtitle: { color: '#9CA3AF', marginTop: 6, fontSize: 14 },
  card: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  label: { color: '#D1D5DB', marginBottom: 8, fontWeight: '600', fontSize: 13 },
  input: {
    backgroundColor: '#0F172A',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 15,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  logo: { width: 160, height: 90 },
  prefix: {
    color: '#9CA3AF',
    marginRight: 10,
    fontWeight: '700',
    fontSize: 15,
  },
  inputPhone: { flex: 1, paddingVertical: 12, color: '#FFF', fontSize: 15 },
  editIconBtn: { padding: 8, marginLeft: 4 },
  inputError: { borderColor: '#EF4444', borderWidth: 1 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 6, marginLeft: 4 },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  resendBtn: {
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  resendText: { color: '#F97316', fontWeight: '600', fontSize: 13 },
  resendTextDisabled: { color: '#6B7280' },
  footer: { marginTop: 24, paddingTop: 20, alignItems: 'center', gap: 12 },
  // ✅ NEW Partner Login styles
  partnerLoginBtn: { paddingVertical: 6 },
  partnerLoginText: { color: '#6B7280', fontSize: 13 },
  partnerLoginLink: { color: '#7C3AED', fontWeight: '700' },
  footerText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  footerLink: { color: '#F97316', fontWeight: '700' },
  versionText: {
    textAlign: 'center',
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '500',
  },
  loaderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  testModeInput: { borderColor: '#10B981', borderWidth: 2 },
  testModeButton: { backgroundColor: '#10B981' },
  testModeAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  testModeAlertText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  testOtpHint: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  testOtpHintText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  btnPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  otpSectionContainer: { overflow: 'hidden' },
});
