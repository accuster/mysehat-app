// components/common/InAppBrowser.tsx
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import Loader from './Loader';

type Props = {
  visible: boolean;
  url: string;
  title: string;
  onClose: () => void;
};

export default function InAppBrowser({ visible, url, title, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const loadTimeoutRef = useRef<number | null>(null);

  // Reset loader when browser opens
  useEffect(() => {
    if (visible) {
      setLoading(true);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.container}>
        {/* ---------- Header ---------- */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              onClose();
            }}
          >
            <X size={22} color="#A1A1AA" />
          </Pressable>
        </View>

        {/* ---------- Loader Overlay ---------- */}
        {loading && (
          <View style={styles.loaderOverlay}>
            <Loader label="Loading content…" />
          </View>
        )}

        {/* ---------- WebView ---------- */}
        <WebView
          source={{ uri: url }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          onLoadStart={() => {
            setLoading(true);

            // Safety timeout (prevents infinite loader)
            if (loadTimeoutRef.current) {
              clearTimeout(loadTimeoutRef.current);
            }

            loadTimeoutRef.current = setTimeout(() => {
              setLoading(false);
            }, 8000);
          }}
          onLoadEnd={() => {
            setLoading(false);

            if (loadTimeoutRef.current) {
              clearTimeout(loadTimeoutRef.current);
              loadTimeoutRef.current = null;
            }
          }}
          onNavigationStateChange={navState => {
            // Handles SPA/internal navigation
            if (!navState.loading) {
              setLoading(false);
            }
          }}
          onShouldStartLoadWithRequest={request => {
            // Allow only mysehat.ai inside WebView
            if (!request.url.includes('mysehat.ai')) {
              Linking.openURL(request.url);
              return false;
            }
            return true;
          }}
          style={{ flex: 1 }}
        />
      </View>
    </Modal>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#020617',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.85)',
    zIndex: 10,
    justifyContent: 'center',
  },
});
