// components/common/drawer/DrawerHeader.tsx
import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { ArrowLeft, Phone, Mail, Pencil } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { fetchMembers, fetchMyProfile } from '../../../store/slices/memberSlice';
import { useAppSelector } from '../../../store/hook';
import { fetchPartnerProfile } from '../../../store/slices/partnerSlice';
import { API_BASE_URL, ADMIN_BASE_URL } from '../../../store/constant';

type Props = {
  onClose: () => void;
  onEditProfile?: () => void;
};

export default function DrawerHeader({ onClose, onEditProfile }: Props) {
  const dispatch = useDispatch<AppDispatch>();

  const isPartner = useAppSelector(s => s.partnerAuth.isAuthenticated);
  const partnerInfo = useAppSelector(s => s.partnerAuth.partner);
  const partnerProfile = useAppSelector(s => s.partner.profile);

  const { members, myProfile } = useSelector((state: RootState) => state.members);
  const { user } = useSelector((state: RootState) => state.auth);

  // Fetch partner profile if not loaded
  useEffect(() => {
    if (isPartner && partnerInfo?.auth_id && !partnerProfile) {
      console.log('📸 DrawerHeader: Fetching partner profile...');
      dispatch(fetchPartnerProfile(partnerInfo.auth_id));
    }
  }, [isPartner, partnerInfo?.auth_id, partnerProfile, dispatch]);

  useEffect(() => {
    if (!isPartner) {
      if (members.length === 0) {
        dispatch(fetchMembers());
      }
      if (!myProfile) {
        dispatch(fetchMyProfile());
      }
    }
  }, [dispatch, isPartner, members.length, myProfile]);

  const getFirstName = (fullName: string) => {
    const trimmed = fullName.trim();
    const idx = trimmed.indexOf(' ');
    return idx > 0 ? trimmed.substring(0, idx) : trimmed;
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.trim().substring(0, 2).toUpperCase();
  };

  // ── Resolve profile image URL (DIFFERENT URLs for User vs Partner) ───────────────
  const resolveProfileImageUrl = (): string | null => {
    // ✅ PARTNER: Images on admin.mysehat.ai
    if (isPartner) {
      if (partnerProfile?.org_image) {
        if (partnerProfile.org_image.startsWith('http://') || partnerProfile.org_image.startsWith('https://')) {
          return partnerProfile.org_image;
        }
        // Partner images from ADMIN_BASE_URL
        return `${ADMIN_BASE_URL}${partnerProfile.org_image}`;
      }
      // Fallback to basic info
      const raw = partnerInfo?.profileImage ?? partnerInfo?.profile_image ?? null;
      if (raw) {
        if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
        return `${ADMIN_BASE_URL}${raw}`;
      }
      return null;
    }

    // ✅ USER: Images on app.mysehat.ai
    const raw = myProfile?.profileImage ?? null;
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    // User images from API_BASE_URL (app.mysehat.ai)
    const baseUrl = API_BASE_URL.replace('/api/v1', '');
    return `${baseUrl}${raw}`;
  };

  let fullName: string;
  let firstName: string;
  let subValue: string;
  let SubIcon: typeof Phone | typeof Mail;

  if (isPartner && partnerInfo) {
    fullName = partnerInfo.username ?? 'Partner';
    firstName = getFirstName(fullName);
    subValue = partnerInfo.email ?? '';
    SubIcon = Mail;
  } else {
    const superUser = members.find(m => m.userType === 'SuperUser');
    fullName = myProfile?.name ?? superUser?.name ?? user?.name ?? 'User';
    firstName = getFirstName(fullName);
    subValue = user?.mobile ?? 'N/A';
    SubIcon = Phone;
  }

  const profileImageUrl = resolveProfileImageUrl();
  const initials = getInitials(fullName);
  const hasImage = !!profileImageUrl;

  console.log('🖼️ [DrawerHeader] Role:', isPartner ? 'PARTNER' : 'USER');
  console.log('🖼️ [DrawerHeader] Image URL:', profileImageUrl);

  return (
    <View style={styles.wrapper}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onClose} hitSlop={12}>
          <ArrowLeft size={22} color="#FAFAFA" strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.topTitle}>Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarRing}>
          {hasImage ? (
            <Image
              source={{ uri: profileImageUrl! }}
              style={styles.avatarImage}
              onError={(e) => {
                console.log('❌ [DrawerHeader] Image failed:', e.nativeEvent.error);
                console.log('❌ [DrawerHeader] URL was:', profileImageUrl);
              }}
              onLoad={() => {
                console.log('✅ [DrawerHeader] Image loaded successfully');
              }}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.name}>{firstName}</Text>
          <View style={styles.subRow}>
            <SubIcon size={13} color="#7C3AED" strokeWidth={2.5} />
            <Text style={styles.subValue} numberOfLines={1}>
              {subValue}
            </Text>
          </View>
          {isPartner && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PARTNER</Text>
            </View>
          )}
        </View>

        <Pressable
          style={styles.editBtn}
          onPress={onEditProfile}
          hitSlop={8}
        >
          <Pencil size={16} color="#71717A" strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '700',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1625',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#2D1B4E',
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 12,
    gap: 14,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#A1A1AA',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  infoBlock: {
    flex: 1,
  },
  name: {
    color: '#FAFAFA',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 3,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subValue: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderColor: '#7C3AED',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#A78BFA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(113, 113, 122, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});