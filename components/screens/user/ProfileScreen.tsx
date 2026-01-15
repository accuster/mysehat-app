// components/screens/user/ProfileScreen.tsx
/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  PermissionsAndroid,  // ✅ Required for camera permission
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import {
  ArrowLeft,
  Camera,
  User,
  Phone,
  Calendar,
  Mail,
  Save,
  CheckCircle2,
  Edit3,  // Pencil icon for edit mode
  X,      // Cancel icon
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import { updateProfile, clearError, fetchMembers } from '../../../store/slices/memberSlice';

type Props = {
  navigation: any;
};

type GenderType = 'Male' | 'Female' | 'Other';

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { members, isLoading, isUpdatingProfile, profileUpdateError } = useSelector(
    (state: RootState) => state.members
  );

  const superUser = members.find(
    member => member.userType === 'SuperUser' && member.id === user?.userId
  );

  // Form state
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [gender, setGender] = useState<GenderType>('Male');
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  
  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Validation errors
  const [errors, setErrors] = useState({
    fullName: '',
    mobile: '',
    email: '',
    dateOfBirth: '',
  });

  // Fetch members on mount
  useEffect(() => {
    dispatch(fetchMembers());
  }, [dispatch]);

  // Update form when superUser data loads
  useEffect(() => {
    if (superUser) {
      setFullName(superUser.name);
      setEmail(superUser.email || '');
      
      if (superUser.profileImage) {
        if (
          superUser.profileImage.startsWith('http://') ||
          superUser.profileImage.startsWith('https://')
        ) {
          setAvatar(superUser.profileImage);
        } else {
          const fullImageUrl = `https://sandbox.mysehat.ai${superUser.profileImage}`;
          setAvatar(fullImageUrl);
        }
      } else {
        setAvatar(null);
      }
      
      setGender(superUser.gender as GenderType);
      
      if (superUser.age) {
        const calculatedDOB = calculateDateFromAge(superUser.age);
        setDateOfBirth(calculatedDOB);
      }
    }
    
    if (user?.mobile) {
      const displayMobile = user.mobile.startsWith('91')
        ? user.mobile.slice(2)
        : user.mobile;
      setMobile(displayMobile);
    }
  }, [superUser, user, members]);

  // Handle errors
  useEffect(() => {
    if (profileUpdateError) {
      Alert.alert('Update Failed', profileUpdateError, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [profileUpdateError, dispatch]);

  function calculateDateFromAge(age: number): Date {
    const today = new Date();
    const birthYear = today.getFullYear() - age;
    return new Date(birthYear, today.getMonth(), today.getDate());
  }

  const calculateAge = (dob: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Canceling edit mode
      Alert.alert(
        'Discard Changes?',
        'Are you sure you want to cancel? Any unsaved changes will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              // Reload original data
              if (superUser) {
                setFullName(superUser.name);
                setEmail(superUser.email || '');
                setGender(superUser.gender as GenderType);
                if (superUser.age) {
                  setDateOfBirth(calculateDateFromAge(superUser.age));
                }
                if (superUser.profileImage) {
                  const fullImageUrl = superUser.profileImage.startsWith('http')
                    ? superUser.profileImage
                    : `https://sandbox.mysehat.ai${superUser.profileImage}`;
                  setAvatar(fullImageUrl);
                } else {
                  setAvatar(null);
                }
              }
              setIsEditMode(false);
              setErrors({ fullName: '', mobile: '', email: '', dateOfBirth: '' });
            },
          },
        ]
      );
    } else {
      // Entering edit mode
      Alert.alert('Edit Profile', 'You can now edit your profile information.', [
        { text: 'OK', onPress: () => setIsEditMode(true) },
      ]);
    }
  };

  // ============================================================================
  // ✅ Camera Permission Request (Required for Android)
  // ============================================================================
  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true; // iOS handles permissions automatically
    }

    try {
      console.log('📸 Requesting camera permission...');

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'MySehat needs access to your camera to take profile pictures.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Camera permission granted');
        return true;
      } else {
        console.log('❌ Camera permission denied');
        Alert.alert(
          'Permission Denied',
          'Camera permission is required to take photos. You can enable it later in your device settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (err) {
      console.error('❌ Error requesting camera permission:', err);
      Alert.alert('Error', 'Failed to request camera permission. Please try again.');
      return false;
    }
  };

  const handleImageResponse = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      console.log('User cancelled image picker');
      return;
    }

    if (response.errorCode) {
      console.error('ImagePicker Error:', response.errorMessage);
      Alert.alert(
        'Error',
        response.errorMessage || 'Failed to select image. Please try again.'
      );
      return;
    }

    if (response.assets && response.assets[0]) {
      const imageUri = response.assets[0].uri;
      if (imageUri) {
        console.log('✅ Image selected:', imageUri);
        setAvatar(imageUri);
      }
    }
  };

  const handleGalleryPicker = () => {
    console.log('📸 Opening Gallery...');
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        selectionLimit: 1,
      },
      handleImageResponse
    );
  };

  // ============================================================================
  // ✅ Camera Picker with Permission Check
  // ============================================================================
  const handleCameraPicker = async () => {
    console.log('📷 Attempting to open camera...');

    // Request permission first
    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      console.log('⚠️ Camera permission not granted, aborting');
      return; // User denied permission
    }

    console.log('✅ Permission granted, launching camera...');

    // Permission granted, launch camera
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        cameraType: 'front',
        saveToPhotos: false,
      },
      handleImageResponse
    );
  };

  const handleAvatarPress = () => {
    // Only allow photo change in edit mode
    if (!isEditMode) {
      Alert.alert(
        'Edit Mode Required',
        'Please enable edit mode to change your profile picture.'
      );
      return;
    }

    Alert.alert('Change Profile Picture', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: handleCameraPicker },
      { text: 'Choose from Gallery', onPress: handleGalleryPicker },
      ...(avatar
        ? [
            {
              text: 'Remove Photo',
              style: 'destructive' as const,
              onPress: () => setAvatar(null),
            },
          ]
        : []),
    ]);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      setErrors({ ...errors, dateOfBirth: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors = { fullName: '', mobile: '', email: '', dateOfBirth: '' };
    let isValid = true;

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      isValid = false;
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
      isValid = false;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Invalid email format';
      isValid = false;
    }

    if (!dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
      isValid = false;
    } else {
      const age = calculateAge(dateOfBirth);
      if (age < 1 || age > 120) {
        newErrors.dateOfBirth = 'Age must be between 1 and 120';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    try {
      const calculatedAge = dateOfBirth ? calculateAge(dateOfBirth) : undefined;

      const resultAction = await dispatch(
        updateProfile({
          fullName: fullName.trim(),
          email: email.trim() || null,
          age: calculatedAge,
          gender: gender,
          profileImage: avatar || null,
        })
      );

      if (updateProfile.fulfilled.match(resultAction)) {
        setIsEditMode(false);
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    handleBack();
  };

  const scrollBottomPadding = 20 + (insets.bottom > 0 ? insets.bottom : 0);

  if (isLoading && members.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#FAFAFA" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header with Edit/Cancel button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>

        {/* Edit/Cancel Toggle Button */}
        <TouchableOpacity
          onPress={handleEditToggle}
          style={styles.editButton}
          disabled={isUpdatingProfile}
        >
          {isEditMode ? (
            <X size={24} color="#EF4444" strokeWidth={2.5} />
          ) : (
            <Edit3 size={22} color="#10B981" strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <View style={styles.editModeBanner}>
          <Text style={styles.editModeText}>
            ✏️ Edit Mode - Make your changes and save
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            disabled={isUpdatingProfile || !isEditMode}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={48} color="#7C3AED" strokeWidth={2} />
              </View>
            )}
            {/* Only show camera icon in edit mode */}
            {isEditMode && (
              <View style={styles.cameraIcon}>
                <Camera size={18} color="#FAFAFA" strokeWidth={2.5} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarHint}>
            {isEditMode ? 'Tap to change photo' : 'Profile picture'}
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelRow}>
              <User size={18} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.label}>Full Name *</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                errors.fullName && styles.inputError,
                !isEditMode && styles.inputDisabled,
              ]}
              placeholder="Enter your full name"
              placeholderTextColor="#71717A"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setErrors({ ...errors, fullName: '' });
              }}
              editable={isEditMode && !isUpdatingProfile}
            />
            {errors.fullName ? (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            ) : null}
          </View>

          {/* Mobile Number (Always Read-Only) */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelRow}>
              <Phone size={18} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.label}>Mobile Number *</Text>
            </View>
            <View style={styles.mobileInputContainer}>
              <View style={styles.countryCodeBox}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <View style={[styles.mobileInput, styles.mobileInputDisabled]}>
                <Text style={styles.mobileInputText}>{mobile}</Text>
              </View>
            </View>
            <Text style={styles.hintText}>Mobile number cannot be changed</Text>
          </View>

          {/* Email */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelRow}>
              <Mail size={18} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.label}>Email</Text>
              <Text style={styles.optionalText}>(Optional)</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                errors.email && styles.inputError,
                !isEditMode && styles.inputDisabled,
              ]}
              placeholder="Enter your email"
              placeholderTextColor="#71717A"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrors({ ...errors, email: '' });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={isEditMode && !isUpdatingProfile}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Date of Birth */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelRow}>
              <Calendar size={18} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.label}>Date of Birth *</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.dateButton,
                errors.dateOfBirth && styles.inputError,
                (!isEditMode || isUpdatingProfile) && styles.dateButtonDisabled,
              ]}
              onPress={() => isEditMode && !isUpdatingProfile && setShowDatePicker(true)}
              disabled={!isEditMode || isUpdatingProfile}
            >
              <Text
                style={[
                  styles.dateButtonText,
                  (!isEditMode || isUpdatingProfile) && styles.dateButtonTextDisabled,
                ]}
              >
                {dateOfBirth
                  ? `${dateOfBirth.toLocaleDateString('en-GB')} (Age: ${calculateAge(
                      dateOfBirth
                    )})`
                  : 'Select date of birth'}
              </Text>
              <Calendar size={20} color="#A1A1AA" strokeWidth={2.5} />
            </TouchableOpacity>
            {errors.dateOfBirth ? (
              <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
            ) : null}
          </View>

          {/* Gender */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Gender *</Text>
            <View style={styles.genderRow}>
              {(['Male', 'Female', 'Other'] as GenderType[]).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderButton,
                    gender === g && styles.genderButtonActive,
                    (!isEditMode || isUpdatingProfile) && styles.genderButtonDisabled,
                  ]}
                  onPress={() => isEditMode && !isUpdatingProfile && setGender(g)}
                  disabled={!isEditMode || isUpdatingProfile}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      gender === g && styles.genderButtonTextActive,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save Button - Only shown in edit mode */}
          {isEditMode && (
            <TouchableOpacity
              style={[styles.saveButton, isUpdatingProfile && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? (
                <>
                  <ActivityIndicator color="#FAFAFA" />
                  <Text style={[styles.saveButtonText, { marginLeft: 10 }]}>
                    Updating...
                  </Text>
                </>
              ) : (
                <>
                  <Save size={20} color="#FAFAFA" strokeWidth={2.5} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && isEditMode && !isUpdatingProfile && (
        <DateTimePicker
          value={dateOfBirth || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={48} color="#10B981" strokeWidth={2.5} />
              </View>
            </View>
            <Text style={styles.successTitle}>Profile Updated</Text>
            <Text style={styles.successMessage}>
              Your profile updated successfully!
            </Text>
            <TouchableOpacity style={styles.successButton} onPress={handleSuccessClose}>
              <Text style={styles.successButtonText}>Okay, Thanks</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#A1A1AA',
    fontSize: 15,
    fontWeight: '600',
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
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  editModeBanner: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#059669',
  },
  editModeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#7C3AED',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#18181B',
    borderWidth: 3,
    borderColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0A0A0A',
  },
  avatarHint: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600',
  },
  form: {
    gap: 20,
  },
  fieldContainer: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '700',
  },
  optionalText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 14,
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  inputDisabled: {
    backgroundColor: '#09090B',
    opacity: 0.7,
    color: '#A1A1AA',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  hintText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  mobileInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  countryCodeBox: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  countryCodeText: {
    color: '#A1A1AA',
    fontSize: 15,
    fontWeight: '700',
  },
  mobileInput: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272A',
    justifyContent: 'center',
  },
  mobileInputDisabled: {
    backgroundColor: '#18181B',
    opacity: 0.6,
  },
  mobileInputText: {
    color: '#A1A1AA',
    fontSize: 15,
    fontWeight: '500',
  },
  dateButton: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  dateButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#09090B',
  },
  dateButtonText: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '500',
  },
  dateButtonTextDisabled: {
    color: '#A1A1AA',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  genderButtonDisabled: {
    opacity: 0.6,
  },
  genderButtonText: {
    color: '#A1A1AA',
    fontSize: 15,
    fontWeight: '700',
  },
  genderButtonTextActive: {
    color: '#18181B',
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '800',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FAFAFA',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 14,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#10B981',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: '100%',
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});