// components/common/Drawer.tsx
import React from 'react';
import {
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({ open, onClose, children }) => {
  if (!open) return null;

  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={onClose}>
      <SafeAreaView style={styles.drawer} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default Drawer;

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});