// components/screens/user/HomeScreen.tsx
/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, BackHandler } from 'react-native';
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
  MessagesSquare,
  ArrowLeftRight,
  ChevronRight,
} from 'lucide-react-native';

type Props = {
  navigation: any;
};

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  
  // ✅ Add isMounted ref
  const isMounted = useRef(true);
  
  const { members } = useSelector((state: RootState) => state.members);
  const { user } = useSelector((state: RootState) => state.auth);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  const [browserTitle, setBrowserTitle] = useState('');

  // ✅ FIXED: Setup and cleanup (no dependencies to prevent re-runs)
  useEffect(() => {
    isMounted.current = true;
    
    console.log('🏠 HomeScreen: Component mounted');

    return () => {
      console.log('🧹 HomeScreen: Unmounting...');
      isMounted.current = false;
      
      // React will handle cleanup automatically
      // No need to warn about open modals
    };
  }, []); // ✅ Empty array = only runs on mount/unmount

  // ✅ Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: HomeScreen');
      
      // ✅ Priority 1: Close browser if open
      if (browserOpen) {
        console.log('📱 Closing browser');
        if (isMounted.current) {
          setBrowserOpen(false);
        }
        return true; // Prevent default back
      }
      
      // ✅ Priority 2: Close drawer if open
      if (drawerOpen) {
        console.log('🗂️ Closing drawer');
        if (isMounted.current) {
          setDrawerOpen(false);
        }
        return true; // Prevent default back
      }
      
      // ✅ Priority 3: Allow default back (exit app or go to previous screen)
      console.log('⬅️ Default back action');
      return false; // Allow default
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [drawerOpen, browserOpen]); // ✅ Keep dependencies here for BackHandler

  const handleOpenBrowser = (title: string, url: string) => {
    // ✅ Check if mounted
    if (!isMounted.current) return;
    
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
  const walletBalance = 0;
  const rewardBalance = 0;

  // ✅ Calculate dynamic bottom padding for ScrollView
  // Base padding (16) + FloatingBottomNav height (56) + gap (16) + safe area
  const scrollBottomPadding = 16 + 56 + 16 + (insets.bottom > 0 ? insets.bottom : 0);

  // ✅ Safe navigation helper
  const handleNavigation = (screen: string) => {
    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, aborting navigation');
      return;
    }
    
    try {
      navigation.navigate(screen);
    } catch (error) {
      console.log('❌ Navigation error:', error);
    }
  };

  // ✅ Safe drawer toggle
  const handleDrawerToggle = (open: boolean) => {
    if (isMounted.current) {
      setDrawerOpen(open);
    }
  };

  // ✅ Safe browser toggle
  const handleBrowserToggle = (open: boolean) => {
    if (isMounted.current) {
      setBrowserOpen(open);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <AppHeader onMenuClick={() => handleDrawerToggle(true)} />

      {/* DRAWER */}
      <AppDrawer
        open={drawerOpen}
        onClose={() => handleDrawerToggle(false)}
        navigation={navigation}
        onOpenBrowser={handleOpenBrowser}
      />

      {/* IN-APP BROWSER */}
      <InAppBrowser
        visible={browserOpen}
        url={browserUrl}
        title={browserTitle}
        onClose={() => handleBrowserToggle(false)}
      />

      {/* CONTENT */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ 
          padding: 16, 
          paddingBottom: scrollBottomPadding
        }}
      >
        <Text style={styles.sectionTitle}>👋 Hi, {displayName}!</Text>

        {/* ✅ Wallet Balance Card with Rewards */}
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
              onPress={() => handleNavigation('Wallet')}
            >
              <Text style={styles.addBalanceText}>+ Add Balance</Text>
            </Pressable>
          </View>
        </Pressable>

        <Text style={styles.quickActionsTitle}>Quick actions</Text>

        <View style={styles.grid}>
          {/* Members Card */}
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

          {/* Transactions Card */}
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

          {/* Reports Card */}
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

          {/* Support Card */}
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
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 16,
  },

  // ✅ Wallet Balance Card Styles - More Appealing
  walletBalanceCard: {
    backgroundColor: '#1A1625', // ✅ Subtle purple-tinted dark background
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#2D1B4E', // ✅ Soft purple border
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#251B35', // ✅ Deeper purple background
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F3FF', // ✅ Slightly purple-tinted white
  },
  walletDivider: {
    height: 1,
    backgroundColor: '#2D1B4E', // ✅ Purple divider
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
    color: '#A78BFA', // ✅ Light purple label
    fontWeight: '600',
    marginBottom: 6,
  },
  balanceWithRewards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletBalanceValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FAFAFA',
    letterSpacing: -0.5,
  },
  // Rewards Badge Styles
  rewardsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#251B35', // ✅ Dark purple background
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3D2B5F', // ✅ Purple border
  },
  rewardCoinSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCoinText: {
    color: '#18181B',
    fontSize: 11,
    fontWeight: '900',
  },
  rewardsText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#10B981',
  },
  addBalanceBtn: {
    backgroundColor: '#2D1B4E', // ✅ Purple-tinted button
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3D2B5F',
    marginBottom: -14,
  },
  addBalanceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E9D5FF', // ✅ Light purple text
  },

  quickActionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 12,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
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
  infoText: {
    fontSize: 14,
    color: '#A1A1AA',
    lineHeight: 20,
  },
});