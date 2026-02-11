// components/screens/user/SelectUserContainer.tsx
// ✅ FIXED VERSION - With Toast Messages instead of Alerts
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from 'react-redux';
import SelectUserBottomSheet from "./SelectUserBottomSheet";
import AddMemberModal from "./AddMemberModal";
import ErrorToast from '../../common/ErrorToast';
import { useErrorToast } from '../../../hooks/useErrorToast';
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
  
  const isMounted = useRef(true);
  const { toast, showError, showSuccess, hideToast } = useErrorToast();
  
  const { qrData, rawData, orderId } = route.params || {};
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    
    if (reduxMembers.length === 0) {
      console.log('🔄 SelectUser: Fetching members...');
      dispatch(fetchMembers());
    } else {
      console.log('✅ SelectUser: Using cached members:', reduxMembers.length);
    }

    return () => {
      console.log('🧹 SelectUser: Cleaning up...');
      isMounted.current = false;
      
      if (isSaving) {
        console.log('⚠️ Component unmounted during save operation');
      }
      if (isUpdatingOrder) {
        console.log('⚠️ Component unmounted during order update');
      }
    };
  }, [dispatch, isSaving, isUpdatingOrder, reduxMembers.length]);

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
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      console.log('❌ Navigation error:', error);
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
    
    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, aborting save');
      return;
    }
    
    setIsSaving(true);

    try {
      await dispatch(createMember(data)).unwrap();
      
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted after create, skipping updates');
        return;
      }
      
      console.log('✅ Member added successfully!');
      showSuccess('Family member added successfully!');
      
      await dispatch(fetchMembers());
      
      if (isMounted.current) {
        setShowAddModal(false);
      }
    } catch (error: any) {
      console.log('❌ Failed to add member:', error);
      
      if (isMounted.current) {
        showError(error.message || 'Member already exists. Please choose a different name.');
      }
      throw error;
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleContinue = async () => {
    if (selectedIndex === null || !formattedMembers || formattedMembers.length === 0) {
      console.log('⚠️ No member selected or members array is empty');
      return;
    }

    const selectedMember = formattedMembers[selectedIndex];
    const originalMember = reduxMembers[selectedIndex];

    if (!selectedMember || !originalMember) {
      console.log('❌ Selected member not found');
      return;
    }

    console.log('✅ Selected user:', selectedMember);
    console.log('📋 QR Data:', qrData);
    console.log('📋 Order ID:', orderId);

    if (orderId) {
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted, aborting order update');
        return;
      }
      
      setIsUpdatingOrder(true);
      
      try {
        console.log('👤 Updating order with selected user...');
        await dispatch(updateOrderUser({
          orderId: orderId,
          userId: originalMember.id,
        })).unwrap();
        
        if (!isMounted.current) {
          console.log('⚠️ Component unmounted after order update, skipping navigation');
          return;
        }
        
        console.log('✅ Order updated successfully!');
      } catch (error: any) {
        console.log('❌ Failed to update order:', error);
        
        if (isMounted.current) {
          showError('Unable to update order. Please check your connection.');
          setIsUpdatingOrder(false);
        }
        return;
      } finally {
        if (isMounted.current) {
          setIsUpdatingOrder(false);
        }
      }
    } else {
      console.log('⚠️ No orderId provided, skipping order update');
    }

    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, skipping navigation to Pay screen');
      return;
    }

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
      console.log('❌ Navigation error:', error);
      
      if (isMounted.current) {
        showError('Navigation failed. Please try again.');
      }
    }
  };

  return (
    <>
      <ErrorToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
        action={toast.action}
      />

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