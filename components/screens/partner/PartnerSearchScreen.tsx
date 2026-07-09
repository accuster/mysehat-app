/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-native/no-inline-styles */
// components/screens/partner/PartnerSearchScreen.tsx
/**
 * MySehat — Partner Search Screen
 *
 * Search saved BMI reports with:
 *   • Free-text query (name OR mobile), debounced 350ms
 *   • Date range filter (bottom sheet)
 *   • BMI Status multi-select filter (bottom sheet)
 *   • Detail modal with View / Share PDF / Call actions
 *
 * Data source:
 *   • Local SQLite via searchReports() in localReportRepository
 *   • TODO: when /partner/reports/search exists, try server first,
 *     fall back to local on network failure. The result shape is
 *     already `{ rows, totalCount }` to match a paginated server response.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  Alert,
  Linking,
  Share,
  TouchableOpacity,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  X,
  Calendar,
  Activity,
  Filter,
  User,
  Phone,
  FileText,
  Share2,
  PhoneCall,
  Inbox,
  RefreshCw,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react-native';

// Repository
import {
  searchReports,
  type BmiStatusFilter,
} from '../../../utils/localReportRepository';
import type { BmiReportRow } from '../../../utils/localDb';

// Redux
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';

// Theme
import { COLORS } from '../../../theme/colors';

// PDF (used in Share action)
// If your file has a different named export, adjust this import.
import { generateReportPdf } from '../../../utils/generateReportPdf';

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const SCREEN_HEIGHT = Dimensions.get('window').height;
const DEBOUNCE_MS = 350;
const PAGE_SIZE = 20;

const BMI_STATUSES: BmiStatusFilter[] = [
  'Underweight',
  'Normal',
  'Overweight',
  'Obese',
];

const STATUS_COLORS: Record<BmiStatusFilter, string> = {
  Underweight: '#38BDF8', // info blue
  Normal: '#22C55E', // success green
  Overweight: '#FB923C', // warning orange
  Obese: '#EF4444', // error red
};

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
type Nav = {
  goBack: () => void;
  navigate: (screen: string, params?: object) => void;
};
type Props = { navigation: Nav };

type LoadState = 'idle' | 'loading' | 'refreshing' | 'loadingMore' | 'error';

// ─────────────────────────────────────────────
//  Utilities
// ─────────────────────────────────────────────
function formatDate(millis: number): string {
  const d = new Date(millis);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(millis: number): string {
  const d = new Date(millis);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Start of day in local time (unix millis). */
