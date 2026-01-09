import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, ArrowLeftRight } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import ScanFrameIcon from '../assets/svg/ScanFrameIcon';

export default function FloatingBottomNav({ state, navigation }: BottomTabBarProps) {
  const activeRoute = state.routes[state.index]?.name;

  const go = (name: string) => navigation.navigate(name as never);

  const isMySehat = activeRoute === 'MySehat';
  const isQR = activeRoute === 'QR';
  const isTxn = activeRoute === 'Transactions';

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.pill}>
        <Pressable
          onPress={() => go('MySehat')}
          style={[styles.tab, isMySehat && styles.tabActive]}
        >
          <Home size={16} color={isMySehat ? COLORS.white : '#111'} />
          <Text style={[styles.tabText, isMySehat && styles.tabTextActive]}>MySehat</Text>
        </Pressable>

        <Pressable
          onPress={() => go('Transactions')}
          style={[styles.tab, isTxn && styles.tabActive]}
        >
          <ArrowLeftRight size={16} color={isTxn ? COLORS.white : '#111'} />
          <Text style={[styles.tabText, isTxn && styles.tabTextActive]}>Transaction</Text>
        </Pressable>

        <Pressable
          onPress={() => go('QR')}
          style={[styles.fab, isQR ? styles.fabActive : null]}
        >
          <ScanFrameIcon size={22} color={isQR ? COLORS.white : '#111'} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' },
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
  tab: { height: 40, paddingHorizontal: 16, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabActive: { backgroundColor: COLORS.purple },
  tabText: { fontSize: 13, fontWeight: '700', color: '#111' },
  tabTextActive: { color: COLORS.white },
  fab: {
    position: 'absolute',
    left: '50%',
    top: -20,
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabActive: { backgroundColor: COLORS.purple },
});