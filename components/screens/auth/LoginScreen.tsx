// components/screens/auth/LoginScreen.tsx
/* eslint-disable react-native/no-inline-styles */
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
  BackHandler,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import InAppBrowser from '../../common/InAppBrowser';
import Loader from '../../common/Loader';
import { isValidIndianMobile } from '../../../utils/validators';
import { verifyLogin, setOtpSent, clearError } from '../../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../../store';

const packageJson = require('../../../package.json');

// MSG91 Configuration
const MSG91_WIDGET_ID = '356a676a4159343638343132';
const MSG91_TOKEN_AUTH = '442931TIzX7UoX8cUH68ee3e82P1';

// ============================================================================
// 🧪 TEST MODE CONFIGURATION
// ============================================================================
const TEST_MOBILE = '9876543210';
const TEST_OTP = '654321';
const TEST_MODE_ENABLED = true;

type Props = {
  navigation: any;
};

export default function LoginScreen({ navigation }: Props) {
  const isMounted = useRef(true);
  
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, otpSent } = useSelector((state: RootState) => state.auth);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [reqId, setReqId] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [browser, setBrowser] = React.useState<{
    visible: boolean;
    url: string;
    title: string;
  }>({
    visible: false,
    url: '',
    title: '',
  });

  const canSendOtp = useMemo(() => isValidIndianMobile(phone), [phone]);

  // ✅ Use useCallback to memoize handleChangeNumber
  const handleChangeNumber = useCallback(() => {
    dispatch(setOtpSent(false));
    setOtp('');
    setOtpError('');
    setPhoneError('');
    setResendTimer(0);
    setReqId(null);
    setIsTestMode(false);
  }, [dispatch]);

  // ✅ Setup and cleanup
  useEffect(() => {
    isMounted.current = true;
    
    console.log('🔐 LoginScreen: Component mounted');
    console.log('🔐 Initializing MSG91 Widget...');
    
    try {
      OTPWidget.initializeWidget(MSG91_WIDGET_ID, MSG91_TOKEN_AUTH);
      console.log('✅ MSG91 Widget initialized successfully');
    } catch (err) {
      console.error('❌ Failed to initialize MSG91 Widget:', err);
      Alert.alert('Error', 'Failed to initialize OTP service. Please restart the app.');
    }

    return () => {
      console.log('🧹 LoginScreen: Unmounting...');
      isMounted.current = false;
    };
  }, []);

  // ✅ Handle hardware back button - now with proper dependencies
  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: LoginScreen');
      
      if (otpSent && !isLoading) {
        Alert.alert(
          'Cancel Login?',
          'Your OTP session will be lost. Are you sure you want to go back?',
          [
            {
              text: 'Stay',
              style: 'cancel',
            },
            {
              text: 'Cancel Login',
              style: 'destructive',
              onPress: () => {
                if (isMounted.current) {
                  handleChangeNumber();
                }
              },
            },
          ]
        );
        return true;
      }
      
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [otpSent, isLoading, handleChangeNumber]); // ✅ Added handleChangeNumber

  // Countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Handle Redux errors
  useEffect(() => {
    if (error) {
      console.warn('Redux error:', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Check if test mobile
  useEffect(() => {
    if (TEST_MODE_ENABLED && phone === TEST_MOBILE) {
      console.log('🧪 TEST MODE DETECTED');
      setIsTestMode(true);
    } else {
      setIsTestMode(false);
    }
  }, [phone]);

  const handleTestModeSendOtp = () => {
    if (!isMounted.current) return;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST MODE: Sending Test OTP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const testReqId = 'TEST_' + Date.now();
    setReqId(testReqId);
    
    dispatch(setOtpSent(true));
    setResendTimer(60);
    
    Alert.alert(
      '🧪 Test Mode',
      `This is a test account for Google Play Console.\n\nTest OTP: ${TEST_OTP}\n\nEnter this OTP to login.`,
      [{ text: 'OK' }]
    );
  };

  const handleSendOtp = async () => {
    console.log('📤 Sending OTP to:', phone);
    
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted, aborting OTP send');
      return;
    }
    
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
    
    if (isTestMode) {
      handleTestModeSendOtp();
      return;
    }
    
    try {
      const data = {
        identifier: `91${phone}`,
      };
      
      console.log('📱 Calling MSG91 sendOTP...');
      const response = await OTPWidget.sendOTP(data);
      
      if (!isMounted.current) {
        console.warn('⚠️ Component unmounted after OTP send');
        return;
      }
      
      console.log('✅ MSG91 Response:', response);
      
      if (response.type === 'success') {
        const hexReqId = response.message;
        console.log('✅ Storing HEX reqId:', hexReqId);
        setReqId(hexReqId);
        
        dispatch(setOtpSent(true));
        setResendTimer(60);
        Alert.alert('OTP Sent', 'Please check your WhatsApp for the OTP code.');
      } else {
        throw new Error(response.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      console.error('❌ Send OTP error:', err);
      
      if (isMounted.current) {
        setPhoneError(err.message || 'Failed to send OTP. Please try again.');
      }
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted, aborting resend');
      return;
    }
    
    console.log('🔄 Resending OTP...');
    setOtpError('');
    setOtp('');
    setReqId(null);
    
    if (isTestMode) {
      handleTestModeSendOtp();
      return;
    }
    
    try {
      const data = {
        identifier: `91${phone}`,
      };
      
      const response = await OTPWidget.sendOTP(data);
      
      if (!isMounted.current) {
        console.warn('⚠️ Component unmounted after resend');
        return;
      }
      
      if (response.type === 'success') {
        const hexReqId = response.message;
        console.log('✅ New HEX reqId:', hexReqId);
        setReqId(hexReqId);
        setResendTimer(60);
        Alert.alert('OTP Sent', 'A new OTP has been sent to your WhatsApp.');
      } else {
        throw new Error(response.message || 'Failed to resend OTP');
      }
    } catch (err: any) {
      console.error('❌ Resend OTP error:', err);
      
      if (isMounted.current) {
        setOtpError(err.message || 'Failed to resend OTP. Please try again.');
      }
    }
  };

  const handleVerifyTestOtp = async () => {
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted, aborting verify');
      return;
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TEST MODE: Verifying Test OTP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (otp !== TEST_OTP) {
      setOtpError(`Invalid OTP. Test OTP is: ${TEST_OTP}`);
      return;
    }
    
    console.log('✅ Test OTP verified! Logging in...');
    
    const testAccessToken = `test_token_${phone}_${Date.now()}`;
    
    const resultAction = await dispatch(verifyLogin({
      accessToken: testAccessToken,
      mobile: phone,
    }));
    
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted after test login');
      return;
    }
    
    if (verifyLogin.fulfilled.match(resultAction)) {
      console.log('✅ Test login successful!');
      
      const userData = resultAction.payload;
      
      if (userData.requiresProfileSetup) {
        console.log('📝 Redirecting to profile setup...');
        navigation.replace('CompleteProfile');
      } else {
        console.log('🏠 Redirecting to home...');
        navigation.replace('App');
      }
    } else {
      setOtpError('Login failed. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    console.log('🔐 Verifying OTP...');
    
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted, aborting verify');
      return;
    }
    
    setOtpError('');
    
    if (!otp.trim()) {
      setOtpError('Please enter the OTP');
      return;
    }
    
    if (otp.length < 4) {
      setOtpError('Please enter a valid OTP (4-6 digits)');
      return;
    }
    
    if (isTestMode) {
      await handleVerifyTestOtp();
      return;
    }
    
    if (!reqId) {
      setOtpError('Session expired. Please resend OTP.');
      return;
    }
    
    try {
      const verifyData = {
        reqId: reqId,
        otp: otp,
      };
      
      console.log('🔍 Verifying with HEX reqId:', reqId);
      
      const verifyResponse = await OTPWidget.verifyOTP(verifyData);
      
      if (!isMounted.current) {
        console.warn('⚠️ Component unmounted after OTP verify');
        return;
      }
      
      console.log('✅ Verify response:', verifyResponse);
      
      if (verifyResponse.type === 'success') {
        const accessToken = 
          verifyResponse.message ||
          verifyResponse.accessToken || 
          verifyResponse['access-token'] ||
          verifyResponse.data?.accessToken ||
          verifyResponse.data?.['access-token'];
        
        console.log('✅ Got access token from MSG91');
        
        if (!accessToken) {
          setOtpError('No access token received. Please try again.');
          return;
        }
        
        console.log('🔑 Sending token to backend for login...');
        
        const resultAction = await dispatch(verifyLogin({
          accessToken: accessToken,
          mobile: phone,
        }));
        
        if (!isMounted.current) {
          console.warn('⚠️ Component unmounted after backend login');
          return;
        }
        
        if (verifyLogin.fulfilled.match(resultAction)) {
          console.log('✅ Login successful!');
          
          const userData = resultAction.payload;
          
          if (userData.requiresProfileSetup) {
            console.log('📝 Redirecting to profile setup...');
            navigation.replace('CompleteProfile');
          } else {
            console.log('🏠 Redirecting to home...');
            navigation.replace('App');
          }
        } else {
          setOtpError('Login failed. Please try again.');
        }
      } else {
        if (verifyResponse.code === 708) {
          setOtpError('OTP session expired. Please request a new OTP.');
        } else if (verifyResponse.message && verifyResponse.message.toLowerCase().includes('invalid')) {
          setOtpError('Invalid OTP. Please check and try again.');
        } else {
          setOtpError(verifyResponse.message || 'Verification failed. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('❌ Verify OTP error:', err);
      
      if (isMounted.current) {
        if (err.message && err.message.toLowerCase().includes('invalid')) {
          setOtpError('Invalid OTP. Please check and try again.');
        } else if (err.message && err.message.toLowerCase().includes('expired')) {
          setOtpError('OTP expired. Please request a new one.');
        } else {
          setOtpError('Verification failed. Please try again.');
        }
      }
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
      
      <InAppBrowser
        visible={browser.visible}
        url={browser.url}
        title={browser.title}
        onClose={() => setBrowser({ visible: false, url: '', title: '' })}
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
            <StatusBar barStyle="light-content" />
            <Image
              source={require('../../../assets/images/mysehat_icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              {isTestMode ? '🧪 Test Mode - Google Play Testing' : 'Login with WhatsApp OTP'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>WhatsApp Number</Text>
            <View style={[
              styles.phoneRow,
              phoneError && styles.inputError,
              isTestMode && styles.testModeInput,
            ]}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder="98765XXXXX"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
                style={styles.inputPhone}
                maxLength={10}
                editable={!otpSent}
              />
            </View>
            
            {phoneError ? (
              <Text style={styles.errorText}>{phoneError}</Text>
            ) : null}

            {isTestMode && !otpSent && (
              <View style={styles.testModeAlert}>
                <Text style={styles.testModeAlertText}>
                  🧪 Test Mode Active{'\n'}
                  For Google Play Console testing
                </Text>
              </View>
            )}

            {!otpSent ? (
              <Pressable
                onPress={handleSendOtp}
                disabled={!canSendOtp || isLoading}
                style={[
                  styles.primaryBtn,
                  isTestMode && styles.testModeButton,
                  (!canSendOtp || isLoading) && styles.btnDisabled,
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {isTestMode ? '🧪 Send Test OTP' : 'Send OTP via WhatsApp'}
                </Text>
              </Pressable>
            ) : (
              <>
                <Text style={[styles.label, { marginTop: 14 }]}>Enter OTP</Text>
                <TextInput
                  value={otp}
                  onChangeText={handleOtpChange}
                  placeholder={isTestMode ? 'Enter test OTP (654321)' : 'Enter 4-6 digit OTP'}
                  placeholderTextColor="#6B7280"
                  keyboardType="number-pad"
                  style={[
                    styles.input,
                    otpError && styles.inputError,
                    isTestMode && styles.testModeInput,
                  ]}
                  maxLength={6}
                  autoFocus
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
                  <Text style={[
                    styles.resendText,
                    (resendTimer > 0 || isLoading) && styles.resendTextDisabled,
                  ]}>
                    {resendTimer > 0 
                      ? `Resend OTP in ${resendTimer}s` 
                      : isTestMode 
                        ? '🧪 Resend Test OTP'
                        : 'Resend OTP'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleVerifyOtp}
                  disabled={otp.length < 4 || isLoading || (!isTestMode && !reqId)}
                  style={[
                    styles.primaryBtn,
                    isTestMode && styles.testModeButton,
                    (otp.length < 4 || isLoading || (!isTestMode && !reqId)) && styles.btnDisabled,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    {isTestMode ? '🧪 Verify Test OTP' : 'Verify & Login'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleChangeNumber}
                  style={styles.linkBtn}
                  disabled={isLoading}
                >
                  <Text style={styles.linkText}>Change Number</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.footerLink}
              onPress={() =>
                setBrowser({
                  visible: true,
                  url: 'https://mysehat.ai/terms',
                  title: 'Terms of Service',
                })
              }
            >
              Terms of Service
            </Text>
            {' and '}
            <Text
              style={styles.footerLink}
              onPress={() =>
                setBrowser({
                  visible: true,
                  url: 'https://mysehat.ai/privacy',
                  title: 'Privacy Policy',
                })
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
  root: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 16,
  },
  subtitle: {
    color: '#9CA3AF',
    marginTop: 6,
    fontSize: 14,
  },
  card: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  label: {
    color: '#D1D5DB',
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 13,
  },
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
  logo: {
    width: 160,
    height: 90,
  },
  prefix: {
    color: '#9CA3AF',
    marginRight: 10,
    fontWeight: '700',
    fontSize: 15,
  },
  inputPhone: {
    flex: 1,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 15,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  resendBtn: {
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  resendText: {
    color: '#F97316',
    fontWeight: '600',
    fontSize: 13,
  },
  resendTextDisabled: {
    color: '#6B7280',
  },
  linkBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  linkText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  footer: {
    marginTop: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  footerLink: {
    color: '#F97316',
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    color: '#4B5563',
    fontSize: 11,
    marginTop: 12,
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
  testModeInput: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  testModeButton: {
    backgroundColor: '#10B981',
  },
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
});