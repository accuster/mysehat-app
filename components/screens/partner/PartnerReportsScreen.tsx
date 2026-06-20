// components/screens/partner/PartnerReportsScreen.tsx
// ✅ Partner Reports with Filtering, Search & Infinite Scroll
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
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
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import { 
  fetchPartnerReports,
  loadMorePartnerReports,
} from '../../../store/slices/partnerSlice';
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  X,
  Calendar,
  FileText,
  Scale,
  Activity,
  MapPin,
  User,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useApiErrorHandler } from '../../../hooks/useApiErrorHandler';

type Props = {
  navigation: any;
};

type FilterOptions = {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
  startDate: Date | null;
  endDate: Date | null;
  bmiType: 'all' | 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
  healthScoreMin: string;
  healthScoreMax: string;
};

export default function PartnerReportsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const isMounted = useRef(true);

  const { executeApiCall } = useApiErrorHandler();

  // Redux state
  const { 
    reports, 
    reportsLoading, 
    reportsError,
    reportsLoadingMore,
    reportsAllLoaded,
    reportsPagination,
  } = useAppSelector(state => state.partner);

  // Check partner auth state
  const isPartnerAuthenticated = useAppSelector(
    state => state.partnerAuth.isAuthenticated,
  );

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredReports, setFilteredReports] = useState(reports);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'all',
    startDate: null,
    endDate: null,
    bmiType: 'all',
    healthScoreMin: '',
    healthScoreMax: '',
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const loadReports = useCallback(async () => {
    try {
      await executeApiCall(
        () => dispatch(fetchPartnerReports({})).unwrap(),
        {
          showSuccessToast: false,
          showErrorToast: true,
          customErrorMessage: 'Failed to load reports',
          retryCallback: loadReports,
        },
      );
    } catch (error: any) {
      if (error?.message?.toLowerCase().includes('session expired')) {
        console.log('🔒 Session expired - global handler will redirect to Auth');
        return;
      }
    }
  }, [dispatch, executeApiCall]);

  useEffect(() => {
    isMounted.current = true;

    console.log('📋 PartnerReportsScreen: Component mounted');

    // Check authentication before loading
    if (!isPartnerAuthenticated) {
      console.log('🔒 Not authenticated - redirecting to Auth');
      navigation.replace('Auth');
      return;
    }

    loadReports();

    return () => {
      console.log('🧹 PartnerReportsScreen: Unmounting...');
      isMounted.current = false;
    };
  }, [loadReports, isPartnerAuthenticated, navigation]);

  // Listen for auth state changes
  useEffect(() => {
    if (!isPartnerAuthenticated && isMounted.current) {
      console.log('🔒 Auth state changed - partner logged out, redirecting...');
      navigation.replace('Auth');
    }
  }, [isPartnerAuthenticated, navigation]);

  // Hardware back button handling
  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: PartnerReportsScreen');
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
  }, [navigation]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...reports];

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report => {
        const name = report.full_name?.toLowerCase() || '';
        const reportId = report.report_id?.toLowerCase() || '';
        const location = report.machine_location?.toLowerCase() || '';
        const bmiStatus = report.bmi_status?.toLowerCase() || '';

        return (
          name.includes(query) ||
          reportId.includes(query) ||
          location.includes(query) ||
          bmiStatus.includes(query)
        );
      });
    }

    // Apply date filter
    if (
      filters.dateRange === 'custom' &&
      (filters.startDate || filters.endDate)
    ) {
      filtered = filtered.filter(report => {
        if (!report.report_date) return false;
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
        if (!report.report_date) return false;
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
        report => report.bmi_status === filters.bmiType,
      );
    }

    // Apply health score range filter
    if (filters.healthScoreMin !== '' || filters.healthScoreMax !== '') {
      filtered = filtered.filter(report => {
        const score = report.health_score || 0;
        const min =
          filters.healthScoreMin !== '' ? parseFloat(filters.healthScoreMin) : 0;
        const max =
          filters.healthScoreMax !== '' ? parseFloat(filters.healthScoreMax) : 100;
        return score >= min && score <= max;
      });
    }

    setFilteredReports(filtered);

    // Count active filters
    let count = 0;
    if (filters.dateRange !== 'all') count++;
    if (filters.bmiType !== 'all') count++;
    if (filters.healthScoreMin !== '' || filters.healthScoreMax !== '') count++;
    setActiveFiltersCount(count);
  }, [searchQuery, reports, filters]);

  const onRefresh = useCallback(async () => {
    console.log('🔄 PartnerReportsScreen: Refreshing reports...');
    if (!isMounted.current) return;

    if (!isPartnerAuthenticated) {
      console.log('🔒 Not authenticated - skipping refresh');
      return;
    }

    setRefreshing(true);
    await loadReports();

    if (isMounted.current) {
      setRefreshing(false);
    }
  }, [loadReports, isPartnerAuthenticated]);

  // Handle infinite scroll - load more reports
  const handleLoadMore = useCallback(async () => {
    if (reportsLoadingMore || reportsAllLoaded || !isPartnerAuthenticated) {
      return;
    }
    
    // Don't load more if filtering is active
    const isFiltering = searchQuery || filters.dateRange !== 'all' || 
                       filters.bmiType !== 'all';
    
    if (isFiltering) {
      return;
    }
    
    console.log('📄 Load more triggered — fetching next page...');
    
    try {
      await dispatch(loadMorePartnerReports({})).unwrap();
    } catch (error: any) {
      console.warn('⚠️ Load more failed:', error.message);
    }
  }, [
    dispatch, 
    reportsLoadingMore, 
    reportsAllLoaded, 
    isPartnerAuthenticated,
    searchQuery,
    filters,
  ]);

  const handleBack = () => {
    if (isMounted.current && navigation.canGoBack()) {
      navigation.goBack();
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
      healthScoreMin: '',
      healthScoreMax: '',
    });
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
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

  const getBmiStatusConfig = (status: string | null) => {
    switch (status) {
      case 'Normal':
        return {
          icon: Activity,
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.15)',
          label: 'Normal',
        };
      case 'Underweight':
        return {
          icon: Scale,
          color: '#3B82F6',
          bg: 'rgba(59, 130, 246, 0.15)',
          label: 'Underweight',
        };
      case 'Overweight':
        return {
          icon: Scale,
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.15)',
          label: 'Overweight',
        };
      case 'Obese':
        return {
          icon: Scale,
          color: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.15)',
          label: 'Obese',
        };
      default:
        return {
          icon: FileText,
          color: '#71717A',
          bg: 'rgba(113, 113, 122, 0.15)',
          label: 'Unknown',
        };
    }
  };

  const contentBottomPadding = 20 + (insets.bottom > 0 ? insets.bottom : 0);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <ArrowLeft size={24} color="#FAFAFA" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Medical Reports</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderFooter = () => {
    // Don't show footer if filtering
    const isFiltering = searchQuery || filters.dateRange !== 'all' || 
                       filters.bmiType !== 'all';
    if (isFiltering) {
      return null;
    }
    
    // Show loading indicator if currently loading more
    if (reportsLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#10B981" />
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        </View>
      );
    }
    
    // Show "Load More" button if more pages available
    if (!reportsAllLoaded && reportsPagination) {
      return (
        <View style={styles.loadMoreContainer}>
          <Text style={styles.loadMoreInfo}>
            Showing {reports.length} of {reportsPagination.total}
          </Text>
          <TouchableOpacity 
            style={styles.loadMoreBtn}
            onPress={handleLoadMore}
          >
            <Text style={styles.loadMoreBtnText}>Load More</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Show "All loaded" message
    if (reports.length > 0 && reportsAllLoaded) {
      return (
        <View style={styles.allLoadedContainer}>
          <Text style={styles.allLoadedText}>
            ✓ All {reports.length} reports loaded
          </Text>
        </View>
      );
    }
    
    return null;
  };

  // Render loading state
  if (reportsLoading && reports.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  const isSessionExpiredError = reportsError
    ?.toLowerCase()
    .includes('session expired');

  if (
    reportsError &&
    reports.length === 0 &&
    !isSessionExpiredError
  ) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{reportsError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => dispatch(fetchPartnerReports({}))}
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
        {renderHeader()}
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>📋 No reports found</Text>
          <Text style={styles.emptySubtext}>
            Reports from your machines will appear here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {renderHeader()}

      {/* Search Bar and Filter Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#71717A" strokeWidth={2.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID, location..."
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
                tintColor="#10B981"
                colors={['#10B981']}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            renderItem={({ item }) => {
              // Safety check
              if (!item || !item.report_id) {
                console.warn('⚠️ Invalid report item:', item);
                return null;
              }
              
              const bmiConfig = getBmiStatusConfig(item.bmi_status);
              const BmiIcon = bmiConfig.icon;

              return (
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => {
                    // TODO: Navigate to report detail screen
                    console.log('📄 Report clicked:', item.report_id);
                  }}
                >
                  {/* BMI Status Icon */}
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: bmiConfig.bg },
                    ]}
                  >
                    <BmiIcon
                      size={22}
                      color={bmiConfig.color}
                      strokeWidth={2.5}
                    />
                  </View>

                  {/* Report Details */}
                  <View style={styles.reportDetails}>
                    {/* Machine Location Badge */}
                    {item.machine_location && (
                      <View style={styles.locationBadge}>
                        <MapPin size={12} color="#10B981" strokeWidth={2.5} />
                        <Text style={styles.locationText}>
                          {item.machine_location}
                        </Text>
                      </View>
                    )}

                    {/* Patient Name & Demographics */}
                    <View style={styles.nameRow}>
                      <User size={14} color="#10B981" strokeWidth={2.5} />
                      <Text style={styles.reportName}>
                        {item.full_name || 'Unknown'}, {item.gender || 'U'}/{item.age || '?'}
                      </Text>
                    </View>

                    {/* Vitals */}
                    <Text style={styles.reportVitals}>
                      H: {item.height || 'N/A'}cm • W: {item.weight || 'N/A'}kg • BMI: {item.bmi ? item.bmi.toFixed(1) : 'N/A'}
                    </Text>

                    {/* Health Score */}
                    {item.health_score !== null && (
                      <View style={styles.healthScoreRow}>
                        <Activity size={12} color="#F59E0B" strokeWidth={2.5} />
                        <Text style={styles.healthScoreText}>
                          Health Score: {item.health_score}%
                        </Text>
                      </View>
                    )}

                    {/* Date & Time */}
                    <Text style={styles.reportDate}>
                      {formatDate(item.report_date)} • {formatTime(item.report_date)}
                    </Text>

                    {/* Report ID */}
                    <Text style={styles.reportId}>
                      Report ID: {item.report_id}
                    </Text>

                    {/* BMI Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: bmiConfig.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: bmiConfig.color },
                        ]}
                      >
                        {bmiConfig.label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
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
                  <Calendar size={18} color="#10B981" strokeWidth={2.5} />
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

              {/* BMI Category Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <Scale size={18} color="#10B981" strokeWidth={2.5} />
                  <Text style={styles.filterLabel}>BMI Category</Text>
                </View>
                <View style={styles.filterOptions}>
                  {[
                    { label: 'All Categories', value: 'all' },
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
                        setFilters({
                          ...filters,
                          bmiType: option.value as any,
                        })
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

              {/* Health Score Range */}
              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <Activity size={18} color="#10B981" strokeWidth={2.5} />
                  <Text style={styles.filterLabel}>Health Score Range (%)</Text>
                </View>
                <View style={styles.rangeInputs}>
                  <View style={styles.rangeInputContainer}>
                    <Text style={styles.rangeInputLabel}>Min Score</Text>
                    <TextInput
                      style={styles.rangeInput}
                      placeholder="e.g., 50"
                      placeholderTextColor="#71717A"
                      value={filters.healthScoreMin}
                      onChangeText={text =>
                        setFilters({ ...filters, healthScoreMin: text })
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <Text style={styles.rangeSeparator}>—</Text>
                  <View style={styles.rangeInputContainer}>
                    <Text style={styles.rangeInputLabel}>Max Score</Text>
                    <TextInput
                      style={styles.rangeInput}
                      placeholder="e.g., 100"
                      placeholderTextColor="#71717A"
                      value={filters.healthScoreMax}
                      onChangeText={text =>
                        setFilters({ ...filters, healthScoreMax: text })
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
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
    backgroundColor: '#10B981',
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
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
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
    color: '#10B981',
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
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  reportDetails: {
    flex: 1,
    marginLeft: 14,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    gap: 4,
  },
  locationText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reportName: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '700',
  },
  reportVitals: {
    color: '#A1A1AA',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  healthScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  healthScoreText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  reportDate: {
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Load more / pagination styles
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingMoreText: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600',
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 12,
  },
  loadMoreInfo: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  loadMoreBtn: {
    backgroundColor: '#18181B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  loadMoreBtnText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 14,
  },
  allLoadedContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  allLoadedText: {
    color: '#52525B',
    fontSize: 12,
    fontWeight: '600',
  },

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
    backgroundColor: '#10B981',
    borderColor: '#10B981',
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
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#18181B',
    fontWeight: '800',
    fontSize: 15,
  },
});