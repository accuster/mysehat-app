// components/common/AppDrawer.tsx
import React from 'react';
import { Text, StyleSheet, Alert, Linking } from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { logout } from '../../store/slices/authSlice';

import Drawer from './Drawer';
import DrawerHeader from './drawer/DrawerHeader';
import DrawerItem from './drawer/DrawerItem';
const packageJson = require('../../package.json');

import {
  FileText,
  MessagesSquare,
  LogOut,
  ShieldCheck,
  ArrowLeftRight,
  CircleUserRound,
} from 'lucide-react-native';

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  navigation: any;
  // ✅ REMOVED: onOpenBrowser prop (no longer needed)
}

const AppDrawer: React.FC<AppDrawerProps> = ({
  open,
  onClose,
  navigation,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const handleNavigation = (screen: string, params?: any) => {
    onClose();
    if (params) {
      navigation.navigate(screen, params);
    } else {
      navigation.navigate(screen);
    }
  };

  // ✅ NEW: Open URL in external browser
  const handleOpenURL = async (url: string, title: string) => {
    onClose();
    
    try {
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Error',
          `Cannot open ${title}. Please check your internet connection.`
        );
      }
    } catch (error) {
      console.log('Error opening URL:', error);
      Alert.alert(
        'Error',
        `Failed to open ${title}. Please try again later.`
      );
    }
  };

  const handleLogout = async () => {
    onClose();
    
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 Logout button pressed');
              
              await dispatch(logout()).unwrap();
              
              console.log('✅ Logout successful, navigating to Auth');
              
              navigation.replace('Auth');
            } catch (error: any) {
              console.log('❌ Logout error:', error);
              
              navigation.replace('Auth');
            }
          }
        }
      ]
    );
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      footer={
        <>
          {/* Logout Button */}
          <DrawerItem
            label="Logout"
            icon={LogOut}
            danger
            onPress={handleLogout}
          />

          {/* App Version */}
          <Text style={styles.versionText}>Version v{packageJson.version}</Text>
        </>
      }
    >
      <DrawerHeader onClose={onClose} />

      {/* My Profile */}
      <DrawerItem
        label="My Profile"
        icon={CircleUserRound}
        onPress={() => handleNavigation('Profile')}
      />

      {/* Reports */}
      <DrawerItem
        label="Reports"
        icon={FileText}
        onPress={() => handleNavigation('Reports')}
      />

      {/* Transactions */}
      <DrawerItem
        label="Transactions"
        icon={ArrowLeftRight}
        onPress={() => handleNavigation('Transactions')}
      />

      {/* Support */}
      <DrawerItem
        label="Support"
        icon={MessagesSquare}
        onPress={() => handleNavigation('Support')}
      />

      {/* ✅ Privacy Policy - Opens in external browser */}
      <DrawerItem
        label="Privacy Policy"
        icon={ShieldCheck}
        external // ✅ Show external link icon
        onPress={() => handleOpenURL('https://mysehat.ai/privacy', 'Privacy Policy')}
      />

      {/* ✅ Terms & Conditions - Opens in external browser */}
      <DrawerItem
        label="Terms & Conditions"
        icon={FileText}
        external // ✅ Show external link icon
        onPress={() => handleOpenURL('https://mysehat.ai/terms', 'Terms & Conditions')}
      />
    </Drawer>
  );
};

export default AppDrawer;

const styles = StyleSheet.create({
  versionText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
});