// components/screens/user/InstantReport.tsx - FIXED: Sticky Download Button
import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  BackHandler,
  Animated,
} from 'react-native';
import { ArrowLeft, Share2, Download } from 'lucide-react-native';
import {
  generateReportPdf,
  shareReportPdf,
} from '../../../utils/generateReportPdf';
import { showDownloadNotification } from '../../../utils/notificationService';
import ErrorToast from '../../common/ErrorToast';
import { useErrorToast } from '../../../hooks/useErrorToast';

export type ReportData = {
  timestamp: string;
  reportId: string;
  patientName: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  heightCm: number;
  weightKg: number;
  bmi: number;
  bmiStatus: string;
  idealWeightKg: number;
  bodyFatPct: number;
  fatMassKg: number;
  leanBodyMassKg: number;
  healthScore: number;
};

type Props = {
  route: { params: { data: ReportData } };
  navigation: any;
};

function formatGender(g: ReportData['gender']) {
  if (g === 'M') return 'Male';
  if (g === 'F') return 'Female';
  return 'Other';
}

export default function InstantReport({ route, navigation }: Props) {
  const { data } = route.params;

  const isMounted = useRef(true);
  const isGeneratingRef = useRef(false);

  const { toast, showError, showSuccess, showWarning, hideToast } = useErrorToast();
  const shareBlinkAnim = useRef(new Animated.Value(1)).current;

  const [isGenerating, setIsGenerating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const insets = useSafeAreaInsets();

  // 🎯 DYNAMIC CALCULATIONS FOR STICKY DOWNLOAD BUTTON
  const footerHeight = useMemo(() => {
    const BUTTON_HEIGHT = 14 * 2 + 15; // paddingVertical (14 * 2) + font height (15)
    const FOOTER_TOP_PADDING = 12;
    const FOOTER_BOTTOM_PADDING = 16;
    const safeAreaBottom = insets.bottom > 0 ? insets.bottom : 0;
    
    return (
      FOOTER_TOP_PADDING +
      BUTTON_HEIGHT +
      FOOTER_BOTTOM_PADDING +
      safeAreaBottom
    );
  }, [insets.bottom]);

  // Calculate scroll content bottom padding
  const contentBottomPadding = useMemo(() => {
    return footerHeight + 20; // Extra 20px breathing room
  }, [footerHeight]);

  useEffect(() => {
    isMounted.current = true;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 InstantReport: Component mounted');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🧹 InstantReport: Unmounting...');

      if (isGeneratingRef.current) {
        console.log(
          '⚠️ CRITICAL: Component unmounting during PDF generation!',
        );
        console.log(
          '⚠️ All state updates will be blocked by isMounted checks',
        );
      }

      isMounted.current = false;
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    };
  }, []);

  const handleBack = useCallback(() => {
    console.log('⬅️ handleBack called');

    if (isGenerating || isSharing) {
      console.log('⚠️ Cannot navigate back - PDF is generating/sharing');
      showWarning('PDF is being processed. Please wait for it to complete.');
      return;
    }

    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, aborting navigation');
      return;
    }

    try {
      if (navigation.canGoBack()) {
        console.log('✅ Navigating back safely');
        navigation.goBack();
      } else {
        console.log('⚠️ Cannot go back - no previous screen');
      }
    } catch (error) {
      console.log('❌ Navigation error:', error);
    }
  }, [navigation, isGenerating, isSharing, showWarning]);

  useEffect(() => {
    console.log('✅ Setting up BackHandler for InstantReport');

    const backAction = () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⬅️ HARDWARE BACK PRESSED: InstantReport');
      console.log('Current state:', {
        isGenerating,
        isSharing,
        isGeneratingRef: isGeneratingRef.current,
        isMounted: isMounted.current,
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (isGenerating || isSharing) {
        console.log('🚫 BLOCKED: Cannot go back while processing PDF');
        return true;
      }

      handleBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    console.log('✅ BackHandler registered successfully');

    return () => {
      console.log('🧹 Removing BackHandler');
      backHandler.remove();
    };
  }, [isGenerating, isSharing, handleBack]);

  const summaryRows = useMemo(
    () => [
      { label: 'Height', value: `${data.heightCm} cm` },
      { label: 'Weight', value: `${data.weightKg} kg` },
      { label: 'BMI', value: `${data.bmi}` },
      { label: 'BMI Status', value: data.bmiStatus },
      { label: 'Ideal Weight', value: `${data.idealWeightKg} kg` },
      { label: 'Body Fat %', value: `${data.bodyFatPct}%` },
      { label: 'Fat Mass', value: `${data.fatMassKg} kg` },
      { label: 'Lean Body Mass', value: `${data.leanBodyMassKg} kg` },
      { label: 'Health Score', value: `${data.healthScore}/100` },
    ],
    [data],
  );

  const triggerShareBlink = () => {
    Animated.sequence([
      Animated.timing(shareBlinkAnim, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(shareBlinkAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(shareBlinkAnim, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(shareBlinkAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onShareReport = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Share Report: Started (Generate PDF + Share)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted, aborting share');
        return;
      }

      triggerShareBlink();

      console.log('🔄 Setting isSharing = true');
      setIsSharing(true);

      console.log('📝 Step 1: Generating PDF...');
      const generatedPath = await generateReportPdf(data);

      if (!isMounted.current) {
        console.log('⚠️ Component unmounted during PDF generation');
        console.log('⚠️ PDF was saved at:', generatedPath);
        setIsSharing(false);
        return;
      }

      console.log('✅ PDF generated successfully:', generatedPath);

      setPdfPath(generatedPath);

      console.log('🔄 Setting isSharing = false (before opening share dialog)');
      setIsSharing(false);

      await new Promise<void>(resolve => setTimeout(resolve, 100));

      console.log('📤 Step 2: Opening share dialog for PDF...');
      await shareReportPdf(generatedPath);

      console.log('✅ Share dialog opened/closed successfully');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Share Report: Completed Successfully');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error: any) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ Share Report: FAILED');
      console.log('Error:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (isMounted.current) {
        showError(`Failed to generate/share PDF.\n\n${error.message || 'Please try again.'}`);
        setIsSharing(false);
      } else {
        console.log('⚠️ Component unmounted, skipping error toast');
      }
    }
  };

  const onDownloadReport = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 Download Report: Started');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted, aborting download');
        return;
      }

      console.log('🔄 Setting isGenerating = true');
      setIsGenerating(true);
      isGeneratingRef.current = true;

      console.log('📝 Calling generateReportPdf...');
      const path = await generateReportPdf(data);

      if (!isMounted.current) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️ COMPONENT UNMOUNTED DURING PDF GENERATION!');
        console.log('⚠️ Aborting all state updates and alerts');
        console.log('⚠️ PDF was saved at:', path);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        isGeneratingRef.current = false;

        console.log('🔔 Showing notification for unmounted component');
        await showDownloadNotification(path);

        return;
      }

      console.log('✅ PDF generated successfully:', path);
      console.log('✅ Component still mounted, safe to update state');

      setPdfPath(path);

      console.log('📢 Showing success toast');
      showSuccess('PDF saved successfully!');

      console.log('🔄 Setting isGenerating = false (before opening PDF)');
      setIsGenerating(false);
      isGeneratingRef.current = false;

      console.log('⏳ Waiting 100ms for UI to update...');
      await new Promise<void>(resolve => setTimeout(resolve, 100));

      console.log('🔔 Showing system notification and opening PDF');
      await showDownloadNotification(path);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Download Report: Completed Successfully');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error: any) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ Download Report: FAILED');
      console.log('Error:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (isMounted.current) {
        showError(`Failed to generate PDF.\n\n${error.message || 'Please try again.'}`);
      } else {
        console.log('⚠️ Component unmounted, skipping error toast');
      }
    } finally {
      if (isMounted.current) {
        console.log('🔄 Final cleanup: Setting isGenerating = false');
        setIsGenerating(false);
        isGeneratingRef.current = false;
      } else {
        console.log('⚠️ Component unmounted, skipping state reset');
        isGeneratingRef.current = false;
      }
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ErrorToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
        action={toast.action}
      />

      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          disabled={isGenerating || isSharing}
          style={[
            styles.backButton,
            (isGenerating || isSharing) && styles.disabledButton,
          ]}
        >
          <ArrowLeft
            size={24}
            color={isGenerating || isSharing ? '#4B5563' : '#E5E7EB'}
          />
        </Pressable>

        <Text style={styles.topTitle}>Report</Text>

        <Animated.View style={{ opacity: shareBlinkAnim }}>
          <Pressable
            onPress={onShareReport}
            disabled={isGenerating || isSharing}
            style={[
              styles.shareButton,
              (isGenerating || isSharing) && styles.disabledButton,
            ]}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#E5E7EB" />
            ) : (
              <Share2
                size={20}
                color={isGenerating || isSharing ? '#4B5563' : '#E5E7EB'}
              />
            )}
          </Pressable>
        </Animated.View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: contentBottomPadding },
        ]}
        scrollEnabled={!isGenerating && !isSharing}
      >
        <View style={styles.card}>
          <Text style={styles.brand}>MySehat.ai</Text>
          <Text style={styles.heading}>Body Composition Report</Text>

          <View style={styles.metaGrid}>
            <Meta label="Timestamp" value={data.timestamp} />
            <Meta label="Report ID" value={data.reportId} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Patient</Text>
            <Text style={styles.patientName}>{data.patientName}</Text>
            <Text style={styles.patientMeta}>
              {data.age} / {formatGender(data.gender)}
            </Text>

            <View style={styles.badges}>
              <Badge text={`BMI: ${data.bmi}`} />
              <Badge text={data.bmiStatus} />
              <Text style={styles.score}>
                Health Score:{' '}
                <Text style={styles.scoreValue}>{data.healthScore}/100</Text>
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Main Report</Text>

          <View style={styles.table}>
            {summaryRows.map((row, idx) => (
              <View
                key={row.label}
                style={[styles.row, idx % 2 === 1 && styles.rowAlt]}
              >
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.disclaimer}>
            Disclaimer: This report is for informational purposes only and does
            not replace professional medical advice.
          </Text>

          {(isGenerating || isSharing) && (
            <View style={styles.generatingOverlay}>
              <View style={styles.generatingCard}>
                <ActivityIndicator size="large" color="#111827" />
                <Text style={styles.generatingText}>
                  {isSharing ? 'Preparing to Share...' : 'Generating PDF...'}
                </Text>
                <Text style={styles.generatingSubtext}>
                  Please don't press back
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 🎯 STICKY DOWNLOAD BUTTON AT BOTTOM */}
      <View
        style={[
          styles.stickyFooter,
          // eslint-disable-next-line react-native/no-inline-styles
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 0 }
        ]}
      >
        <Pressable
          style={[
            styles.downloadBtn,
            (isGenerating || isSharing) && styles.downloadBtnDisabled,
          ]}
          onPress={onDownloadReport}
          disabled={isGenerating || isSharing}
        >
          {isGenerating ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.downloadText}>Generating PDF...</Text>
            </>
          ) : (
            <>
              <Download size={18} color="#fff" />
              <Text style={styles.downloadText}>Download Report</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaBox}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },

  topTitle: {
    color: '#E5E7EB',
    fontWeight: '700',
    fontSize: 18,
  },
  backButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.4,
  },

  scroll: {
    padding: 10,
    // paddingBottom is now dynamic - applied inline
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    position: 'relative',
  },

  brand: {
    fontSize: 12,
    color: '#6B7280',
  },

  heading: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    color: '#111827',
  },

  metaGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },

  metaBox: {
    flex: 1,
    backgroundColor: '#F4F4F5',
    borderRadius: 12,
    padding: 10,
  },

  metaLabel: {
    fontSize: 11,
    color: '#6B7280',
  },

  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },

  section: {
    marginTop: 16,
  },

  sectionLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  patientName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },

  patientMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },

  badge: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F9FAFB',
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  score: {
    marginLeft: 'auto',
    fontSize: 11,
    color: '#6B7280',
  },

  scoreValue: {
    fontWeight: '800',
    color: '#111827',
  },

  sectionTitle: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },

  rowAlt: {
    backgroundColor: '#F9FAFB',
  },

  rowLabel: {
    fontSize: 13,
    color: '#374151',
  },

  rowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },

  disclaimer: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 12,
    lineHeight: 16,
  },

  // 🎯 NEW: Sticky footer with solid background
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#020617',
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 20,
  },

  downloadBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  downloadBtnDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.7,
  },

  downloadText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  generatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },

  generatingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  generatingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },

  generatingSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
});