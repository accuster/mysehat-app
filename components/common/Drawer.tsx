// components/common/Drawer.tsx
import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from "react-native";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({ open, onClose, children, footer }) => {
  if (!open) return null;

  return (
    <Modal transparent animationType="fade" visible={open}>
      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={onClose} />

      {/* Drawer */}
      <View style={styles.drawer}>
        {/* Scrollable content */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {children}
        </ScrollView>

        {/* Footer (Logout + Version) */}
        {footer && <View style={styles.footer}>{footer}</View>}
      </View>
    </Modal>
  );
};

export default Drawer;

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    width: 280,
    height: "100%",
    backgroundColor: "#020617",
    paddingTop: 16,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 12,
    paddingBottom: 20,
  },
});