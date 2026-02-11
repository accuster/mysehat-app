// components/screens/user/PaymentSuccessScreen.tsx - FIXED: Sticky View Report Button
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  BackHandler,
  ScrollView,
} from 'react-native';
import { X, Share2, Download, HelpCircle } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import { fetchReportById } from '../../../store/slices/reportSlice';
import ErrorToast from '../../common/ErrorToast';
import { useErrorToast } from '../../../hooks/useErrorToast';

export default function PaymentSuccessScreen({ navigation, route }: any) {
  const dispatch = useAppDispatch();
  
  const isMounted = useRef(true);
  const { toast, showError, showWarning, hideToast } = useErrorToast();
  
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  
  const insets = useSafeAreaInsets();

  // 🎯 DYNAMIC CALCULATIONS FOR STICKY BUTTON
  const footerHeight = useMemo(() => {
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
  }, [insets.bottom]);

  // Calculate scroll content bottom padding
  const contentBottomPadding = useMemo(() => {
    return footerHeight + 20; // Extra 20px breathing room
  }, [footerHeight]);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 PaymentSuccessScreen RENDER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Route params:', JSON.stringify(route.params, null, 2));
  
  const {
    amountLabel = '₹199',
    refNumber = 'N/A',
    paymentTime = new Date().toLocaleString(),
    paymentMethod = 'Online Payment',
    senderName = 'User',
    reportId,
    paymentId,
  } = route.params || {};

  console.log('Extracted values:');
  console.log('  amountLabel:', amountLabel);
  console.log('  refNumber:', refNumber);
  console.log('  reportId:', reportId);
  console.log('  paymentId:', paymentId);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { selectedReport, isLoading, error: fetchError } = useAppSelector((state) => state.reports);

  console.log('Redux state:');
  console.log('  selectedReport:', selectedReport ? 'EXISTS' : 'NULL');
  console.log('  isLoading:', isLoading);
  console.log('  fetchError:', fetchError);

  useEffect(() => {
    isMounted.current = true;
    
    console.log('💳 PaymentSuccessScreen: Component mounted');

    return () => {
      console.log('🧹 PaymentSuccessScreen: Unmounting...');
      isMounted.current = false;
      
      if (isFetchingReport) {
        console.log('⚠️ Component unmounted during report fetch');
      }
    };
  }, [isFetchingReport]);

  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: PaymentSuccessScreen');
      console.log('🏠 Navigating to Home (popToTop) to prevent going back to PayScreen');
      
      if (isMounted.current) {
        try {
          navigation.reset({
            index: 0,
            routes: [{ name: 'App' }],
          });
        } catch (navError) {
          console.log('❌ Navigation error:', navError);
          try {
            navigation.popToTop();
          } catch (fallbackError) {
            console.log('❌ Fallback navigation also failed:', fallbackError);
          }
        }
        return true;
      }
      
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 PaymentSuccessScreen useEffect TRIGGERED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Report ID from params:', reportId);
    console.log('Payment ID from params:', paymentId);
    
    if (reportId) {
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted, aborting report fetch');
        return;
      }
      
      console.log('✅ reportId exists, fetching report data...');
      console.log('🔄 Fetching report data for:', reportId);
      setIsFetchingReport(true);
      
      dispatch(fetchReportById(reportId))
        .unwrap()
        .then((fetchedReport) => {
          if (!isMounted.current) {
            console.log('⚠️ Component unmounted after report fetch, skipping state update');
            return;
          }
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ Report fetched successfully!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('Fetched report:', JSON.stringify(fetchedReport, null, 2));
          setIsFetchingReport(false);
        })
        .catch((err) => {
          if (!isMounted.current) {
            console.log('⚠️ Component unmounted, skipping error toast');
            return;
          }
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('❌ Failed to fetch report');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('Error:', err);
          setIsFetchingReport(false);
          
          showError('Failed to load report data. You can try viewing it from the Reports tab.');
        });
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️ No reportId provided to PaymentSuccessScreen');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Full route.params:', route.params);
    }
  }, [reportId, paymentId, dispatch, showError, route.params]);

  const onViewReport = () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👆 View Report button clicked');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('selectedReport state:', selectedReport ? 'EXISTS' : 'NULL');
    
    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, aborting navigation');
      return;
    }
    
    if (!selectedReport) {
      console.log('❌ selectedReport is null!');
      showWarning('Please wait while we fetch your report data, or try again from the Reports tab.');
      return;
    }

    console.log('📊 Navigating to Report screen');
    console.log('Selected report structure:', JSON.stringify(selectedReport, null, 2));
    
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

      try {
        navigation.navigate('Report', {
          data: reportData,
        });
      } catch (navError) {
        console.log('❌ Navigation error:', navError);
        showError('Failed to open report. Please try again from the Reports tab.');
      }
    } catch (transformError) {
      console.log('❌ Error transforming report data:', transformError);
      
      if (isMounted.current) {
        showError('Failed to prepare report data');
      }
    }
  };

  const handleNavigation = (screen: string) => {
    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, aborting navigation');
      return;
    }
    
    try {
      navigation.navigate(screen);
    } catch (error) {
      console.log('❌ Navigation error:', error);
    }
  };

  const handleClose = () => {
    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, aborting navigation');
      return;
    }
    
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: 'App' }],
      });
    } catch (error) {
      console.log('❌ Navigation error:', error);
      try {
        navigation.popToTop();
      } catch (fallbackError) {
        console.log('❌ Fallback also failed:', fallbackError);
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

      <View style={styles.header}>
        <Pressable onPress={handleClose}>
          <X size={22} color="#CBD5E1" />
        </Pressable>
        <Pressable>
          <Share2 size={20} color="#CBD5E1" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: contentBottomPadding }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
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

          <View style={styles.infoGrid}>
            <Info label="Ref Number" value={refNumber} />
            <Info label="Payment Time" value={paymentTime} />
            <Info label="Payment Method" value={paymentMethod} />
            <Info label="Sender Name" value={senderName} />
            <Info label="Payment ID" value={paymentId} />
          </View>

          <View style={styles.divider} />

          <Pressable style={styles.receiptRow}>
            <Download size={18} color="#E5E7EB" />
            <Text style={styles.receiptText}>Get PDF Receipt</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.supportCard}
          onPress={() => handleNavigation('Support')}
        >
          <HelpCircle size={20} color="#CBD5E1" />
          <View style={styles.supportTextWrap}>
            <Text style={styles.supportTitle}>Trouble With Your Payment?</Text>
            <Text style={styles.supportSubtitle}>Let us know on help center now!</Text>
          </View>
        </Pressable>

        {fetchError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {fetchError}</Text>
          </View>
        )}
      </ScrollView>

      {/* 🎯 STICKY VIEW REPORT BUTTON AT BOTTOM */}
      <View
        style={[
          styles.stickyFooter,
          // eslint-disable-next-line react-native/no-inline-styles
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 0 }
        ]}
      >
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
      </View>
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
    backgroundColor: '#020617',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },

  scrollContent: {
    padding: 16,
    paddingTop: 0,
    // paddingBottom is now dynamic - applied inline
  },

  card: {
    backgroundColor: '#1A2332',
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },

  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22C55E',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  check: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 14,
  },

  totalLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },

  amount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },

  infoItem: {
    backgroundColor: '#0A1628',
    borderRadius: 10,
    padding: 12,
    paddingVertical: 10,
    flex: 1,
    minWidth: '47%',
  },

  infoLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 3,
  },

  infoValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  receiptText: {
    color: '#E5E7EB',
    fontWeight: '600',
    fontSize: 13,
  },

  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1A2332',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
  },

  supportTextWrap: {
    flex: 1,
  },

  supportTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  supportSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },

  errorText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // 🎯 NEW: Sticky footer with solid background
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#020617',
    paddingHorizontal: 16,
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

  cta: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },

  ctaDisabled: {
    backgroundColor: '#475569',
  },

  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});