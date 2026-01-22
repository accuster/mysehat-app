// components/screens/user/ManageMembersScreen.tsx
/* eslint-disable radix */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { X, Edit2, Trash2, ArrowLeft, User } from 'lucide-react-native';

import {
  fetchMembers,
  createMember,
  updateMember,
  deleteMember,
  clearError,
  setSelectedMember,
} from '../../../store/slices/memberSlice';
import { RootState, AppDispatch } from '../../../store';

export default function ManageMembersScreen({ navigation }: any) {
  const isMounted = useRef(true);

  const dispatch = useDispatch<AppDispatch>();
  const { members, isLoading, error, selectedMember } = useSelector(
    (state: RootState) => state.members,
  );

  const insets = useSafeAreaInsets();
  const NAME_REGEX = /^[a-zA-Z0-9. ]+$/;

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');

  // Validation errors
  const [nameError, setNameError] = useState('');
  const [ageError, setAgeError] = useState('');

  // ✅ Setup and cleanup
  useEffect(() => {
    isMounted.current = true;

    console.log('👥 ManageMembersScreen: Component mounted');
    console.log('🔄 Fetching members...');
    dispatch(fetchMembers());

    return () => {
      console.log('🧹 ManageMembersScreen: Unmounting...');
      isMounted.current = false;
    };
  }, [dispatch]);

  // ✅ Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: ManageMembersScreen');

      // ✅ Check if mounted before navigation
      if (isMounted.current && navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [navigation]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // ✅ Safe navigation helper
  const handleBack = () => {
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted, aborting navigation');
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // Reset form
  const resetForm = () => {
    setName('');
    setAge('');
    setGender('Male');
    setNameError('');
    setAgeError('');
  };

  // Validate form
  const validateForm = (): boolean => {
    let valid = true;

    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      valid = false;
    } else if (!NAME_REGEX.test(name.trim())) {
      setNameError(
        'Name can only contain letters, numbers, period, and spaces',
      );
      valid = false;
    } else {
      setNameError('');
    }

    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum)) {
      setAgeError('Age is required');
      valid = false;
    } else if (ageNum < 1 || ageNum > 120) {
      setAgeError('Age must be between 1 and 120');
      valid = false;
    } else {
      setAgeError('');
    }

    return valid;
  };

  // ✅ Handle add member with full safety
  const handleAddMember = async () => {
    if (!validateForm()) return;

    // ✅ Check if mounted before starting
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted, aborting add');
      return;
    }

    try {
      console.log('➕ Adding member...');

      await dispatch(
        createMember({
          name: name.trim(),
          age: parseInt(age),
          gender,
        }),
      ).unwrap();

      // ✅ Check if still mounted after async
      if (!isMounted.current) {
        console.warn('⚠️ Component unmounted after member add');
        return;
      }

      console.log('✅ Member added successfully');

      resetForm();
      setShowAddForm(false);
      Alert.alert('Success', 'Family member added successfully!');
    } catch (err: any) {
      console.error('❌ Add member error:', err);

      // ✅ Only show alert if mounted
      if (isMounted.current) {
        Alert.alert('Error', err.message || 'Failed to add member');
      }
    }
  };

  // Handle edit member click
  const handleEditClick = (member: any) => {
    dispatch(setSelectedMember(member));
    setName(member.name);
    setAge(member.age.toString());
    setGender(member.gender);
    setShowEditModal(true);
  };

  // ✅ Handle update member with full safety
  const handleUpdateMember = async () => {
    if (!selectedMember) return;
    if (!validateForm()) return;

    // ✅ Check if mounted before starting
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted, aborting update');
      return;
    }

    try {
      console.log('✏️ Updating member...');

      await dispatch(
        updateMember({
          id: selectedMember.id,
          data: {
            name: name.trim(),
            age: parseInt(age),
            gender,
          },
        }),
      ).unwrap();

      // ✅ Check if still mounted after async
      if (!isMounted.current) {
        console.warn('⚠️ Component unmounted after member update');
        return;
      }

      console.log('✅ Member updated successfully');

      resetForm();
      setShowEditModal(false);
      dispatch(setSelectedMember(null));
      Alert.alert('Success', 'Family member updated successfully!');
    } catch (err: any) {
      console.error('❌ Update member error:', err);

      // ✅ Only show alert if mounted
      if (isMounted.current) {
        Alert.alert('Error', err.message || 'Failed to update member');
      }
    }
  };

  // ✅ Handle delete member with full safety
  const handleDeleteMember = (member: any) => {
    Alert.alert(
      'Delete Member',
      `Are you sure you want to delete ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // ✅ Check if mounted before starting
            if (!isMounted.current) {
              console.warn('⚠️ Component unmounted, aborting delete');
              return;
            }

            try {
              console.log('🗑️ Deleting member:', member.id);

              await dispatch(deleteMember(member.id)).unwrap();

              // ✅ Check if still mounted after async
              if (!isMounted.current) {
                console.warn('⚠️ Component unmounted after member delete');
                return;
              }

              console.log('✅ Member deleted successfully');

              Alert.alert('Success', 'Family member deleted successfully!');
            } catch (err: any) {
              console.error('❌ Delete member error:', err);

              // ✅ Only show alert if mounted
              if (isMounted.current) {
                Alert.alert('Error', err.message || 'Failed to delete member');
              }
            }
          },
        },
      ],
    );
  };

  const contentBottomPadding = 40 + (insets.bottom > 0 ? insets.bottom : 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Simple Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Members</Text>
        <View style={styles.placeholder} />
      </View>

      {/* CONTENT */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: contentBottomPadding },
        ]}
      >
        {/* LOADING STATE */}
        {isLoading && members.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading members...</Text>
          </View>
        )}

        {/* EMPTY STATE */}
        {!isLoading && members.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No family members yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first family member to get started
            </Text>
          </View>
        )}

        {/* MEMBERS LIST */}
        {members.map(member => {
          const isSuperUser = member.userType === 'SuperUser';

          return (
            <View key={member.id} style={styles.memberCard}>
              {/* Icon Container */}
              <View
                style={[
                  styles.iconContainer,
                  isSuperUser && styles.iconContainerSuperUser,
                ]}
              >
                <User
                  size={24}
                  color={isSuperUser ? '#FBBF24' : '#8B5CF6'}
                  strokeWidth={2.5}
                />
                {isSuperUser && (
                  <View style={styles.crownBadge}>
                    <Text style={styles.crownIcon}>👑</Text>
                  </View>
                )}
              </View>

              <View style={styles.memberInfo}>
                <View style={styles.memberHeader}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  {isSuperUser && (
                    <View style={styles.superUserBadge}>
                      <Text style={styles.superUserText}>Super User</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberMeta}>
                  Age: {member.age} • {member.gender}
                </Text>
              </View>

              <View style={styles.memberActions}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => handleEditClick(member)}
                >
                  <Edit2 size={18} color="#3B82F6" strokeWidth={2.5} />
                </Pressable>

                {!isSuperUser && (
                  <Pressable
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDeleteMember(member)}
                  >
                    <Trash2 size={18} color="#EF4444" strokeWidth={2.5} />
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {/* ADD FAMILY MEMBER BUTTON */}
        <Pressable style={styles.addBtn} onPress={() => setShowAddForm(true)}>
          <Text style={styles.addText}>+ Add Family Member</Text>
        </Pressable>
      </ScrollView>

      {/* ADD MEMBER MODAL */}
      <Modal
        visible={showAddForm}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddForm(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Family Member</Text>
              <Pressable
                onPress={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                <X size={24} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                placeholder="Enter full name"
                placeholderTextColor="#71717A"
                value={name}
                onChangeText={text => {
                  const filtered = text.replace(/[^a-zA-Z0-9. ]/g, '');
                  setName(filtered);
                  setNameError('');
                }}
                style={[styles.input, nameError && styles.inputError]}
                editable={!isLoading}
              />
              {nameError ? (
                <Text style={styles.errorText}>{nameError}</Text>
              ) : null}

              <Text style={styles.label}>Age *</Text>
              <TextInput
                placeholder="Enter age"
                placeholderTextColor="#71717A"
                value={age}
                onChangeText={text => {
                  setAge(text.replace(/[^0-9]/g, ''));
                  setAgeError('');
                }}
                keyboardType="number-pad"
                maxLength={3}
                style={[styles.input, ageError && styles.inputError]}
                editable={!isLoading}
              />
              {ageError ? (
                <Text style={styles.errorText}>{ageError}</Text>
              ) : null}

              <Text style={styles.label}>Gender *</Text>
              <View style={styles.genderRow}>
                {(['Male', 'Female', 'Other'] as const).map(g => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    disabled={isLoading}
                    style={[
                      styles.genderBtn,
                      gender === g && styles.genderActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        gender === g && styles.genderTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.saveBtn, isLoading && styles.btnDisabled]}
                onPress={handleAddMember}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FAFAFA" />
                ) : (
                  <Text style={styles.saveText}>Save Member</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditModal(false);
          resetForm();
          dispatch(setSelectedMember(null));
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Family Member</Text>
              <Pressable
                onPress={() => {
                  setShowEditModal(false);
                  resetForm();
                  dispatch(setSelectedMember(null));
                }}
              >
                <X size={24} color="#A1A1AA" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                placeholder="Enter full name"
                placeholderTextColor="#71717A"
                value={name}
                onChangeText={text => {
                  const filtered = text.replace(/[^a-zA-Z0-9. ]/g, '');
                  setName(filtered);
                  setNameError('');
                }}
                style={[styles.input, nameError && styles.inputError]}
                editable={!isLoading}
              />
              {nameError ? (
                <Text style={styles.errorText}>{nameError}</Text>
              ) : null}

              <Text style={styles.label}>Age *</Text>
              <TextInput
                placeholder="Enter age"
                placeholderTextColor="#71717A"
                value={age}
                onChangeText={text => {
                  setAge(text.replace(/[^0-9]/g, ''));
                  setAgeError('');
                }}
                keyboardType="number-pad"
                maxLength={3}
                style={[styles.input, ageError && styles.inputError]}
                editable={!isLoading}
              />
              {ageError ? (
                <Text style={styles.errorText}>{ageError}</Text>
              ) : null}

              <Text style={styles.label}>Gender *</Text>
              <View style={styles.genderRow}>
                {(['Male', 'Female', 'Other'] as const).map(g => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    disabled={isLoading}
                    style={[
                      styles.genderBtn,
                      gender === g && styles.genderActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        gender === g && styles.genderTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.saveBtn, isLoading && styles.btnDisabled]}
                onPress={handleUpdateMember}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FAFAFA" />
                ) : (
                  <Text style={styles.saveText}>Update Member</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* STYLES */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    backgroundColor: '#09090B',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  placeholder: {
    width: 40,
  },

  content: {
    padding: 16,
  },

  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#71717A',
    marginTop: 12,
    fontSize: 14,
  },

  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#71717A',
    fontSize: 14,
  },

  memberCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    position: 'relative',
  },
  iconContainerSuperUser: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  crownBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FBBF24',
  },
  crownIcon: {
    fontSize: 10,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  memberName: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
  },
  superUserBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  superUserText: {
    color: '#18181B',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  memberMeta: {
    color: '#A1A1AA',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#0A0A0A',
  },
  deleteBtn: {
    backgroundColor: '#0A0A0A',
  },

  addBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addText: {
    color: '#FAFAFA',
    fontWeight: '800',
    fontSize: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  modalTitle: {
    color: '#FAFAFA',
    fontSize: 20,
    fontWeight: '800',
  },
  modalBody: {
    padding: 20,
  },

  label: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 14,
    color: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#27272A',
    fontSize: 15,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },

  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
  },
  genderActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  genderText: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '700',
  },
  genderTextActive: {
    color: '#FAFAFA',
  },

  saveBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveText: {
    color: '#FAFAFA',
    fontWeight: '800',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
