// components/screens/user/AddMemberModal.tsx
/* eslint-disable radix */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
  }) => Promise<void>;
  isLoading?: boolean;
};

export default function AddMemberModal({
  visible,
  onClose,
  onSave,
  isLoading,
}: Props) {
  // ✅ Add isMounted ref
  const isMounted = useRef(true);

  const NAME_REGEX = /^[a-zA-Z0-9. ]+$/;
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');

  // Validation errors
  const [nameError, setNameError] = useState('');
  const [ageError, setAgeError] = useState('');

  // ✅ Setup and cleanup
  useEffect(() => {
    isMounted.current = true;

    console.log('➕ AddMemberModal: Component mounted');

    return () => {
      console.log('🧹 AddMemberModal: Unmounting...');
      isMounted.current = false;
    };
  }, []);

  // ✅ Track visibility changes
  useEffect(() => {
    if (visible) {
      console.log('👁️ AddMemberModal: Opened');
    } else {
      console.log('👁️ AddMemberModal: Closed');
    }
  }, [visible]);

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

  // ✅ Handle save with isMounted protection
  const handleSave = async () => {
    if (!validateForm()) return;

    // ✅ Check if mounted before starting
    if (!isMounted.current) {
      console.log('⚠️ Modal unmounted, aborting save');
      return;
    }

    try {
      console.log('💾 Saving member...');

      await onSave({
        name: name.trim(),
        age: parseInt(age),
        gender,
      });

      // ✅ Check if still mounted after async operation
      if (!isMounted.current) {
        console.log('⚠️ Modal unmounted after save');
        return;
      }

      console.log('✅ Member saved successfully');

      resetForm();
      onClose();
    } catch (err: any) {
      console.log('❌ Save error:', err);
      // Error is already shown by parent component
    }
  };

  // ✅ Handle close with safety
  const handleClose = () => {
    // ✅ Check if mounted before state updates
    if (!isMounted.current) {
      console.log('⚠️ Modal unmounted, aborting close');
      return;
    }

    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Family Member</Text>
            <Pressable onPress={handleClose} disabled={isLoading}>
              <X size={24} color="#CBD5E1" />
            </Pressable>
          </View>

          {/* Form */}
          <View style={styles.modalBody}>
            {/* Name Input */}
            <Text style={styles.label}>Name *</Text>
            <TextInput
              placeholder="Enter full name"
              placeholderTextColor="#64748B"
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

            {/* Age Input */}
            <Text style={styles.label}>Age *</Text>
            <TextInput
              placeholder="Enter age"
              placeholderTextColor="#64748B"
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
            {ageError ? <Text style={styles.errorText}>{ageError}</Text> : null}

            {/* Gender Selector */}
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

            {/* Save Button */}
            <Pressable
              style={[styles.saveBtn, isLoading && styles.btnDisabled]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#020617" />
              ) : (
                <Text style={styles.saveText}>Save Member</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F172A',
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
    borderBottomColor: '#1E293B',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    padding: 20,
  },

  label: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    gap: 10,
    marginBottom: 12,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#020617',
    alignItems: 'center',
  },
  genderActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  genderText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  genderTextActive: {
    color: '#FFFFFF',
  },

  saveBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveText: {
    color: '#020617',
    fontWeight: '800',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
