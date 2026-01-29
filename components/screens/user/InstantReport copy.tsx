// components/screens/user/InstantReport.tsx - WITH NOTIFICATIONS
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
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { ArrowLeft, Share2, Download } from 'lucide-react-native';
import {
  generateReportPdf,
  shareReportPdf,
} from '../../../utils/generateReportPdf';
import { showDownloadNotification } from '../../../utils/notificationService';

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

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  const insets = useSafeAreaInsets();

  // ✅ Setup and cleanup
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

  // ✅ Safe back navigation handler
  const handleBack = useCallback(() => {
    console.log('⬅️ handleBack called');

    if (isGenerating) {
      console.log('⚠️ Cannot navigate back - PDF is generating');
      Alert.alert(
        'Please Wait',
        'PDF is being generated. Please wait for it to complete.',
        [{ text: 'OK' }],
      );
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
  }, [navigation, isGenerating]);

  // ✅ Hardware back button handler
  useEffect(() => {
    console.log('✅ Setting up BackHandler for InstantReport');

    const backAction = () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⬅️ HARDWARE BACK PRESSED: InstantReport');
      console.log('Current state:', {
        isGenerating,
        isGeneratingRef: isGeneratingRef.current,
        isMounted: isMounted.current,
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (isGenerating) {
        console.log('🚫 BLOCKED: Cannot go back while generating PDF');
        Alert.alert(
          'PDF Generating',
          'Please wait for the PDF generation to complete before going back.',
          [{ text: 'OK' }],
        );
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
  }, [isGenerating, handleBack]);

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

  // ✅ Fixed download handler with NOTIFICATION
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

      // ✅ CRITICAL - Check if still mounted after async
      if (!isMounted.current) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️ COMPONENT UNMOUNTED DURING PDF GENERATION!');
        console.log('⚠️ Aborting all state updates and alerts');
        console.log('⚠️ PDF was saved at:', path);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        isGeneratingRef.current = false;

        // ✅ STILL SHOW NOTIFICATION even if unmounted!
        console.log('🔔 Showing notification for unmounted component');
        await showDownloadNotification(path);

        return;
      }

      console.log('✅ PDF generated successfully:', path);
      console.log('✅ Component still mounted, safe to update state');

      // ✅ Update state (only if mounted)
      setPdfPath(path);

      // ✅ Show Alert.alert (as requested)
      console.log('📢 Showing success alert');
      Alert.alert('Success! ✅', `PDF saved successfully!`, [
        { text: 'OK', style: 'default' },
      ]);

      // ✅ SHOW NOTIFICATION (after Alert)
      console.log('🔔 Showing system notification');
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
        Alert.alert(
          'Error',
          `Failed to generate PDF.\n\n${error.message || 'Please try again.'}`,
          [{ text: 'OK' }],
        );
      } else {
        console.log('⚠️ Component unmounted, skipping error alert');
      }
    } finally {
      if (isMounted.current) {
        console.log('🔄 Setting isGenerating = false');
        setIsGenerating(false);
        isGeneratingRef.current = false;
      } else {
        console.log('⚠️ Component unmounted, skipping state reset');
        isGeneratingRef.current = false;
      }
    }
  };

  // ✅ Fixed share handler
  const onShareReport = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Share Report: Started');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted, aborting share');
        return;
      }

      if (!pdfPath) {
        console.log('⚠️ No PDF path available');
        Alert.alert('Info', 'Please download the report first');
        return;
      }

      console.log('📤 Calling shareReportPdf with path:', pdfPath);
      await shareReportPdf(pdfPath);

      if (!isMounted.current) {
        console.log('⚠️ Component unmounted during share');
        return;
      }

      console.log('✅ Share completed successfully');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error: any) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ Share Report: FAILED');
      console.log('Error:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (isMounted.current) {
        Alert.alert('Error', 'Failed to share report. Please try again.');
      } else {
        console.log('⚠️ Component unmounted, skipping error alert');
      }
    }
  };

  const scrollBottomPadding = -30 + (insets.bottom > 0 ? insets.bottom : 0);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          disabled={isGenerating}
          // style={isGenerating && styles.disabledButton}
          style={[
            styles.backButton, // ✅ Base style
            isGenerating && styles.disabledButton, // ✅ Conditional style
          ]}
        >
          <ArrowLeft size={24} color={isGenerating ? '#4B5563' : '#E5E7EB'} />
        </Pressable>

        <Text style={styles.topTitle}>Report</Text>

        <Pressable
          onPress={onShareReport}
          disabled={!pdfPath || isGenerating}
          // style={(!pdfPath || isGenerating) && styles.disabledButton}
          style={[
            styles.shareButton, // ✅ Base style
            (!pdfPath || isGenerating) && styles.disabledButton, // ✅ Conditional
          ]}
        >
          <Share2
            size={20}
            color={pdfPath && !isGenerating ? '#E5E7EB' : '#4B5563'}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: scrollBottomPadding },
        ]}
        scrollEnabled={!isGenerating}
      >
        {/* Report Card */}
        <View style={styles.card}>
          {/* Header */}
          <Text style={styles.brand}>MySehat.ai</Text>
          <Text style={styles.heading}>Body Composition Report</Text>

          <View style={styles.metaGrid}>
            <Meta label="Timestamp" value={data.timestamp} />
            <Meta label="Report ID" value={data.reportId} />
          </View>

          {/* Patient */}
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

          {/* Main Report */}
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

          {/* Download Button */}
          <Pressable
            style={[
              styles.downloadBtn,
              isGenerating && styles.downloadBtnDisabled,
            ]}
            onPress={onDownloadReport}
            disabled={isGenerating}
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

          {/* Generating Overlay */}
          {isGenerating && (
            <View style={styles.generatingOverlay}>
              <View style={styles.generatingCard}>
                <ActivityIndicator size="large" color="#111827" />
                <Text style={styles.generatingText}>Generating PDF...</Text>
                <Text style={styles.generatingSubtext}>
                  Please don't press back
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Small Components ---------- */

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
    padding: 8, // Larger tap area
  },
  shareButton: {
    padding: 8, // Larger tap area
  },
  disabledButton: {
    opacity: 0.4,
  },

  scroll: {
    padding: 10,
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

  downloadBtn: {
    marginTop: 14,
    backgroundColor: '#111827',
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

  successBox: {
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
  },

  successText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  successSubtext: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
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
