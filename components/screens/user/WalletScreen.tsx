// components/screens/user/WalletScreen.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-native/no-inline-styles */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Zap, Percent, IndianRupee } from 'lucide-react-native';

type Props = {
  navigation: any;
};

type QuickAmount = {
  cash: number;
  reward: number;
};

const formatINR = (n: number) => {
  try {
    return n.toLocaleString('en-IN');
  } catch {
    return String(n);
  }
};

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

function FeatureItem({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconWrap}>{icon}</View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureSubtitle}>{subtitle}</Text>
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

      {isPopular ? (
        <View style={styles.popularTagWrap}>
          <Text style={styles.popularTagText}>POPULAR</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function AmountBreakdown({ cash, reward }: { cash: number; reward: number }) {
  const total = cash + reward;

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
          <Text style={styles.breakdownValue}>= ₹{formatINR(total)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function WalletScreen({ navigation }: Props) {
  // ✅ Add isMounted ref
  const isMounted = useRef(true);
  
  // Mock data - TODO: Replace with Redux/API data
  const cashBalance = 0;
  const rewardBalance = 0;
  const rewardRate = 0.05;
  const popularAmount = 500;
  
  // ✅ Payment limits
  const MIN_AMOUNT = 100;
  const MAX_AMOUNT = 10000;

  const [amount, setAmount] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Setup and cleanup
  useEffect(() => {
    isMounted.current = true;
    
    console.log('💰 WalletScreen: Component mounted');

    return () => {
      console.log('🧹 WalletScreen: Unmounting...');
      isMounted.current = false;
      
      if (isProcessing) {
        console.log('⚠️ Component unmounted during payment processing');
      }
    };
  }, []);

  const baseQuick: QuickAmount[] = useMemo(
    () => [
      { cash: 100, reward: 20 },
      { cash: 200, reward: 50 },
      { cash: 500, reward: 120 },
      { cash: 1000, reward: 250 },
    ],
    [],
  );

  const parsedAmount = useMemo(() => {
    const n = Number(String(amount).replace(/[^0-9]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const rewardForAmount = useMemo(() => {
    if (!parsedAmount) return 0;

    const fixed: Record<number, number> = {
      100: 20,
      200: 50,
      500: 120,
      1000: 250,
    };

    if (fixed[parsedAmount] !== undefined) return fixed[parsedAmount];
    return Math.floor(parsedAmount * rewardRate);
  }, [parsedAmount, rewardRate]);

  const quickList = useMemo(() => {
    const primary = baseQuick.slice(0, 4);
    if (!expanded) return primary;

    return [
      ...primary,
      ...baseQuick.slice(4).map(q => ({
        cash: q.cash,
        reward: q.reward || Math.floor(q.cash * rewardRate),
      })),
    ];
  }, [baseQuick, expanded, rewardRate]);

  const showBreakdown = parsedAmount > 0;

  // ✅ Helper function for actual navigation
  const performNavigation = () => {
    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, aborting navigation');
      return;
    }
    
    try {
      if (navigation.canGoBack()) {
        console.log('✅ Navigating back');
        navigation.goBack();
      }
    } catch (error) {
      console.log('❌ Navigation error:', error);
    }
  };

  // ✅ Unified back handler with confirmation logic
  const handleBack = () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⬅️ handleBack called');
    console.log('Current state:', { 
      isProcessing, 
      parsedAmount, 
      isMounted: isMounted.current 
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, aborting navigation');
      return;
    }
    
    // ✅ Block if processing payment
    if (isProcessing) {
      console.log('🚫 BLOCKED: Payment in progress');
      Alert.alert(
        'Processing Payment',
        'Please wait for the payment to complete.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // ✅ Ask for confirmation if amount entered
    if (parsedAmount > 0) {
      console.log('⚠️ Amount entered, showing confirmation');
      Alert.alert(
        'Discard Amount?',
        'You have entered an amount. Are you sure you want to go back?',
        [
          {
            text: 'STAY',
            style: 'cancel',
            onPress: () => console.log('User chose to stay'),
          },
          {
            text: 'DISCARD',
            style: 'destructive',
            onPress: () => {
              console.log('User chose to discard');
              if (isMounted.current) {
                performNavigation();
              }
            },
          },
        ]
      );
      return;
    }
    
    // ✅ No amount entered, navigate directly
    console.log('✅ No amount, navigating back directly');
    performNavigation();
  };

  // ✅ Hardware back handler - just calls handleBack
  useEffect(() => {
    const backAction = () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⬅️ HARDWARE BACK PRESSED: WalletScreen');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      handleBack(); // ✅ Use unified handler
      
      return true; // Always prevent default
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [parsedAmount, isProcessing]); // ✅ Dependencies for handleBack closure

  // ✅ Validate amount before payment
  const validateAmount = (amt: number): string | null => {
    if (amt < MIN_AMOUNT) {
      return `Minimum amount is ₹${MIN_AMOUNT}`;
    }
    
    if (amt > MAX_AMOUNT) {
      return `Maximum amount is ₹${MAX_AMOUNT}`;
    }
    
    return null; // Valid
  };

  // ✅ Handle add balance with validation and safety
  const handleAddBalance = async (amt: number) => {
    try {
      // ✅ Check if mounted
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted, aborting payment');
        return;
      }
      
      // ✅ Validate amount
      const validationError = validateAmount(amt);
      if (validationError) {
        Alert.alert('Invalid Amount', validationError, [{ text: 'OK' }]);
        return;
      }
      
      setIsProcessing(true);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💳 INITIATING WALLET RECHARGE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Amount:', amt);
      console.log('Rewards:', rewardForAmount);
      console.log('Total:', amt + rewardForAmount);
      
      // TODO: Implement Razorpay payment integration
      // Example:
      // const paymentData = await createWalletRecharge(amt);
      // const razorpayResponse = await RazorpayCheckout.open({
      //   key: paymentData.key_id,
      //   amount: paymentData.amount,
      //   order_id: paymentData.razorpay_order_id,
      //   name: 'MySehat Wallet',
      //   description: 'Add Balance',
      // });
      
      // Simulate async delay
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      
      // ✅ Check if still mounted after async operation
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted after payment initiation');
        return;
      }
      
      // TODO: Verify payment with backend
      // await verifyWalletRecharge(razorpayResponse);
      
      // ✅ For now, show coming soon alert
      Alert.alert(
        'Coming Soon',
        `Wallet recharge feature is coming soon!\n\nYou selected: ₹${amt}\nRewards: +₹${rewardForAmount}`,
        [{ text: 'OK' }]
      );
      
      console.log('✅ Payment flow completed');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
    } catch (error: any) {
      console.log('❌ Payment error:', error);
      
      // ✅ Only show alert if mounted
      if (isMounted.current) {
        Alert.alert(
          'Payment Error',
          'Failed to process payment. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      // ✅ Only update state if mounted
      if (isMounted.current) {
        setIsProcessing(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            style={[
              styles.iconBtn,
              isProcessing && styles.iconBtnDisabled
            ]} 
            onPress={handleBack}
            disabled={isProcessing}
          >
            <ChevronLeft 
              size={20} 
              color={isProcessing ? "#6B7280" : "#E5E7EB"} 
            />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>MySehat Wallet</Text>
            <Text style={styles.headerSubtitle}>MySehat Cash + Rewards</Text>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={[styles.balanceBanner, { backgroundColor: '#7C3AED' }]}>
            <Text style={styles.balanceLabel}>Available Balance</Text>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceValue}>₹{formatINR(cashBalance)}</Text>

              {/* Rewards pill next to balance */}
              <View style={styles.rewardsPill}>
                <Text style={styles.rewardsPillLabel}>Rewards</Text>
                <Text style={styles.rewardsPillValue}>
                  +₹{formatINR(rewardBalance)}
                </Text>
              </View>
            </View>

            {/* simple "coin" on right */}
            <View style={styles.bannerCoin}>
              <View style={styles.bannerCoinCircle}>
                <Text style={styles.bannerCoinText}>₹</Text>
              </View>
              <View
                style={[
                  styles.bannerCoinCircle,
                  { opacity: 0.85, marginTop: -10 },
                ]}
              />
            </View>
          </View>
          <Text style={styles.breakdownHint}>
            Note: Rewards are subject to usage rules and expiry.
          </Text>
          <View style={styles.featuresRow}>
            <FeatureItem
              icon={<Zap size={18} color="#E5E7EB" />}
              title="Easy & Fast"
              subtitle="Payments"
            />
            <FeatureItem
              icon={<IndianRupee size={18} color="#E5E7EB" />}
              title="Instant"
              subtitle="Credits"
            />
            <FeatureItem
              icon={<Percent size={18} color="#E5E7EB" />}
              title="Rewards"
              subtitle="On recharge"
            />
          </View>
        </View>

        {/* Add Cash */}
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
              editable={!isProcessing}
            />
          </View>

          {/* Validation hint */}
          <Text style={styles.validationHint}>
            Min: ₹{MIN_AMOUNT} • Max: ₹{MAX_AMOUNT}
          </Text>

          {/* Breakdown only when amount present */}
          {showBreakdown ? (
            <View style={{ marginTop: 12 }}>
              <AmountBreakdown cash={parsedAmount} reward={rewardForAmount} />
            </View>
          ) : null}

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>
            Quick Select
          </Text>

          <View style={styles.quickGrid}>
            {quickList.map(q => {
              const active = parsedAmount === q.cash;
              return (
                <View key={q.cash} style={{ width: '48%' }}>
                  <AmountChip
                    cash={q.cash}
                    reward={q.reward}
                    active={active}
                    isPopular={q.cash === popularAmount}
                    disabled={isProcessing}
                    onPress={() => {
                      if (!isProcessing) {
                        setAmount(String(q.cash));
                      }
                    }}
                  />
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={() => handleAddBalance(parsedAmount)}
            disabled={!parsedAmount || isProcessing}
            style={[
              styles.primaryBtn,
              (!parsedAmount || isProcessing) && styles.primaryBtnDisabled,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {isProcessing ? 'Processing...' : 'Add Balance'}
            </Text>
          </Pressable>

          <Text style={styles.poweredBy}>
            Secure payments powered by Razorpay
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
    paddingHorizontal: 14,
    paddingTop: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '900' },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 2,
  },

  balanceCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 12,
  },
  balanceBanner: {
    padding: 16,
    minHeight: 120,
    position: 'relative',
  },
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

  bannerCoin: {
    position: 'absolute',
    right: 14,
    top: 18,
    alignItems: 'flex-end',
  },
  bannerCoinCircle: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(255,215,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCoinText: { color: '#3A2200', fontWeight: '900', fontSize: 18 },

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
  breakdownHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginTop: 10,
    marginLeft: 15,
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
  amountChipDisabled: {
    opacity: 0.5,
  },

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

  viewMoreBtn: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewMoreText: { color: '#C4B5FD', fontWeight: '900' },

  primaryBtn: {
    marginTop: 14,
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

  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginVertical: 10,
  },
  txnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  txnTitle: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '800',
    fontSize: 14,
  },
  txnSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 4,
  },
  txnAmount: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '900',
    fontSize: 14,
  },

  seeAllBtn: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  seeAllText: { color: '#C4B5FD', fontWeight: '900' },
});