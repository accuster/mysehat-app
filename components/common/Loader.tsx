// components/common/Loader.tsx
import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

type Props = {
  label?: string;
};

const Loader: React.FC<Props> = ({ label = "Loading…" }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7C3AED" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

export default Loader;
const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    color: "#A1A1AA",
  },
});
