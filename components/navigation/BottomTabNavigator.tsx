// components/navigation/BottomTabNavigator.tsx
// ✅ FIXED: Responsive for all Android screen sizes + Safe area support
import React, { useCallback, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import {
  Home,
  FileText,
  QrCode,
  Wallet,
  ArrowLeftRight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';

// Import your screens
import HomeScreen from '../screens/user/HomeScreen';
import ReportsScreen from '../screens/user/ReportsScreen';
import ScanScreen from '../screens/user/ScanScreen';
import WalletScreen from '../screens/user/WalletScreen';
import TransactionsScreen from '../screens/user/TransactionsScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  // 🎯 DYNAMIC safe area for all devices
  const insets = useSafeAreaInsets();

  // 🎯 Calculate responsive tab bar height and padding
  const tabBarDimensions = useMemo(() => {
    if (Platform.OS === 'ios') {
      // iOS: Account for home indicator (34-44px on newer devices)
      return {
        height: 68 + insets.bottom,
        paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20,
        paddingTop: 8,
      };
    } else {
      // Android: Account for gesture navigation or hardware buttons
      return {
        height: insets.bottom > 0 ? 60 + insets.bottom : 70,
        paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 10,
        paddingTop: 8,
      };
    }
  }, [insets.bottom]);

  // ✅ Icons with proper contrast - WHITE stays WHITE on dark pill
  const renderHomeIcon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <View style={[styles.iconPill, focused && styles.iconPillActive]}>
        <Home size={24} color={COLORS.white} strokeWidth={2} />
      </View>
    ),
    [],
  );

  const renderReportsIcon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <View style={[styles.iconPill, focused && styles.iconPillActive]}>
        <FileText size={24} color={COLORS.white} strokeWidth={2} />
      </View>
    ),
    [],
  );

  // ✅ MODERN: QR with scale + gradient effect on active
  const renderQRIcon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <View
        style={[styles.qrIconWrapper, focused && styles.qrIconWrapperActive]}
      >
        <QrCode
          size={focused ? 34 : 32}
          color={focused ? COLORS.purple : '#FFFFFF'}
          strokeWidth={focused ? 2.8 : 2.5}
        />
      </View>
    ),
    [],
  );

  const renderWalletIcon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <View style={[styles.iconPill, focused && styles.iconPillActive]}>
        <Wallet size={24} color={COLORS.white} strokeWidth={2} />
        <View style={styles.walletBadge}>
          <Text style={styles.walletBadgeText}>NEW</Text>
        </View>
      </View>
    ),
    [],
  );

  const renderTransactionsIcon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <View style={[styles.iconPill, focused && styles.iconPillActive]}>
        <ArrowLeftRight size={24} color={COLORS.white} strokeWidth={2} />
      </View>
    ),
    [],
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.white,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
        tabBarStyle: {
          backgroundColor: '#15202B',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          elevation: 0,
          shadowOpacity: 0,
          height: tabBarDimensions.height,
          paddingBottom: tabBarDimensions.paddingBottom,
          paddingTop: tabBarDimensions.paddingTop,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      {/* 1. Home Tab */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: renderHomeIcon,
        }}
      />

      {/* 2. Reports Tab */}
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: renderReportsIcon,
        }}
      />

      {/* 3. QR Tab - Large Purple Circle (NO LABEL) */}
      <Tab.Screen
        name="QR"
        component={ScanScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: renderQRIcon,
        }}
      />

      {/* 4. Wallet Tab */}
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: renderWalletIcon,
        }}
      />

      {/* 5. Transactions Tab */}
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarLabel: 'Payments',
          tabBarIcon: renderTransactionsIcon,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  // ✅ ROUNDED pill (Twitter/X style)
  iconPill: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    minWidth: 60,
  },
  iconPillActive: {
    backgroundColor: '#38444D',
  },

  // ✅ QR Tab - Large Purple Circle (default/inactive state)
  qrIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  // ✅ QR Tab - ACTIVE (White center + Purple ring)
  qrIconWrapperActive: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF', // ✅ White background
    alignItems: 'center',
    justifyContent: 'center',

    // ✅ Purple circular ring
    borderWidth: 2,
    borderColor: COLORS.purple,

    // ✅ Soft premium glow
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 16,
  },
  walletBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  walletBadgeText: {
    color: '#FFFFFF',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
