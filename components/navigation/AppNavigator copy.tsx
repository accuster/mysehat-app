// components/navigation/AppNavigator.tsx
// ✅ UPDATED: Renamed stack screens to avoid conflicts with bottom tab screens
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';

import ReportsScreen from '../screens/user/ReportsScreen';
import TransactionsScreen from '../screens/user/TransactionsScreen';
import WalletScreen from '../screens/user/WalletScreen';
import SelectUserContainer from '../screens/user/SelectUserContainer';
import SupportScreen from '../screens/user/SupportScreen';
import PayScreen from '../screens/user/PayScreen';
import PaymentSuccessScreen from '../screens/user/PaymentSuccessScreen';
import InstantReport, { ReportData } from '../screens/user/InstantReport';
import ProfileScreen from '../screens/user/ProfileScreen';
import ManageMembersScreen from '../screens/user/ManageMembersScreen';
import RechargeScreen from '../screens/partner/RechargeScreen';

// ✅ Import BottomTabNavigator
import BottomTabNavigator from './BottomTabNavigator';

import { COLORS } from '../../theme/colors';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  CompleteProfile: undefined;
};

// ✅ UPDATED: Renamed stack screens to avoid bottom tab conflicts
export type AppStackParamList = {
  Tabs: undefined;
  ReportsStack: undefined;
  TransactionsStack: undefined;
  WalletStack: undefined;
  RechargeStack: undefined;
  Support: undefined;
  Profile: undefined;
  ManageMembers: undefined;
  SelectUser: {
    qrData: any;
    rawData: string;
    orderId?: string;
  };
  Pay: {
    selectedUserName: string;
    scannedPayload: string;
    orderId: string;
    qrData: any;
  };
  PaymentSuccess: {
    amountLabel: string;
    refNumber: string;
    paymentTime: string;
    paymentMethod: string;
    senderName: string;
    reportId?: string;
    paymentId?: string;
  };
  Report: {
    data: ReportData;
  };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <AuthStack.Screen
        name="CompleteProfile"
        component={CompleteProfileScreen}
      />
    </AuthStack.Navigator>
  );
}

function AppStackNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      {/* ✅ Bottom Tab Navigator (contains: Home, Reports, QR, Wallet, Transactions) */}
      <AppStack.Screen
        name="Tabs"
        component={BottomTabNavigator}
        options={{
          gestureEnabled: false,
        }}
      />

      {/* ✅ UPDATED: Stack-only screens with new names */}
      <AppStack.Screen name="ReportsStack" component={ReportsScreen} />
      <AppStack.Screen
        name="TransactionsStack"
        component={TransactionsScreen}
      />
      <AppStack.Screen name="WalletStack" component={WalletScreen} />
      <AppStack.Screen name="RechargeStack" component={RechargeScreen} />
      <AppStack.Screen name="Support" component={SupportScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="ManageMembers" component={ManageMembersScreen} />

      <AppStack.Screen
        name="SelectUser"
        component={SelectUserContainer}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
        }}
      />

      <AppStack.Screen
        name="Pay"
        component={PayScreen}
        options={{
          gestureEnabled: false,
        }}
      />

      <AppStack.Screen
        name="PaymentSuccess"
        component={PaymentSuccessScreen}
        options={{
          gestureEnabled: false,
        }}
      />

      <AppStack.Screen name="Report" component={InstantReport} />
    </AppStack.Navigator>
  );
}

export default function AppNavigator() {
  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: COLORS.bg,
      card: COLORS.card,
      text: COLORS.text,
      border: COLORS.border,
      primary: COLORS.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme} fallback={null}>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
        }}
      >
        <RootStack.Screen
          name="Splash"
          component={SplashScreen}
          options={{
            gestureEnabled: false,
          }}
        />
        <RootStack.Screen name="Auth" component={AuthNavigator} />
        <RootStack.Screen
          name="App"
          component={AppStackNavigator}
          options={{
            gestureEnabled: false,
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
