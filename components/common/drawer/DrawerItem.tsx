// components/common/drawer/DrawerItem.tsx
import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { LucideIcon, ExternalLink } from "lucide-react-native";

type Props = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  danger?: boolean;
  external?: boolean; // ✅ NEW: Show external link icon
};

export default function DrawerItem({ label, icon: Icon, onPress, danger, external }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.leftContent}>
        <Icon size={18} color={danger ? "#EF4444" : "#CBD5E1"} />
        <Text style={[styles.text, danger && styles.danger]}>
          {label}
        </Text>
      </View>
      
      {/* ✅ Show external link icon if external prop is true */}
      {external && (
        <ExternalLink size={16} color="#64748B" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // ✅ Push external icon to the right
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1, // ✅ Take remaining space
  },
  text: {
    color: "#CBD5E1",
    fontSize: 16,
    fontWeight: "600",
  },
  danger: {
    color: "#EF4444",
  },
});