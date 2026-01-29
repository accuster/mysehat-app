// components/screens/auth/CompleteProfileScreen.tsx
/* eslint-disable radix */
/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  BackHandler,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { completeProfile } from '../../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../../store';
import Loader from '../../common/Loader';
import { UserPlus } from 'lucide-react-native';

type Props = {
  navigation: any;
};

export default function CompleteProfileScreen({ navigation }: Props) {
  // ✅ Add isMounted ref
  const isMounted = useRef(true);
  
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');

  const [nameError, setNameError] = useState('');
  const [ageError, setAgeError] = useState('');
  const [genderError, setGenderError] = useState('');

  // ✅ Track if user has entered any data
  const hasEnteredData = fullName.trim().length > 0 || age.length > 0 || gender !== '';

  // ✅ Setup and cleanup
  useEffect(() => {
    isMounted.current = true;
    
    console.log('📝 CompleteProfileScreen: Component mounted');

    return () => {
      console.log('🧹 CompleteProfileScreen: Unmounting...');
      isMounted.current = false;
      
      if (isLoading) {
        console.log('⚠️ Component unmounted during profile completion');
      }
    };
  }, []);

  // ✅ Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: CompleteProfileScreen');
      
      // ✅ Block back during profile submission
      if (isLoading) {
        Alert.alert(
          'Completing Profile',
          'Please wait while we complete your profile.',
          [{ text: 'OK' }]
        );
        return true; // Prevent default back
      }
      
      // ✅ Ask for confirmation if data entered
      if (hasEnteredData) {
        Alert.alert(
          'Discard Profile?',
          'You will need to login again. Are you sure you want to go back?',
          [
            {
              text: 'Stay',
              style: 'cancel',
            },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                if (isMounted.current) {
                  navigation.goBack();
                }
              },
            },
          ]
        );
        return true; // Prevent default back
      }
      
      // ✅ Allow back if no data entered
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation, hasEnteredData, isLoading]);

  const handleSubmit = async () => {
    // ✅ Check if mounted
    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, aborting submit');
      return;
    }
    
    // Validate
    let hasError = false;

    if (!fullName.trim()) {
      setNameError('Please enter your name');
      hasError = true;
    } else if (fullName.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      hasError = true;
    }

    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum)) {
      setAgeError('Please enter your age');
      hasError = true;
    } else if (ageNum < 1 || ageNum > 120) {
      setAgeError('Age must be between 1 and 120');
      hasError = true;
    }

    if (!gender) {
      setGenderError('Please select your gender');
      hasError = true;
    }

    if (hasError) return;

    try {
      console.log('📤 Completing profile...');
      
      const resultAction = await dispatch(
        completeProfile({
          fullName: fullName.trim(),
          age: ageNum,
          gender: gender as 'Male' | 'Female' | 'Other',
        }),
      );

      // ✅ Check if still mounted after async
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted after profile completion');
        return;
      }

      if (completeProfile.fulfilled.match(resultAction)) {
        console.log('✅ Profile completed successfully');
        
        Alert.alert(
          'Success!',
          'Your profile has been completed successfully. You received free credits!',
          [
            {
              text: 'Continue',
              onPress: () => {
                if (isMounted.current) {
                  navigation.replace('App');
                }
              },
            },
          ],
        );
      } else {
        throw new Error('Failed to complete profile');
      }
    } catch (err: any) {
      console.log('❌ Profile completion error:', err);
      
      // ✅ Only show alert if mounted
      if (isMounted.current) {
        Alert.alert('Error', err.message || 'Failed to complete profile');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* LOADING OVERLAY */}
      <Modal transparent visible={isLoading} animationType="fade">
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderCard}>
            <Loader label="Completing profile..." />
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <UserPlus size={56} color="#7C3AED" strokeWidth={2} />
          </View>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Help us personalize your experience
          </Text>
        </View>

        <View style={styles.card}>
          {/* Reward Banner */}
          <View style={styles.rewardBanner}>
            <Text style={styles.rewardText}>
              🎁 Complete your profile and get{' '}
              <Text style={styles.rewardHighlight}>FREE credits</Text> for your
              next BMI!
            </Text>
          </View>

          {/* Full Name */}
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            value={fullName}
            onChangeText={text => {
              setFullName(text);
              setNameError('');
            }}
            placeholder="Enter your full name"
            placeholderTextColor="#6B7280"
            style={[styles.input, nameError && styles.inputError]}
            editable={!isLoading}
          />
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

          {/* Age */}
          <Text style={[styles.label, { marginTop: 16 }]}>Age *</Text>
          <TextInput
            value={age}
            onChangeText={text => {
              setAge(text.replace(/[^0-9]/g, ''));
              setAgeError('');
            }}
            placeholder="Enter your age"
            placeholderTextColor="#6B7280"
            keyboardType="number-pad"
            maxLength={3}
            style={[styles.input, ageError && styles.inputError]}
            editable={!isLoading}
          />
          {ageError ? <Text style={styles.errorText}>{ageError}</Text> : null}

          {/* Gender */}
          <Text style={[styles.label, { marginTop: 16 }]}>Gender *</Text>
          <View style={styles.genderRow}>
            <Pressable
              onPress={() => {
                setGender('Male');
                setGenderError('');
              }}
              disabled={isLoading}
              style={[
                styles.genderBtn,
                gender === 'Male' && styles.genderBtnActive,
                isLoading && styles.btnDisabled,
              ]}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === 'Male' && styles.genderTextActive,
                ]}
              >
                Male
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setGender('Female');
                setGenderError('');
              }}
              disabled={isLoading}
              style={[
                styles.genderBtn,
                gender === 'Female' && styles.genderBtnActive,
                isLoading && styles.btnDisabled,
              ]}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === 'Female' && styles.genderTextActive,
                ]}
              >
                Female
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setGender('Other');
                setGenderError('');
              }}
              disabled={isLoading}
              style={[
                styles.genderBtn,
                gender === 'Other' && styles.genderBtnActive,
                isLoading && styles.btnDisabled,
              ]}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === 'Other' && styles.genderTextActive,
                ]}
              >
                Other
              </Text>
            </Pressable>
          </View>
          {genderError ? (
            <Text style={styles.errorText}>{genderError}</Text>
          ) : null}

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={[styles.submitBtn, isLoading && styles.btnDisabled]}
          >
            <Text style={styles.submitBtnText}>Complete Profile</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#9CA3AF',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
  },
  rewardBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  rewardText: {
    color: '#78350F',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  rewardHighlight: {
    fontWeight: '800',
    color: '#F59E0B',
  },
  label: {
    color: '#D1D5DB',
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#0F172A',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 15,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1F2937',
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  genderBtnActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#1F2937',
  },
  genderText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 14,
  },
  genderTextActive: {
    color: '#7C3AED',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 56,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#334155',
    marginBottom: 20,
    paddingLeft: 9,
  },
  submitBtn: {
    marginTop: 24,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  skipBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  loaderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
});