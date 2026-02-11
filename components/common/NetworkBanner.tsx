// components/common/NetworkBanner.tsx
// 🌐 Industry-standard network status banner (PhonePe/GooglePay style)
// ✅ Fixed at screen top
// ✅ Slides down smoothly when offline
// ✅ Auto-dismisses when online
// ✅ Non-blocking, no overlay

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';

interface NetworkBannerProps {
  visible: boolean;
  message?: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function NetworkBanner({ 
  visible, 
  message = 'Could not connect to internet' 
}: NetworkBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // ✅ Slide DOWN (show banner)
      console.log('🔴 NetworkBanner: Sliding DOWN');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      // ✅ Slide UP (hide banner)
      console.log('🟢 NetworkBanner: Sliding UP');
      Animated.spring(translateY, {
        toValue: -100,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [visible, translateY]);

  // Calculate top position (status bar height)
  const topPosition = insets.top;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topPosition,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none" // ✅ Allow touches to pass through to content below
    >
      <View style={styles.banner}>
        <WifiOff size={20} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10000,
    elevation: 1000,
    width: SCREEN_WIDTH,
  },
  banner: {
    backgroundColor: '#DC2626', // ✅ Red-600 (industry standard error red)
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});