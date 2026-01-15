// components/screens/user/SelectUserContainer.tsx
import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useDispatch, useSelector } from 'react-redux';
import SelectUserBottomSheet from "./SelectUserBottomSheet";
import AddMemberModal from "./AddMemberModal";
import { fetchMembers, createMember } from '../../../store/slices/memberSlice';
import { updateOrderUser } from '../../../store/slices/orderSlice'; // ✅ ADD THIS
import { RootState, AppDispatch } from '../../../store';

type Props = {
  navigation: any;
  route: {
    params: {
      qrData: any;
      rawData: string;
      orderId?: string; // ✅ ADD THIS
    };
  };
};

export default function SelectUserContainer({ navigation, route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { members: reduxMembers, isLoading } = useSelector((state: RootState) => state.members);
  
  const { qrData, rawData, orderId } = route.params || {}; // ✅ GET orderId
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false); // ✅ ADD THIS

  // Fetch members on mount (only if not already loaded)
  useEffect(() => {
    if (reduxMembers.length === 0) {
      console.log('🔄 SelectUser: Fetching members...');
      dispatch(fetchMembers());
    } else {
      console.log('✅ SelectUser: Using cached members:', reduxMembers.length);
    }
  }, [dispatch, reduxMembers.length]);

  // Format members for SelectUserScreen
  const formattedMembers = reduxMembers.map(member => ({
    id: member.id,
    name: member.name,
    age: member.age,
    gender: member.gender.charAt(0) as 'M' | 'F' | 'O', // "Male" → "M"
    isSuperUser: member.userType === 'SuperUser',
  }));

  console.log('📊 SelectUser State:', {
    reduxMembersCount: reduxMembers.length,
    formattedMembersCount: formattedMembers.length,
    isLoading,
    selectedIndex,
    showAddModal,
  });

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAddUser = () => {
    console.log('➕ Opening Add Member Modal');
    setShowAddModal(true);
  };

  const handleSaveMember = async (data: { name: string; age: number; gender: 'Male' | 'Female' | 'Other' }) => {
    console.log('💾 Saving new member:', data);
    setIsSaving(true);

    try {
      await dispatch(createMember(data)).unwrap();
      
      console.log('✅ Member added successfully!');
      Alert.alert('Success', 'Family member added successfully!');
      
      // Refresh members list
      await dispatch(fetchMembers());
      
      // Close modal
      setShowAddModal(false);
    } catch (error: any) {
      console.error('❌ Failed to add member:', error);
      Alert.alert('Error', error.message || 'Failed to add member');
      throw error; // Re-throw to prevent modal from closing
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => { // ✅ Make async
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
      setIsUpdatingOrder(true);
      try {
        console.log('👤 Updating order with selected user...');
        await dispatch(updateOrderUser({
          orderId: orderId,
          userId: originalMember.id,
        })).unwrap();
        
        console.log('✅ Order updated successfully!');
      } catch (error: any) {
        console.error('❌ Failed to update order:', error);
        Alert.alert('Error', 'Failed to update order. Please try again.');
        setIsUpdatingOrder(false);
        return; // Don't navigate if update failed
      } finally {
        setIsUpdatingOrder(false);
      }
    } else {
      console.warn('⚠️ No orderId provided, skipping order update');
    }

    // Navigate to Pay screen with selected user and QR data
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
      orderId: orderId, // ✅ Pass orderId to Pay screen
    });
  };

  return (
    <>
      <SelectUserBottomSheet
        members={formattedMembers}
        selectedIndex={selectedIndex}
        isLoading={isLoading || isUpdatingOrder} // ✅ Show loading during order update
        onSelect={handleSelect}
        onBack={handleBack}
        onContinue={handleContinue}
        onAddUser={handleAddUser}
      />

      <AddMemberModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveMember}
        isLoading={isSaving}
      />
    </>
  );
}