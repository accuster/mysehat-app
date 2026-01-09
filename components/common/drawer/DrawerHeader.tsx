import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { fetchMembers } from '../../../store/slices/memberSlice';
import { authApi } from '../../../store/services/authApi';

type Props = {
  credits: number; // ✅ Keep this prop
  onClose: () => void;
};

export default function DrawerHeader({ onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { members } = useSelector((state: RootState) => state.members);
  const { user } = useSelector((state: RootState) => state.auth);

  const [credits, setCredits] = useState<number>(0);
  const [loadingCredits, setLoadingCredits] = useState(false);

  // Fetch members if not loaded
  useEffect(() => {
    if (members.length === 0) {
      dispatch(fetchMembers());
    }
  }, [dispatch, members.length]);

  // Fetch wallet credits
  useEffect(() => {
    const fetchCredits = async () => {
      if (!user?.mobile) return;

      try {
        setLoadingCredits(true);
        // You'll need to add this endpoint to your authApi.ts
        // For now, using placeholder - replace with actual API call
        // const walletInfo = await authApi.getWalletInfo();
        // setCredits(walletInfo.balance);

        // Placeholder until you add the API endpoint
        setCredits(50);
      } catch (error) {
        console.error('Error fetching credits:', error);
        setCredits(0);
      } finally {
        setLoadingCredits(false);
      }
    };

    fetchCredits();
  }, [user?.mobile]);

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

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.name}>Hi, {displayName}</Text>
        <View style={styles.creditsRow}>
          <Text style={styles.credits}>Credits: </Text>
          {loadingCredits ? (
            <ActivityIndicator size="small" color="#94A3B8" />
          ) : (
            <Text style={styles.creditsValue}>{credits}</Text>
          )}
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
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  credits: {
    color: '#94A3B8',
    fontSize: 12,
  },
  creditsValue: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '700',
  },
});
