// components/screens/user/WalletScreen.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-native/no-inline-styles */
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
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Zap,
  Percent,
  IndianRupee,
  Menu,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react-native';
import { useRoute } from '@react-navigation/native';
import RazorpayCheckout from 'react-native-razorpay';

import AppDrawer from '../../common/AppDrawer';
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import {
  fetchWalletBalance,
  fetchWalletTransactions,
  verifyWalletRecharge,
  clearWalletErrors,
} from '../../../store/slices/walletSlice';
import { walletApi } from '../../../store/services/walletApi';
import { useApiErrorHandler } from '../../../hooks/useApiErrorHandler';

type Props = { navigation: any };

// ─── Reward tiers — single source of truth (matches backend) ─────────────────
const REWARD_TIERS: Record<number, number> = {
  100: 20,
  200: 50,
  500: 120,
  1000: 250,
};
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 10000;
const POPULAR_AMOUNT = 500;

function getReward(cash: number): number {
  return REWARD_TIERS[cash] !== undefined
    ? REWARD_TIERS[cash]
    : Math.floor(cash * 0.05);
}

const formatINR = (n: number) => {
  try {
    return n.toLocaleString('en-IN');
  } catch {
    return String(n);
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CoinPill({ value }: { value: number }) {
  return (
    <View style={styles.coinPill}>
      <View style={styles.coinCircle}>
        <Text style={styles.coinText}>₹</Text>
      </View>
      <Text style={styles.coinPillText}>+{formatINR(value)}</Text>
    </View>
  );
}

function AmountChip({
  cash,
  reward,
  active,
  isPopular,
  onPress,
  disabled,
}: {
  cash: number;
  reward: number;
  active: boolean;
  isPopular: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.amountChip,
        active ? styles.amountChipActive : styles.amountChipIdle,
        disabled && styles.amountChipDisabled,
      ]}
    >
      <View style={styles.amountChipTopRow}>
        <Text
          style={[styles.amountChipCash, active && styles.amountChipCashActive]}
        >
          ₹{formatINR(cash)}
        </Text>
        <CoinPill value={reward} />
      </View>
      {isPopular && (
        <View style={styles.popularTagWrap}>
          <Text style={styles.popularTagText}>POPULAR</Text>
        </View>
      )}
    </Pressable>
  );
}

