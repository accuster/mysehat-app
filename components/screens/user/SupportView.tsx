// components/screens/user/SupportView.tsx
/* eslint-disable react-native/no-inline-styles */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export type SupportTicket = {
  id: string;
  category: string;
  message: string;
  createdAt: string;
  status: TicketStatus;
};

export type TicketTimelineEvent = {
  at: string;
  status: string;
  note?: string;
};

type Props = {
  tickets: SupportTicket[];
  onCreateTicket: (payload: {
    category: string;
    message: string;
  }) => Promise<{ ok: true; ticketId: string } | { ok: false; error: string }>;
  onFetchTimeline: (
    ticketId: string,
  ) => Promise<
    { ok: true; events: TicketTimelineEvent[] } | { ok: false; error: string }
  >;
  bottomInset: number;
  onMessageChange?: (hasMessage: boolean) => void;
};

export default function SupportView({
  tickets,
  onCreateTicket,
  onFetchTimeline,
  bottomInset,
  onMessageChange,
}: Props) {
  const isMounted = useRef(true);
  
  const [view, setView] = useState<'form' | 'success' | 'history'>(
    tickets.length ? 'history' : 'form',
  );

  const categories = ['App', 'Payment', 'Report', 'Device', 'Other'];
  const [category, setCategory] = useState('App');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastTicketId, setLastTicketId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [timelineLoadingId, setTimelineLoadingId] = useState<string | null>(
    null,
  );
  const [timelineById, setTimelineById] = useState<
    Record<string, TicketTimelineEvent[]>
  >({});
  const [timelineErrorById, setTimelineErrorById] = useState<
    Record<string, string>
  >({});

  const MIN_MESSAGE_LENGTH = 10;
  const MAX_MESSAGE_LENGTH = 1000;

  useEffect(() => {
    isMounted.current = true;
    
    console.log('🎫 SupportView: Component mounted');

    return () => {
      console.log('🧹 SupportView: Unmounting...');
      isMounted.current = false;
      
      if (submitting || timelineLoadingId) {
        console.log('⚠️ Component unmounted during async operation');
      }
    };
  }, [submitting, timelineLoadingId]);

  useEffect(() => {
    setView(v => (tickets.length && v === 'form' ? 'history' : v));
  }, [tickets.length]);

  useEffect(() => {
    setShowCategoryDropdown(false);
  }, [view]);

  useEffect(() => {
    if (onMessageChange) {
      onMessageChange(message.trim().length > 0 && view === 'form');
    }
  }, [message, view, onMessageChange]);

  const validateMessage = (text: string): string | null => {
    const trimmed = text.trim();
    
    if (trimmed.length < MIN_MESSAGE_LENGTH) {
      return `Please add more detail (minimum ${MIN_MESSAGE_LENGTH} characters).`;
    }
    
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return `Message is too long (maximum ${MAX_MESSAGE_LENGTH} characters).`;
    }
    
    if (/<[^>]*>/g.test(trimmed)) {
      return 'HTML tags are not allowed in messages.';
    }
    
    return null;
  };

  const submit = async () => {
    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, aborting submit');
      return;
    }
    
    setError(null);

    const validationError = validateMessage(message);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    
    try {
      console.log('📤 Submitting ticket...');
      
      const res = await onCreateTicket({ 
        category, 
        message: message.trim() 
      });
      
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted after ticket submission');
        return;
      }
      
      if (!res.ok) {
        setError(res.error);
        return;
      }
      
      console.log('✅ Ticket submitted:', res.ticketId);
      
      setLastTicketId(res.ticketId);
      setMessage('');
      setView('success');
      setShowCategoryDropdown(false);
    } catch (err) {
      // ✅ FIX: Use different variable name to avoid ESLint warning
      console.log('❌ Submit error:', err);
      
      if (isMounted.current) {
        setError('Failed to submit ticket. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  const toggleTimeline = async (ticketId: string) => {
    if (!isMounted.current) {
      console.log('⚠️ Component unmounted, aborting timeline toggle');
      return;
    }
    
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
      return;
    }

    setExpandedTicketId(ticketId);
    if (timelineById[ticketId]) return;

    setTimelineLoadingId(ticketId);
    setTimelineErrorById(p => ({ ...p, [ticketId]: '' }));

    try {
      console.log('📅 Fetching timeline for:', ticketId);
      
      const res = await onFetchTimeline(ticketId);
      
      if (!isMounted.current) {
        console.log('⚠️ Component unmounted after timeline fetch');
        return;
      }
      
      if (!res.ok) {
        setTimelineErrorById(p => ({ ...p, [ticketId]: res.error }));
        setTimelineLoadingId(null);
        return;
      }

      console.log('✅ Timeline loaded');
      
      setTimelineById(p => ({ ...p, [ticketId]: res.events }));
      setTimelineLoadingId(null);
    } catch (err) {
      // ✅ FIX: Use different variable name to avoid ESLint warning
      console.log('❌ Timeline fetch error:', err);
      
      if (isMounted.current) {
        setTimelineErrorById(p => ({ ...p, [ticketId]: 'Failed to load timeline' }));
        setTimelineLoadingId(null);
      }
    }
  };

  const scrollBottomPadding = 24 + (bottomInset > 0 ? bottomInset : 0);

  const messageLength = message.trim().length;
  const isValidLength = messageLength >= MIN_MESSAGE_LENGTH && messageLength <= MAX_MESSAGE_LENGTH;

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      {/* Header */}
      <View
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}
      >
        <Text style={{ color: '#A1A1AA', marginTop: 6 }}>
          Raise a ticket and track your support history
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Pressable
            onPress={() => setView('form')}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor:
                view === 'form' ? 'rgba(168,85,247,0.35)' : '#27272A',
              backgroundColor:
                view === 'form' ? 'rgba(168,85,247,0.18)' : '#111827',
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '700' }}>New Ticket</Text>
          </Pressable>

          <Pressable
            onPress={() => setView('history')}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor:
                view === 'history' ? 'rgba(168,85,247,0.35)' : '#27272A',
              backgroundColor:
                view === 'history' ? 'rgba(168,85,247,0.18)' : '#111827',
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '700' }}>History</Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ 
          paddingHorizontal: 16, 
          paddingBottom: scrollBottomPadding 
        }}
      >
        {view === 'success' ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: '#27272A',
              backgroundColor: 'rgba(24,24,27,0.6)',
              borderRadius: 18,
              padding: 16,
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>
              Ticket submitted
            </Text>
            <Text style={{ color: '#A1A1AA', marginTop: 8 }}>
              Your Ticket ID is
            </Text>

            <View
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#27272A',
                backgroundColor: '#0B0B0F',
              }}
            >
              <Text style={{ color: '#FFF', fontFamily: 'monospace' }}>
                {lastTicketId}
              </Text>
            </View>

            <Text style={{ color: '#71717A', marginTop: 10, fontSize: 12 }}>
              We'll get back to you as soon as possible.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable
                onPress={() => setView('history')}
                style={{
                  flex: 1,
                  backgroundColor: '#7C3AED',
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>
                  View History
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setView('form')}
                style={{
                  flex: 1,
                  backgroundColor: '#111827',
                  borderWidth: 1,
                  borderColor: '#27272A',
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>
                  Create Another
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {view === 'form' ? (
          <View style={{ gap: 12 }}>
            {error ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.35)',
                  backgroundColor: 'rgba(239,68,68,0.10)',
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <Text style={{ color: '#FCA5A5', fontWeight: '700' }}>
                  {error}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                borderWidth: 1,
                borderColor: '#27272A',
                backgroundColor: 'rgba(24,24,27,0.6)',
                borderRadius: 18,
                padding: 16,
              }}
            >
              <Text style={{ color: '#A1A1AA', fontSize: 12, marginBottom: 8 }}>
                Category
              </Text>

              <Pressable
                style={styles.dropdown}
                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                <Text style={styles.dropdownText}>{category}</Text>
                <Text style={styles.dropdownArrow}>▾</Text>
              </Pressable>

              {showCategoryDropdown && (
                <View style={styles.dropdownMenu}>
                  {categories.map(cat => (
                    <Pressable
                      key={cat}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          cat === category && styles.dropdownItemActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text
                style={{
                  color: '#A1A1AA',
                  fontSize: 12,
                  marginTop: 14,
                  marginBottom: 8,
                }}
              >
                Message
              </Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your issue in detail…"
                placeholderTextColor="#52525B"
                multiline
                maxLength={MAX_MESSAGE_LENGTH}
                editable={!submitting}
                style={{
                  minHeight: 120,
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#27272A',
                  backgroundColor: '#0B0B0F',
                  color: '#FFF',
                  textAlignVertical: 'top',
                }}
              />
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: '#71717A', fontSize: 12 }}>
                  Tip: For device issues, mention model/serial no.
                </Text>
                <Text style={{ 
                  color: isValidLength ? '#10B981' : '#71717A', 
                  fontSize: 12,
                  fontWeight: '600'
                }}>
                  {messageLength}/{MAX_MESSAGE_LENGTH}
                </Text>
              </View>

              <Pressable
                onPress={submit}
                disabled={submitting || !isValidLength}
                style={{
                  marginTop: 14,
                  backgroundColor: '#7C3AED',
                  opacity: (submitting || !isValidLength) ? 0.5 : 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: 'center',
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: '900' }}>
                    Submit Ticket
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Contact info */}
            <View
              style={{
                borderWidth: 1,
                borderColor: '#27272A',
                backgroundColor: 'rgba(24,24,27,0.35)',
                borderRadius: 18,
                padding: 16,
              }}
            >
              <Text style={{ color: '#A1A1AA', fontSize: 12 }}>Contact</Text>
              <Text style={{ color: '#FFF', marginTop: 8 }}>
                Email: support@mysehat.ai
              </Text>
              <Text style={{ color: '#FFF', marginTop: 6 }}>
                Phone: +91 98765 43210
              </Text>
              <Text style={{ color: '#71717A', marginTop: 6 }}>
                Working hours: Mon–Sat, 9:00 AM – 6:00 PM
              </Text>

              <Text style={{ color: '#A1A1AA', fontSize: 12, marginTop: 14 }}>
                Support policy
              </Text>
              <Text style={{ color: '#71717A', marginTop: 6, lineHeight: 18 }}>
                • Response within 24 working hours{'\n'}• Payment issues are
                prioritized{'\n'}• Add device details when applicable{'\n'}•
                Track status in History
              </Text>
            </View>
          </View>
        ) : null}

        {view === 'history' ? (
          <View style={{ gap: 12 }}>
            {tickets.length === 0 ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#27272A',
                  backgroundColor: 'rgba(24,24,27,0.45)',
                  borderRadius: 18,
                  padding: 16,
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>
                  No tickets yet
                </Text>
                <Text style={{ color: '#A1A1AA', marginTop: 8 }}>
                  Create a new ticket and it will appear here.
                </Text>
                <Pressable
                  onPress={() => setView('form')}
                  style={{
                    marginTop: 12,
                    backgroundColor: '#7C3AED',
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '900' }}>
                    Create Ticket
                  </Text>
                </Pressable>
              </View>
            ) : (
              tickets.map(t => (
                <View
                  key={t.id}
                  style={{
                    borderWidth: 1,
                    borderColor: '#27272A',
                    backgroundColor: 'rgba(24,24,27,0.6)',
                    borderRadius: 18,
                    padding: 14,
                  }}
                >
                  <Pressable onPress={() => toggleTimeline(t.id)}>
                    <Text style={{ color: '#A1A1AA', fontSize: 12 }}>
                      Ticket ID
                    </Text>
                    <Text
                      style={{
                        color: '#FFF',
                        fontFamily: 'monospace',
                        marginTop: 4,
                      }}
                    >
                      {t.id}
                    </Text>
                    <Text
                      style={{ color: '#71717A', marginTop: 6, fontSize: 12 }}
                    >
                      {t.category} • {t.createdAt}
                    </Text>

                    <View
                      style={{
                        marginTop: 10,
                        padding: 12,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: '#27272A',
                        backgroundColor: 'rgba(0,0,0,0.25)',
                      }}
                    >
                      <Text style={{ color: '#E4E4E7' }}>{t.message}</Text>
                    </View>

                    <Text
                      style={{
                        color: '#A855F7',
                        fontWeight: '800',
                        marginTop: 10,
                      }}
                    >
                      {expandedTicketId === t.id
                        ? 'Hide timeline ▲'
                        : 'View timeline ▼'}
                    </Text>
                  </Pressable>

                  {expandedTicketId === t.id ? (
                    <View style={{ marginTop: 10 }}>
                      {timelineLoadingId === t.id ? (
                        <Text style={{ color: '#A1A1AA' }}>
                          Loading timeline…
                        </Text>
                      ) : timelineErrorById[t.id] ? (
                        <View
                          style={{
                            borderWidth: 1,
                            borderColor: 'rgba(239,68,68,0.35)',
                            backgroundColor: 'rgba(239,68,68,0.10)',
                            borderRadius: 14,
                            padding: 12,
                          }}
                        >
                          <Text style={{ color: '#FCA5A5', fontWeight: '700' }}>
                            {timelineErrorById[t.id]}
                          </Text>
                        </View>
                      ) : timelineById[t.id] ? (
                        <View
                          style={{
                            borderWidth: 1,
                            borderColor: '#27272A',
                            backgroundColor: 'rgba(0,0,0,0.25)',
                            borderRadius: 14,
                            padding: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: '#A1A1AA',
                              fontSize: 12,
                              marginBottom: 10,
                            }}
                          >
                            Status timeline
                          </Text>
                          {timelineById[t.id].map((e, idx) => (
                            <View
                              key={idx}
                              style={{
                                flexDirection: 'row',
                                gap: 10,
                                marginBottom:
                                  idx === timelineById[t.id].length - 1
                                    ? 0
                                    : 12,
                              }}
                            >
                              <View style={{ alignItems: 'center' }}>
                                <View
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor: '#A855F7',
                                    marginTop: 4,
                                  }}
                                />
                                {idx !== timelineById[t.id].length - 1 ? (
                                  <View
                                    style={{
                                      width: 1,
                                      height: 22,
                                      backgroundColor: '#3F3F46',
                                      marginTop: 6,
                                    }}
                                  />
                                ) : null}
                              </View>
                              <View style={{ flex: 1 }}>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                  }}
                                >
                                  <Text
                                    style={{ color: '#FFF', fontWeight: '800' }}
                                  >
                                    {e.status}
                                  </Text>
                                  <Text
                                    style={{ color: '#71717A', fontSize: 12 }}
                                  >
                                    {e.at}
                                  </Text>
                                </View>
                                {e.note ? (
                                  <Text
                                    style={{ color: '#A1A1AA', marginTop: 4 }}
                                  >
                                    {e.note}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    backgroundColor: '#020617',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  dropdownText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  dropdownArrow: {
    color: '#94A3B8',
    fontSize: 14,
  },

  dropdownMenu: {
    backgroundColor: '#020617',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 6,
    overflow: 'hidden',
  },

  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },

  dropdownItemText: {
    color: '#CBD5E1',
    fontSize: 14,
  },

  dropdownItemActive: {
    color: '#A855F7',
    fontWeight: '700',
  },
});