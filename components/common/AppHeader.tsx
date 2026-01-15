// components/common/AppHeader.tsx
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Menu } from 'lucide-react-native';
import { StatusBar, Image } from 'react-native';

// ✅ Proper TypeScript interface
interface AppHeaderProps {
  onMenuClick: () => void;
  rightSlot?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onMenuClick, rightSlot }) => {
  return (
    <View style={styles.container}>
      {/* Menu Button */}
      <Pressable onPress={onMenuClick} style={styles.iconButton}>
        <Menu size={24} color="#A1A1AA" />
      </Pressable>

      {/* Logo */}

      <StatusBar barStyle="light-content" />
      <Image
        source={require('../../assets/images/mysehat_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Right Slot */}
      <View style={styles.rightSlot}>{rightSlot ?? null}</View>
    </View>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    backgroundColor: '#09090B',
  },
  logo: {
    width: 100,
    height: 40,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightSlot: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
