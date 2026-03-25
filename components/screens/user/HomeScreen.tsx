// components/screens/user/HomeScreen.tsx
/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useSelector } from 'react-redux';
import { RootState } from '../../../store';

// ✅ Use typed hooks
import { useAppDispatch, useAppSelector } from '../../../store/hook';

// ✅ Import wallet action
import { fetchWalletBalance } from '../../../store/slices/walletSlice';

import AppHeader from '../../common/AppHeader';
import AppDrawer from '../../common/AppDrawer';

import {
  FileText,
  Users,
  Wallet,
  MessagesSquare,
  ArrowLeftRight,
  ChevronRight,
} from 'lucide-react-native';

type Props = {
  navigation: any;
};

const formatINR = (n: number) => {
  try {
    return n.toLocaleString('en-IN');
  } catch {
    return String(n);
  }
};

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const isMounted = useRef(true);
  const dispatch = useAppDispatch();

  // ── Auth & Members ───────────────────────────────────────────────────────────
  const { members } = useSelector((state: RootState) => state.members);
  const { user } = useSelector((state: RootState) => state.auth);

  // ── Wallet — real data from Redux ────────────────────────────────────────────
  const { balance, isLoadingBalance } = useAppSelector(s => s.wallet);
  const walletBalance = balance?.wallet_balance ?? 0;
  const rewardBalance = balance?.rewards_points ?? 0;

  // ── Local state ──────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    console.log('🏠 HomeScreen: Component mounted');
    return () => {
      console.log('🧹 HomeScreen: Unmounting...');
      isMounted.current = false;
    };
  }, []);

  // ✅ Fetch wallet balance on mount
  useEffect(() => {
    dispatch(fetchWalletBalance());
  }, [dispatch]);

  // ── Hardware back ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: HomeScreen');
      if (browserOpen) {
        if (isMounted.current) setBrowserOpen(false);
        return true;
      }
      if (drawerOpen) {
        if (isMounted.current) setDrawerOpen(false);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, [drawerOpen, browserOpen]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const superUser = members.find(m => m.userType === 'SuperUser');

  const getFirstName = (fullName: string) => {
    const trimmed = fullName.trim();
    const idx = trimmed.indexOf(' ');
    return idx > 0 ? trimmed.substring(0, idx) : trimmed;
  };

  const displayName = superUser
    ? getFirstName(superUser.name)
    : user?.name
    ? getFirstName(user.name)
    : 'User';

  const scrollBottomPadding =
    16 + 56 + 16 + (insets.bottom > 0 ? insets.bottom : 0);

  // ── Navigation ────────────────────────────────────────────────────────────────
  const handleNavigation = (screen: string) => {
    if (!isMounted.current) return;
    try {
      const screenMap: { [key: string]: string } = {
        ManageMembers: 'ManageMembers',
        Transactions: 'TransactionsStack',
        Reports: 'ReportsStack',
        Support: 'Support',
        Wallet: 'WalletStack',
      };
      const target = screenMap[screen] || screen;
      console.log(`📍 HomeScreen: Navigating "${screen}" → "${target}"`);
      navigation.navigate(target);
    } catch (error) {
      console.log('❌ Navigation error:', error);
    }
  };

  const handleDrawerToggle = (open: boolean) => {
    if (isMounted.current) setDrawerOpen(open);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader onMenuClick={() => handleDrawerToggle(true)} />

      <AppDrawer
        open={drawerOpen}
        onClose={() => handleDrawerToggle(false)}
        navigation={navigation}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: scrollBottomPadding,
        }}
      >
        <Text style={styles.sectionTitle}>👋 Hi, {displayName}!</Text>

        {/* ── Wallet Balance Card ────────────────────────────────────────────── */}
        <Pressable
          style={styles.walletBalanceCard}
          onPress={() => handleNavigation('Wallet')}
        >
          <View style={styles.walletHeader}>
            <View style={styles.walletIconContainer}>
              <Wallet size={24} color="#A78BFA" />
            </View>
            <Text style={styles.walletTitle}>MySehat Cash & Rewards</Text>
            <ChevronRight size={20} color="#71717A" />
          </View>

          <View style={styles.walletDivider} />

          <View style={styles.walletBalanceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.walletBalanceLabel}>Available Balance</Text>

              {isLoadingBalance ? (
                // ✅ Show spinner while fetching
                <View style={styles.balanceLoadingRow}>
                  <ActivityIndicator size="small" color="#A78BFA" />
                  <Text style={styles.balanceLoadingText}>Loading...</Text>
                </View>
              ) : (
                <View style={styles.balanceWithRewards}>
                  {/* Total balance */}
                  <Text style={styles.walletBalanceValue}>
                    ₹{formatINR(walletBalance)}
                  </Text>

                  {/* Rewards badge — only show if rewards > 0 */}
                  {rewardBalance > 0 && (
                    <View style={styles.rewardsBadge}>
                      <View style={styles.rewardCoinSmall}>
                        <Text style={styles.rewardCoinText}>₹</Text>
                      </View>
                      <Text style={styles.rewardsText}>
                        +₹{formatINR(rewardBalance)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <Pressable
              style={styles.addBalanceBtn}
              onPress={() => handleNavigation('Wallet')}
            >
              <Text style={styles.addBalanceText}>+ Add Balance</Text>
            </Pressable>
          </View>
        </Pressable>

        {/* ── Quick Actions ──────────────────────────────────────────────────── */}
        <Text style={styles.quickActionsTitle}>Quick actions</Text>

        <View style={styles.grid}>
          <Pressable
            style={styles.actionCard}
            onPress={() => handleNavigation('ManageMembers')}
          >
            <View style={styles.actionIconContainer}>
              <Users size={28} color="#8B5CF6" />
            </View>
            <Text style={styles.actionTitle}>Members</Text>
            <Text style={styles.actionSubtitle}>Manage family</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => handleNavigation('Transactions')}
          >
            <View style={styles.actionIconContainer}>
              <ArrowLeftRight size={28} color="#10B981" />
            </View>
            <Text style={styles.actionTitle}>Transactions</Text>
            <Text style={styles.actionSubtitle}>Payment history</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => handleNavigation('Reports')}
          >
            <View style={styles.actionIconContainer}>
              <FileText size={28} color="#F59E0B" />
            </View>
            <Text style={styles.actionTitle}>Reports</Text>
            <Text style={styles.actionSubtitle}>View reports</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => handleNavigation('Support')}
          >
            <View style={styles.actionIconContainer}>
              <MessagesSquare size={28} color="#EC4899" />
            </View>
            <Text style={styles.actionTitle}>Support</Text>
            <Text style={styles.actionSubtitle}>Get help</Text>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Did you know?</Text>
          <Text style={styles.infoText}>
            You can access your health reports anytime via WhatsApp. Just scan
            QR code on MySehat device to get started!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { flex: 1 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 16,
  },

  walletBalanceCard: {
    backgroundColor: '#1A1625',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#2D1B4E',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  walletHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#251B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#F5F3FF' },
  walletDivider: {
    height: 1,
    backgroundColor: '#2D1B4E',
    marginVertical: 16,
    opacity: 0.6,
  },

  walletBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletBalanceLabel: {
    fontSize: 13,
    color: '#A78BFA',
    fontWeight: '600',
    marginBottom: 6,
  },

  // Loading state
  balanceLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  balanceLoadingText: { color: '#71717A', fontSize: 13 },

  balanceWithRewards: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletBalanceValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FAFAFA',
    letterSpacing: -0.5,
  },

  // Cash vs Rewards breakdown row
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  bucketText: { fontSize: 11, color: '#6D28D9', fontWeight: '600' },
  bucketDot: { fontSize: 11, color: '#3D2B5F' },

  rewardsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#251B35',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3D2B5F',
  },
  rewardCoinSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCoinText: { color: '#18181B', fontSize: 11, fontWeight: '900' },
  rewardsText: { fontSize: 13, fontWeight: '900', color: '#10B981' },

  addBalanceBtn: {
    backgroundColor: '#2D1B4E',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3D2B5F',
    marginBottom: -14,
  },
  addBalanceText: { fontSize: 14, fontWeight: '700', color: '#E9D5FF' },

  quickActionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 12,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FAFAFA',
    marginTop: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 4,
    textAlign: 'center',
  },

  infoCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 8,
  },
  infoText: { fontSize: 14, color: '#A1A1AA', lineHeight: 20 },
});
