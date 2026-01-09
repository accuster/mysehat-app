// components/common/AppDrawer.tsx - LOGOUT FIX
import React from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { logout } from '../../store/slices/authSlice';

import Drawer from './Drawer';
import DrawerHeader from './drawer/DrawerHeader';
import DrawerMembers from './drawer/DrawerMembers';
import DrawerItem from './drawer/DrawerItem';
const packageJson = require('../../package.json');

import {
  FileText,
  MessageCircle,
  LogOut,
  ShieldCheck,
  ArrowLeftRight
} from 'lucide-react-native';

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  navigation: any;
  onOpenBrowser?: (title: string, url: string) => void;
  userCredits?: number;
}

const AppDrawer: React.FC<AppDrawerProps> = ({
  open,
  onClose,
  navigation,
  onOpenBrowser,
  userCredits = 50,
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

  const handleBrowserOpen = (title: string, url: string) => {
    onClose();
    setTimeout(() => {
      if (onOpenBrowser) {
        onOpenBrowser(title, url);
      }
    }, 200);
  };

  // ✅ FIXED: Actually call Redux logout action
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
              
              // ✅ Dispatch Redux logout action
              await dispatch(logout()).unwrap();
              
              console.log('✅ Logout successful, navigating to Auth');
              
              // Navigate to Auth screen
              navigation.replace('Auth');
            } catch (error: any) {
              console.error('❌ Logout error:', error);
              
              // Even if logout fails, still navigate to Auth
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
      <DrawerHeader
        credits={userCredits}
        onClose={onClose}
      />

      <DrawerMembers />

      <DrawerItem
        label="Reports"
        icon={FileText}
        onPress={() => handleNavigation('Reports')}
      />

      <DrawerItem
        label="Transactions"
        icon={ArrowLeftRight}
        onPress={() => handleNavigation('Transactions')}
      />

      <DrawerItem
        label="Support"
        icon={MessageCircle}
        onPress={() => handleNavigation('Support')}
      />

      {onOpenBrowser && (
        <>
          <DrawerItem
            label="Privacy Policy"
            icon={ShieldCheck}
            onPress={() =>
              handleBrowserOpen('Privacy Policy', 'https://mysehat.ai/privacy')
            }
          />

          <DrawerItem
            label="Terms & Conditions"
            icon={FileText}
            onPress={() =>
              handleBrowserOpen(
                'Terms & Conditions',
                'https://mysehat.ai/terms'
              )
            }
          />
        </>
      )}
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