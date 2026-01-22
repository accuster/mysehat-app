// components/screens/user/SupportScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, BackHandler, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import SupportView, {
  SupportTicket,
  TicketTimelineEvent,
} from './SupportView';

export default function SupportScreen({ navigation }: any) {
  // ✅ Add isMounted ref
  const isMounted = useRef(true);
  
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [hasUnsavedMessage, setHasUnsavedMessage] = useState(false);
  
  const insets = useSafeAreaInsets();

  // ✅ Setup and cleanup
  useEffect(() => {
    isMounted.current = true;
    
    console.log('🎫 SupportScreen: Component mounted');

    return () => {
      console.log('🧹 SupportScreen: Unmounting...');
      isMounted.current = false;
    };
  }, []);

  // ✅ Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      console.log('⬅️ HARDWARE BACK: SupportScreen');
      
      // ✅ Ask for confirmation if unsaved message
      if (hasUnsavedMessage) {
        Alert.alert(
          'Discard Message?',
          'You have an unsaved message. Are you sure you want to go back?',
          [
            {
              text: 'Stay',
              style: 'cancel',
            },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                if (isMounted.current) {
                  handleBack();
                }
              },
            },
          ]
        );
        return true; // Prevent default back
      }
      
      // ✅ Safe navigation when no unsaved data
      if (isMounted.current) {
        handleBack();
        return true;
      }
      
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation, hasUnsavedMessage]);

  // ✅ Safe navigation helper
  const handleBack = () => {
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted, aborting navigation');
      return;
    }
    
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  const createTicket = async ({
    category,
    message,
  }: {
    category: string;
    message: string;
  }) => {
    // ✅ Check if mounted
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted, aborting ticket creation');
      return { ok: false as const, error: 'Operation cancelled' };
    }
    
    try {
      console.log('🎫 Creating ticket:', { category, message: message.substring(0, 50) + '...' });
      
      // Mock ticket creation
      const id = 'TKT-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      // ✅ Check if still mounted before updating state
      if (!isMounted.current) {
        console.warn('⚠️ Component unmounted after ticket creation');
        return { ok: false as const, error: 'Operation cancelled' };
      }

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

      // ✅ Clear unsaved message flag
      setHasUnsavedMessage(false);

      console.log('✅ Ticket created:', id);
      return { ok: true as const, ticketId: id };
    } catch (error) {
      console.error('❌ Failed to create ticket:', error);
      return { ok: false as const, error: 'Failed to create ticket' };
    }
  };

  const fetchTimeline = async (ticketId: string) => {
    // ✅ Check if mounted
    if (!isMounted.current) {
      console.warn('⚠️ Component unmounted, aborting timeline fetch');
      return { ok: false as const, error: 'Operation cancelled' };
    }
    
    try {
      console.log('📅 Fetching timeline for:', ticketId);
      
      // Mock timeline
      const events: TicketTimelineEvent[] = [
        { at: 'Today', status: 'Open', note: 'Ticket created' },
        { at: 'Pending', status: 'In Progress' },
      ];

      // ✅ Check if still mounted before returning
      if (!isMounted.current) {
        console.warn('⚠️ Component unmounted after timeline fetch');
        return { ok: false as const, error: 'Operation cancelled' };
      }

      console.log('✅ Timeline fetched');
      return { ok: true as const, events };
    } catch (error) {
      console.error('❌ Failed to fetch timeline:', error);
      return { ok: false as const, error: 'Failed to fetch timeline' };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Support Content */}
      <SupportView
        tickets={tickets}
        onCreateTicket={createTicket}
        onFetchTimeline={fetchTimeline}
        bottomInset={insets.bottom}
        onMessageChange={setHasUnsavedMessage}
      />
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
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
});