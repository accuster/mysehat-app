// components/screens/user/SupportScreen.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import SupportView, {
  SupportTicket,
  TicketTimelineEvent,
} from './SupportView';

export default function SupportScreen({ navigation }: any) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  
  // ✅ Add safe area hook
  const insets = useSafeAreaInsets();

  // Handle back navigation
  const handleBack = () => {
    navigation.goBack();
  };

  const createTicket = async ({
    category,
    message,
  }: {
    category: string;
    message: string;
  }) => {
    // mock ticket creation
    const id = 'TKT-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    setTickets(prev => [
      {
        id,
        category,
        message,
        createdAt: new Date().toLocaleString(),
        status: 'Open',
      },
      ...prev,
    ]);

    return { ok: true as const, ticketId: id };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchTimeline = async (ticketId: string) => {
    // mock timeline
    const events: TicketTimelineEvent[] = [
      { at: 'Today', status: 'Open', note: 'Ticket created' },
      { at: 'Pending', status: 'In Progress' },
    ];

    return { ok: true as const, events };
  };

  return (
    // ✅ Add 'bottom' to edges
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ✅ Simple Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Support Content - ✅ Pass safe area insets */}
      <SupportView
        tickets={tickets}
        onCreateTicket={createTicket}
        onFetchTimeline={fetchTimeline}
        bottomInset={insets.bottom}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
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
});