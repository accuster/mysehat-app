// components/navigation/AppNavigator.tsx
// ✅ FIXED VERSION - Better gesture handling and error prevention
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';

import HomeScreen from '../screens/user/HomeScreen';
import ReportsScreen from '../screens/user/ReportsScreen';
import TransactionsScreen from '../screens/user/TransactionsScreen';
import ScanScreen from '../screens/user/ScanScreen';
import SelectUserContainer from '../screens/user/SelectUserContainer';
import SupportScreen from '../screens/user/SupportScreen';
import PayScreen from '../screens/user/PayScreen';
import PaymentSuccessScreen from '../screens/user/PaymentSuccessScreen';
import InstantReport, { ReportData } from '../screens/user/InstantReport';
import ManageMembersScreen from '../screens/user/ManageMembersScreen';
import WalletScreen from '../screens/user/WalletScreen';
import ProfileScreen from '../screens/user/ProfileScreen';


import { COLORS } from '../../theme/colors';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  App: undefined;
  SelectUser: {
    qrData: any;
    rawData: string;
    orderId?: string;
  };
};

export type AuthStackParamList = {
  Login: undefined;
  CompleteProfile: undefined;
};

export type AppTabParamList = {
  MySehat: undefined;
  QR: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  Reports: undefined;
  Transactions: undefined;
  Wallet: undefined;
  Support: undefined;
  ManageMembers: undefined;
  Profile: undefined;
  SelectUser: {
    qrData: any;
    rawData: string;
    orderId?: string;
  };
  Payment: {
    user: any;
    qrData: any;
    rawData: string;
  };
  Pay: {
    selectedUserName: string;
    scannedPayload: string;
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
const AppTab = createBottomTabNavigator<AppTabParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        // ✅ Enable gesture navigation for auth screens
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </AuthStack.Navigator>
  );
}

function AppTabNavigator() {
  return (
    <AppTab.Navigator 
      screenOptions={{ 
        headerShown: false,
      }} 
    >
      <AppTab.Screen name="MySehat" component={HomeScreen} />
      <AppTab.Screen name="QR" component={ScanScreen} />
    </AppTab.Navigator>
  );
}

function AppStackNavigator() {
  return (
    <AppStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        // ✅ Enable gesture navigation for all screens by default
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <AppStack.Screen 
        name="Tabs" 
        component={AppTabNavigator}
        options={{
          // ✅ Disable gesture on home to prevent accidental back
          gestureEnabled: false,
        }}
      />
      <AppStack.Screen name="Reports" component={ReportsScreen} />
      <AppStack.Screen name="Transactions" component={TransactionsScreen} />
      <AppStack.Screen name="Wallet" component={WalletScreen} />
      <AppStack.Screen name="Support" component={SupportScreen} />
      <AppStack.Screen name="ManageMembers" component={ManageMembersScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen 
        name="SelectUser" 
        component={SelectUserContainer}
        options={{ 
          presentation: 'modal', 
          animation: 'slide_from_bottom',
          // ✅ Enable gesture for modal
          gestureEnabled: true,
        }} 
      />
      <AppStack.Screen 
        name="Pay" 
        component={PayScreen}
        options={{
          // ✅ Disable gesture during payment to prevent accidental back
          gestureEnabled: false,
        }}
      />
      <AppStack.Screen 
        name="PaymentSuccess" 
        component={PaymentSuccessScreen}
        options={{
          // ✅ Disable gesture on success screen
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
    <NavigationContainer 
      theme={navTheme}
      fallback={null}
    >
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