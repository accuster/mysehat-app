/* eslint-disable react-native/no-inline-styles */
// components/screens/partner/PartnerReportPreview.tsx

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { BMIRecord } from '../../../utils/partnerStorage';

type Props = {
  route: { params: { record: BMIRecord } };
  navigation: any;
};

function formatGender(gender: string): string {
  const normalized = gender.toLowerCase();
  if (normalized === 'men' || normalized === 'male') return 'Male';
  if (normalized === 'women' || normalized === 'female') return 'Female';
  return 'Other';
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PartnerReportPreview({ route, navigation }: Props) {
  const { record } = route.params;

  const isMounted = useRef(true);
  const isGeneratingRef = useRef(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const insets = useSafeAreaInsets();
  const shareBlinkAnim = useRef(new Animated.Value(1)).current;

  // 🎯 DYNAMIC CALCULATIONS FOR STICKY DOWNLOAD BUTTON
  const footerHeight = useMemo(() => {
    const BUTTON_HEIGHT = 14 * 2 + 15;
    const FOOTER_TOP_PADDING = 12;
    const FOOTER_BOTTOM_PADDING = 16;
    const safeAreaBottom = insets.bottom > 0 ? insets.bottom : 0;
    
    return FOOTER_TOP_PADDING + BUTTON_HEIGHT + FOOTER_BOTTOM_PADDING + safeAreaBottom;
  }, [insets.bottom]);

  const contentBottomPadding = useMemo(() => {
    return footerHeight + 20;
  }, [footerHeight]);

  useEffect(() => {
    isMounted.current = true;
    console.log('📄 PartnerReportPreview: Component mounted');

    return () => {
      console.log('🧹 PartnerReportPreview: Unmounting...');
      isMounted.current = false;
    };
  }, []);

  const handleBack = useCallback(() => {
    console.log('⬅️ handleBack called');

    if (isGenerating || isSharing) {
      console.log('⚠️ Cannot navigate back - Processing...');
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
      }
    } catch (error) {
      console.log('❌ Navigation error:', error);
    }
  }, [navigation, isGenerating, isSharing]);

  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK PRESSED: PartnerReportPreview');

      if (isGenerating || isSharing) {
        console.log('🚫 BLOCKED: Cannot go back while processing');
        return true;
      }

      handleBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isGenerating, isSharing, handleBack]);

  const summaryRows = useMemo(
    () => [
      { label: 'Height', value: `${record.height} cm` },
      { label: 'Weight', value: `${record.weight} kg` },
      { label: 'BMI', value: record.bmi },
      { label: 'BMI Status', value: record.bmiStatus },
      { label: 'Ideal Weight', value: `${record.idealWeight} kg` },
      { label: 'Body Fat %', value: `${record.bodyFatPercentage}%` },
      { label: 'Fat Mass', value: `${record.fatMass} kg` },
      { label: 'Lean Body Mass', value: `${record.leanBodyMass} kg` },
      { label: 'Health Score', value: `${record.healthScore}/100` },
    ],
    [record],
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
    console.log('📤 Share Report: Started');
    
    try {
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted, aborting share');
        return;
      }

      triggerShareBlink();
      setIsSharing(true);

      // TODO: Implement PDF generation and sharing
      console.log('📝 Generating PDF for record:', record.id);
      
      // Placeholder - implement actual PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted during PDF generation');
        setIsSharing(false);
        return;
      }

      console.log('✅ Share functionality coming soon!');
      setIsSharing(false);

    } catch (error: any) {
      console.log('❌ Share Report: FAILED', error);
      if (isMounted.current) {
        setIsSharing(false);
      }
    }
  };

  const onDownloadReport = async () => {
    console.log('📥 Download Report: Started');

    try {
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted, aborting download');
        return;
      }

      setIsGenerating(true);
      isGeneratingRef.current = true;

      // TODO: Implement PDF generation
      console.log('📝 Generating PDF for record:', record.id);
      
      // Placeholder - implement actual PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (!isMounted.current) {
        console.log('⚠️ Component unmounted during PDF generation');
        isGeneratingRef.current = false;
        return;
      }

      console.log('✅ PDF generation functionality coming soon!');
      setIsGenerating(false);
      isGeneratingRef.current = false;

    } catch (error: any) {
      console.log('❌ Download Report: FAILED', error);
      if (isMounted.current) {
        setIsGenerating(false);
        isGeneratingRef.current = false;
      }
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
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

        <Text style={styles.topTitle}>Report Preview</Text>

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
            <Meta label="Timestamp" value={formatTimestamp(record.createdAt)} />
            <Meta label="Report ID" value={record.id} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Patient</Text>
            <Text style={styles.patientName}>{record.name}</Text>
            <Text style={styles.patientMeta}>
              {record.age} / {formatGender(record.gender)}
            </Text>
            <Text style={styles.patientContact}>📱 {record.mobile}</Text>

            <View style={styles.badges}>
              <Badge text={`BMI: ${record.bmi}`} />
              <Badge text={record.bmiStatus} />
              <Text style={styles.score}>
                Health Score:{' '}
                <Text style={styles.scoreValue}>{record.healthScore}/100</Text>
              </Text>
            </View>

            {/* Data Source Badge */}
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceText}>
                📊 Data Source: {record.dataSource === 'bluetooth' ? 'Bluetooth Device' : 'QR Code Scan'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Health Metrics</Text>

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
            not replace professional medical advice. Consult a healthcare provider
            for medical concerns.
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
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
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

  patientContact: {
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

  sourceBadge: {
    marginTop: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  sourceText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
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
    backgroundColor: '#10B981',
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
