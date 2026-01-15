// components/screens/user/SelectUserScreen.tsx
/* eslint-disable react-native/no-inline-styles */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
// ✅ STEP 1: Import SafeAreaView and hook
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from "lucide-react-native";

type Member = {
  id?: string;
  name: string;
  age: number;
  gender: "M" | "F" | "O";
  isSuperUser?: boolean;
};

type Props = {
  members: Member[];
  selectedIndex: number | null;
  isLoading: boolean;
  onSelect: (index: number) => void;
  onBack: () => void;
  onContinue: () => void;
};

export default function SelectUserScreen({
  members,
  selectedIndex,
  isLoading,
  onSelect,
  onBack,
  onContinue,
}: Props) {
  // ✅ STEP 2: Add safe area hook and calculate dynamic padding
  const insets = useSafeAreaInsets();
  const contentBottomPadding = 120 + (insets.bottom > 0 ? insets.bottom : 0);
  // ✅ Calculate dynamic bottom position for footer
  const footerBottom = 16 + (insets.bottom > 0 ? insets.bottom : 0);
  
  return (
    // ✅ STEP 3: Replace View with SafeAreaView
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Select user</Text>

      {/* Loading State */}
      {isLoading && (!members || members.length === 0) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      ) : !members || members.length === 0 ? (
        // Empty State
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No family members found</Text>
          <Text style={styles.emptySubtext}>
            Please add family members in the app first
          </Text>
        </View>
      ) : (
        // Users List
        <FlatList
          data={members}
          keyExtractor={(item, i) => item.id || i.toString()}
          // ✅ STEP 4: Use dynamic padding instead of hardcoded 120
          contentContainerStyle={{ paddingBottom: contentBottomPadding }}
          renderItem={({ item, index }) => {
            const selected = selectedIndex === index;

            return (
              <Pressable
                onPress={() => onSelect(index)}
                style={[styles.card, selected && styles.cardActive]}
              >
                <View>
                  <Text style={styles.name}>
                    {item.name}
                    {item.isSuperUser && (
                      <Text style={styles.super}>  Super</Text>
                    )}
                  </Text>
                  <Text style={styles.meta}>
                    {item.age}/{item.gender}
                  </Text>
                </View>

                <ChevronRight size={18} color="#64748B" />
              </Pressable>
            );
          }}
        />
      )}

      {/* Continue Button - ✅ With dynamic bottom position */}
      <View style={[styles.footer, { bottom: footerBottom }]}>
        <Pressable
          style={[
            styles.payBtn,
            (selectedIndex === null || !members || members.length === 0) && { opacity: 0.5 },
          ]}
          onPress={onContinue}
          disabled={selectedIndex === null || !members || members.length === 0}
        >
          <Text style={styles.payText}>Continue to Pay</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: {
    color: "#94A3B8",
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginTop: 20,
    marginBottom: 16,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  },

  card: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#020617",
  },
  cardActive: {
    backgroundColor: "#1E1B4B",
    borderColor: "#7C3AED",
  },
  name: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  super: {
    fontSize: 12,
    color: "#C4B5FD",
  },
  meta: {
    color: "#94A3B8",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    // ✅ bottom is now set via inline style with dynamic value
    left: 16,
    right: 16,
  },
  payBtn: {
    backgroundColor: "#7C3AED",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  payText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});