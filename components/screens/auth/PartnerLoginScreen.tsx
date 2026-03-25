/* eslint-disable react-native/no-inline-styles */
// components/screens/auth/PartnerLoginScreen.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  Linking,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import Loader from '../../common/Loader';
import ErrorToast from '../../common/ErrorToast';
import { useErrorToast } from '../../../hooks/useErrorToast';
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import { partnerLogin, clearPartnerError } from '../../../store/slices/partnerAuthSlice';

const packageJson = require('../../../package.json');

type Props = {
  navigation: any;
};

export default function PartnerLoginScreen({ navigation }: Props) {
  const isMounted    = useRef(true);
  const isSubmitting = useRef(false);

  // ✅ Redux
  const dispatch                  = useAppDispatch();
  const { isLoading, error }      = useAppSelector(s => s.partnerAuth);

  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [emailError,    setEmailError]    = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { toast, showError, hideToast } = useErrorToast();

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ✅ Show Redux errors via ErrorToast
  useEffect(() => {
    if (error) {
      showError(error);
      dispatch(clearPartnerError());
    }
  }, [error, dispatch, showError]);

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError('');
  };

  const handleLogin = async () => {
    if (isSubmitting.current) return;

    // ── Validation ────────────────────────────────────────────────────────
    let valid = true;

    if (!email.trim()) {
      setEmailError('Please enter your email address');
      valid = false;
    } else if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    }

    if (!password.trim()) {
      setPasswordError('Please enter your password');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    }

    if (!valid) return;

    isSubmitting.current = true;

    try {
      // ✅ Dispatch real partnerLogin thunk
      const resultAction = await dispatch(
        partnerLogin({ email: email.trim().toLowerCase(), password }),
      );

      if (!isMounted.current) return;

      if (partnerLogin.fulfilled.match(resultAction)) {
        console.log('✅ Partner login success → PartnerDashboard');
        // ✅ PartnerDashboard lives in AppStack, PartnerLogin is in AuthStack
        // Must reset the root navigator to App, then navigate to PartnerDashboard
        navigation.getParent()?.reset({
          index: 0,
          routes: [
            {
              name: 'App',
              state: {
                routes: [{ name: 'PartnerDashboard' }],
              },
            },
          ],
        });
      }
      // Errors are handled via the `error` useEffect + ErrorToast above

    } catch (err: any) {
      if (isMounted.current) {
        showError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      isSubmitting.current = false;
    }
  };

  const handleForgotPassword = useCallback(async () => {
    try {
      const url       = 'https://admin.mysehat.ai/forgot-password';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showError('Unable to open the forgot password page.');
      }
    } catch {
      showError('Something went wrong. Please try again.');
    }
  }, [showError]);

  const canSubmit = email.trim().length > 0 && password.trim().length > 0;

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

      {/* ✅ isLoading from Redux — no local isLoading state needed */}
      <Modal transparent visible={isLoading} animationType="fade">
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderCard}>
            <Loader label="Signing in..." />
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/images/mysehat_icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.badgeRow}>
              <View style={styles.partnerBadge}>
                <Text style={styles.partnerBadgeText}>PARTNER PORTAL</Text>
              </View>
            </View>
            <Text style={styles.title}>Partner Login</Text>
            <Text style={styles.subtitle}>Sign in with your partner credentials</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Email */}
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={handleEmailChange}
              placeholder="partner@example.com"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, emailError && styles.inputError]}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            {/* Password */}
            <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
            <View style={[styles.passwordRow, passwordError && styles.inputError]}>
              <TextInput
                value={password}
                onChangeText={handlePasswordChange}
                placeholder="Enter your password"
                placeholderTextColor="#6B7280"
                secureTextEntry={!showPassword}
                style={styles.inputPassword}
              />
              <Pressable
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.eyeBtn}
              >
                {showPassword
                  ? <EyeOff size={18} color="#6B7280" />
                  : <Eye size={18} color="#6B7280" />}
              </Pressable>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            {/* Forgot Password */}
            <Pressable onPress={handleForgotPassword} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>

            {/* Login Button */}
            <Pressable
              onPress={handleLogin}
              disabled={!canSubmit || isLoading}
              style={({ pressed }) => [
                styles.primaryBtn,
                (!canSubmit || isLoading) && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>Sign In as Partner</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Back to User Login */}
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Back to User Login</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Partner login is restricted to authorized personnel only.
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

  header: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 160, height: 90 },
  badgeRow: { marginTop: 10, marginBottom: 4 },
  partnerBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderColor: '#7C3AED',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  partnerBadgeText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: { color: '#FFF', fontSize: 26, fontWeight: '800', marginTop: 10 },
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputPassword: { flex: 1, paddingVertical: 12, color: '#FFF', fontSize: 15 },
  eyeBtn: { padding: 6 },
  inputError: { borderColor: '#EF4444', borderWidth: 1 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 6, marginLeft: 4 },

  forgotBtn: { alignSelf: 'flex-end', marginTop: 10, paddingVertical: 4 },
  forgotText: { color: '#F97316', fontSize: 13, fontWeight: '600' },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1F2937' },
  dividerText: { color: '#4B5563', marginHorizontal: 12, fontSize: 13 },

  backBtn: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  backBtnText: { color: '#9CA3AF', fontWeight: '600', fontSize: 14 },

  footer: { marginTop: 24, paddingTop: 16, alignItems: 'center', gap: 8 },
  footerText: { textAlign: 'center', color: '#4B5563', fontSize: 12, lineHeight: 18 },
  versionText: { textAlign: 'center', color: '#4B5563', fontSize: 11, fontWeight: '500' },

  loaderOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  loaderCard: { backgroundColor: '#111827', borderRadius: 16, padding: 24, minWidth: 200, borderWidth: 1, borderColor: '#1F2937' },
});