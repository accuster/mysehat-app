// components/common/AppDrawer.tsx
// ✅ UPDATED: InAppBrowser for Terms & Privacy Policy (embed=true)
// ✅ FIXED: InAppBrowser moved outside Drawer so it renders after drawer closes
import React, { useState } from 'react';
import {
  Text,
  View,
  Image,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { partnerLogout } from '../../store/slices/partnerAuthSlice';
import { useAppSelector } from '../../store/hook';

import Drawer from './Drawer';
import DrawerHeader from './drawer/DrawerHeader';
import InAppBrowser from './InAppBrowser';
const packageJson = require('../../package.json');

const mysehatLogo = require('../../assets/images/mysehat_logo.png');

import {
  FileText,
  MessagesSquare,
  LogOut,
  ShieldCheck,
  ArrowLeftRight,
  CircleUserRound,
  Zap,
  ChevronRight,
} from 'lucide-react-native';

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  navigation: any;
}

const ICON_COLOR = '#A1A1AA';
const ICON_BG = 'rgba(161, 161, 170, 0.1)';

const IconBox: React.FC<{
  icon: React.ElementType;
  size?: number;
  danger?: boolean;
}> = ({ icon: Icon, size = 22, danger = false }) => (
  <View
    style={[
      styles.iconBox,
      // eslint-disable-next-line react-native/no-inline-styles
      { backgroundColor: danger ? 'rgba(220, 38, 38, 0.12)' : ICON_BG },
    ]}
  >
    <Icon
      size={size}
      color={danger ? '#F87171' : ICON_COLOR}
      strokeWidth={1.8}
    />
  </View>
);

const CardRow: React.FC<{
  label: string;
  icon: React.ElementType;
  onPress: () => void;
  danger?: boolean;
}> = ({ label, icon, onPress, danger = false }) => (
  <Pressable
    style={styles.cardRow}
    onPress={onPress}
    android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
  >
    <IconBox icon={icon} danger={danger} />
    <Text style={[styles.cardRowLabel, danger && styles.dangerLabel]}>
      {label}
    </Text>
    <ChevronRight
      size={22}
      color={danger ? '#F8717160' : '#52525B'}
      strokeWidth={2.5}
    />
  </Pressable>
);

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

const AppDrawer: React.FC<AppDrawerProps> = ({ open, onClose, navigation }) => {
  const dispatch = useDispatch<AppDispatch>();

  const isPartner = useAppSelector(s => s.partnerAuth.isAuthenticated);
  const partnerToken = useAppSelector(s => s.partnerAuth.token);

  // ✅ InAppBrowser state
  const [browser, setBrowser] = useState({ visible: false, url: '', title: '' });

  const userScreenMap: Record<string, string> = {
    Reports: 'ReportsStack',
    Transactions: 'TransactionsStack',
    Profile: 'Profile',
    Support: 'Support',
  };

  const partnerScreenMap: Record<string, string> = {
    Reports: 'PartnerReports',
    Transactions: 'PartnerTransactions',
    Recharge: 'RechargeStack',
    Profile: 'PartnerProfile',
    Support: 'Support',
  };

  const handleNavigation = (screen: string, params?: any) => {
    onClose();
    const map = isPartner ? partnerScreenMap : userScreenMap;
    const target = map[screen] || screen;
    console.log(
      `📍 AppDrawer [${isPartner ? 'partner' : 'user'}]: "${screen}" → "${target}"`,
    );
    params ? navigation.navigate(target, params) : navigation.navigate(target);
  };

  const handleEditProfile = () => {
    onClose();
    const target = isPartner ? 'PartnerProfile' : 'Profile';
    navigation.navigate(target);
  };

  // ✅ Close drawer first, then open InAppBrowser after drawer animation completes
  const handleOpenURL = (url: string, title: string) => {
    onClose();
    setTimeout(() => {
      setBrowser({ visible: true, url, title });
    }, 400);
  };

  const handleLogout = () => {
    onClose();
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            if (isPartner) {
              await dispatch(partnerLogout(partnerToken!)).unwrap();
            } else {
              await dispatch(logout()).unwrap();
            }
          } catch (error) {
            console.log('⚠️ Logout error:', error);
          } finally {
            navigation.replace('Auth');
          }
        },
      },
    ]);
  };

  return (
    <>
      <Drawer open={open} onClose={onClose}>
        <DrawerHeader onClose={onClose} onEditProfile={handleEditProfile} />

        {/* ── Manage ────────────────────────────────────────────────────────── */}
        <SectionTitle title="Manage" />
        <View style={styles.card}>
          <CardRow
            label="My Profile"
            icon={CircleUserRound}
            onPress={() => handleNavigation('Profile')}
          />
          <View style={styles.itemDivider} />
          <CardRow
            label="Reports"
            icon={FileText}
            onPress={() => handleNavigation('Reports')}
          />
          <View style={styles.itemDivider} />
          <CardRow
            label="Transactions"
            icon={ArrowLeftRight}
            onPress={() => handleNavigation('Transactions')}
          />
          {isPartner && (
            <>
              <View style={styles.itemDivider} />
              <CardRow
                label="Recharge"
                icon={Zap}
                onPress={() => handleNavigation('Recharge')}
              />
            </>
          )}
        </View>

        {/* ── Support ───────────────────────────────────────────────────────── */}
        <SectionTitle title="Support" />
        <View style={styles.card}>
          <CardRow
            label="Support"
            icon={MessagesSquare}
            onPress={() => handleNavigation('Support')}
          />
        </View>

        {/* ── More ──────────────────────────────────────────────────────────── */}
        <SectionTitle title="More" />
        <View style={styles.card}>
          <CardRow
            label="Privacy Policy"
            icon={ShieldCheck}
            onPress={() =>
              handleOpenURL('https://mysehat.ai/privacy?embed=true', 'Privacy Policy')
            }
          />
          <View style={styles.itemDivider} />
          <CardRow
            label="Terms & Conditions"
            icon={FileText}
            onPress={() =>
              handleOpenURL('https://mysehat.ai/terms?embed=true', 'Terms & Conditions')
            }
          />
        </View>

        {/* ── Logout ────────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <CardRow
            label="Logout"
            icon={LogOut}
            danger
            onPress={handleLogout}
          />
        </View>

        {/* ── Logo + Version ──────────────────────────────────────────────── */}
        <View style={styles.brandBlock}>
          <Image
            source={mysehatLogo}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.versionText}>v{packageJson.version}</Text>
        </View>
      </Drawer>

      {/* ✅ FIXED: InAppBrowser OUTSIDE Drawer — renders independently */}
      <InAppBrowser
        visible={browser.visible}
        url={browser.url}
        title={browser.title}
        onClose={() => setBrowser({ visible: false, url: '', title: '' })}
      />
    </>
  );
};

export default AppDrawer;

const styles = StyleSheet.create({
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 18,
    marginTop: 10,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
  },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#27272A',
    marginLeft: 66,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 16,
    gap: 12,
  },
  cardRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#FAFAFA',
    letterSpacing: 0.1,
  },
  dangerLabel: {
    color: '#F87171',
    fontWeight: '600',
  },
  brandBlock: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 8,
  },
  logo: {
    width: 130,
    height: 32,
    tintColor: '#3F3F46',
    marginBottom: 2,
  },
  versionText: {
    color: '#52525B',
    fontSize: 12,
    fontWeight: '500',
  },
});