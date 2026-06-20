// components/common/AppHeader.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, Image } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAppSelector, useAppDispatch } from '../../store/hook';
import { fetchMyProfile } from '../../store/slices/memberSlice';
import { fetchPartnerProfile } from '../../store/slices/partnerSlice';
import { API_BASE_URL, ADMIN_BASE_URL } from '../../store/constant';

interface AppHeaderProps {
  onMenuClick: () => void;
  rightSlot?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onMenuClick, rightSlot }) => {
  const dispatch = useAppDispatch();

  const isPartner = useAppSelector(s => s.partnerAuth.isAuthenticated);
  const partnerInfo = useAppSelector(s => s.partnerAuth.partner);
  const partnerProfile = useAppSelector(s => s.partner.profile);
  const { members, myProfile } = useSelector((state: RootState) => state.members);
  const { user } = useSelector((state: RootState) => state.auth);

  // Fetch partner profile if not loaded (only for partners)
  useEffect(() => {
    if (isPartner && partnerInfo?.auth_id && !partnerProfile) {
      console.log('📸 AppHeader: Fetching partner profile...');
      dispatch(fetchPartnerProfile(partnerInfo.auth_id));
    }
  }, [isPartner, partnerInfo?.auth_id, partnerProfile, dispatch]);

  // Fetch myProfile if not loaded yet (users only)
  useEffect(() => {
    if (!isPartner && !myProfile) {
      dispatch(fetchMyProfile());
    }
  }, [dispatch, isPartner, myProfile]);

  // ── Resolve profile image (DIFFERENT URLs for User vs Partner) ───────────────────
  const resolveProfileImageUrl = (): string | null => {
    // ✅ PARTNER: Images on admin.mysehat.ai
    if (isPartner) {
      // First try full profile's org_image
      if (partnerProfile?.org_image) {
        if (partnerProfile.org_image.startsWith('http://') || partnerProfile.org_image.startsWith('https://')) {
          return partnerProfile.org_image;
        }
        // Partner images come from ADMIN_BASE_URL (admin.mysehat.ai)
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
    // User images come from API_BASE_URL (app.mysehat.ai)
    // Remove '/api/v1' from API_BASE_URL to get base domain
    const baseUrl = API_BASE_URL.replace('/api/v1', '');
    return `${baseUrl}${raw}`;
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.trim().substring(0, 2).toUpperCase();
  };

  const profileImageUrl = resolveProfileImageUrl();
  const hasImage = !!profileImageUrl;

  let initials = 'U';
  if (isPartner && partnerInfo) {
    initials = getInitials(partnerInfo.username ?? 'P');
  } else {
    const superUser = members.find((m: any) => m.userType === 'SuperUser');
    const fullName = myProfile?.name ?? superUser?.name ?? user?.name ?? 'User';
    initials = getInitials(fullName);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Pressable onPress={onMenuClick} style={styles.avatarBtn}>
        {hasImage ? (
          <Image
            source={{ uri: profileImageUrl! }}
            style={styles.avatarImage}
            onError={(e) => console.log('❌ AppHeader image error:', e.nativeEvent.error)}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
      </Pressable>

      <Image
        source={require('../../assets/images/mysehat_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.rightSlot}>{rightSlot ?? null}</View>
    </View>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    backgroundColor: '#09090B',
  },
  logo: {
    width: 100,
    height: 40,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '700',
  },
  rightSlot: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});