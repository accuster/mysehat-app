// components/common/drawer/DrawerHeader.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { X, Phone, Mail } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { fetchMembers } from '../../../store/slices/memberSlice';
import { useAppSelector } from '../../../store/hook';

type Props = {
  onClose: () => void;
};

export default function DrawerHeader({ onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();

  // ── Role detection ────────────────────────────────────────────────────────
  const isPartner = useAppSelector(s => s.partnerAuth.isAuthenticated);
  const partnerInfo = useAppSelector(s => s.partnerAuth.partner);

  // ── User data ─────────────────────────────────────────────────────────────
  const { members } = useSelector((state: RootState) => state.members);
  const { user } = useSelector((state: RootState) => state.auth);

  // Fetch members only for user role
  useEffect(() => {
    if (!isPartner && members.length === 0) {
      dispatch(fetchMembers());
    }
  }, [dispatch, isPartner, members.length]);

  // ── Display values — branch by role ──────────────────────────────────────
  const getFirstName = (fullName: string) => {
    const trimmed = fullName.trim();
    const spaceIdx = trimmed.indexOf(' ');
    return spaceIdx > 0 ? trimmed.substring(0, spaceIdx) : trimmed;
  };

  let displayName: string;
  let subValue: string;
  let SubIcon: typeof Phone | typeof Mail;

  if (isPartner && partnerInfo) {
    // Partner: show username + email
    displayName = getFirstName(partnerInfo.username ?? 'Partner');
    subValue = partnerInfo.email ?? '';
    SubIcon = Mail;
  } else {
    // User: show SuperUser name + mobile
    const superUser = members.find(m => m.userType === 'SuperUser');
    displayName = superUser
      ? getFirstName(superUser.name)
      : user?.name
      ? getFirstName(user.name)
      : 'User';
    subValue = user?.mobile ?? 'N/A';
    SubIcon = Phone;
  }

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name}>Hi, {displayName}!</Text>
        <View style={styles.subRow}>
          <SubIcon size={12} color="#7C3AED" strokeWidth={2.5} />
          <Text style={styles.subValue} numberOfLines={1}>
            {subValue}
          </Text>
        </View>
        {/* Partner badge */}
        {isPartner && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PARTNER</Text>
          </View>
        )}
      </View>

      <Pressable onPress={onClose} hitSlop={8}>
        <X size={24} color="#94A3B8" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  subValue: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1, // prevent long email from overflowing
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderColor: '#7C3AED',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#A78BFA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
