// components/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';
import PartnerLoginScreen from '../screens/auth/PartnerLoginScreen';

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
import PartnerHomeScreen from '../screens/partner/PartnerHomeScreen';
import PartnerTransactionsScreen from '../screens/partner/PartnerTransactionsScreen';
import PartnerReportsScreen from '../screens/partner/PartnerReportsScreen';
import PartnerProfileScreen from '../screens/partner/PartnerProfileScreen';
import BMIRecordsScreen from '../screens/partner/BMIRecordsScreen';
import PartnerReportPreview from '../screens/partner/PartnerReportPreview';
import PartnerSearchScreen from '../screens/partner/PartnerSearchScreen';

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
  PartnerLogin: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  ReportsStack: undefined;
  TransactionsStack: undefined;
  WalletStack: undefined;
  RechargeStack: undefined;
  PartnerHome: undefined;
  PartnerTransactions: undefined;
  PartnerProfile: undefined;
  PartnerReports: undefined;
  PartnerSearch: undefined;
  BMIRecords: undefined;
  PartnerReportPreview: {
    record: any;
  };
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
      <AuthStack.Screen name="PartnerLogin" component={PartnerLoginScreen} />
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
      <AppStack.Screen
        name="Tabs"
        component={BottomTabNavigator}
        options={{
          gestureEnabled: false,
        }}
      />

      <AppStack.Screen name="ReportsStack" component={ReportsScreen} />
      <AppStack.Screen
        name="TransactionsStack"
        component={TransactionsScreen}
      />
      <AppStack.Screen name="WalletStack" component={WalletScreen} />
      <AppStack.Screen name="RechargeStack" component={RechargeScreen} />
      <AppStack.Screen name="PartnerHome" component={PartnerHomeScreen} />
      <AppStack.Screen
        name="PartnerTransactions"
        component={PartnerTransactionsScreen}
      />
      <AppStack.Screen name="Support" component={SupportScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="ManageMembers" component={ManageMembersScreen} />
      <AppStack.Screen name="PartnerProfile" component={PartnerProfileScreen} />
      <AppStack.Screen name="PartnerReports" component={PartnerReportsScreen} />
      <AppStack.Screen name="PartnerSearch" component={PartnerSearchScreen} />
      <AppStack.Screen name="BMIRecords" component={BMIRecordsScreen} />
      <AppStack.Screen
        name="PartnerReportPreview"
        component={PartnerReportPreview}
      />
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