function AmountBreakdown({ cash, reward }: { cash: number; reward: number }) {
  return (
    <View style={styles.breakdownCard}>
      <View style={styles.breakdownRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.breakdownLabel}>MySehat Cash</Text>
          <Text style={styles.breakdownValue}>₹{formatINR(cash)}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.breakdownLabel}>Rewards</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.coinCircleSm}>
              <Text style={styles.coinTextSm}>₹</Text>
            </View>
            <Text style={[styles.breakdownValue, { color: '#6EE7B7' }]}>
              ₹{formatINR(reward)}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.breakdownLabel}>Total added</Text>
          <Text style={styles.breakdownValue}>
            = ₹{formatINR(cash + reward)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WalletScreen({ navigation }: Props) {
  const isMounted = useRef(true);
  const isRazorpayOpen = useRef(false);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { executeApiCall } = useApiErrorHandler();

  const route = useRoute();
  const isFromTab = route.name === 'Wallet';
  const isFromStack = route.name === 'WalletStack';

  // ── Redux state ─────────────────────────────────────────────────────────────
  const { balance, isLoadingBalance, balanceError, isRecharging } =
    useAppSelector(s => s.wallet);

  // ── Local state ─────────────────────────────────────────────────────────────
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Derived values ──────────────────────────────────────────────────────────
  const parsedAmount = useMemo(() => {
    const n = Number(String(amount).replace(/[^0-9]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const rewardForAmount = useMemo(
    () => getReward(parsedAmount),
    [parsedAmount],
  );

  const quickList = useMemo(
    () =>
      Object.entries(REWARD_TIERS).map(([cash, reward]) => ({
        cash: Number(cash),
        reward,
      })),
    [],
  );

  const cashBalance = balance?.mysehat_cash ?? 0;
  const rewardBalance = balance?.rewards_points ?? 0;
  const totalBalance = balance?.wallet_balance ?? 0;

  // ── Footer height ────────────────────────────────────────────────────────────
  const footerHeight = useMemo(() => {
    const safeBottom = insets.bottom > 0 ? insets.bottom : 0;
    return 12 + (14 * 2 + 16) + 12 + 10 + 16 + safeBottom;
  }, [insets.bottom]);

  const contentBottomPadding = useMemo(() => footerHeight + 20, [footerHeight]);

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    loadBalance();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBalance = useCallback(async () => {
    await executeApiCall(() => dispatch(fetchWalletBalance()).unwrap(), {
      showErrorToast: true,
      retryCallback: loadBalance,
    });
  }, [dispatch, executeApiCall]);

  // ✅ Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await dispatch(fetchWalletBalance())
      .unwrap()
      .catch(() => {});
    if (isMounted.current) setIsRefreshing(false);
  }, [dispatch]);

  // ── Hardware back ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onBack = () => {
      if (drawerOpen && isFromTab) {
        setDrawerOpen(false);
        return true;
      }
      if (isFromStack) {
        handleBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedAmount, isProcessing, drawerOpen, isFromTab, isFromStack]);

  const handleBack = useCallback(() => {
    if (!isMounted.current || isProcessing || isRazorpayOpen.current) return;
    if (parsedAmount > 0) {
      Alert.alert('Discard Amount?', 'You have entered an amount. Go back?', [
        { text: 'STAY', style: 'cancel' },
        {
          text: 'DISCARD',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]);
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
  }, [isProcessing, parsedAmount, navigation]);

  // ── Validate ─────────────────────────────────────────────────────────────────
  const validateAmount = (amt: number): string | null => {
    if (amt < MIN_AMOUNT) return `Minimum amount is ₹${MIN_AMOUNT}`;
    if (amt > MAX_AMOUNT) return `Maximum amount is ₹${MAX_AMOUNT}`;
    return null;
  };

  // ── Recharge flow ─────────────────────────────────────────────────────────────
  const handleAddBalance = useCallback(
    async (amt: number) => {
      if (!isMounted.current) return;

      const err = validateAmount(amt);
      if (err) {
        Alert.alert('Invalid Amount', err);
        return;
      }

      const reward = getReward(amt);

      try {
        setIsProcessing(true);
        dispatch(clearWalletErrors());

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💳 WALLET RECHARGE — Amount:', amt, '| Reward:', reward);

        // Step 1: Create Razorpay order
        const orderRes = await walletApi.createRechargeOrder(amt);

        if (!isMounted.current) return;

        if (!orderRes.success) {
          throw new Error(
            orderRes.message || 'Failed to create recharge order',
          );
        }

        const orderData = orderRes.data;
        console.log('✅ Recharge order created:', orderData.razorpay_order_id);

        // Step 2: Open Razorpay SDK
        const rzpOptions = {
          description: `MySehat Wallet Recharge — ₹${amt}`,
          currency: orderData.currency,
          key: orderData.key_id,
          amount: orderData.amount, // paise
          order_id: orderData.razorpay_order_id,
          name: 'MySehat',
          theme: { color: '#7C3AED' },
        };

        isRazorpayOpen.current = true;
        console.log('🌐 Opening Razorpay...');
        const rzpResponse = await RazorpayCheckout.open(rzpOptions);
        isRazorpayOpen.current = false;

        console.log(
          '✅ Razorpay success — Payment ID:',
          rzpResponse.razorpay_payment_id,
        );

        // Step 3: Verify with backend via Redux thunk
        // Verification MUST complete — don't check isMounted
        const result = await dispatch(
          verifyWalletRecharge({
            razorpay_order_id: rzpResponse.razorpay_order_id,
            razorpay_payment_id: rzpResponse.razorpay_payment_id,
            razorpay_signature: rzpResponse.razorpay_signature,
            cash_amount: amt,
            reward_amount: reward,
          }),
        ).unwrap();

        console.log(
          '✅ Wallet recharged! New balance: ₹',
          result.wallet_balance,
        );
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Reset amount input
        if (isMounted.current) setAmount('');

        Alert.alert(
          '✅ Recharge Successful!',
          `₹${amt} added to MySehat Cash\n+₹${reward} reward bonus added!\n\nNew Balance: ₹${result.wallet_balance}`,
          [{ text: 'Great!' }],
        );
      } catch (error: any) {
        isRazorpayOpen.current = false;
        console.log('❌ Recharge error:', error.message);

        if (!isMounted.current) return;

        // Razorpay user-cancelled — don't show error
        if (error.code === 0 || error.code === 5) {
          console.log('ℹ️ User cancelled Razorpay');
          return;
        }

        Alert.alert(
          'Recharge Failed',
          error.message || 'Failed to recharge wallet. Please try again.',
          [{ text: 'OK' }],
        );
      } finally {
        if (isMounted.current) setIsProcessing(false);
      }
    },
    [dispatch],
  );

  const isAddDisabled =
    !parsedAmount || isProcessing || isRecharging || isLoadingBalance;

  // ── Header ───────────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.header}>
      {isFromStack ? (
        <TouchableOpacity
          onPress={handleBack}
          style={styles.iconBtn}
          disabled={isProcessing}
        >
          <ArrowLeft size={24} color={isProcessing ? '#71717A' : '#FAFAFA'} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          style={styles.iconBtn}
        >
          <Menu size={24} color="#FAFAFA" />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>MySehat Wallet</Text>
      {/* Refresh button */}
      <TouchableOpacity
        onPress={loadBalance}
        style={styles.iconBtn}
        disabled={isLoadingBalance}
      >
        {isLoadingBalance ? (
          <ActivityIndicator size="small" color="#7C3AED" />
        ) : (
          <RefreshCw size={20} color="#71717A" />
        )}
      </TouchableOpacity>
    </View>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {isFromTab && (
        <AppDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          navigation={navigation}
        />
      )}

      {renderHeader()}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: contentBottomPadding }}
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#7C3AED" // iOS spinner color
            colors={['#7C3AED']} // Android spinner color
            progressBackgroundColor="#09090B" // Android background
          />
        }
      >
        {/* ── Balance Card ─────────────────────────────────────────────────── */}
        <View style={styles.balanceCard}>
          <View style={[styles.balanceBanner, { backgroundColor: '#7C3AED' }]}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <View style={styles.balanceRow}>
              {isLoadingBalance ? (
                <ActivityIndicator
                  size="large"
                  color="#FFFFFF"
                  style={{ marginTop: 8 }}
                />
              ) : (
                <Text style={styles.balanceValue}>
                  ₹{formatINR(totalBalance)}
                </Text>
              )}
              <View style={styles.rewardsPill}>
                <Text style={styles.rewardsPillLabel}>Rewards</Text>
                <Text style={styles.rewardsPillValue}>
                  +₹{formatINR(rewardBalance)}
                </Text>
              </View>
            </View>

            {/* Cash vs Rewards breakdown */}
            {!isLoadingBalance && (
              <View style={styles.bucketRow}>
                <Text style={styles.bucketText}>
                  Cash: ₹{formatINR(cashBalance)}
                </Text>
                <Text style={styles.bucketDot}>•</Text>
                <Text style={styles.bucketText}>
                  Rewards: ₹{formatINR(rewardBalance)}
                </Text>
              </View>
            )}

            <View style={styles.bannerCoin}>
              <View style={styles.bannerCoinCircle}>
                <Text style={styles.bannerCoinText}>₹</Text>
              </View>
            </View>
          </View>

          <Text style={styles.breakdownHint}>
            Note: Rewards are subject to usage rules and expiry.
          </Text>

          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Zap size={18} color="#E5E7EB" />
              </View>
              <Text style={styles.featureTitle}>Easy & Fast</Text>
              <Text style={styles.featureSubtitle}>Payments</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <IndianRupee size={18} color="#E5E7EB" />
              </View>
              <Text style={styles.featureTitle}>Instant</Text>
              <Text style={styles.featureSubtitle}>Credits</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Percent size={18} color="#E5E7EB" />
              </View>
              <Text style={styles.featureTitle}>Rewards</Text>
              <Text style={styles.featureSubtitle}>On recharge</Text>
            </View>
          </View>
        </View>

        {/* ── Add Cash ─────────────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Add Cash</Text>
          <Text style={styles.sectionSubTitle}>
            Add wallet cash and get extra reward credits.
          </Text>

          <Text style={styles.inputLabel}>Enter Amount</Text>
          <View style={styles.amountInputWrap}>
            <Text style={styles.rupeePrefix}>₹</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="numeric"
              style={styles.amountInput}
              editable={!isProcessing && !isRecharging}
            />
          </View>

          <Text style={styles.validationHint}>
            Min: ₹{MIN_AMOUNT} • Max: ₹{MAX_AMOUNT}
          </Text>

          {parsedAmount > 0 && (
            <View style={{ marginTop: 12 }}>
              <AmountBreakdown cash={parsedAmount} reward={rewardForAmount} />
            </View>
          )}

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>
            Quick Select
          </Text>
          <View style={styles.quickGrid}>
            {quickList.map(q => (
              <View key={q.cash} style={{ width: '48%' }}>
                <AmountChip
                  cash={q.cash}
                  reward={q.reward}
                  active={parsedAmount === q.cash}
                  isPopular={q.cash === POPULAR_AMOUNT}
                  disabled={isProcessing || isRecharging}
                  onPress={() => {
                    if (!isProcessing && !isRecharging)
                      setAmount(String(q.cash));
                  }}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky Footer ──────────────────────────────────────────────────── */}
      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 0 },
        ]}
      >
        <Pressable
          onPress={() => handleAddBalance(parsedAmount)}
          disabled={isAddDisabled}
          style={[
            styles.primaryBtn,
            isAddDisabled && styles.primaryBtnDisabled,
          ]}
        >
          {isProcessing || isRecharging ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>
                {isRecharging ? 'Verifying...' : 'Processing...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>Add Balance</Text>
          )}
        </Pressable>
        <Text style={styles.poweredBy}>
          Secure payments powered by Razorpay
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    backgroundColor: '#09090B',
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FAFAFA' },
  scrollContent: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },

  balanceCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 12,
  },
  balanceBanner: { padding: 16, minHeight: 120, position: 'relative' },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '700',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  balanceValue: { color: 'white', fontSize: 36, fontWeight: '900' },

  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  bucketText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '600',
  },
  bucketDot: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },

  rewardsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  rewardsPillLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
  },
  rewardsPillValue: { color: '#6EE7B7', fontSize: 12, fontWeight: '900' },

  bannerCoin: { position: 'absolute', right: 14, top: 18 },
  bannerCoinCircle: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(255,215,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCoinText: { color: '#3A2200', fontWeight: '900', fontSize: 18 },

  breakdownHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginTop: 10,
    marginLeft: 15,
  },
  featuresRow: {
    backgroundColor: '#09090B',
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  featureItem: { alignItems: 'center', width: '30%' },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  featureTitle: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '800',
    fontSize: 12,
  },
  featureSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    marginTop: 2,
  },

  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: '900' },
  sectionSubTitle: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    fontSize: 13,
  },

  inputLabel: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
  },
  amountInputWrap: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rupeePrefix: { color: 'white', fontSize: 22, fontWeight: '900' },
  amountInput: { flex: 1, color: 'white', fontSize: 22, fontWeight: '900' },
  validationHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginTop: 6,
    marginLeft: 4,
  },

  breakdownCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
  },
  breakdownRow: { flexDirection: 'row' },
  breakdownLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
    rowGap: 10,
  },
  amountChip: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    minHeight: 72,
    justifyContent: 'center',
  },
  amountChipIdle: {
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  amountChipActive: {
    borderColor: 'rgba(168,85,247,0.85)',
    backgroundColor: 'rgba(168,85,247,0.12)',
  },
  amountChipDisabled: { opacity: 0.5 },
  amountChipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountChipCash: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 18,
    fontWeight: '900',
  },
  amountChipCashActive: { color: '#E9D5FF' },
  popularTagWrap: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -12,
    backgroundColor: '#eb2b12ff',
    paddingHorizontal: 10,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  popularTagText: { color: 'white', fontSize: 11, fontWeight: '900' },

  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  coinCircle: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: { color: '#111827', fontWeight: '900', fontSize: 11 },
  coinPillText: { color: '#A7F3D0', fontWeight: '900', fontSize: 12 },
  coinCircleSm: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinTextSm: { color: '#111827', fontWeight: '900', fontSize: 11 },

  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#09090B',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    elevation: 20,
  },
  primaryBtn: {
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '900' },
  poweredBy: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 10,
  },
});