function startOfDay(d: Date): number {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

/** End of day in local time (unix millis, 23:59:59.999). */
function endOfDay(d: Date): number {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy.getTime();
}

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────
export default function PartnerSearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const partner = useSelector((s: RootState) => s.partnerAuth.partner);

  // ── Search state ──
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Filter state ──
  const [fromDate, setFromDate] = useState<number | null>(null);
  const [toDate, setToDate] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<BmiStatusFilter[]>([]);

  // ── Sheet visibility ──
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const dateSheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const statusSheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // ── Results state ──
  const [rows, setRows] = useState<BmiReportRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [offset, setOffset] = useState(0);

  // ── Detail modal ──
  const [detailRow, setDetailRow] = useState<BmiReportRow | null>(null);

  const isMounted = useRef(true);
  const lastRequestId = useRef(0);

  // ─────────────────────────────────────────────
  //  Lifecycle
  // ─────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Debounce the query — no request until user stops typing for 350ms.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (isMounted.current) setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Re-run search when any filter changes.
  useEffect(() => {
    runSearch(0, 'loading');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, fromDate, toDate, statusFilter]);

  // ─────────────────────────────────────────────
  //  Search execution
  // ─────────────────────────────────────────────
  const runSearch = useCallback(
    async (nextOffset: number, mode: LoadState) => {
      if (!partner?.auth_id) {
        setErrorMsg('Partner session missing. Please log in again.');
        setLoadState('error');
        return;
      }

      // Race-guard: only apply results if this is the most recent request.
      const requestId = ++lastRequestId.current;

      setLoadState(mode);
      setErrorMsg('');

      try {
        // TODO(server): when /partner/reports/search endpoint exists,
        // try it here first with the same input shape, fall back to
        // searchReports() on network / 5xx error. Result shape already
        // matches: { rows, totalCount }.
        const result = await searchReports({
          partnerAuthId: partner.auth_id,
          query: debouncedQuery,
          fromDate,
          toDate,
          bmiStatuses: statusFilter,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });

        if (!isMounted.current || requestId !== lastRequestId.current) return;

        if (nextOffset === 0) {
          setRows(result.rows);
        } else {
          setRows(prev => [...prev, ...result.rows]);
        }
        setTotalCount(result.totalCount);
        setOffset(nextOffset + result.rows.length);
        setLoadState('idle');
      } catch (err: any) {
        if (!isMounted.current || requestId !== lastRequestId.current) return;
        console.log('❌ searchReports error:', err);
        setErrorMsg(err?.message ?? 'Search failed. Please try again.');
        setLoadState('error');
      }
    },
    [partner?.auth_id, debouncedQuery, fromDate, toDate, statusFilter],
  );

  const handleRefresh = () => runSearch(0, 'refreshing');

  const handleLoadMore = () => {
    if (loadState === 'idle' && rows.length < totalCount && rows.length > 0) {
      runSearch(offset, 'loadingMore');
    }
  };

  // ─────────────────────────────────────────────
  //  Filter helpers
  // ─────────────────────────────────────────────
  const activeFilterCount =
    (fromDate != null || toDate != null ? 1 : 0) +
    (statusFilter.length > 0 ? 1 : 0);

  const clearAllFilters = () => {
    setFromDate(null);
    setToDate(null);
    setStatusFilter([]);
  };

  const toggleStatus = (s: BmiStatusFilter) => {
    setStatusFilter(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s],
    );
  };

  // Quick date-range presets — a full calendar picker is overkill here.
  const applyDatePreset = (days: number) => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - (days - 1));
    setFromDate(startOfDay(from));
    setToDate(endOfDay(now));
    closeDateSheet();
  };

  const applyDateAllTime = () => {
    setFromDate(null);
    setToDate(null);
    closeDateSheet();
  };

  // ─────────────────────────────────────────────
  //  Sheet open / close
  // ─────────────────────────────────────────────
  const openDateSheet = () => {
    setDateSheetVisible(true);
    Animated.spring(dateSheetAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };
  const closeDateSheet = () => {
    Animated.timing(dateSheetAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 240,
      useNativeDriver: true,
    }).start(() => setDateSheetVisible(false));
  };

  const openStatusSheet = () => {
    setStatusSheetVisible(true);
    Animated.spring(statusSheetAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };
  const closeStatusSheet = () => {
    Animated.timing(statusSheetAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 240,
      useNativeDriver: true,
    }).start(() => setStatusSheetVisible(false));
  };

  // ─────────────────────────────────────────────
  //  Detail modal actions
  // ─────────────────────────────────────────────
  const handleView = (row: BmiReportRow) => {
    setDetailRow(null);
    navigation.navigate('PartnerReportPreview', {
      record: {
        id: row.client_uuid,
        height: row.height_cm.toString(),
        weight: row.weight_kg.toString(),
        bmi: row.bmi.toString(),
        bmiStatus: row.bmi_status ?? 'Normal',
        idealWeight: '',
        bodyFatPercentage: row.fat_percent?.toString() ?? '',
        fatMass: '',
        leanBodyMass: '',
        healthScore: '',
        gender: row.gender,
        age: row.age.toString(),
        name: row.patient_name,
        mobile: row.mobile,
        dataSource: row.bt_device_name === 'QR-SCAN' ? 'qr' : 'bluetooth',
        machineId: row.bt_device_address ?? 'QR-SCAN',
        timestamp: new Date(row.created_at).toISOString(),
      },
    });
  };

  const handleShare = async (row: BmiReportRow) => {
    try {
      // If your generateReportPdf returns a filepath, we can plug into
      // react-native-share with { url: filepath }. For now, share as text
      // as a safe universal fallback.
      // TODO: wire to generateReportPdf() → react-native-share for real PDF.
      const text =
        `BMI Report — ${row.patient_name}\n` +
        `Mobile: ${row.mobile}\n` +
        `Height: ${row.height_cm} cm  |  Weight: ${row.weight_kg} kg\n` +
        `BMI: ${row.bmi} (${row.bmi_status ?? 'Normal'})\n` +
        `Fat%: ${row.fat_percent ?? '—'}\n` +
        `Date: ${formatDateTime(row.created_at)}\n` +
        `\n— MySehat`;

      await Share.share({
        message: text,
        title: `BMI Report — ${row.patient_name}`,
      });
    } catch (err: any) {
      console.log('❌ Share error:', err);
    }
  };

  const handleCall = (row: BmiReportRow) => {
    const digits = row.mobile.replace(/\D/g, '');
    if (!digits) {
      Alert.alert('No number', 'This report has no valid mobile number.');
      return;
    }
    setDetailRow(null);
    Linking.openURL(`tel:${digits}`).catch(err => {
      console.log('❌ tel: link error:', err);
      Alert.alert('Error', 'Could not open the dialer.');
    });
  };

  // ─────────────────────────────────────────────
  //  Render helpers
  // ─────────────────────────────────────────────
  const renderResultCard = ({ item }: { item: BmiReportRow }) => {
    const status = (item.bmi_status ?? 'Normal') as BmiStatusFilter;
    const statusColor = STATUS_COLORS[status] ?? COLORS.textMuted;
    const isSynced = item.sync_status === 'synced';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.resultCard,
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => setDetailRow(item)}
        accessibilityRole="button"
        accessibilityLabel={`Report for ${item.patient_name}, BMI ${item.bmi}`}
      >
        <View style={styles.resultTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultName} numberOfLines={1}>
              {item.patient_name}
            </Text>
            <Text style={styles.resultMobile}>{item.mobile}</Text>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: statusColor + '22',
                borderColor: statusColor + '55',
              },
            ]}
          >
            <Text style={[styles.statusPillText, { color: statusColor }]}>
              {status}
            </Text>
          </View>
        </View>

        <View style={styles.resultBottom}>
          <Text style={styles.resultMeta}>
            BMI {item.bmi} · {item.gender}, {item.age}y
          </Text>
          <Text style={styles.resultDate}>{formatDate(item.created_at)}</Text>
        </View>

        {!isSynced && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>
              {item.sync_status === 'failed' ? 'Sync failed' : 'Pending sync'}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  const renderListFooter = () => {
    if (loadState === 'loadingMore') {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      );
    }
    if (rows.length > 0 && rows.length >= totalCount) {
      return (
        <Text style={styles.endOfList}>
          End of results · {totalCount} total
        </Text>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (loadState === 'loading') {
      return (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyText}>Searching…</Text>
        </View>
      );
    }
    if (loadState === 'error') {
      return (
        <View style={styles.emptyWrap}>
          <AlertCircle size={40} color={COLORS.error} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Search failed</Text>
          <Text style={styles.emptyText}>{errorMsg}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => runSearch(0, 'loading')}
          >
            <RefreshCw size={14} color={COLORS.primary} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    const hasFilters = debouncedQuery.length > 0 || activeFilterCount > 0;
    return (
      <View style={styles.emptyWrap}>
        <Inbox size={44} color={COLORS.textMuted} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>
          {hasFilters ? 'No matching reports' : 'No reports yet'}
        </Text>
        <Text style={styles.emptyText}>
          {hasFilters
            ? 'Try adjusting your search or clearing filters.'
            : 'Reports you save will appear here.'}
        </Text>
        {hasFilters && (
          <Pressable style={styles.retryBtn} onPress={clearAllFilters}>
            <X size={14} color={COLORS.primary} />
            <Text style={styles.retryText}>Clear filters</Text>
          </Pressable>
        )}
      </View>
    );
  };

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  const showingList = rows.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Reports</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchBarWrap}>
        <Search size={18} color={COLORS.textMuted} strokeWidth={2.5} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or mobile"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search query"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery('')}
            hitSlop={10}
            accessibilityLabel="Clear search"
          >
            <X size={18} color={COLORS.textMuted} strokeWidth={2.5} />
          </Pressable>
        )}
      </View>

      {/* ── Filter chips row ── */}
      <View style={styles.filterRow}>
        <FilterChip
          icon={
            <Calendar
              size={13}
              color={fromDate || toDate ? COLORS.primary : COLORS.textSecondary}
              strokeWidth={2.5}
            />
          }
          label={
            fromDate && toDate
              ? `${formatDate(fromDate)} – ${formatDate(toDate)}`
              : 'Date range'
          }
          active={fromDate != null || toDate != null}
          onPress={openDateSheet}
        />
        <FilterChip
          icon={
            <Activity
              size={13}
              color={
                statusFilter.length > 0 ? COLORS.primary : COLORS.textSecondary
              }
              strokeWidth={2.5}
            />
          }
          label={
            statusFilter.length > 0
              ? `${statusFilter.length} status`
              : 'BMI status'
          }
          active={statusFilter.length > 0}
          onPress={openStatusSheet}
        />
        {activeFilterCount > 0 && (
          <Pressable
            style={styles.clearFiltersBtn}
            onPress={clearAllFilters}
            accessibilityLabel="Clear all filters"
          >
            <X size={12} color={COLORS.textSecondary} strokeWidth={2.5} />
            <Text style={styles.clearFiltersText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* ── Result count + data source label ── */}
      {showingList && (
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            Showing {rows.length} of {totalCount}
          </Text>
          <View style={styles.sourceBadge}>
            <Circle size={6} color={COLORS.success} fill={COLORS.success} />
            <Text style={styles.sourceText}>Offline results</Text>
          </View>
        </View>
      )}

      {/* ── Results list ── */}
      <FlatList
        data={rows}
        keyExtractor={item => item.client_uuid}
        renderItem={renderResultCard}
        contentContainerStyle={
          showingList ? { paddingBottom: 24 + insets.bottom } : { flex: 1 }
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderListFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshing={loadState === 'refreshing'}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DATE RANGE BOTTOM SHEET                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={dateSheetVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDateSheet}
      >
        <Pressable style={styles.sheetOverlay} onPress={closeDateSheet} />
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: dateSheetAnim }] },
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Date range</Text>
            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={closeDateSheet}
              accessibilityLabel="Close"
            >
              <X size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.presetGrid}>
            <PresetBtn label="Today" onPress={() => applyDatePreset(1)} />
            <PresetBtn label="Last 7 days" onPress={() => applyDatePreset(7)} />
            <PresetBtn
              label="Last 30 days"
              onPress={() => applyDatePreset(30)}
            />
            <PresetBtn
              label="Last 90 days"
              onPress={() => applyDatePreset(90)}
            />
          </View>

          <Pressable style={styles.allTimeBtn} onPress={applyDateAllTime}>
            <Text style={styles.allTimeText}>All time</Text>
          </Pressable>

          <Text style={styles.sheetNote}>
            For custom ranges, add a calendar picker later.
          </Text>
        </Animated.View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BMI STATUS BOTTOM SHEET                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={statusSheetVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeStatusSheet}
      >
        <Pressable style={styles.sheetOverlay} onPress={closeStatusSheet} />
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: statusSheetAnim }] },
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>BMI status</Text>
            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={closeStatusSheet}
              accessibilityLabel="Close"
            >
              <X size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.statusList}>
            {BMI_STATUSES.map(s => {
              const selected = statusFilter.includes(s);
              const color = STATUS_COLORS[s];
              return (
                <Pressable
                  key={s}
                  style={[
                    styles.statusRow,
                    selected && { backgroundColor: color + '15' },
                  ]}
                  onPress={() => toggleStatus(s)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  <View
                    style={[styles.statusDot, { backgroundColor: color }]}
                  />
                  <Text style={styles.statusName}>{s}</Text>
                  {selected ? (
                    <CheckCircle2 size={20} color={color} strokeWidth={2.5} />
                  ) : (
                    <Circle
                      size={20}
                      color={COLORS.textMuted}
                      strokeWidth={2}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.applyBtn} onPress={closeStatusSheet}>
            <Text style={styles.applyBtnText}>Done</Text>
          </Pressable>
        </Animated.View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DETAIL MODAL                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={detailRow != null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDetailRow(null)}
      >
        <Pressable
          style={styles.detailOverlay}
          onPress={() => setDetailRow(null)}
        >
          <Pressable
            style={styles.detailDialog}
            onPress={e => e.stopPropagation()}
          >
            {detailRow && (
              <>
                <View style={styles.detailHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>
                      {detailRow.patient_name}
                    </Text>
                    <Text style={styles.detailSub}>
                      {detailRow.gender}, {detailRow.age}y · {detailRow.mobile}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.detailCloseBtn}
                    onPress={() => setDetailRow(null)}
                    accessibilityLabel="Close details"
                  >
                    <X size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.metricsGrid}>
                  <MetricBox
                    label="Height"
                    value={`${detailRow.height_cm} cm`}
                  />
                  <MetricBox
                    label="Weight"
                    value={`${detailRow.weight_kg} kg`}
                  />
                  <MetricBox
                    label="BMI"
                    value={detailRow.bmi.toFixed(1)}
                    highlight
                  />
                  <MetricBox
                    label="Status"
                    value={detailRow.bmi_status ?? '—'}
                    color={
                      STATUS_COLORS[
                        (detailRow.bmi_status ?? 'Normal') as BmiStatusFilter
                      ]
                    }
                  />
                  {detailRow.fat_percent != null && (
                    <MetricBox
                      label="Fat %"
                      value={`${detailRow.fat_percent}%`}
                    />
                  )}
                </View>

                <Text style={styles.detailTimestamp}>
                  Recorded {formatDateTime(detailRow.created_at)}
                </Text>

                <View style={styles.detailActions}>
                  <ActionBtn
                    icon={
                      <FileText
                        size={18}
                        color={COLORS.primary}
                        strokeWidth={2.5}
                      />
                    }
                    label="View"
                    onPress={() => handleView(detailRow)}
                  />
                  <ActionBtn
                    icon={
                      <Share2
                        size={18}
                        color={COLORS.primary}
                        strokeWidth={2.5}
                      />
                    }
                    label="Share"
                    onPress={() => handleShare(detailRow)}
                  />
                  <ActionBtn
                    icon={
                      <PhoneCall
                        size={18}
                        color={COLORS.primary}
                        strokeWidth={2.5}
                      />
                    }
                    label="Call"
                    onPress={() => handleCall(detailRow)}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
//  Small subcomponents
// ─────────────────────────────────────────────
function FilterChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      <Text
        style={[styles.chipText, active && styles.chipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PresetBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.presetBtn} onPress={onPress}>
      <Text style={styles.presetText}>{label}</Text>
    </Pressable>
  );
}

function MetricBox({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <View style={[styles.metricBox, highlight && styles.metricBoxHighlight]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : null]}>
        {value}
      </Text>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.appBackground },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 200,
  },
  chipActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primaryBorder,
  },
  chipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: COLORS.primary },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearFiltersText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  metaText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },

  resultCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    gap: 8,
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  resultName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  resultMobile: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  statusPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  resultBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultMeta: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  resultDate: { color: COLORS.textMuted, fontSize: 12 },
  pendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251,146,60,0.12)',
    borderColor: 'rgba(251,146,60,0.35)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  pendingBadgeText: { color: COLORS.warning, fontSize: 10, fontWeight: '700' },

  footerLoader: { paddingVertical: 20 },
  endOfList: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  retryText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

  // ── Sheets ──
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.divider,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetNote: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  presetBtn: {
    flexGrow: 1,
    minWidth: '47%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.appBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  presetText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  allTimeBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: 'center',
    marginTop: 4,
  },
  allTimeText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },

  statusList: { gap: 6, marginBottom: 14 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.appBackground,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusName: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  // ── Detail modal ──
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detailDialog: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  detailName: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },
  detailSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  detailCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metricBox: {
    flexGrow: 1,
    minWidth: '30%',
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.appBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricBoxHighlight: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primaryBorder,
  },
  metricLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  metricValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  detailTimestamp: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 14,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.appBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionLabel: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
});
