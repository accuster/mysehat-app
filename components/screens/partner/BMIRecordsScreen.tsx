
// components/screens/partner/BMIRecordsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  Trash2,
  Calendar,
  User,
  Phone,
  Activity,
  Bluetooth,
  QrCode,
} from 'lucide-react-native';
import {
  getAllBMIRecords,
  deleteBMIRecord,
  searchBMIRecords,
  getBMIStatistics,
  BMIRecord,
} from '../../../utils/partnerStorage';

type Props = {
  navigation: any;
};

export default function BMIRecordsScreen({ navigation }: Props) {
  const [records, setRecords] = useState<BMIRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BMIRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statistics, setStatistics] = useState({
    totalRecords: 0,
    totalPatients: 0,
    averageBMI: 0,
  });

  useEffect(() => {
    loadRecords();
    loadStatistics();
  }, []);

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, records]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await getAllBMIRecords();
      setRecords(data);
      setFilteredRecords(data);
      console.log('📋 Loaded', data.length, 'BMI records');
    } catch (error) {
      console.log('Error loading records:', error);
      Alert.alert('Error', 'Failed to load BMI records');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await getBMIStatistics();
      setStatistics({
        totalRecords: stats.totalRecords,
        totalPatients: stats.totalPatients,
        averageBMI: stats.averageBMI,
      });
    } catch (error) {
      console.log('Error loading statistics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    await loadStatistics();
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setFilteredRecords(records);
      return;
    }

    const results = await searchBMIRecords(query);
    setFilteredRecords(results);
  };

  const handleDelete = (record: BMIRecord) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to delete this record?\n\nPatient: ${record.name}\nMobile: ${record.mobile}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteBMIRecord(record.id);
              if (success) {
                await loadRecords();
                await loadStatistics();
                Alert.alert('Success', 'Record deleted successfully');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete record');
              console.log('Error deleting record:', error);
            }
          },
        },
      ]
    );
  };

  const getBMIColor = (bmi: string) => {
    const bmiNum = parseFloat(bmi);
    if (bmiNum < 18.5) return '#F59E0B'; // Underweight - Orange
    if (bmiNum >= 18.5 && bmiNum < 25) return '#10B981'; // Normal - Green
    if (bmiNum >= 25 && bmiNum < 30) return '#F97316'; // Overweight - Orange
    return '#EF4444'; // Obese - Red
  };

  const getHealthScoreColor = (score: string) => {
    const scoreNum = parseFloat(score);
    if (scoreNum >= 80) return '#10B981'; // Excellent - Green
    if (scoreNum >= 60) return '#3B82F6'; // Good - Blue
    if (scoreNum >= 40) return '#F59E0B'; // Fair - Orange
    return '#EF4444'; // Poor - Red
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderRecord = ({ item }: { item: BMIRecord }) => (
    <Pressable
      style={styles.recordCard}
      onPress={() => {
        console.log('📄 Opening report preview for:', item.id);
        navigation.navigate('PartnerReportPreview', { record: item });
      }}
    >
      {/* Header with Name & Delete */}
      <View style={styles.recordHeader}>
        <View style={styles.recordHeaderLeft}>
          <User size={16} color="#E4E4E7" strokeWidth={2.5} />
          <Text style={styles.recordName}>{item.name}</Text>
        </View>
        <Pressable
          style={styles.deleteBtn}
          onPress={(e) => {
            e.stopPropagation(); // Prevent opening preview
            handleDelete(item);
          }}
        >
          <Trash2 size={18} color="#EF4444" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Details Grid */}
      <View style={styles.recordGrid}>
        {/* Phone */}
        <View style={styles.recordDetail}>
          <Phone size={14} color="#71717A" strokeWidth={2.5} />
          <Text style={styles.recordDetailText}>{item.mobile}</Text>
        </View>

        {/* Date & Time */}
        <View style={styles.recordDetail}>
          <Calendar size={14} color="#71717A" strokeWidth={2.5} />
          <Text style={styles.recordDetailText}>
            {formatDate(item.createdAt)} • {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>

      {/* BMI Stats - Extended with Health Score */}
      <View style={styles.recordStats}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Height</Text>
          <Text style={styles.statValue}>{item.height} cm</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Weight</Text>
          <Text style={styles.statValue}>{item.weight} kg</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>BMI</Text>
          <Text style={[styles.statValue, { color: getBMIColor(item.bmi) }]}>
            {item.bmi}
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Health</Text>
          <Text style={[styles.statValue, { color: getHealthScoreColor(item.healthScore) }]}>
            {item.healthScore}
          </Text>
        </View>
      </View>

      {/* Extended Metrics */}
      <View style={styles.extendedMetrics}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Body Fat:</Text>
          <Text style={styles.metricValue}>{item.bodyFatPercentage}%</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Fat Mass:</Text>
          <Text style={styles.metricValue}>{item.fatMass} kg</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Lean Mass:</Text>
          <Text style={styles.metricValue}>{item.leanBodyMass} kg</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Ideal Weight:</Text>
          <Text style={styles.metricValue}>{item.idealWeight} kg</Text>
        </View>
      </View>

      {/* Footer with Source */}
      <View style={styles.recordFooter}>
        <View style={styles.sourceTag}>
          {item.dataSource === 'bluetooth' ? (
            <Bluetooth size={12} color="#71717A" strokeWidth={2.5} />
          ) : (
            <QrCode size={12} color="#71717A" strokeWidth={2.5} />
          )}
          <Text style={styles.sourceText}>
            {item.dataSource === 'bluetooth' ? 'Bluetooth' : 'QR Code'}
          </Text>
        </View>

        <Text style={styles.recordId}>ID: {item.id}</Text>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#FAFAFA" />
          </Pressable>
          <Text style={styles.headerTitle}>BMI Records</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#FAFAFA" />
        </Pressable>
        <Text style={styles.headerTitle}>BMI Records</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{statistics.totalRecords}</Text>
          <Text style={styles.statText}>Total Records</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{statistics.totalPatients}</Text>
          <Text style={styles.statText}>Patients</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{statistics.averageBMI}</Text>
          <Text style={styles.statText}>Avg BMI</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#71717A" strokeWidth={2.5} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or mobile..."
          placeholderTextColor="#52525B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Activity size={48} color="#3F3F46" strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No records found' : 'No BMI records yet'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'Try searching with a different name or mobile number'
              : 'Start by scanning QR codes or connecting Bluetooth devices'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={item => item.id}
          renderItem={renderRecord}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#10B981']}
              tintColor="#10B981"
            />
          }
          // eslint-disable-next-line react/no-unstable-nested-components
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  // Header
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
  },

  // Statistics
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  statNumber: {
    color: '#10B981',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    height: 48,
    gap: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  searchInput: {
    flex: 1,
    color: '#E4E4E7',
    fontSize: 15,
    fontWeight: '500',
  },

  // List
  listContent: {
    padding: 16,
  },
  separator: {
    height: 12,
  },

  // Record Card
  recordCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  recordName: {
    color: '#E4E4E7',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Record Details
  recordGrid: {
    gap: 8,
    marginBottom: 12,
  },
  recordDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordDetailText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '500',
  },

  // Record Stats
  recordStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#27272A',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    color: '#E4E4E7',
    fontSize: 15,
    fontWeight: '800',
  },
  statStatus: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Extended Metrics
  extendedMetrics: {
    backgroundColor: '#27272A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    color: '#E4E4E7',
    fontSize: 13,
    fontWeight: '700',
  },

  // Record Footer
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sourceText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
  },
  recordId: {
    color: '#52525B',
    fontSize: 10,
    fontWeight: '500',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#71717A',
    fontSize: 14,
    marginTop: 12,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#E4E4E7',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#71717A',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
