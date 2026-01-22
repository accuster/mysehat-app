// components/screens/user/SelectUserContainer.tsx
// ✅ FIXED VERSION - Prevents crashes on back navigation
import React, { useEffect, useState, useRef } from "react";
import { Alert } from "react-native";
import { useDispatch, useSelector } from 'react-redux';
import SelectUserBottomSheet from "./SelectUserBottomSheet";
import AddMemberModal from "./AddMemberModal";
import { fetchMembers, createMember } from '../../../store/slices/memberSlice';
import { updateOrderUser } from '../../../store/slices/orderSlice';
import { RootState, AppDispatch } from '../../../store';

type Props = {
  navigation: any;
  route: {
    params: {
      qrData: any;
      rawData: string;
      orderId?: string;
    };
  };
};

export default function SelectUserContainer({ navigation, route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { members: reduxMembers, isLoading } = useSelector((state: RootState) => state.members);
  
  // ✅ Track if component is mounted
  const isMounted = useRef(true);
  
  const { qrData, rawData, orderId } = route.params || {};
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // ✅ Setup and cleanup
  useEffect(() => {
    isMounted.current = true;
    
    // Fetch members on mount
    if (reduxMembers.length === 0) {
      console.log('🔄 SelectUser: Fetching members...');
      dispatch(fetchMembers());
    } else {
      console.log('✅ SelectUser: Using cached members:', reduxMembers.length);
    }

    // ✅ Cleanup on unmount
    return () => {
      console.log('🧹 SelectUser: Cleaning up...');
      isMounted.current = false;
      
      // Cancel any pending operations
      if (isSaving) {
        console.warn('⚠️ Component unmounted during save operation');
      }
      if (isUpdatingOrder) {
        console.warn('⚠️ Component unmounted during order update');
      }
    };
  }, [dispatch]);

  // Format members for SelectUserScreen
  const formattedMembers = reduxMembers.map(member => ({
    id: member.id,
    name: member.name,
    age: member.age,
    gender: member.gender.charAt(0) as 'M' | 'F' | 'O',
    isSuperUser: member.userType === 'SuperUser',
  }));

  console.log('📊 SelectUser State:', {
    reduxMembersCount: reduxMembers.length,
    formattedMembersCount: formattedMembers.length,
    isLoading,
    selectedIndex,
    showAddModal,
    isMounted: isMounted.current,
  });

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleBack = () => {
    // ✅ Safe navigation check
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  const handleAddUser = () => {
    console.log('➕ Opening Add Member Modal');
    if (isMounted.current) {
      setShowAddModal(true);
    }
  };

  const handleSaveMember = async (data: { name: string; age: number; gender: 'Male' | 'Female' | 'Other' }) => {
    console.log('💾 Saving new member:', data);
    
    // ✅ Check if still mounted
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted, aborting save');
      return;
    }
    
    setIsSaving(true);

    try {
      await dispatch(createMember(data)).unwrap();
      
      // ✅ Check before state updates
      if (!isMounted.current) {
        console.warn('⚠️ Component unmounted after create, skipping updates');
        return;
      }
      
      console.log('✅ Member added successfully!');
      Alert.alert('Success', 'Family member added successfully!');
      
      // Refresh members list
      await dispatch(fetchMembers());
      
      // ✅ Check again before closing modal
      if (isMounted.current) {
        setShowAddModal(false);
      }
    } catch (error: any) {
      console.error('❌ Failed to add member:', error);
      
      // ✅ Only show alert if mounted
      if (isMounted.current) {
        Alert.alert('Error', error.message || 'Failed to add member');
      }
      throw error;
    } finally {
      // ✅ Only update state if mounted
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleContinue = async () => {
    if (selectedIndex === null || !formattedMembers || formattedMembers.length === 0) {
      console.warn('⚠️ No member selected or members array is empty');
      return;
    }

    const selectedMember = formattedMembers[selectedIndex];
    const originalMember = reduxMembers[selectedIndex];

    if (!selectedMember || !originalMember) {
      console.error('❌ Selected member not found');
      return;
    }

    console.log('✅ Selected user:', selectedMember);
    console.log('📋 QR Data:', qrData);
    console.log('📋 Order ID:', orderId);

    // ✅ UPDATE ORDER WITH SELECTED USER_ID
    if (orderId) {
      // ✅ Check if mounted before starting
      if (!isMounted.current) {
        console.warn('⚠️ Component unmounted, aborting order update');
        return;
      }
      
      setIsUpdatingOrder(true);
      
      try {
        console.log('👤 Updating order with selected user...');
        await dispatch(updateOrderUser({
          orderId: orderId,
          userId: originalMember.id,
        })).unwrap();
        
        // ✅ Check if still mounted after async operation
        if (!isMounted.current) {
          console.warn('⚠️ Component unmounted after order update, skipping navigation');
          return;
        }
        
        console.log('✅ Order updated successfully!');
      } catch (error: any) {
        console.error('❌ Failed to update order:', error);
        
        // ✅ Only show alert if mounted
        if (isMounted.current) {
          Alert.alert('Error', 'Failed to update order. Please try again.');
          setIsUpdatingOrder(false);
        }
        return;
      } finally {
        // ✅ Only update state if mounted
        if (isMounted.current) {
          setIsUpdatingOrder(false);
        }
      }
    } else {
      console.warn('⚠️ No orderId provided, skipping order update');
    }

    // ✅ Final mounted check before navigation
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted, skipping navigation to Pay screen');
      return;
    }

    // ✅ Safe navigation with try-catch
    try {
      navigation.navigate("Pay", {
        selectedUserName: originalMember.name,
        scannedPayload: rawData,
        user: {
          id: originalMember.id,
          name: originalMember.name,
          age: originalMember.age,
          gender: originalMember.gender,
          userType: originalMember.userType,
        },
        qrData: qrData,
        rawData: rawData,
        orderId: orderId,
      });
    } catch (error) {
      console.error('❌ Navigation error:', error);
      
      if (isMounted.current) {
        Alert.alert('Error', 'Navigation failed. Please try again.');
      }
    }
  };

  return (
    <>
      <SelectUserBottomSheet
        members={formattedMembers}
        selectedIndex={selectedIndex}
        isLoading={isLoading || isUpdatingOrder}
        onSelect={handleSelect}
        onBack={handleBack}
        onContinue={handleContinue}
        onAddUser={handleAddUser}
      />

      <AddMemberModal
        visible={showAddModal}
        onClose={() => {
          if (isMounted.current) {
            setShowAddModal(false);
          }
        }}
        onSave={handleSaveMember}
        isLoading={isSaving}
      />
    </>
  );
}