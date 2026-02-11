// components/screens/user/ProfileScreen.tsx - FIXED: Sticky Save Button
/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  PermissionsAndroid,
  BackHandler,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
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
  Edit3,
  X,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
} from 'react-native-image-picker';
import {
  fetchMyProfile,
  updateProfile,
  clearError,
} from '../../../store/slices/memberSlice';
import { useApiErrorHandler } from '../../../hooks/useApiErrorHandler';

type Props = {
  navigation: any;
};

type GenderType = 'Male' | 'Female' | 'Other';

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const isMounted = useRef(true);
  const { executeApiCall } = useApiErrorHandler();

  const { user } = useSelector((state: RootState) => state.auth);
  const { myProfile, isLoadingProfile, isUpdatingProfile, profileUpdateError } =
    useSelector((state: RootState) => state.members);

  // 🎯 DYNAMIC CALCULATIONS FOR STICKY SAVE BUTTON
  const footerHeight = useMemo(() => {
    // Only calculate if in edit mode
    if (!isUpdatingProfile) {
      const BUTTON_HEIGHT = 16 * 2 + 16; // paddingVertical (16 * 2) + font height (16)
      const FOOTER_TOP_PADDING = 12;
      const FOOTER_BOTTOM_PADDING = 16;
      const safeAreaBottom = insets.bottom > 0 ? insets.bottom : 0;

      return (
        FOOTER_TOP_PADDING +
        BUTTON_HEIGHT +
        FOOTER_BOTTOM_PADDING +
        safeAreaBottom
      );
    }
    return 0;
  }, [insets.bottom, isUpdatingProfile]);

  // Calculate scroll content bottom padding
  const contentBottomPadding = useMemo(() => {
    return footerHeight + 20; // Extra 20px breathing room
  }, [footerHeight]);

  const NAME_REGEX = /^[a-zA-Z0-9. ]+$/;

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

  useEffect(() => {
    isMounted.current = true;
    console.log('📱 ProfileScreen: Component mounted');

    const loadProfile = async () => {
      await executeApiCall(() => dispatch(fetchMyProfile()).unwrap(), {
        showSuccessToast: false,
        showErrorToast: true,
        customErrorMessage: 'Failed to load profile',
      });
    };

    loadProfile();

    return () => {
      console.log('🧹 ProfileScreen: Unmounting...');
      isMounted.current = false;
    };
  }, [dispatch, executeApiCall]);

  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: ProfileScreen');

      if (isEditMode) {
        Alert.alert(
          'Discard Changes?',
          'Are you sure you want to go back? Any unsaved changes will be lost.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => {} },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                if (isMounted.current && navigation.canGoBack()) {
                  navigation.goBack();
                }
              },
            },
          ],
        );
        return true;
      }

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
  }, [navigation, isEditMode]);

  useEffect(() => {
    if (myProfile) {
      console.log('📝 Loading profile data into form:', myProfile.name);

      setFullName(myProfile.name);
      setEmail(myProfile.email || '');

      if (myProfile.profileImage) {
        if (
          myProfile.profileImage.startsWith('http://') ||
          myProfile.profileImage.startsWith('https://')
        ) {
          setAvatar(myProfile.profileImage);
        } else {
          const fullImageUrl = `https://app.mysehat.ai${myProfile.profileImage}`;
          setAvatar(fullImageUrl);
        }
      } else {
        setAvatar(null);
      }

      setGender(myProfile.gender as GenderType);

      if (myProfile.age) {
        const calculatedDOB = calculateDateFromAge(myProfile.age);
        setDateOfBirth(calculatedDOB);
      }
    }

    if (user?.mobile) {
      const displayMobile = user.mobile.startsWith('91')
        ? user.mobile.slice(2)
        : user.mobile;
      setMobile(displayMobile);
    }
  }, [myProfile, user]);

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
    console.log('⬅️ handleBack called');

    // ✅ Check if in edit mode
    if (isEditMode) {
      Alert.alert(
        'Discard Changes?',
        'Are you sure you want to go back? Any unsaved changes will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              if (isMounted.current && navigation.canGoBack()) {
                navigation.goBack();
              }
            },
          },
        ],
      );
      return; // ✅ Stop here if in edit mode
    }
    // ✅ Not in edit mode, go back directly
    try {
      if (isMounted.current && navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      console.log('❌ Navigation error:', error);
    }
  };

  const handleEditToggle = () => {
    if (!isMounted.current) return;

    if (isEditMode) {
      Alert.alert(
        'Discard Changes?',
        'Are you sure you want to cancel? Any unsaved changes will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              if (!isMounted.current) return;

              if (myProfile) {
                setFullName(myProfile.name);
                setEmail(myProfile.email || '');
                setGender(myProfile.gender as GenderType);
                if (myProfile.age) {
                  setDateOfBirth(calculateDateFromAge(myProfile.age));
                }
                if (myProfile.profileImage) {
                  const fullImageUrl = myProfile.profileImage.startsWith('http')
                    ? myProfile.profileImage
                    : `https://app.mysehat.ai${myProfile.profileImage}`;
                  setAvatar(fullImageUrl);
                } else {
                  setAvatar(null);
                }
              }
              setIsEditMode(false);
              setErrors({
                fullName: '',
                mobile: '',
                email: '',
                dateOfBirth: '',
              });
            },
          },
        ],
      );
    } else {
      setIsEditMode(true);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      console.log('📸 Requesting camera permission...');

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message:
            'MySehat needs access to your camera to take profile pictures.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Camera permission granted');
        return true;
      } else {
        console.log('❌ Camera permission denied');

        if (isMounted.current) {
          Alert.alert(
            'Permission Denied',
            'Camera permission is required to take photos. You can enable it later in your device settings.',
            [{ text: 'OK' }],
          );
        }
        return false;
      }
    } catch (err) {
      console.log('❌ Error requesting camera permission:', err);

      if (isMounted.current) {
        Alert.alert(
          'Error',
          'Failed to request camera permission. Please try again.',
        );
      }
      return false;
    }
  };

  const handleImageResponse = (response: ImagePickerResponse) => {
    if (!isMounted.current) return;

    if (response.didCancel) {
      console.log('User cancelled image picker');
      return;
    }

    if (response.errorCode) {
      console.log('ImagePicker Error:', response.errorMessage);
      Alert.alert(
        'Error',
        response.errorMessage || 'Failed to select image. Please try again.',
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
      handleImageResponse,
    );
  };

  const handleCameraPicker = async () => {
    console.log('📷 Attempting to open camera...');

    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      console.log('⚠️ Camera permission not granted, aborting');
      return;
    }

    console.log('✅ Permission granted, launching camera...');

    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        cameraType: 'front',
        saveToPhotos: false,
      },
      handleImageResponse,
    );
  };

  const handleAvatarPress = () => {
    if (!isEditMode) {
      Alert.alert(
        'Edit Mode Required',
        'Please enable edit mode to change your profile picture.',
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
              onPress: () => {
                if (isMounted.current) {
                  setAvatar(null);
                }
              },
            },
          ]
        : []),
    ]);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (!isMounted.current) return;

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
    } else if (!NAME_REGEX.test(fullName.trim())) {
      newErrors.fullName =
        'Name can only contain letters, numbers, period, and spaces';
      isValid = false;
    } else {
      newErrors.fullName = '';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Invalid email format';
      isValid = false;
    } else {
      newErrors.email = '';
    }

    if (!dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
      isValid = false;
    } else {
      const age = calculateAge(dateOfBirth);
      if (age < 1 || age > 120) {
        newErrors.dateOfBirth = 'Age must be between 1 and 120';
        isValid = false;
      } else {
        newErrors.dateOfBirth = '';
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, aborting save');
      return;
    }

    if (!validateForm()) {
      return;
    }

    const calculatedAge = dateOfBirth ? calculateAge(dateOfBirth) : undefined;

    let imageToSend: string | null = null;

    if (avatar) {
      if (avatar.startsWith('file://')) {
        imageToSend = avatar;
        console.log('📸 Sending new image file');
      } else if (
        avatar.startsWith('http://') ||
        avatar.startsWith('https://')
      ) {
        console.log('ℹ️ Image unchanged, not sending to backend');
        imageToSend = null;
      } else {
        imageToSend = avatar;
      }
    }

    console.log('💾 Saving profile...');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result = await executeApiCall(
      () =>
        dispatch(
          updateProfile({
            fullName: fullName.trim(),
            email: email.trim() || null,
            age: calculatedAge,
            gender: gender,
            profileImage: imageToSend,
          }),
        ).unwrap(),
      {
        showSuccessToast: false,
        showErrorToast: true,
        customErrorMessage: 'Failed to update profile',
        onSuccess: () => {
          if (!isMounted.current) return;
          console.log('✅ Profile updated successfully');
          setIsEditMode(false);
          setShowSuccessModal(true);
        },
      },
    );
  };

  const handleSuccessClose = () => {
    if (!isMounted.current) return;

    setShowSuccessModal(false);

    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      console.log('❌ Navigation error:', error);
    }
  };

  if (isLoadingProfile && !myProfile) {
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

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: isEditMode
              ? contentBottomPadding
              : 20 + (insets.bottom > 0 ? insets.bottom : 0),
          },
        ]}
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
              onChangeText={text => {
                if (isMounted.current) {
                  const filtered = text.replace(/[^a-zA-Z0-9. ]/g, '');
                  setFullName(filtered);
                  setErrors({ ...errors, fullName: '' });
                }
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
              onChangeText={text => {
                if (isMounted.current) {
                  setEmail(text);
                  setErrors({ ...errors, email: '' });
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={isEditMode && !isUpdatingProfile}
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
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
              onPress={() => {
                if (isMounted.current && isEditMode && !isUpdatingProfile) {
                  setShowDatePicker(true);
                }
              }}
              disabled={!isEditMode || isUpdatingProfile}
            >
              <Text
                style={[
                  styles.dateButtonText,
                  (!isEditMode || isUpdatingProfile) &&
                    styles.dateButtonTextDisabled,
                ]}
              >
                {dateOfBirth
                  ? `${dateOfBirth.toLocaleDateString(
                      'en-GB',
                    )} (Age: ${calculateAge(dateOfBirth)})`
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
              {(['Male', 'Female', 'Other'] as GenderType[]).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderButton,
                    gender === g && styles.genderButtonActive,
                    (!isEditMode || isUpdatingProfile) &&
                      styles.genderButtonDisabled,
                  ]}
                  onPress={() => {
                    if (isMounted.current && isEditMode && !isUpdatingProfile) {
                      setGender(g);
                    }
                  }}
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
        </View>
      </ScrollView>

      {/* 🎯 STICKY SAVE BUTTON AT BOTTOM - Only shown in edit mode */}
      {isEditMode && (
        <View
          style={[
            styles.stickyFooter,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 0 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.saveButton,
              isUpdatingProfile && styles.saveButtonDisabled,
            ]}
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
        </View>
      )}

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
              Your profile has been updated successfully!
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={handleSuccessClose}
            >
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
  content: {
    padding: 20,
    // paddingBottom is now dynamic - applied inline
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

  // 🎯 NEW: Sticky footer with solid background
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 20,
  },

  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
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
