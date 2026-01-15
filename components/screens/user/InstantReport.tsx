// components/screens/user/InstantReport.tsx
import React, { useMemo, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { ArrowLeft, Share2, Download } from 'lucide-react-native';
import { generateReportPdf, shareReportPdf } from '../../../utils/generateReportPdf';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  
  // ✅ Add safe area hook
  const insets = useSafeAreaInsets();

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

  const onDownloadReport = async () => {
    try {
      setIsGenerating(true);
      console.log('Download button pressed');
      
      const path = await generateReportPdf(data);
      console.log('PDF saved at:', path);
      
      setPdfPath(path);
      
      // Show friendly folder name
      const folderName = path.includes('/Documents/') ? 'Documents' : 
                        path.includes('/Download/') ? 'Downloads' : 'Files';
      
      Alert.alert(
        'Success! ✅',
        `PDF saved successfully to ${folderName} folder!\n\nYou can find it in your file manager.`,
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Open PDF',
            onPress: () => openPdf(path),
          },
        ]
      );
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert(
        'Error',
        `Failed to generate report PDF.\n\n${error.message || 'Please try again.'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const openPdf = async (path: string) => {
    try {
      console.log('Attempting to open PDF:', path);
      
      // Try opening with content:// URI for better compatibility
      const contentUri = path.startsWith('content://') 
        ? path 
        : `file://${path}`;
      
      const supported = await Linking.canOpenURL(contentUri);
      
      if (supported) {
        await Linking.openURL(contentUri);
      } else {
        // If can't open, show instructions to find it manually
        const folderName = path.includes('/Documents/') ? 'Documents' : 
                          path.includes('/Download/') ? 'Downloads' : 'Files';
        
        Alert.alert(
          'Open Manually',
          `Please open your File Manager app and navigate to the ${folderName} folder to view the PDF.\n\nFile name: ${path.split('/').pop()}`,
          [
            { text: 'OK' },
            {
              text: 'Install PDF Viewer',
              onPress: () => {
                Linking.openURL('https://play.google.com/store/apps/details?id=com.adobe.reader');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Open PDF error:', error);
      
      // Show where to find the file
      const fileName = path.split('/').pop() || 'MySehat_Report.pdf';
      const folderName = path.includes('/Documents/') ? 'Documents' : 
                        path.includes('/Download/') ? 'Downloads' : 'Files';
      
      Alert.alert(
        'Cannot Open PDF',
        `File saved successfully but cannot be opened automatically.\n\nPlease use your File Manager to open:\n${folderName}/${fileName}`,
        [{ text: 'OK' }]
      );
    }
  };

  const onShareReport = async () => {
    try {
      if (!pdfPath) {
        Alert.alert('Info', 'Please download the report first');
        return;
      }
      
      await shareReportPdf(pdfPath);
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share report');
    }
  };

  // ✅ Calculate dynamic bottom padding
  const scrollBottomPadding = -30 + (insets.bottom > 0 ? insets.bottom : 0);

  return (
    // ✅ Update SafeAreaView edges to include bottom
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#E5E7EB" />
        </Pressable>

        <Text style={styles.topTitle}>Report</Text>

        <Pressable onPress={onShareReport} disabled={!pdfPath}>
          <Share2 size={20} color={pdfPath ? "#E5E7EB" : "#4B5563"} />
        </Pressable>
      </View>

      {/* ✅ Use dynamic bottom padding */}
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}>
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
              isGenerating && styles.downloadBtnDisabled
            ]} 
            onPress={onDownloadReport}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Download size={18} color="#fff" />
            )}
            <Text style={styles.downloadText}>
              {isGenerating ? 'Generating PDF...' : 'Download Report'}
            </Text>
          </Pressable>

          {/* Success Message */}
          {pdfPath && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                ✅ PDF saved to {pdfPath.includes('/Documents/') ? 'Documents' : 'Files'} folder
              </Text>
              <Pressable onPress={() => openPdf(pdfPath)} style={styles.openBtn}>
                <Text style={styles.openBtnText}>Open PDF</Text>
              </Pressable>
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
  },

  scroll: {
    padding: 10,
    // ✅ paddingBottom is now applied dynamically via inline style
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
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
  },

  downloadText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  successBox: {
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },

  successText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },

  openBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },

  openBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});