// components/screens/user/ReportsScreen.tsx
// ✅ UPDATED: Conditional header - Menu icon for tab navigation, Back arrow for stack navigation
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable radix */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  BackHandler,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  FileText,
  Search,
  SlidersHorizontal,
  X,
  Calendar,
  Scale,
  BarChart3,
  Heart,
  Menu, // ✅ NEW: Import Menu icon
} from 'lucide-react-native';
import { useRoute } from '@react-navigation/native'; // ✅ NEW: Import useRoute
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import { fetchReports } from '../../../store/slices/reportSlice';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApiErrorHandler } from '../../../hooks/useApiErrorHandler';

// ✅ NEW: Import AppDrawer
import AppDrawer from '../../common/AppDrawer';

type Props = {
  navigation: any;
};

type FilterOptions = {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
  startDate: Date | null;
  endDate: Date | null;
  bmiType: 'all' | 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
  bmiValueMin: string;
  bmiValueMax: string;
  healthScoreOperator: 'all' | 'greater' | 'less';
  healthScoreValue: '25' | '50' | '75' | '100';
};

export default function ReportsScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const isMounted = useRef(true);
  const insets = useSafeAreaInsets();
  const contentBottomPadding = 20 + (insets.bottom > 0 ? insets.bottom : 0);

  // ✅ NEW: Detect navigation source
  const route = useRoute();
  const isFromTab = route.name === 'Reports'; // Bottom tab navigation
  const isFromStack = route.name === 'ReportsStack'; // Stack navigation

  console.log('📊 ReportsScreen - Navigation source:', {
    routeName: route.name,
    isFromTab,
    isFromStack,
  });

  // Redux state
  const { reports, isLoading, error } = useAppSelector(state => state.reports);

  const { executeApiCall } = useApiErrorHandler();

  // ✅ NEW: Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredReports, setFilteredReports] = useState(reports);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'all',
    startDate: null,
    endDate: null,
    bmiType: 'all',
    bmiValueMin: '',
    bmiValueMax: '',
    healthScoreOperator: 'all',
    healthScoreValue: '50',
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const loadReports = useCallback(async () => {
    await executeApiCall(
      () => dispatch(fetchReports()).unwrap(),
      {
        showSuccessToast: false,
        showErrorToast: true,
        retryCallback: loadReports,
      }
    );
  }, [dispatch, executeApiCall]);

  useEffect(() => {
    isMounted.current = true;
    console.log('📊 ReportsScreen: Component mounted');
    loadReports();

    return () => {
      console.log('🧹 ReportsScreen: Unmounting...');
      isMounted.current = false;
    };
  }, [loadReports]);

  // ✅ UPDATED: Hardware back button handling
  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: ReportsScreen');

      // ✅ Priority 1: Close drawer if open (for tab navigation)
      if (drawerOpen && isFromTab) {
        console.log('🗂️ Closing drawer');
        if (isMounted.current) {
          setDrawerOpen(false);
        }
        return true; // Prevent default back
      }

      // ✅ Priority 2: Navigate back (for stack navigation)
      if (isFromStack && isMounted.current && navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation, drawerOpen, isFromTab, isFromStack]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...reports];

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report => {
        return (
          report.user_name.toLowerCase().includes(query) ||
          report.report_id.toLowerCase().includes(query) ||
          report.vitals.bmi_status.toLowerCase().includes(query)
        );
      });
    }

    // Apply date filter
    if (
      filters.dateRange === 'custom' &&
      (filters.startDate || filters.endDate)
    ) {
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.report_date);
        reportDate.setHours(0, 0, 0, 0);

        if (filters.startDate && filters.endDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          return reportDate >= start && reportDate <= end;
        } else if (filters.startDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          return reportDate >= start;
        } else if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          return reportDate <= end;
        }
        return true;
      });
    } else if (filters.dateRange !== 'all' && filters.dateRange !== 'custom') {
      const now = new Date();
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.report_date);

        switch (filters.dateRange) {
          case 'today':
            return reportDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return reportDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return reportDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            return reportDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    // Apply BMI type filter
    if (filters.bmiType !== 'all') {
      filtered = filtered.filter(
        report => report.vitals.bmi_status === filters.bmiType,
      );
    }

    // Apply BMI value range filter
    if (filters.bmiValueMin !== '' || filters.bmiValueMax !== '') {
      filtered = filtered.filter(report => {
        const bmi = report.vitals.bmi;
        const min =
          filters.bmiValueMin !== '' ? parseFloat(filters.bmiValueMin) : 0;
        const max =
          filters.bmiValueMax !== '' ? parseFloat(filters.bmiValueMax) : 999;
        return bmi >= min && bmi <= max;
      });
    }

    // Apply health score filter
    if (filters.healthScoreOperator !== 'all') {
      const targetScore = parseInt(filters.healthScoreValue);
      filtered = filtered.filter(report => {
        const score = report.vitals.health_score;
        return filters.healthScoreOperator === 'greater'
          ? score >= targetScore
          : score < targetScore;
      });
    }

    setFilteredReports(filtered);

    // Count active filters
    let count = 0;
    if (filters.dateRange !== 'all') count++;
    if (filters.bmiType !== 'all') count++;
    if (filters.bmiValueMin !== '' || filters.bmiValueMax !== '') count++;
    if (filters.healthScoreOperator !== 'all') count++;
    setActiveFiltersCount(count);
  }, [searchQuery, reports, filters]);

  const onRefresh = useCallback(async () => {
    console.log('🔄 ReportsScreen: Refreshing reports...');
    if (!isMounted.current) return;
    
    setRefreshing(true);
    await loadReports();
    
    if (isMounted.current) {
      setRefreshing(false);
    }
  }, [loadReports]);

  // ✅ UPDATED: Conditional back/menu handler
  const handleBack = () => {
    if (isMounted.current && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleMenuToggle = () => {
    if (isMounted.current) {
      setDrawerOpen(true);
    }
  };

  const handleFilter = () => {
    setShowFilterModal(true);
  };

  const handleDateRangeChange = (value: any) => {
    setFilters({
      ...filters,
      dateRange: value,
      startDate: value === 'custom' ? filters.startDate : null,
      endDate: value === 'custom' ? filters.endDate : null,
    });
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFilters({ ...filters, startDate: selectedDate, dateRange: 'custom' });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFilters({ ...filters, endDate: selectedDate, dateRange: 'custom' });
    }
  };

  const handleResetFilters = () => {
    setFilters({
      dateRange: 'all',
      startDate: null,
      endDate: null,
      bmiType: 'all',
      bmiValueMin: '',
      bmiValueMax: '',
      healthScoreOperator: 'all',
      healthScoreValue: '50',
    });
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
  };

  const handleDownload = (item: any) => {
    console.log('📥 Opening report:', item.report_id);

    const reportData = {
      timestamp:
        formatDate(item.report_date) + ' ' + formatTime(item.report_date),
      reportId: item.report_id,
      patientName: item.user_name,
      age: item.age,
      gender:
        item.gender === 'Male' ? 'M' : item.gender === 'Female' ? 'F' : 'O',
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

    navigation.navigate('Report', { data: reportData });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateForPicker = (date: Date | null) => {
    if (!date) return 'Select Date';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // ✅ UPDATED: Conditional header rendering
  const renderHeader = () => (
    <View style={styles.header}>
      {/* ✅ Conditional left button */}
      {isFromStack ? (
        // Stack navigation - Show back arrow
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </TouchableOpacity>
      ) : (
        // Tab navigation - Show menu icon
        <TouchableOpacity onPress={handleMenuToggle} style={styles.backButton}>
          <Menu size={24} color="#FAFAFA" />
        </TouchableOpacity>
      )}
      
      <Text style={styles.headerTitle}>Medical Reports</Text>
      <View style={styles.placeholder} />
    </View>
  );

  // Render loading state
  if (isLoading && reports.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* ✅ NEW: Drawer for tab navigation */}
        {isFromTab && (
          <AppDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            navigation={navigation}
          />
        )}

        {renderHeader()}

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && reports.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* ✅ NEW: Drawer for tab navigation */}
        {isFromTab && (
          <AppDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            navigation={navigation}
          />
        )}

        {renderHeader()}

        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={loadReports}
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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* ✅ NEW: Drawer for tab navigation */}
        {isFromTab && (
          <AppDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            navigation={navigation}
          />
        )}

        {renderHeader()}

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ✅ NEW: Drawer for tab navigation */}
      {isFromTab && (
        <AppDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          navigation={navigation}
        />
      )}

      {/* ✅ UPDATED: Use renderHeader function */}
      {renderHeader()}

      {/* Search Bar and Filter Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#71717A" strokeWidth={2.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID, or status..."
            placeholderTextColor="#71717A"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.filterBtn} onPress={handleFilter}>
          <SlidersHorizontal size={20} color="#FAFAFA" strokeWidth={2.5} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {filteredReports.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>No reports found</Text>
            <Text style={styles.noResultsSubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredReports}
            keyExtractor={item => item.report_id}
            contentContainerStyle={{ paddingBottom: contentBottomPadding }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#F59E0B"
                colors={['#F59E0B']}
              />
            }
            renderItem={({ item }) => {
              const bmiColor =
                item.vitals.bmi_status === 'Normal'
                  ? '#10B981'
                  : item.vitals.bmi_status === 'Underweight'
                  ? '#3B82F6'
                  : item.vitals.bmi_status === 'Overweight'
                  ? '#F59E0B'
                  : '#EF4444';

              const bmiIconBg =
                item.vitals.bmi_status === 'Normal'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : item.vitals.bmi_status === 'Underweight'
                  ? 'rgba(59, 130, 246, 0.15)'
                  : item.vitals.bmi_status === 'Overweight'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)';

              return (
                <Pressable
                  style={styles.card}
                  onPress={() => handleDownload(item)}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: bmiIconBg },
                    ]}
                  >
                    <FileText size={24} color={bmiColor} strokeWidth={2.5} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.name}>
                      {item.user_name}, {item.gender}/{item.age}
                    </Text>
                    <Text style={styles.meta}>
                      H: {item.vitals.height} cm • W: {item.vitals.weight} kg •
                      BMI: {item.vitals.bmi.toFixed(1)} •{' '}
                      <Text style={{ color: bmiColor }}>
                        {item.vitals.bmi_status}
                      </Text>
                    </Text>
                    <Text style={styles.date}>
                      {formatDate(item.report_date)} •{' '}
                      {formatTime(item.report_date)}
                    </Text>
                    <Text style={styles.reportId}>
                      Report ID: {item.report_id}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={e => {
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
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Reports</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <Calendar size={18} color="#F59E0B" strokeWidth={2.5} />
                  <Text style={styles.filterLabel}>Date Range</Text>
                </View>
                <View style={styles.filterOptions}>
                  {[
                    { label: 'All Time', value: 'all' },
                    { label: 'Today', value: 'today' },
                    { label: 'Last 7 Days', value: 'week' },
                    { label: 'Last 30 Days', value: 'month' },
                    { label: 'Last Year', value: 'year' },
                    { label: 'Custom Range', value: 'custom' },
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filters.dateRange === option.value &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() => handleDateRangeChange(option.value)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          filters.dateRange === option.value &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Date Range Pickers */}
                {filters.dateRange === 'custom' && (
                  <View style={styles.datePickersContainer}>
                    <View style={styles.datePickerItem}>
                      <Text style={styles.datePickerLabel}>Start Date</Text>
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <Calendar size={18} color="#A1A1AA" strokeWidth={2.5} />
                        <Text style={styles.datePickerButtonText}>
                          {formatDateForPicker(filters.startDate)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.datePickerItem}>
                      <Text style={styles.datePickerLabel}>End Date</Text>
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <Calendar size={18} color="#A1A1AA" strokeWidth={2.5} />
                        <Text style={styles.datePickerButtonText}>
                          {formatDateForPicker(filters.endDate)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* BMI Type Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <Scale size={18} color="#F59E0B" strokeWidth={2.5} />
                  <Text style={styles.filterLabel}>BMI Category</Text>
                </View>
                <View style={styles.filterOptions}>
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Underweight', value: 'Underweight' },
                    { label: 'Normal', value: 'Normal' },
                    { label: 'Overweight', value: 'Overweight' },
                    { label: 'Obese', value: 'Obese' },
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filters.bmiType === option.value &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        setFilters({ ...filters, bmiType: option.value as any })
                      }
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          filters.bmiType === option.value &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* BMI Value Range */}
              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <BarChart3 size={18} color="#F59E0B" strokeWidth={2.5} />
                  <Text style={styles.filterLabel}>BMI Value Range</Text>
                </View>
                <View style={styles.rangeInputs}>
                  <View style={styles.rangeInputContainer}>
                    <Text style={styles.rangeInputLabel}>Min</Text>
                    <TextInput
                      style={styles.rangeInput}
                      placeholder="e.g., 18.5"
                      placeholderTextColor="#71717A"
                      value={filters.bmiValueMin}
                      onChangeText={text =>
                        setFilters({ ...filters, bmiValueMin: text })
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <Text style={styles.rangeSeparator}>—</Text>
                  <View style={styles.rangeInputContainer}>
                    <Text style={styles.rangeInputLabel}>Max</Text>
                    <TextInput
                      style={styles.rangeInput}
                      placeholder="e.g., 24.9"
                      placeholderTextColor="#71717A"
                      value={filters.bmiValueMax}
                      onChangeText={text =>
                        setFilters({ ...filters, bmiValueMax: text })
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>

              {/* Health Score Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <Heart size={18} color="#F59E0B" strokeWidth={2.5} />
                  <Text style={styles.filterLabel}>Health Score</Text>
                </View>

                <View style={styles.filterOptions}>
                  {[
                    { label: 'All Scores', value: 'all' },
                    { label: 'Greater Than', value: 'greater' },
                    { label: 'Less Than', value: 'less' },
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filters.healthScoreOperator === option.value &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        setFilters({
                          ...filters,
                          healthScoreOperator: option.value as any,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          filters.healthScoreOperator === option.value &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {filters.healthScoreOperator !== 'all' && (
                  <View style={[styles.filterOptions, { marginTop: 12 }]}>
                    {[
                      { label: '25%', value: '25' },
                      { label: '50%', value: '50' },
                      { label: '75%', value: '75' },
                      { label: '100%', value: '100' },
                    ].map(option => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.filterOption,
                          filters.healthScoreValue === option.value &&
                            styles.filterOptionActive,
                        ]}
                        onPress={() =>
                          setFilters({
                            ...filters,
                            healthScoreValue: option.value as any,
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            filters.healthScoreValue === option.value &&
                              styles.filterOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetFilters}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={handleApplyFilters}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={filters.startDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleStartDateChange}
            maximumDate={new Date()}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={filters.endDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleEndDateChange}
            maximumDate={new Date()}
            minimumDate={filters.startDate || undefined}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
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
  placeholder: {
    width: 40,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#0A0A0A',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  searchInput: {
    flex: 1,
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '500',
  },
  clearText: {
    color: '#71717A',
    fontSize: 18,
    fontWeight: '600',
  },
  filterBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#18181B',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#18181B',
    fontSize: 10,
    fontWeight: '900',
  },

  content: {
    flex: 1,
    padding: 16,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#71717A',
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#18181B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  retryText: {
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#71717A',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  noResultsSubtext: {
    color: '#71717A',
    fontSize: 14,
  },

  card: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    color: '#A1A1AA',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  date: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  reportId: {
    color: '#52525B',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  downloadBtn: {
    backgroundColor: '#18181B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  downloadText: {
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 13,
  },

  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  modalTitle: {
    color: '#FAFAFA',
    fontSize: 20,
    fontWeight: '800',
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterLabel: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '700',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  filterOptionActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  filterOptionText: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '700',
  },
  filterOptionTextActive: {
    color: '#18181B',
  },

  datePickersContainer: {
    marginTop: 16,
    gap: 12,
  },
  datePickerItem: {
    flex: 1,
  },
  datePickerLabel: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 10,
  },
  datePickerButtonText: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '600',
  },

  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rangeInputContainer: {
    flex: 1,
  },
  rangeInputLabel: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  rangeInput: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 14,
    color: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#27272A',
    fontSize: 15,
  },
  rangeSeparator: {
    color: '#71717A',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#A1A1AA',
    fontWeight: '800',
    fontSize: 15,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#18181B',
    fontWeight: '800',
    fontSize: 15,
  },
});