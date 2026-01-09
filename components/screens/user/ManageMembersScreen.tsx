/* eslint-disable radix */
/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { X, Edit2, Trash2, ArrowLeft } from 'lucide-react-native';

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
  const dispatch = useDispatch<AppDispatch>();
  const { members, isLoading, error, selectedMember } = useSelector(
    (state: RootState) => state.members
  );
  
  // ✅ ADD THIS: Use safe area hook
  const insets = useSafeAreaInsets();

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');

  // Validation errors
  const [nameError, setNameError] = useState('');
  const [ageError, setAgeError] = useState('');

  // Load members on mount
  useEffect(() => {
    console.log('🔄 ManageMembersScreen mounted, fetching members...');
    dispatch(fetchMembers());
  }, [dispatch]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Handle back navigation
  const handleBack = () => {
    navigation.goBack();
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
    }

    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum)) {
      setAgeError('Age is required');
      valid = false;
    } else if (ageNum < 1 || ageNum > 120) {
      setAgeError('Age must be between 1 and 120');
      valid = false;
    }

    return valid;
  };

  // Handle add member
  const handleAddMember = async () => {
    if (!validateForm()) return;

    try {
      await dispatch(
        createMember({
          name: name.trim(),
          age: parseInt(age),
          gender,
        })
      ).unwrap();

      resetForm();
      setShowAddForm(false);
      Alert.alert('Success', 'Family member added successfully!');
    } catch (err: any) {
      console.error('Add member error:', err);
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

  // Handle update member
  const handleUpdateMember = async () => {
    if (!selectedMember) return;
    if (!validateForm()) return;

    try {
      await dispatch(
        updateMember({
          id: selectedMember.id,
          data: {
            name: name.trim(),
            age: parseInt(age),
            gender,
          },
        })
      ).unwrap();

      resetForm();
      setShowEditModal(false);
      dispatch(setSelectedMember(null));
      Alert.alert('Success', 'Family member updated successfully!');
    } catch (err: any) {
      console.error('Update member error:', err);
    }
  };

  // Handle delete member
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
            try {
              await dispatch(deleteMember(member.id)).unwrap();
              Alert.alert('Success', 'Family member deleted successfully!');
            } catch (err: any) {
              console.error('Delete member error:', err);
            }
          },
        },
      ]
    );
  };

  // ✅ ADD THIS: Calculate dynamic bottom padding
  const contentBottomPadding = 40 + (insets.bottom > 0 ? insets.bottom : 0);

  return (
    // ✅ CHANGE 1: Add 'bottom' to edges
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ✅ Simple Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Members</Text>
        <View style={styles.placeholder} />
      </View>

      {/* ---------- CONTENT ---------- */}
      {/* ✅ CHANGE 2: Use dynamic padding */}
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}>
        {/* LOADING STATE */}
        {isLoading && members.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C3AED" />
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
        {members.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberInfo}>
              <View style={styles.memberHeader}>
                <Text style={styles.memberName}>{member.name}</Text>
                {member.userType === 'SuperUser' && (
                  <View style={styles.superUserBadge}>
                    <Text style={styles.superUserText}>Super User</Text>
                  </View>
                )}
              </View>
              <Text style={styles.memberMeta}>
                {member.age}/{member.gender}
              </Text>
            </View>

            {/* Show edit button for ALL users (SuperUser and FamilyUser) */}
            <View style={styles.memberActions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => handleEditClick(member)}
              >
                <Edit2 size={18} color="#3B82F6" />
              </Pressable>

              {/* Only show delete button for FamilyUser, NOT for SuperUser */}
              {member.userType === 'FamilyUser' && (
                <Pressable
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDeleteMember(member)}
                >
                  <Trash2 size={18} color="#EF4444" />
                </Pressable>
              )}
            </View>
          </View>
        ))}

        {/* ADD FAMILY MEMBER BUTTON */}
        <Pressable
          style={styles.addBtn}
          onPress={() => setShowAddForm(true)}
        >
          <Text style={styles.addText}>+ Add Family Member</Text>
        </Pressable>
      </ScrollView>

      {/* ---------- ADD MEMBER MODAL ---------- */}
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
                <X size={24} color="#94A3B8" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                placeholder="Enter full name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setNameError('');
                }}
                style={[styles.input, nameError && styles.inputError]}
              />
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

              <Text style={styles.label}>Age *</Text>
              <TextInput
                placeholder="Enter age"
                placeholderTextColor="#94A3B8"
                value={age}
                onChangeText={(text) => {
                  setAge(text.replace(/[^0-9]/g, ''));
                  setAgeError('');
                }}
                keyboardType="number-pad"
                maxLength={3}
                style={[styles.input, ageError && styles.inputError]}
              />
              {ageError ? <Text style={styles.errorText}>{ageError}</Text> : null}

              <Text style={styles.label}>Gender *</Text>
              <View style={styles.genderRow}>
                {(['Male', 'Female', 'Other'] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    style={[
                      styles.genderBtn,
                      gender === g && styles.genderActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        gender === g && { color: '#fff' },
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
                  <ActivityIndicator color="#020617" />
                ) : (
                  <Text style={styles.saveText}>Save Member</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ---------- EDIT MODAL ---------- */}
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
                <X size={24} color="#94A3B8" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                placeholder="Enter full name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setNameError('');
                }}
                style={[styles.input, nameError && styles.inputError]}
              />
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

              <Text style={styles.label}>Age *</Text>
              <TextInput
                placeholder="Enter age"
                placeholderTextColor="#94A3B8"
                value={age}
                onChangeText={(text) => {
                  setAge(text.replace(/[^0-9]/g, ''));
                  setAgeError('');
                }}
                keyboardType="number-pad"
                maxLength={3}
                style={[styles.input, ageError && styles.inputError]}
              />
              {ageError ? <Text style={styles.errorText}>{ageError}</Text> : null}

              <Text style={styles.label}>Gender *</Text>
              <View style={styles.genderRow}>
                {(['Male', 'Female', 'Other'] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    style={[
                      styles.genderBtn,
                      gender === g && styles.genderActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        gender === g && { color: '#fff' },
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
                  <ActivityIndicator color="#020617" />
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

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
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
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  
  content: {
    padding: 16,
    // ✅ CHANGE 3: Remove fixed paddingBottom (now applied dynamically)
  },

  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },

  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 14,
  },

  memberCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  superUserBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  superUserText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  memberMeta: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  deleteBtn: {
    backgroundColor: '#1E293B',
  },

  addBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },

  label: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },

  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  genderActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  genderText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },

  saveBtn: {
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveText: {
    color: '#020617',
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    padding: 20,
  },
});