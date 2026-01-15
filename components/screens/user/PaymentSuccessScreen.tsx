// components/screens/user/PaymentSuccessScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { X, Share2, Download, HelpCircle } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "../../../store/hook";
import { fetchReportById } from "../../../store/slices/reportSlice";

export default function PaymentSuccessScreen({ navigation, route }: any) {
  const dispatch = useAppDispatch();
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  
  // ✅ DEBUG: Log everything from route params
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 PaymentSuccessScreen RENDER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Route params:', JSON.stringify(route.params, null, 2));
  
  const {
    amountLabel = "₹199",
    refNumber = "N/A",
    paymentTime = new Date().toLocaleString(),
    paymentMethod = "Razorpay",
    senderName = "User",
    reportId, // ✅ This comes from PayScreen
    paymentId,
  } = route.params || {};

  console.log('Extracted values:');
  console.log('  amountLabel:', amountLabel);
  console.log('  refNumber:', refNumber);
  console.log('  reportId:', reportId);
  console.log('  paymentId:', paymentId);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Get report from Redux store
  const { selectedReport, isLoading, error } = useAppSelector((state) => state.reports);

  console.log('Redux state:');
  console.log('  selectedReport:', selectedReport ? 'EXISTS' : 'NULL');
  console.log('  isLoading:', isLoading);
  console.log('  error:', error);

  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 PaymentSuccessScreen useEffect TRIGGERED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Report ID from params:', reportId);
    console.log('Payment ID from params:', paymentId);
    
    // Fetch report data if reportId is provided
    if (reportId) {
      console.log('✅ reportId exists, fetching report data...');
      console.log('🔄 Fetching report data for:', reportId);
      setIsFetchingReport(true);
      
      dispatch(fetchReportById(reportId))
        .unwrap()
        .then((fetchedReport) => {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ Report fetched successfully!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('Fetched report:', JSON.stringify(fetchedReport, null, 2));
          setIsFetchingReport(false);
        })
        .catch((err) => {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('❌ Failed to fetch report');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('Error:', err);
          setIsFetchingReport(false);
          Alert.alert(
            'Error',
            'Failed to load report data. You can try viewing it from the Reports tab.',
            [{ text: 'OK' }]
          );
        });
    } else {
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.warn('⚠️ No reportId provided to PaymentSuccessScreen');
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.warn('Full route.params:', route.params);
    }
  }, [reportId, dispatch]);

  const onViewReport = () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👆 View Report button clicked');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('selectedReport state:', selectedReport ? 'EXISTS' : 'NULL');
    
    if (!selectedReport) {
      console.error('❌ selectedReport is null!');
      Alert.alert(
        'Report Not Available',
        'Please wait while we fetch your report data, or try again from the Reports tab.',
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('📊 Navigating to Report screen');
    console.log('Selected report structure:', JSON.stringify(selectedReport, null, 2));
    
    // Transform database structure to InstantReport format
    try {
      const reportData = {
        timestamp: new Date(selectedReport.report_date || selectedReport.created_at).toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        reportId: selectedReport.report_id,
        // ✅ Handle both nested and flat structures
        patientName: (selectedReport as any).user_details?.name || selectedReport.user_name || 'Unknown',
        age: (selectedReport as any).user_details?.age || selectedReport.age || 0,
        gender: ((selectedReport as any).user_details?.gender || selectedReport.gender || 'M') as 'M' | 'F' | 'O',
        heightCm: selectedReport.vitals.height,
        weightKg: selectedReport.vitals.weight,
        bmi: selectedReport.vitals.bmi,
        bmiStatus: selectedReport.vitals.bmi_status,
        idealWeightKg: selectedReport.vitals.ideal_weight,
        bodyFatPct: selectedReport.vitals.body_fat_pct,
        fatMassKg: selectedReport.vitals.fat_mass,
        leanBodyMassKg: selectedReport.vitals.lean_body_mass,
        healthScore: selectedReport.vitals.health_score,
      };

      console.log('✅ Transformed report data:', JSON.stringify(reportData, null, 2));

      navigation.navigate("Report", {
        data: reportData,
      });
    } catch (transformError) {
      console.error('❌ Error transforming report data:', transformError);
      Alert.alert('Error', 'Failed to prepare report data');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.popToTop()}>
          <X size={22} color="#CBD5E1" />
        </Pressable>
        <Pressable>
          <Share2 size={20} color="#CBD5E1" />
        </Pressable>
      </View>

      {/* Main Card */}
      <View style={styles.card}>
        {/* Success Icon */}
        <View style={styles.iconWrap}>
          <Text style={styles.check}>✓</Text>
        </View>

        <Text style={styles.title}>Payment Success!</Text>
        <Text style={styles.subtitle}>
          Your payment has been successfully done.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.totalLabel}>Total Payment</Text>
        <Text style={styles.amount}>{amountLabel}</Text>

        {/* Info blocks - 2 COLUMN GRID */}
        <View style={styles.infoGrid}>
          <Info label="Ref Number" value={refNumber} />
          <Info label="Payment Time" value={paymentTime} />
          <Info label="Payment Method" value={paymentMethod} />
          <Info label="Sender Name" value={senderName} />
        </View>

        <View style={styles.divider} />

        {/* Receipt */}
        <Pressable style={styles.receiptRow}>
          <Download size={18} color="#E5E7EB" />
          <Text style={styles.receiptText}>Get PDF Receipt</Text>
        </Pressable>
      </View>

      {/* Support */}
      <Pressable
        style={styles.supportCard}
        onPress={() => navigation.navigate("Support")}
      >
        <HelpCircle size={20} color="#CBD5E1" />
        <View style={styles.supportTextWrap}>
          <Text style={styles.supportTitle}>Trouble With Your Payment?</Text>
          <Text style={styles.supportSubtitle}>Let us know on help center now!</Text>
        </View>
      </Pressable>

      {/* Bottom CTA */}
      <Pressable
        style={[
          styles.cta,
          (isFetchingReport || isLoading || !selectedReport) && styles.ctaDisabled
        ]}
        onPress={onViewReport}
        disabled={isFetchingReport || isLoading || !selectedReport}
      >
        {isFetchingReport || isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.ctaText}>Loading Report...</Text>
          </View>
        ) : (
          <Text style={styles.ctaText}>View Report</Text>
        )}
      </Pressable>

      {/* Error Message */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#1A2332",
    borderRadius: 20,
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },

  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#22C55E",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  check: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "#1E293B",
    marginVertical: 14,
  },

  totalLabel: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },

  amount: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 2,
  },

  // 2-COLUMN GRID LAYOUT
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },

  infoItem: {
    backgroundColor: "#0A1628",
    borderRadius: 10,
    padding: 12,
    paddingVertical: 10,
    flex: 1,
    minWidth: "47%",
  },

  infoLabel: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 3,
  },

  infoValue: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  receiptRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  receiptText: {
    color: "#E5E7EB",
    fontWeight: "600",
    fontSize: 13,
  },

  supportCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1A2332",
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
  },

  supportTextWrap: {
    flex: 1,
  },

  supportTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  supportSubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },

  cta: {
    backgroundColor: "#7C3AED",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: "auto",
  },

  ctaDisabled: {
    backgroundColor: "#475569",
  },

  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },

  errorText: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});