// components/common/drawer/DrawerHeader.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { X, Phone } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { fetchMembers } from '../../../store/slices/memberSlice';

type Props = {
  onClose: () => void;
};

export default function DrawerHeader({ onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { members } = useSelector((state: RootState) => state.members);
  const { user } = useSelector((state: RootState) => state.auth);

  // Fetch members if not loaded
  useEffect(() => {
    if (members.length === 0) {
      dispatch(fetchMembers());
    }
  }, [dispatch, members.length]);

  // Get SuperUser from members
  const superUser = members.find(member => member.userType === 'SuperUser');

  // Extract first name only (text before first space)
  const getFirstName = (fullName: string) => {
    const trimmedName = fullName.trim();
    const spaceIndex = trimmedName.indexOf(' ');
    return spaceIndex > 0 ? trimmedName.substring(0, spaceIndex) : trimmedName;
  };

  // Use SuperUser name if available, otherwise fall back to auth user
  const displayName = superUser
    ? getFirstName(superUser.name)
    : user?.name
    ? getFirstName(user.name)
    : 'User';

  // Get mobile number from user
  const userMobile = user?.mobile || 'N/A';

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.name}>Hi, {displayName}</Text>
        <View style={styles.mobileRow}>
          <Phone size={12} color="#7C3AED" strokeWidth={2.5} />
          <Text style={styles.mobileValue}>{userMobile}</Text>
        </View>
      </View>

      <Pressable onPress={onClose}>
        <X size={18} color="#94A3B8" />
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
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  mobileValue: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '700',
  },
});