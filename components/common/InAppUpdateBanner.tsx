// components/common/InAppUpdateBanner.tsx
// ─── In-App Update Banner (Google Play Flexible Update) ──────────────────────
// Shows a non-intrusive bottom banner when a new version is available on Play Store.
// Three states: Update Available → Downloading (with progress) → Ready to Install
// Sits above bottom tabs, works for both User and Partner roles.

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, Check, X } from 'lucide-react-native';

export type UpdateStatus =
  | 'idle' // No update available
  | 'available' // Update available — show banner
  | 'downloading' // Download in progress
  | 'downloaded'; // Ready to install

type Props = {
  status: UpdateStatus;
  progress: number; // 0–100
  onUpdate: () => void; // Trigger download
  onInstall: () => void; // Install (restart)
  onDismiss?: () => void; // Optional: temporarily hide (will return on next app open)
};

export default function InAppUpdateBanner({
  status,
  progress,
  onUpdate,
  onInstall,
  onDismiss,
}: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(120)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ── Slide in/out ─────────────────────────────────────────────────────────────
  const isVisible =
    status === 'available' ||
    status === 'downloading' ||
    status === 'downloaded';

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isVisible ? 0 : 120,
      useNativeDriver: true,
      damping: 18,
      stiffness: 140,
    }).start();
  }, [isVisible, slideAnim]);

  // ── Progress bar animation ───────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  if (status === 'idle') {
    return null;
  }

  // ── Bottom offset: above bottom tabs (56px tab bar) + safe area ──────────────
  const BOTTOM_TAB_HEIGHT = 56;
  const bottomOffset =
    BOTTOM_TAB_HEIGHT + (insets.bottom > 0 ? insets.bottom : 8);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      {/* ── Dismiss X — floats at top-right corner of the banner ─────────── */}
      {status === 'available' && onDismiss && (
        <Pressable
          style={styles.dismissBtn}
          onPress={onDismiss}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <X size={12} color="#A1A1AA" />
        </Pressable>
      )}

      <View
        style={[
          styles.banner,
          status === 'downloaded' && styles.bannerDownloaded,
        ]}
      >
        {/* ── Icon ──────────────────────────────────────────────────────────── */}
        <View
          style={[
            styles.iconContainer,
            status === 'downloaded' && styles.iconContainerDownloaded,
          ]}
        >
          {status === 'downloaded' ? (
            <Check size={18} color="#10B981" strokeWidth={2.5} />
          ) : (
            <Download size={18} color="#A78BFA" />
          )}
        </View>

        {/* ── Text ──────────────────────────────────────────────────────────── */}
        <View style={styles.textContainer}>
          {status === 'available' && (
            <>
              <Text style={styles.title}>New version available</Text>
              <Text style={styles.subtitle}>
                Update for the best experience
              </Text>
            </>
          )}
          {status === 'downloading' && (
            <>
              <Text style={styles.title}>Downloading update...</Text>
              <Text style={styles.subtitle}>
                {Math.round(progress)}% complete
              </Text>
            </>
          )}
          {status === 'downloaded' && (
            <>
              <Text style={[styles.title, styles.titleDownloaded]}>
                Update ready!
              </Text>
              <Text style={[styles.subtitle, styles.subtitleDownloaded]}>
                Restart to apply the update
              </Text>
            </>
          )}
        </View>

        {/* ── Action Button ─────────────────────────────────────────────────── */}
        {status === 'available' && (
          <Pressable
            style={({ pressed }) => [
              styles.updateBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={onUpdate}
            hitSlop={8}
          >
            <Text style={styles.updateBtnText}>Update</Text>
          </Pressable>
        )}

        {status === 'downloading' && (
          <Text style={styles.progressPercent}>
            {Math.round(progress)}%
          </Text>
        )}

        {status === 'downloaded' && (
          <Pressable
            style={({ pressed }) => [
              styles.restartBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={onInstall}
            hitSlop={8}
          >
            <Text style={styles.restartBtnText}>Restart</Text>
          </Pressable>
        )}
      </View>

      {/* ── Progress Bar (only during download) ────────────────────────────── */}
      {status === 'downloading' && (
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[styles.progressBarFill, { width: progressWidth }]}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },

  // ── Dismiss — pinned to top-right corner, outside the banner ───────────
  dismissBtn: {
    position: 'absolute',
    top: -10,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2D1B4E',
    borderWidth: 1.5,
    borderColor: '#3D2B5F',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 10,
  },

  banner: {
    backgroundColor: '#1A1625',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D1B4E',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,

    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
    }),
  },
  bannerDownloaded: {
    backgroundColor: '#0F1A14',
    borderColor: '#1B3A2A',
  },

  // ── Icon ───────────────────────────────────────────────────────────────
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#251B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerDownloaded: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },

  // ── Text ───────────────────────────────────────────────────────────────
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F5F3FF',
  },
  titleDownloaded: {
    color: '#D1FAE5',
  },
  subtitle: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
  },
  subtitleDownloaded: {
    color: '#6EE7B7',
  },

  // ── Buttons ────────────────────────────────────────────────────────────
  updateBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  updateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  restartBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  restartBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },

  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A78BFA',
  },

  // ── Progress Bar ───────────────────────────────────────────────────────
  progressBarContainer: {
    height: 3,
    backgroundColor: '#251B35',
    borderRadius: 2,
    marginTop: -1,
    marginHorizontal: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 2,
  },
});