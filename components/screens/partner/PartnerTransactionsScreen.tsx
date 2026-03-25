// components/screens/partner/PartnerTransactionsScreen.tsx
/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput, // ✅ proper import
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
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
import { fetchPartnerTransactions } from '../../../store/slices/partnerSlice';
import { TransactionFilters } from '../../../store/services/partnerApi';
import {
  ArrowLeft,
  SlidersHorizontal,
  X,
  Calendar,
  CreditCard,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Smartphone,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApiErrorHandler } from '../../../hooks/useApiErrorHandler';
import AppHeader from '../../common/AppHeader';
import AppDrawer from '../../common/AppDrawer';

type Props = { navigation: any };

type FilterState = {
  from: Date | null;
  to: Date | null;
  paymentMethod: 'all' | 'UPI' | 'Card' | 'NetBanking' | 'Wallet';
  amountMin: string;
  amountMax: string;
};

const INITIAL_FILTERS: FilterState = {
  from: null,
  to: null,
  paymentMethod: 'all',
  amountMin: '',
  amountMax: '',
};

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateForPicker(date: Date | null) {
  if (!date) return 'Select Date';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toQueryDate(date: Date | null): string | undefined {
  if (!date) return undefined;
  return date.toISOString().split('T')[0];
}

function buildApiFilters(
  filters: FilterState,
  page: number,
): TransactionFilters {
  const result: TransactionFilters = { page, limit: PAGE_SIZE };
  if (filters.from) result.from = toQueryDate(filters.from);
  if (filters.to) result.to = toQueryDate(filters.to);
  return result;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const isPaid = s === 'paid';
  const isPending = s === 'pending' || s === 'processing';
  const color = isPaid ? '#10B981' : isPending ? '#F59E0B' : '#EF4444';
  const bg = isPaid
    ? 'rgba(16,185,129,0.12)'
    : isPending
    ? 'rgba(245,158,11,0.12)'
    : 'rgba(239,68,68,0.1)';
  const Icon = isPaid ? CheckCircle : isPending ? Clock : XCircle;
  const label = isPaid ? 'Paid' : isPending ? 'Pending' : 'Failed';

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: color }]}>
      <Icon size={11} color={color} strokeWidth={2.5} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PartnerTransactionsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const isMounted = useRef(true);

  const { executeApiCall } = useApiErrorHandler();

  const {
    transactions,
    transactionsPagination,
    transactionsLoading,
    transactionsError,
  } = useAppSelector(s => s.partner);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // ── Filter / pagination ───────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeFiltersCount = [
    appliedFilters.from,
    appliedFilters.to,
    appliedFilters.paymentMethod !== 'all'
      ? appliedFilters.paymentMethod
      : null,
    appliedFilters.amountMin || appliedFilters.amountMax ? 'amount' : null,
  ].filter(Boolean).length;

  const hasMorePages = transactionsPagination
    ? currentPage < transactionsPagination.totalPages
    : false;

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(
    async (page: number, applied: FilterState) => {
      await executeApiCall(
        () =>
          dispatch(
            fetchPartnerTransactions(buildApiFilters(applied, page)),
          ).unwrap(),
        {
          showSuccessToast: false,
          showErrorToast: true,
          customErrorMessage: 'Failed to load transactions',
          retryCallback: () => load(page, applied),
        },
      );
    },
    [dispatch, executeApiCall],
  );

  useEffect(() => {
    isMounted.current = true;
    load(1, INITIAL_FILTERS);
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hardware back ─────────────────────────────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }
      if (showFilterModal) {
        setShowFilterModal(false);
        return true;
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [drawerOpen, showFilterModal, navigation]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    if (!isMounted.current) return;
    setRefreshing(true);
    setCurrentPage(1);
    await load(1, appliedFilters);
    if (isMounted.current) setRefreshing(false);
  }, [load, appliedFilters]);

  // ── Load more ─────────────────────────────────────────────────────────────
  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMorePages || transactionsLoading) return;
    const next = currentPage + 1;
    setLoadingMore(true);
    setCurrentPage(next);
    await load(next, appliedFilters);
    if (isMounted.current) setLoadingMore(false);
  }, [
    loadingMore,
    hasMorePages,
    transactionsLoading,
    currentPage,
    load,
    appliedFilters,
  ]);

  // ── Apply / reset filters ─────────────────────────────────────────────────
  const handleApplyFilters = useCallback(async () => {
    setShowFilterModal(false);
    setAppliedFilters(filters);
    setCurrentPage(1);
    await load(1, filters);
  }, [filters, load]);

  const handleResetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  // ── Client-side filter (payment method + amount) ──────────────────────────
  const displayed = transactions.filter(tx => {
    if (appliedFilters.paymentMethod !== 'all') {
      const m = tx.payment_method?.toLowerCase() ?? '';
      if (!m.includes(appliedFilters.paymentMethod.toLowerCase())) return false;
    }
    if (appliedFilters.amountMin !== '') {
      if ((tx.test_fee ?? 0) < parseFloat(appliedFilters.amountMin))
        return false;
    }
    if (appliedFilters.amountMax !== '') {
      if ((tx.test_fee ?? 0) > parseFloat(appliedFilters.amountMax))
        return false;
    }
    return true;
  });

  const bottomPad = 20 + (insets.bottom > 0 ? insets.bottom : 0);

  // ── Sub-header ────────────────────────────────────────────────────────────
  const ScreenHeader = () => (
    <View style={styles.screenHeader}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
      >
        <ArrowLeft size={24} color="#FAFAFA" />
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Transactions</Text>
      <View style={styles.placeholder} />
    </View>
  );

  // ── Card ──────────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: (typeof transactions)[0] }) => (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <Text style={styles.orderId} numberOfLines={1}>
            #{item.order_id}
          </Text>
          <StatusBadge status={item.payment_status} />
        </View>

        <View style={styles.cardMidRow}>
          <View style={styles.metaItem}>
            <Smartphone size={12} color="#71717A" strokeWidth={2} />
            <Text style={styles.metaText}>{item.machine_id}</Text>
          </View>
          {item.machine_location ? (
            <View style={styles.metaItem}>
              <MapPin size={12} color="#71717A" strokeWidth={2} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.machine_location}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardBottomRow}>
          <View>
            <Text style={styles.dateText}>
              {formatDate(item.payment_completed_at ?? item.scan_timestamp)}
            </Text>
            <Text style={styles.timeText}>
              {formatTime(item.payment_completed_at ?? item.scan_timestamp)}
              {item.payment_method ? `  •  ${item.payment_method}` : ''}
              {item.payment_gateway ? `  •  ${item.payment_gateway}` : ''}
            </Text>
          </View>
          <Text style={styles.amount}>
            ₹{Number(item.test_fee ?? 0).toFixed(0)}
          </Text>
        </View>
      </View>
    ),
    [],
  );

  const ListFooter = () => {
    if (loadingMore)
      return (
        <View style={styles.footerRow}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    if (!hasMorePages && transactions.length > 0)
      return (
        <Text style={styles.endText}>
          — {transactionsPagination?.total ?? transactions.length} total
          transactions —
        </Text>
      );
    return null;
  };

  // ── Shared drawer + header snippet ───────────────────────────────────────
  const DrawerAndHeader = () => (
    <>
      <AppHeader onMenuClick={() => setDrawerOpen(true)} />
      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />
      <ScreenHeader />
    </>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (transactionsLoading && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DrawerAndHeader />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (transactionsError && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DrawerAndHeader />
        <View style={styles.center}>
          <Text style={styles.errorText}>{transactionsError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => load(1, appliedFilters)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DrawerAndHeader />

      {/* Filter bar */}
      <View style={styles.filterBar}>
        {activeFiltersCount > 0 ? (
          <Text style={styles.filterSummary}>
            {transactionsPagination?.total ?? 0} results
          </Text>
        ) : (
          <View />
        )}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => {
            setFilters(appliedFilters);
            setShowFilterModal(true);
          }}
        >
          <SlidersHorizontal size={18} color="#FAFAFA" strokeWidth={2.5} />
          <Text style={styles.filterBtnText}>Filter</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* List */}
      {displayed.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>💳 No transactions found</Text>
          <Text style={styles.emptySubtext}>
            {activeFiltersCount > 0
              ? 'Try adjusting your filters'
              : 'Completed payments will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.order_id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7C3AED"
              colors={['#7C3AED']}
            />
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooter />}
        />
      )}

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
              <Text style={styles.modalTitle}>Filter Transactions</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Date Range */}
              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <Calendar size={18} color="#7C3AED" strokeWidth={2.5} />
                  <Text style={styles.filterLabel}>Date Range</Text>
                </View>
                <View style={styles.dateRow}>
                  <View style={styles.datePart}>
                    <Text style={styles.datePartLabel}>From</Text>
                    <TouchableOpacity
                      style={styles.dateBtn}
                      onPress={() => setShowFromPicker(true)}
                    >
                      <Calendar size={14} color="#A1A1AA" />
                      <Text style={styles.dateBtnText}>
                        {formatDateForPicker(filters.from)}
                      </Text>
                    </TouchableOpacity>
                    {filters.from && (
                      <TouchableOpacity
                        onPress={() => setFilters(f => ({ ...f, from: null }))}
                      >
                        <Text style={styles.clearDate}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.dateArrow}>→</Text>

                  <View style={styles.datePart}>
                    <Text style={styles.datePartLabel}>To</Text>
                    <TouchableOpacity
                      style={styles.dateBtn}
                      onPress={() => setShowToPicker(true)}
                    >
                      <Calendar size={14} color="#A1A1AA" />
                      <Text style={styles.dateBtnText}>
                        {formatDateForPicker(filters.to)}
                      </Text>
                    </TouchableOpacity>
                    {filters.to && (
                      <TouchableOpacity
                        onPress={() => setFilters(f => ({ ...f, to: null }))}
                      >
                        <Text style={styles.clearDate}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Payment Method */}
              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <CreditCard size={18} color="#7C3AED" strokeWidth={2.5} />
                  <Text style={styles.filterLabel}>Payment Method</Text>
                </View>
                <View style={styles.filterOptions}>
                  {(
                    ['all', 'UPI', 'Card', 'NetBanking', 'Wallet'] as const
                  ).map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.chip,
                        filters.paymentMethod === m && styles.chipActive,
                      ]}
                      onPress={() =>
                        setFilters(f => ({ ...f, paymentMethod: m }))
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          filters.paymentMethod === m && styles.chipTextActive,
                        ]}
                      >
                        {m === 'all'
                          ? 'All Methods'
                          : m === 'NetBanking'
                          ? 'Net Banking'
                          : m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Amount Range */}
              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <DollarSign size={18} color="#7C3AED" strokeWidth={2.5} />
                  <Text style={styles.filterLabel}>Amount Range (₹)</Text>
                </View>
                <View style={styles.rangeRow}>
                  <View style={styles.rangeBox}>
                    <Text style={styles.rangeLabel}>Min</Text>
                    <View style={styles.rangeInputWrapper}>
                      <Text style={styles.rupee}>₹</Text>
                      <TextInput
                        style={styles.rangeInputField}
                        placeholder="0"
                        placeholderTextColor="#52525B"
                        value={filters.amountMin}
                        onChangeText={v =>
                          setFilters(f => ({ ...f, amountMin: v }))
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <Text style={styles.rangeSep}>—</Text>
                  <View style={styles.rangeBox}>
                    <Text style={styles.rangeLabel}>Max</Text>
                    <View style={styles.rangeInputWrapper}>
                      <Text style={styles.rupee}>₹</Text>
                      <TextInput
                        style={styles.rangeInputField}
                        placeholder="9999"
                        placeholderTextColor="#52525B"
                        value={filters.amountMax}
                        onChangeText={v =>
                          setFilters(f => ({ ...f, amountMax: v }))
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
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

        {showFromPicker && (
          <DateTimePicker
            value={filters.from ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={filters.to ?? new Date()}
            onChange={(_, d) => {
              setShowFromPicker(Platform.OS === 'ios');
              if (d) setFilters(f => ({ ...f, from: d }));
            }}
          />
        )}
        {showToPicker && (
          <DateTimePicker
            value={filters.to ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={filters.from ?? undefined}
            maximumDate={new Date()}
            onChange={(_, d) => {
              setShowToPicker(Platform.OS === 'ios');
              if (d) setFilters(f => ({ ...f, to: d }));
            }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  screenHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    backgroundColor: '#0B0B0F',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: { fontSize: 18, fontWeight: '700', color: '#FAFAFA' },
  placeholder: { width: 40 },

  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  filterSummary: { color: '#6B7280', fontSize: 12, fontWeight: '600' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F2937',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    position: 'relative',
  },
  filterBtnText: { color: '#FAFAFA', fontSize: 13, fontWeight: '600' },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  cardMidRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#6B7280', fontSize: 12 },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dateText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  timeText: { color: '#4B5563', fontSize: 11, marginTop: 2 },
  amount: { color: '#10B981', fontSize: 20, fontWeight: '800' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  loadingText: { color: '#6B7280', fontSize: 14, marginTop: 12 },
  errorText: {
    color: '#EF4444',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  retryText: { color: '#7C3AED', fontWeight: '700', fontSize: 14 },
  emptyText: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: { color: '#6B7280', fontSize: 14, textAlign: 'center' },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  footerText: { color: '#6B7280', fontSize: 13 },
  endText: {
    color: '#374151',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
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
    borderBottomColor: '#1F2937',
  },
  modalTitle: { color: '#FAFAFA', fontSize: 20, fontWeight: '800' },
  modalBody: { padding: 20 },
  filterSection: { marginBottom: 24 },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterLabel: { color: '#E5E7EB', fontSize: 16, fontWeight: '700' },

  dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  datePart: { flex: 1 },
  datePartLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0B0B0F',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  dateBtnText: { color: '#E5E7EB', fontSize: 13, fontWeight: '600' },
  clearDate: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  dateArrow: { color: '#4B5563', fontSize: 18, marginTop: 28 },

  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#0B0B0F',
    borderWidth: 1,
    borderColor: '#374151',
  },
  chipActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  chipText: { color: '#9CA3AF', fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#FFF' },

  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rangeBox: { flex: 1 },
  rangeLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  rangeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0B0F',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 10,
  },
  rupee: { color: '#6B7280', fontSize: 15, fontWeight: '700', marginRight: 4 },
  rangeInputField: {
    flex: 1,
    color: '#FAFAFA',
    fontSize: 15,
    paddingVertical: 10,
  },
  rangeSep: {
    color: '#4B5563',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
  },

  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0B0B0F',
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  resetBtnText: { color: '#9CA3AF', fontWeight: '800', fontSize: 15 },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
  },
  applyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
