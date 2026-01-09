import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { LucideIcon } from "lucide-react-native";

type Props = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  danger?: boolean;
};

export default function DrawerItem({ label, icon: Icon, onPress, danger }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Icon size={16} color={danger ? "#EF4444" : "#CBD5E1"} />
      <Text style={[styles.text, danger && styles.danger]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  text: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600",
  },
  danger: {
    color: "#EF4444",
  },
});
