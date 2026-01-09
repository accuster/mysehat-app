/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import { fetchTransactions } from '../../../store/slices/transactionSlice';
import { ArrowDownLeft, ArrowUpRight, ArrowLeft } from 'lucide-react-native';

type Props = {
  navigation: any;
};

export default function TransactionsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  
  // Redux state
  const { transactions, isLoading, error } = useAppSelector((state) => state.transactions);
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);

  // Fetch transactions on mount
  useEffect(() => {
    console.log('💳 TransactionsScreen: Component mounted');
    dispatch(fetchTransactions());
  }, [dispatch]);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    console.log('🔄 TransactionsScreen: Refreshing transactions...');
    setRefreshing(true);
    await dispatch(fetchTransactions());
    setRefreshing(false);
  };

  // Handle back navigation
  const handleBack = () => {
    navigation.goBack();
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

  // ✅ Calculate dynamic bottom padding for content
  const contentBottomPadding = 20 + (insets.bottom > 0 ? insets.bottom : 0);

  // Render loading state
  if (isLoading && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Simple Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction History</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Simple Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction History</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => dispatch(fetchTransactions())}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render empty state
  if (transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Simple Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction History</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>💳 No transactions found</Text>
          <Text style={styles.emptySubtext}>
            Your transaction history will appear here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Simple Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <FlatList
          data={transactions}
          keyExtractor={item => item.transaction_id}
          contentContainerStyle={{ paddingBottom: contentBottomPadding }} // ✅ Dynamic padding
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10B981"
              colors={['#10B981']}
            />
          }
          renderItem={({ item }) => {
            // Determine transaction type based on payment_method
            const isCredit = item.payment_method === 'UPI' || 
                            item.payment_method === 'Razorpay' || 
                            item.payment_method === 'Card' ||
                            item.payment_method === 'NetBanking';
            
            const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
            const title = 'BMI Report Purchase';
            const iconColor = isCredit ? '#22C55E' : '#F97316';
            const iconBg = isCredit ? 'rgba(34, 197, 94, 0.1)' : 'rgba(249, 115, 22, 0.1)';
            const amountColor = isCredit ? '#22C55E' : '#F97316';

            return (
              <View style={styles.card}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: iconBg },
                  ]}
                >
                  <Icon size={20} color={iconColor} />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.txnTitle}>{title}</Text>

                  <Text style={styles.txnDate}>
                    {formatDate(item.report_date)} • {formatTime(item.report_date)}
                  </Text>

                  <Text style={styles.txnId}>Txn ID: {item.transaction_id}</Text>
                </View>

                <Text
                  style={[
                    styles.txnAmount,
                    { color: amountColor },
                  ]}
                >
                  {isCredit ? '+' : '-'}₹{item.fee.toFixed(0)}
                </Text>
              </View>
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
    width: 40,
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
    backgroundColor: '#10B981',
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
  
  // Transaction card
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  txnDate: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  txnId: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
});