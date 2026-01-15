// components/screens/user/SelectUserBottomSheet.tsx
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
} from '@gorhom/bottom-sheet';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ChevronRight, UserPlus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Member = {
  id?: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  isSuperUser?: boolean;
};

type Props = {
  members: Member[];
  selectedIndex: number | null;
  isLoading: boolean;
  onSelect: (index: number) => void;
  onBack: () => void;
  onContinue: () => void;
  onAddUser?: () => void;
};

export default function SelectUserBottomSheet({
  members,
  selectedIndex,
  isLoading,
  onSelect,
  onBack,
  onContinue,
  onAddUser,
}: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  /* 🔒 FIXED HEIGHT — NO EXPANSION */
  const snapPoints = useMemo(() => ['75%'], []);

  /* Backdrop */
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.6}
        onPress={onBack}
      />
    ),
    [onBack],
  );

  useEffect(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  /* Sticky Footer */
  const renderFooter = useCallback(
    (props: any) => {
      const disabled = selectedIndex === null;
      
      // Calculate dynamic bottom inset
      const bottomInset = insets.bottom > 0 ? insets.bottom + 8 : 20;

      return (
        <BottomSheetFooter {...props} bottomInset={bottomInset}>
          {/* ✅ Wrapper View with solid background to block list items */}
          <View style={styles.footerWrapper}>
            <View style={styles.footer}>
              <Pressable
                disabled={disabled}
                onPress={onContinue}
                style={[
                  styles.continueBtn,
                  disabled && styles.continueBtnDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.continueText,
                    disabled && styles.continueTextDisabled,
                  ]}
                >
                  Continue to Pay
                </Text>
              </Pressable>
            </View>
          </View>
        </BottomSheetFooter>
      );
    },
    [selectedIndex, onContinue, insets.bottom],
  );

  const renderItem = ({ item, index }: { item: Member; index: number }) => {
    const selected = selectedIndex === index;

    
    return (
      <Pressable
        onPress={() => onSelect(index)}
        style={[styles.card, selected && styles.cardActive]}
      >
        <View>
          <Text style={styles.name}>
            {item.name}
            {item.isSuperUser && <Text style={styles.super}>  Super</Text>}
          </Text>
          <Text style={styles.meta}>
            {item.age}/{item.gender}
          </Text>
        </View>
        <ChevronRight size={18} color="#64748B" />
      </Pressable>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onBack}
        backdropComponent={renderBackdrop}
        footerComponent={renderFooter}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Select user</Text>

          {onAddUser && (
            <Pressable style={styles.addBtn} onPress={onAddUser}>
              <UserPlus size={16} color="#7C3AED" />
              <Text style={styles.addText}>Add Member</Text>
            </Pressable>
          )}
        </View>

        {/* USER LIST (ONLY THIS SCROLLS) */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Loading members...</Text>
          </View>
        ) : (
          <BottomSheetFlatList
            data={members}
            keyExtractor={(item, i) => item.id || i.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
          />
        )}
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },

  sheetBackground: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  handleIndicator: {
    backgroundColor: '#475569',
    width: 40,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },

  addBtn: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124,58,237,0.1)',
  },

  addText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '700',
  },

  // ✅ Increased bottom padding to prevent items from hiding behind footer
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },

  card: {
    backgroundColor: '#020617',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },

  cardActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#7C3AED',
  },

  name: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  super: {
    color: '#C4B5FD',
    fontSize: 12,
  },

  meta: {
    color: '#94A3B8',
    marginTop: 4,
  },

  // ✅ NEW: Wrapper to ensure solid background that blocks list items
  footerWrapper: {
    backgroundColor: '#0F172A',  // Solid background
    paddingTop: 8,
    // Add shadow to create separation effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,  // Android shadow
  },

  footer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  continueBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },

  continueBtnDisabled: {
    backgroundColor: '#334155',
  },

  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  continueTextDisabled: {
    color: '#94A3B8',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
});