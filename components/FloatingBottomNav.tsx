// components/FloatingBottomNav.tsx
import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, ArrowLeftRight } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { QrCode   } from 'lucide-react-native';

export default function FloatingBottomNav({ state, navigation, insets }: BottomTabBarProps) {
  const activeRoute = state.routes[state.index]?.name;

  const go = (name: string) => navigation.navigate(name as never);

  const isMySehat = activeRoute === 'MySehat';
  const isQR = activeRoute === 'QR';
  const isTxn = activeRoute === 'Transactions';

  const bottomSpacing = (insets?.bottom || 0) > 0 ? (insets?.bottom || 0) + 8 : 18;

  return (
    <View style={[styles.wrap, { bottom: bottomSpacing }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {/* Left Tab */}
        <Pressable
          onPress={() => go('MySehat')}
          style={[styles.tab, isMySehat && styles.tabActive]}
        >
          <Home size={16} color={isMySehat ? COLORS.white : '#111'} />
          <Text style={[styles.tabText, isMySehat && styles.tabTextActive]}>MySehat</Text>
        </Pressable>

        {/* Center Spacer for FAB */}
        <View style={styles.spacer} />

        {/* Right Tab */}
        <Pressable
          onPress={() => go('Transactions')}
          style={[styles.tab, isTxn && styles.tabActive]}
        >
          <ArrowLeftRight size={16} color={isTxn ? COLORS.white : '#111'} />
          <Text style={[styles.tabText, isTxn && styles.tabTextActive]}>Transaction</Text>
        </Pressable>
      </View>

      {/* Floating Action Button - Centered */}
      <Pressable
        onPress={() => go('QR')}
        style={[styles.fab, isQR && styles.fabActive]}
      >
        <View style={[styles.fabInner, isQR && styles.fabInnerActive]}>
          <QrCode  size={35} color={isQR ? COLORS.white : COLORS.purple} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: 320,
    maxWidth: '92%',
    height: 56,
    backgroundColor: 'rgba(228,228,231,0.95)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacer: {
    width: 72, // Space for the FAB
  },
  tab: { 
    height: 40, 
    paddingHorizontal: 16, 
    borderRadius: 999, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    flex: 1,
    maxWidth: 130,
  },
  tabActive: { 
    backgroundColor: COLORS.purple,
  },
  tabText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#111',
  },
  tabTextActive: { 
    color: COLORS.white,
  },
  fab: {
    position: 'absolute',
    top: -24,
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  fabActive: {
    backgroundColor: COLORS.purple,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabInnerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});