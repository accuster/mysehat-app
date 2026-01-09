/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSelector } from 'react-redux';
import { RootState } from '../../../store';

import AppHeader from '../../common/AppHeader';
import AppDrawer from '../../common/AppDrawer';
import InAppBrowser from '../../common/InAppBrowser';

import {
  FileText,
  Users,
  Wallet,
  MessageCircle,
  ArrowLeftRight,
  ChevronRight,
} from 'lucide-react-native';

type Props = {
  navigation: any;
};

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { members } = useSelector((state: RootState) => state.members);
  const { user } = useSelector((state: RootState) => state.auth);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  const [browserTitle, setBrowserTitle] = useState('');

  const handleOpenBrowser = (title: string, url: string) => {
    setBrowserTitle(title);
    setBrowserUrl(url);
    setBrowserOpen(true);
  };

  const superUser = members.find(member => member.userType === 'SuperUser');

  // Extract first name only (text before first space)
  const getFirstName = (fullName: string) => {
    const trimmedName = fullName.trim();
    const spaceIndex = trimmedName.indexOf(' ');
    return spaceIndex > 0 ? trimmedName.substring(0, spaceIndex) : trimmedName;
  };

  // Use SuperUser name if available, otherwise fall back to auth user
  const displayName = superUser
    ? getFirstName(superUser.name)
    : user?.name
    ? getFirstName(user.name)
    : 'User';

  // Mock wallet balance - TODO: Replace with real data from Redux/API
  const walletBalance = 1250;
  const rewardBalance = 180;

  // ✅ Calculate dynamic bottom padding for ScrollView
  // Base padding (16) + FloatingBottomNav height (56) + gap (16) + safe area
  const scrollBottomPadding = 16 + 56 + 16 + (insets.bottom > 0 ? insets.bottom : 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <AppHeader onMenuClick={() => setDrawerOpen(true)} />

      {/* DRAWER */}
      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
        onOpenBrowser={handleOpenBrowser}
      />

      {/* IN-APP BROWSER */}
      <InAppBrowser
        visible={browserOpen}
        url={browserUrl}
        title={browserTitle}
        onClose={() => setBrowserOpen(false)}
      />

      {/* CONTENT */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ 
          padding: 16, 
          paddingBottom: scrollBottomPadding // ✅ Dynamic bottom padding
        }}
      >
        <Text style={styles.sectionTitle}>👋 Hi, {displayName}!</Text>

        {/* ✅ Wallet Balance Card with Rewards */}
        <Pressable
          style={styles.walletBalanceCard}
          onPress={() => navigation.navigate('Wallet')}
        >
          <View style={styles.walletHeader}>
            <View style={styles.walletIconContainer}>
              <Wallet size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.walletTitle}>MySehat Cash & Rewards</Text>
            <ChevronRight size={20} color="#94A3B8" />
          </View>

          <View style={styles.walletDivider} />

          <View style={styles.walletBalanceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.walletBalanceLabel}>Available Balance</Text>
              <View style={styles.balanceWithRewards}>
                <Text style={styles.walletBalanceValue}>₹{walletBalance}</Text>
                {/* ✅ Rewards Badge */}
                <View style={styles.rewardsBadge}>
                  <View style={styles.rewardCoinSmall}>
                    <Text style={styles.rewardCoinText}>₹</Text>
                  </View>
                  <Text style={styles.rewardsText}>+₹{rewardBalance}</Text>
                </View>
              </View>
            </View>

            <Pressable
              style={styles.addBalanceBtn}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Text style={styles.addBalanceText}>Add Balance</Text>
            </Pressable>
          </View>
        </Pressable>
        <Text
          style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: 'white',
            marginBottom: 8,
          }}
        >
          {' '}
          Quick actions
        </Text>
        <View style={styles.grid}>
          {/* Members Card */}
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate('ManageMembers')}
          >
            <Users size={32} color="#8B5CF6" />
            <Text style={styles.actionTitle}>Members</Text>
            <Text style={styles.actionSubtitle}>Manage family</Text>
          </Pressable>

          {/* Transactions Card */}
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate('Transactions')}
          >
            <ArrowLeftRight size={32} color="#10B981" />
            <Text style={styles.actionTitle}>Transactions</Text>
            <Text style={styles.actionSubtitle}>Payment history</Text>
          </Pressable>

          {/* Reports Card */}
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate('Reports')}
          >
            <FileText size={32} color="#F97316" />
            <Text style={styles.actionTitle}>Reports</Text>
            <Text style={styles.actionSubtitle}>View reports</Text>
          </Pressable>

          {/* Support Card */}
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate('Support')}
          >
            <MessageCircle size={32} color="#EC4899" />
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
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },

  // Wallet Balance Card Styles
  walletBalanceCard: {
    backgroundColor: '#eae7ecff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletIconContainer: {
    width: 40,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  walletDivider: {
    height: 1,
    backgroundColor: '#C4B5FD',
    marginVertical: 14,
    borderStyle: 'dashed',
  },
  walletBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletBalanceLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceWithRewards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletBalanceValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F2937',
  },
  // ✅ NEW: Rewards Badge Styles
  rewardsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DDD6FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  rewardCoinSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCoinText: {
    color: '#1F2937',
    fontSize: 10,
    fontWeight: '900',
  },
  rewardsText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
  },
  addBalanceBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  addBalanceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
  },
});