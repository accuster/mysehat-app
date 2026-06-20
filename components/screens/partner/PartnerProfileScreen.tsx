// components/screens/partner/PartnerProfileScreen.tsx
// ✅ Partner Profile with Edit Mode, Organization Info & Password Change
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
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import {
  fetchPartnerProfile,
  updatePartnerProfile,
  clearProfileError,
} from '../../../store/slices/partnerSlice';
import {
  ArrowLeft,
  Camera,
  User,
  Phone,
  Mail,
  Save,
  CheckCircle2,
  Edit3,
  X,
  Building2,
  MapPin,
  Lock,
  Briefcase,
  FileText,
  DollarSign,
} from 'lucide-react-native';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
} from 'react-native-image-picker';
import { useApiErrorHandler } from '../../../hooks/useApiErrorHandler';
import { ADMIN_BASE_URL } from '../../../store/constant';

type Props = {
  navigation: any;
};

export default function PartnerProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const isMounted = useRef(true);
  const { executeApiCall } = useApiErrorHandler();

  // Redux state
  const { partner: partnerUser, isAuthenticated } = useAppSelector(
    state => state.partnerAuth,
  );
  const { profile, profileLoading, profileError } = useAppSelector(
    state => state.partner,
  );

  const NAME_REGEX = /^[a-zA-Z0-9. ]+$/;
  const MOBILE_REGEX = /^[0-9]{10}$/;

  // Form state - Personal Info
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // UI state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState({
    fullName: '',
    username: '',
    mobile: '',
  });

  // 🎯 DYNAMIC CALCULATIONS FOR STICKY SAVE BUTTON
  const footerHeight = useMemo(() => {
    if (isEditMode && !profileLoading) {
      const BUTTON_HEIGHT = 16 * 2 + 16;
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
  }, [insets.bottom, isEditMode, profileLoading]);

  const contentBottomPadding = useMemo(() => {
    return footerHeight + 20;
  }, [footerHeight]);

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD PROFILE ON MOUNT
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    isMounted.current = true;
    console.log('👤 PartnerProfileScreen: Component mounted');

    if (!isAuthenticated || !partnerUser) {
      console.log('🔒 Not authenticated - redirecting to Auth');
      navigation.replace('Auth');
      return;
    }

    const loadProfile = async () => {
      await executeApiCall(
        () => dispatch(fetchPartnerProfile(partnerUser.auth_id)).unwrap(),
        {
          showSuccessToast: false,
          showErrorToast: true,
          customErrorMessage: 'Failed to load profile',
        },
      );
    };

    loadProfile();

    return () => {
      console.log('🧹 PartnerProfileScreen: Unmounting...');
      isMounted.current = false;
    };
  }, [dispatch, executeApiCall, isAuthenticated, partnerUser, navigation]);

  // ─────────────────────────────────────────────────────────────────────────
  // LISTEN FOR AUTH STATE CHANGES
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated && isMounted.current) {
      console.log('🔒 Auth state changed - partner logged out, redirecting...');
      navigation.replace('Auth');
    }
  }, [isAuthenticated, navigation]);

  // ─────────────────────────────────────────────────────────────────────────
  // HARDWARE BACK BUTTON HANDLING
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: PartnerProfileScreen');

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

  // ─────────────────────────────────────────────────────────────────────────
  // POPULATE FORM FROM PROFILE DATA
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (profile) {
      console.log('📝 Loading profile data into form:', profile.username);

      setFullName(profile.owner_name || '');
      setUsername(profile.username || '');
      setEmail(profile.email || '');

      // Mobile number handling
      if (profile.org_phone) {
        let displayMobile = profile.org_phone;

        // Remove +91 prefix if present
        if (displayMobile.startsWith('+91')) {
          displayMobile = displayMobile.slice(3); // Remove '+91'
        } else if (displayMobile.startsWith('91')) {
          displayMobile = displayMobile.slice(2); // Remove '91'
        }
        console.log(
          '🔍 DEBUG - displayMobile after processing:',
          displayMobile,
        );
        setMobile(displayMobile);
        console.log('🔍 DEBUG - mobile state set to:', displayMobile);
      } else {
        console.log('⚠️ DEBUG - profile.org_phone is null/undefined');
      }

      // Profile image handling
      if (profile.org_image) {
        console.log(
          '🖼️ DEBUG - profile.org_image from API:',
          profile.org_image,
        );
        if (
          profile.org_image.startsWith('http://') ||
          profile.org_image.startsWith('https://')
        ) {
          console.log('🖼️ DEBUG - Using direct URL');
          setAvatar(profile.org_image);
        } else {
          const fullImageUrl = `${ADMIN_BASE_URL}${profile.org_image}`;
          console.log('🖼️ DEBUG - Built full URL:', fullImageUrl);
          setAvatar(fullImageUrl);
        }
      } else {
        console.log('⚠️ DEBUG - profile.org_image is null/undefined');
        setAvatar(null);
      }
    }
  }, [profile]);

  // ─────────────────────────────────────────────────────────────────────────
  // ERROR HANDLING
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (profileError) {
      Alert.alert('Update Failed', profileError, [
        { text: 'OK', onPress: () => dispatch(clearProfileError()) },
      ]);
    }
  }, [profileError, dispatch]);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleBack = () => {
    console.log('⬅️ handleBack called');

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
      return;
    }

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

              // Reset to original profile data
              if (profile) {
                setFullName(profile.owner_name || '');
                setUsername(profile.username || '');
                let displayMobile = profile.org_phone || '';

                // Remove +91 prefix if present
                if (displayMobile.startsWith('+91')) {
                  displayMobile = displayMobile.slice(3); // Remove '+91'
                } else if (displayMobile.startsWith('91')) {
                  displayMobile = displayMobile.slice(2); // Remove '91'
                }

                setMobile(displayMobile);

                if (profile.org_image) {
                  const fullImageUrl = profile.org_image.startsWith('http')
                    ? profile.org_image
                    : `${ADMIN_BASE_URL}${profile.org_image}`;
                  setAvatar(fullImageUrl);
                } else {
                  setAvatar(null);
                }
              }

              setIsEditMode(false);
              setErrors({
                fullName: '',
                username: '',
                mobile: '',
              });
            },
          },
        ],
      );
    } else {
      setIsEditMode(true);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // IMAGE PICKER
  // ─────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const newErrors = {
      fullName: '',
      username: '',
      mobile: '',
    };
    let isValid = true;

    // Full name validation
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
    }

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
      isValid = false;
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
      isValid = false;
    } else if (!NAME_REGEX.test(username.trim())) {
      newErrors.username =
        'Username can only contain letters, numbers, period, and spaces';
      isValid = false;
    }

    // Mobile validation
    if (!mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
      isValid = false;
    } else if (!MOBILE_REGEX.test(mobile.trim())) {
      newErrors.mobile = 'Mobile number must be exactly 10 digits';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE PROFILE
  // ─────────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!isMounted.current || !partnerUser) {
      console.log('⚠️ Component unmounted or no user, aborting save');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsUpdating(true);

    // Prepare image
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

    // Prepare update data
    const updateData: any = {
      full_name: fullName.trim(),
      username: username.trim(),
      mobile_number: mobile.trim(),
    };

    if (imageToSend) {
      updateData.profile_image = imageToSend;
    }

    console.log('💾 Saving profile...');

    const result = await executeApiCall(
      () =>
        dispatch(
          updatePartnerProfile({
            authId: partnerUser.auth_id,
            data: updateData,
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
          setIsUpdating(false);
          setShowSuccessModal(true);
        },
        onError: () => {
          if (isMounted.current) {
            setIsUpdating(false);
          }
        },
      },
    );

    if (!result && isMounted.current) {
      setIsUpdating(false);
    }
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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (profileLoading && !profile) {
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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER MAIN UI
  // ─────────────────────────────────────────────────────────────────────────

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
          disabled={isUpdating}
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
            disabled={isUpdating || !isEditMode}
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

        {/* Personal Information Section */}
        <View style={styles.section}>
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
                editable={isEditMode && !isUpdating}
              />
              {errors.fullName ? (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              ) : null}
            </View>

            {/* Username */}
            <View style={styles.fieldContainer}>
              <View style={styles.labelRow}>
                <Briefcase size={18} color="#10B981" strokeWidth={2.5} />
                <Text style={styles.label}>Username *</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  errors.username && styles.inputError,
                  !isEditMode && styles.inputDisabled,
                ]}
                placeholder="Enter your username"
                placeholderTextColor="#71717A"
                value={username}
                onChangeText={text => {
                  if (isMounted.current) {
                    const filtered = text.replace(/[^a-zA-Z0-9. ]/g, '');
                    setUsername(filtered);
                    setErrors({ ...errors, username: '' });
                  }
                }}
                editable={isEditMode && !isUpdating}
                autoCapitalize="none"
              />
              {errors.username ? (
                <Text style={styles.errorText}>{errors.username}</Text>
              ) : null}
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldContainer}>
              <View style={styles.labelRow}>
                <Phone size={18} color="#10B981" strokeWidth={2.5} />
                <Text style={styles.label}>Mobile Number *</Text>
              </View>
              <View style={styles.mobileInputContainer}>
                <View style={styles.countryCodeBox}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={[
                    styles.mobileInput,
                    errors.mobile && styles.inputError,
                    !isEditMode && styles.mobileInputDisabled,
                  ]}
                  placeholder="10-digit mobile"
                  placeholderTextColor="#71717A"
                  value={mobile}
                  onChangeText={text => {
                    if (isMounted.current) {
                      const filtered = text.replace(/[^0-9]/g, '').slice(0, 10);
                      setMobile(filtered);
                      setErrors({ ...errors, mobile: '' });
                    }
                  }}
                  keyboardType="phone-pad"
                  editable={isEditMode && !isUpdating}
                  maxLength={10}
                />
              </View>
              {errors.mobile ? (
                <Text style={styles.errorText}>{errors.mobile}</Text>
              ) : null}
            </View>

            {/* Email (Read-Only) */}
            <View style={styles.fieldContainer}>
              <View style={styles.labelRow}>
                <Mail size={18} color="#71717A" strokeWidth={2.5} />
                <Text style={[styles.label, { color: '#71717A' }]}>
                  Email
                </Text>
              </View>
              <View style={styles.readOnlyInputContainer}>
                <Lock size={16} color="#71717A" strokeWidth={2.5} />
                <Text style={styles.readOnlyInputText}>
                  {email || 'No email provided'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Organization Information Section */}
        {profile?.org_id && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Building2 size={20} color="#7C3AED" strokeWidth={2.5} />
              <Text style={styles.sectionTitle}>Organization Information</Text>
            </View>

            <View style={styles.orgCard}>
              {/* Organization Name */}
              {profile.org_name && (
                <View style={styles.orgInfoRow}>
                  <View style={styles.orgIconContainer}>
                    <Building2 size={18} color="#7C3AED" strokeWidth={2.5} />
                  </View>
                  <View style={styles.orgInfoContent}>
                    <Text style={styles.orgInfoLabel}>Organization</Text>
                    <Text style={styles.orgInfoValue}>{profile.org_name}</Text>
                  </View>
                </View>
              )}

              {/* Owner Name */}
              {profile.owner_name && (
                <View style={styles.orgInfoRow}>
                  <View style={styles.orgIconContainer}>
                    <User size={18} color="#7C3AED" strokeWidth={2.5} />
                  </View>
                  <View style={styles.orgInfoContent}>
                    <Text style={styles.orgInfoLabel}>Owner</Text>
                    <Text style={styles.orgInfoValue}>
                      {profile.owner_name}
                    </Text>
                  </View>
                </View>
              )}

              {/* Organization Phone */}
              {profile.org_phone && (
                <View style={styles.orgInfoRow}>
                  <View style={styles.orgIconContainer}>
                    <Phone size={18} color="#7C3AED" strokeWidth={2.5} />
                  </View>
                  <View style={styles.orgInfoContent}>
                    <Text style={styles.orgInfoLabel}>Contact</Text>
                    <Text style={styles.orgInfoValue}>{profile.org_phone}</Text>
                  </View>
                </View>
              )}

              {/* Location */}
              {profile.location && (
                <View style={styles.orgInfoRow}>
                  <View style={styles.orgIconContainer}>
                    <MapPin size={18} color="#7C3AED" strokeWidth={2.5} />
                  </View>
                  <View style={styles.orgInfoContent}>
                    <Text style={styles.orgInfoLabel}>Location</Text>
                    <Text style={styles.orgInfoValue}>
                      {profile.location}
                      {profile.city && `, ${profile.city}`}
                      {profile.state && `, ${profile.state}`}
                      {profile.pincode && ` - ${profile.pincode}`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Revenue Share */}
              {profile.revenue_share != null && (
                <View style={styles.orgInfoRow}>
                  <View style={styles.orgIconContainer}>
                    <DollarSign size={18} color="#10B981" strokeWidth={2.5} />
                  </View>
                  <View style={styles.orgInfoContent}>
                    <Text style={styles.orgInfoLabel}>Revenue Share</Text>
                    <Text style={[styles.orgInfoValue, { color: '#10B981' }]}>
                      {profile.revenue_share}%
                    </Text>
                  </View>
                </View>
              )}

              {/* PAN/GST */}
              {profile.pan_gst && (
                <View style={styles.orgInfoRow}>
                  <View style={styles.orgIconContainer}>
                    <FileText size={18} color="#7C3AED" strokeWidth={2.5} />
                  </View>
                  <View style={styles.orgInfoContent}>
                    <Text style={styles.orgInfoLabel}>PAN/GST</Text>
                    <Text style={styles.orgInfoValue}>{profile.pan_gst}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
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
            style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isUpdating}
          >
            {isUpdating ? (
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
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FAFAFA',
    letterSpacing: 0.3,
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
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  mobileInputDisabled: {
    backgroundColor: '#09090B',
    opacity: 0.7,
    color: '#A1A1AA',
  },
  readOnlyInputContainer: {
    backgroundColor: '#09090B',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    opacity: 0.7,
  },
  readOnlyInputText: {
    color: '#71717A',
    fontSize: 15,
    fontWeight: '500',
  },
  orgCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 16,
  },
  orgInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  orgIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orgInfoContent: {
    flex: 1,
  },
  orgInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717A',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orgInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
    lineHeight: 20,
  },
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
