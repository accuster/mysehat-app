/* eslint-disable react-native/no-inline-styles */
// components/screens/partner/PartnerDashboardScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LogOut,
  Wallet,
  TrendingUp,
  CreditCard,
  Headphones,
  RefreshCw,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import { partnerLogout } from '../../../store/slices/partnerAuthSlice';

const packageJson = require('../../../package.json');

// ─── Dummy Data (replace with real API calls later) ───────────────────────────
const WALLET = {
  balance: '₹12,450.00',
  pending: '₹3,200.00',
  lastPayout: '₹8,000.00',
  lastPayoutDate: '22 Feb 2025',
};

const EARNINGS = {
  today: '₹1,840',
  thisMonth: '₹38,200',
  lastMonth: '₹42,500',
  total: '₹2,14,800',
};

const RECENT_TRANSACTIONS = [
  {
    id: '1',
    label: 'Payout - HDFC Bank',
    amount: '-₹8,000',
    date: '22 Feb',
    type: 'debit',
  },
  {
    id: '2',
    label: 'Commission Credit',
    amount: '+₹2,400',
    date: '20 Feb',
    type: 'credit',
  },
  {
    id: '3',
    label: 'Commission Credit',
    amount: '+₹1,840',
    date: '18 Feb',
    type: 'credit',
  },
  {
    id: '4',
    label: 'Payout - HDFC Bank',
    amount: '-₹5,000',
    date: '15 Feb',
    type: 'debit',
  },
  {
    id: '5',
    label: 'Commission Credit',
    amount: '+₹3,100',
    date: '12 Feb',
    type: 'credit',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
type Props = { navigation: any };

export default function PartnerDashboardScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();

  // ✅ Real partner data from Redux
  const { token, partner, isLoading } = useAppSelector(s => s.partnerAuth);

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>(
    'overview',
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          dispatch(partnerLogout(token!));
          navigation.replace('Auth');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <Image
          source={require('../../../assets/images/mysehat_icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.topBarRight}>
          <View style={styles.partnerBadge}>
            <Text style={styles.partnerBadgeText}>PARTNER</Text>
          </View>
          <Pressable
            onPress={handleLogout}
            disabled={isLoading}
            hitSlop={10}
            style={styles.logoutBtn}
          >
            <LogOut size={20} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      {/* ── Greeting — real partner data from Redux ── */}
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greetingName}>
            👋 {partner?.username ?? 'Partner'}
          </Text>
          <Text style={styles.greetingMeta}>
            {partner?.email ?? ''}
            {partner?.org_id ? `  •  ${partner.org_id}` : ''}
          </Text>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabRow}>
        {(['overview', 'transactions'] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab === 'overview' ? 'Overview' : 'Transactions'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' ? (
          <>
            {/* ── Wallet Card ── */}
            <View style={styles.walletCard}>
              <View style={styles.walletCardHeader}>
                <Wallet size={20} color="#A78BFA" />
                <Text style={styles.walletCardTitle}>Wallet Balance</Text>
              </View>
              <Text style={styles.walletBalance}>{WALLET.balance}</Text>
              <View style={styles.walletRow}>
                <View style={styles.walletMeta}>
                  <Text style={styles.walletMetaLabel}>Pending</Text>
                  <Text style={styles.walletMetaValue}>{WALLET.pending}</Text>
                </View>
                <View style={styles.walletDivider} />
                <View style={styles.walletMeta}>
                  <Text style={styles.walletMetaLabel}>Last Payout</Text>
                  <Text style={styles.walletMetaValue}>
                    {WALLET.lastPayout}
                  </Text>
                </View>
                <View style={styles.walletDivider} />
                <View style={styles.walletMeta}>
                  <Text style={styles.walletMetaLabel}>Payout Date</Text>
                  <Text style={styles.walletMetaValue}>
                    {WALLET.lastPayoutDate}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Earnings ── */}
            <Text style={styles.sectionHeader}>Earnings / Revenue</Text>
            <View style={styles.statsGrid}>
              <StatCard label="Today" value={EARNINGS.today} />
              <StatCard label="This Month" value={EARNINGS.thisMonth} />
              <StatCard
                label="Last Month"
                value={EARNINGS.lastMonth}
                sub="↓ 10% vs current"
              />
              <StatCard label="Total Earned" value={EARNINGS.total} />
            </View>

            {/* ── Earnings Chart Placeholder ── */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <TrendingUp size={16} color="#A78BFA" />
                <Text style={styles.chartTitle}>Monthly Earnings Trend</Text>
              </View>
              <View style={styles.chartBars}>
                {[60, 80, 55, 90, 75, 100, 85].map((h, i) => (
                  <View key={i} style={styles.barWrap}>
                    <View style={[styles.bar, { height: h * 0.8 }]} />
                    <Text style={styles.barLabel}>
                      {['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'][i]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Quick Actions ── */}
            <Text style={styles.sectionHeader}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.actionBtnPressed,
                ]}
                onPress={() => navigation.navigate('RechargeStack')}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: 'rgba(124,58,237,0.15)' },
                  ]}
                >
                  <CreditCard size={22} color="#A78BFA" />
                </View>
                <Text style={styles.actionLabel}>Recharge</Text>
                <Text style={styles.actionSub}>Top up wallet</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.actionBtnPressed,
                ]}
                onPress={() => navigation.navigate('Support')}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: 'rgba(249,115,22,0.12)' },
                  ]}
                >
                  <Headphones size={22} color="#F97316" />
                </View>
                <Text style={styles.actionLabel}>Support</Text>
                <Text style={styles.actionSub}>Get help</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* ── Transactions List ── */}
            <Text style={styles.sectionHeader}>Recent Transactions</Text>
            <View style={styles.txCard}>
              {RECENT_TRANSACTIONS.map((tx, idx) => (
                <View key={tx.id}>
                  <View style={styles.txRow}>
                    <View
                      style={[
                        styles.txIcon,
                        {
                          backgroundColor:
                            tx.type === 'credit'
                              ? 'rgba(16,185,129,0.12)'
                              : 'rgba(239,68,68,0.1)',
                        },
                      ]}
                    >
                      {tx.type === 'credit' ? (
                        <TrendingUp size={16} color="#10B981" />
                      ) : (
                        <RefreshCw size={16} color="#EF4444" />
                      )}
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txLabel}>{tx.label}</Text>
                      <Text style={styles.txDate}>{tx.date}</Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: tx.type === 'credit' ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {tx.amount}
                    </Text>
                  </View>
                  {idx < RECENT_TRANSACTIONS.length - 1 && (
                    <View style={styles.txDivider} />
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Footer ── */}
        <Text style={styles.versionText}>Version v{packageJson.version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0F' },
  scroll: { padding: 16, paddingBottom: 40 },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  logo: { width: 100, height: 40 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  partnerBadge: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderColor: '#7C3AED',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  partnerBadgeText: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  logoutBtn: { padding: 4 },

  // Greeting
  greetingRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  greetingName: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  greetingMeta: { color: '#6B7280', fontSize: 12, marginTop: 3 },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#7C3AED' },
  tabText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },

  // Section header
  sectionHeader: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },

  // Wallet Card
  walletCard: {
    backgroundColor: '#1A0F2E',
    borderColor: '#7C3AED',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
  },
  walletCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  walletCardTitle: { color: '#A78BFA', fontWeight: '700', fontSize: 13 },
  walletBalance: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 14,
  },
  walletRow: { flexDirection: 'row', alignItems: 'center' },
  walletMeta: { flex: 1, alignItems: 'center' },
  walletMetaLabel: { color: '#6B7280', fontSize: 11, marginBottom: 4 },
  walletMetaValue: { color: '#D1D5DB', fontSize: 13, fontWeight: '700' },
  walletDivider: { width: 1, height: 32, backgroundColor: '#2D1B69' },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  statValue: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  statSub: { color: '#EF4444', fontSize: 11, marginTop: 4 },

  // Chart
  chartCard: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: { color: '#D1D5DB', fontSize: 13, fontWeight: '600' },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 90,
  },
  barWrap: { alignItems: 'center', gap: 6, flex: 1 },
  bar: {
    width: 22,
    backgroundColor: '#7C3AED',
    borderRadius: 4,
    opacity: 0.85,
  },
  barLabel: { color: '#6B7280', fontSize: 10 },

  // Quick Actions
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionBtnPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  actionSub: { color: '#6B7280', fontSize: 11 },

  // Transactions
  txCard: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txLabel: { color: '#E5E7EB', fontSize: 13, fontWeight: '600' },
  txDate: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txDivider: { height: 1, backgroundColor: '#1F2937', marginHorizontal: 4 },

  // Footer
  versionText: {
    textAlign: 'center',
    color: '#374151',
    fontSize: 11,
    marginTop: 28,
  },
});
