// components/navigation/BottomTabNavigator.tsx
// ✅ Twitter/X Style: Dark theme with ROUNDED pill backgrounds
import React, { useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform } from 'react-native';
import { Home, FileText, QrCode, Wallet, ArrowLeftRight } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';

// Import your screens
import HomeScreen from '../screens/user/HomeScreen';
import ReportsScreen from '../screens/user/ReportsScreen';
import ScanScreen from '../screens/user/ScanScreen';
import WalletScreen from '../screens/user/WalletScreen';
import TransactionsScreen from '../screens/user/TransactionsScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  // ✅ Icons with proper contrast - WHITE stays WHITE on dark pill
  const renderHomeIcon = useCallback(({ focused }: { focused: boolean }) => (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <Home 
        size={24} 
        color={COLORS.white} 
        strokeWidth={2} 
      />
    </View>
  ), []);

  const renderReportsIcon = useCallback(({ focused }: { focused: boolean }) => (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <FileText 
        size={24} 
        color={COLORS.white} 
        strokeWidth={2} 
      />
    </View>
  ), []);

  // ✅ MODERN: QR with scale + gradient effect on active
  const renderQRIcon = useCallback(({ focused }: { focused: boolean }) => (
    <View style={[styles.qrIconWrapper, focused && styles.qrIconWrapperActive]}>
      <QrCode 
        size={focused ? 34 : 32} 
        color={focused ? COLORS.purple : '#FFFFFF'} 
        strokeWidth={focused ? 2.8 : 2.5}
      />
    </View>
  ), []);

  const renderWalletIcon = useCallback(({ focused }: { focused: boolean }) => (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <Wallet 
        size={24} 
        color={COLORS.white} 
        strokeWidth={2} 
      />
    </View>
  ), []);

  const renderTransactionsIcon = useCallback(({ focused }: { focused: boolean }) => (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <ArrowLeftRight 
        size={24} 
        color={COLORS.white} 
        strokeWidth={2} 
      />
    </View>
  ), []);

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
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 8,
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
          tabBarLabel: 'Transactions',
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
    marginTop: 10
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
});