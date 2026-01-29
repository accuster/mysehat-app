// components/common/ErrorToast.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react-native';

export type ToastType = 'error' | 'warning' | 'info' | 'success';

export interface ErrorToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onDismiss: () => void;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export default function ErrorToast({
  visible,
  message,
  type = 'error',
  onDismiss,
  duration = 4000,
  action,
}: ErrorToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  // Move handleDismiss BEFORE useEffect
  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [onDismiss, opacity, scale]);

  useEffect(() => {
    if (visible) {
      // Fade in + scale in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after duration
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Fade out + scale out
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, duration, handleDismiss, opacity, scale]);

  if (!visible) return null;

  // Get icon based on type
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle size={24} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={24} color="#F59E0B" />;
      case 'info':
        return <Info size={24} color="#3B82F6" />;
      case 'success':
        return <CheckCircle size={24} color="#10B981" />;
      default:
        return <AlertCircle size={24} color="#EF4444" />;
    }
  };

  // Get title based on type
  const getTitle = () => {
    switch (type) {
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Info';
      case 'success':
        return 'Success';
      default:
        return 'Error';
    }
  };

  // Get colors based on type
  const getColors = () => {
    switch (type) {
      case 'error':
        return {
          icon: '#EF4444',
          button: '#EF4444',
        };
      case 'warning':
        return {
          icon: '#F59E0B',
          button: '#F59E0B',
        };
      case 'info':
        return {
          icon: '#3B82F6',
          button: '#3B82F6',
        };
      case 'success':
        return {
          icon: '#10B981',
          button: '#10B981',
        };
      default:
        return {
          icon: '#EF4444',
          button: '#EF4444',
        };
    }
  };

  const colors = getColors();

  return (
    <>
      {/* Dark overlay background */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity,
          },
        ]}
      />

      {/* Toast card */}
      <Animated.View
        style={[
          styles.container,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.card}>
          {/* Title with Icon */}
          <View style={styles.header}>
            {getIcon()}
            <Text style={styles.title}>{getTitle()}</Text>
          </View>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {action && (
              <Pressable
                style={[styles.button, styles.actionButton]}
                onPress={() => {
                  action.onPress();
                  handleDismiss();
                }}
              >
                <Text style={[styles.buttonText, { color: colors.button }]}>
                  {action.label}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.button, styles.okButton]}
              onPress={handleDismiss}
            >
              <Text style={[styles.buttonText, { color: colors.button }]}>
                OK
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 9998,
    elevation: 998,
  },

  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 9999,
    elevation: 999,
    pointerEvents: 'box-none',
  },

  card: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 24,
    minWidth: 280,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },

  message: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },

  button: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },

  actionButton: {
    backgroundColor: 'transparent',
  },

  okButton: {
    backgroundColor: 'transparent',
  },

  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});