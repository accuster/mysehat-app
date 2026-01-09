/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
// ✅ STEP 1: Import useSafeAreaInsets
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import { fetchReports } from '../../../store/slices/reportSlice';

type Props = {
  navigation: any;
};

export default function ReportsScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  
  // ✅ STEP 2: Add safe area hook and calculate dynamic padding
  const insets = useSafeAreaInsets();
  const contentBottomPadding = 20 + (insets.bottom > 0 ? insets.bottom : 0);
  
  // Redux state
  const { reports, isLoading, error } = useAppSelector((state) => state.reports);
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);

  // Fetch reports on mount
  useEffect(() => {
    console.log('📊 ReportsScreen: Component mounted');
    dispatch(fetchReports());
  }, [dispatch]);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    console.log('🔄 ReportsScreen: Refreshing reports...');
    setRefreshing(true);
    await dispatch(fetchReports());
    setRefreshing(false);
  };

  // Handle back navigation
  const handleBack = () => {
    navigation.goBack();
  };

  // Handle download - Navigate to InstantReport
  const handleDownload = (item: any) => {
    console.log('📥 Opening report:', item.report_id);
    
    // Format data for InstantReport screen
    const reportData = {
      timestamp: formatDate(item.report_date) + ' ' + formatTime(item.report_date),
      reportId: item.report_id,
      patientName: item.user_name,
      age: item.age,
      gender: item.gender === 'Male' ? 'M' : item.gender === 'Female' ? 'F' : 'O',
      heightCm: item.vitals.height,
      weightKg: item.vitals.weight,
      bmi: item.vitals.bmi,
      bmiStatus: item.vitals.bmi_status,
      idealWeightKg: item.vitals.ideal_weight,
      bodyFatPct: item.vitals.body_fat_pct,
      fatMassKg: item.vitals.fat_mass,
      leanBodyMassKg: item.vitals.lean_body_mass,
      healthScore: item.vitals.health_score,
    };
    
    // Navigate to InstantReport screen
    navigation.navigate('Report', { data: reportData });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Render loading state
  if (isLoading && reports.length === 0) {
    return (
      // ✅ STEP 3: Change edges to ['top', 'bottom']
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Simple Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical Reports</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && reports.length === 0) {
    return (
      // ✅ STEP 3: Change edges to ['top', 'bottom']
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Simple Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical Reports</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => dispatch(fetchReports())}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render empty state
  if (reports.length === 0) {
    return (
      // ✅ STEP 3: Change edges to ['top', 'bottom']
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Simple Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical Reports</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>📄 No reports found</Text>
          <Text style={styles.emptySubtext}>
            Scan a QR code on MySehat device to generate your first report
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    // ✅ STEP 3: Change edges to ['top', 'bottom']
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Simple Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Reports</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <FlatList
          data={reports}
          keyExtractor={item => item.report_id}
          // ✅ STEP 4: Use dynamic padding instead of hardcoded 20
          contentContainerStyle={{ paddingBottom: contentBottomPadding }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F97316"
              colors={['#F97316']}
            />
          }
          renderItem={({ item }) => {
            const bmiColor = 
              item.vitals.bmi_status === 'Normal' ? '#22C55E' :
              item.vitals.bmi_status === 'Underweight' ? '#3B82F6' :
              item.vitals.bmi_status === 'Overweight' ? '#FB923C' :
              '#EF4444'; // Obese

            return (
              <Pressable
                style={styles.card}
                onPress={() => handleDownload(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {item.user_name}, {item.gender}/{item.age}
                  </Text>
                  <Text style={styles.meta}>
                    H: {item.vitals.height} cm, W: {item.vitals.weight} kg, BMI: {item.vitals.bmi.toFixed(1)} •{' '}
                    <Text style={{ color: bmiColor }}>
                      {item.vitals.bmi_status}
                    </Text>
                  </Text>
                  <Text style={styles.date}>
                    {formatDate(item.report_date)} • {formatTime(item.report_date)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDownload(item);
                  }}
                >
                  <Text style={styles.downloadText}>View</Text>
                </TouchableOpacity>
              </Pressable>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  
  // Simple header with back button
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
    color: '#fff',
  },
  placeholder: {
    width: 40, // Match back button width for centering
  },
  
  content: {
    flex: 1,
    padding: 16,
  },
  
  // Loading/Error/Empty states
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  
  // Report card
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    color: '#CBD5E5',
    fontSize: 13,
    marginTop: 4,
  },
  date: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },
  downloadBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  downloadText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});