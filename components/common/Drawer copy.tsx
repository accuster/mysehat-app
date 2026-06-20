// components/common/Drawer.tsx - FIXED: Responsive with Safe Area
import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({ open, onClose, children, footer }) => {
  // 🎯 DYNAMIC safe area for all devices
  const insets = useSafeAreaInsets();

  // 🎯 Calculate responsive padding
  const drawerPadding = useMemo(() => ({
    paddingTop: insets.top > 0 ? insets.top + 16 : 16,
    paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 20,
  }), [insets.top, insets.bottom]);

  if (!open) return null;

  return (
    <Modal transparent animationType="fade" visible={open}>
      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={onClose} />

      {/* Drawer */}
      <View style={[styles.drawer, { paddingTop: drawerPadding.paddingTop }]}>
        {/* Scrollable content */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {children}
        </ScrollView>

        {/* Footer (Logout + Version) */}
        {footer && (
          <View style={[styles.footer, { paddingBottom: drawerPadding.paddingBottom }]}>
            {footer}
          </View>
        )}
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
    // paddingTop is now dynamic - applied inline
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 12,
    // paddingBottom is now dynamic - applied inline
  },
});