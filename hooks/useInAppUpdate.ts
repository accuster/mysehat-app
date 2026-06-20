/* eslint-disable @typescript-eslint/no-unused-vars */
// hooks/useInAppUpdate.ts
// ─── In-App Update Hook (Google Play Flexible Update) ────────────────────────
// Uses the CORRECT sp-react-native-in-app-updates API:
//   1. checkNeedsUpdate()          → check if update exists
//   2. addStatusUpdateListener()   → listen for download progress & status
//   3. startUpdate({ updateType }) → trigger the update flow
//   4. installUpdate()             → install after download completes

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus, Linking } from 'react-native';
import type { UpdateStatus } from '../components/common/InAppUpdateBanner';

// ── Conditional imports (Android only) ─────────────────────────────────────────
let SpInAppUpdates: any = null;
let IAUUpdateKind: any = null;
let IAUInstallStatus: any = null;

if (Platform.OS === 'android') {
  try {
    const module = require('sp-react-native-in-app-updates');
    SpInAppUpdates = module.default;
    IAUUpdateKind = module.IAUUpdateKind;
    IAUInstallStatus = module.IAUInstallStatus;
  } catch (e) {
    console.warn(
      '⚠️ sp-react-native-in-app-updates not installed. In-app updates disabled.',
    );
  }
}

// ── Configuration ──────────────────────────────────────────────────────────────
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // Re-check every 24 hours
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.mysehat.ai';

type UseInAppUpdateReturn = {
  status: UpdateStatus;
  progress: number;
  startUpdate: () => void;
  installUpdate: () => void;
  dismissBanner: () => void;
};

export function useInAppUpdate(): UseInAppUpdateReturn {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const updaterRef = useRef<any>(null);
  const lastCheckRef = useRef<number>(0);
  const listenerAttached = useRef(false);

  // ── Status update listener callback ────────────────────────────────────────
  // This is the CORRECT way to track download progress with this library.
  // The listener receives { status, bytesDownloaded, totalBytesToDownload }
  const onStatusUpdate = useCallback((event: any) => {
    console.log('📦 InAppUpdate status:', JSON.stringify(event));

    const { bytesDownloaded, totalBytesToDownload } = event;

    // Track download progress
    if (totalBytesToDownload > 0) {
      const pct = Math.round((bytesDownloaded / totalBytesToDownload) * 100);
      setProgress(pct);
    }

    // Map Play Core InstallStatus to our banner states
    // See: https://developer.android.com/reference/com/google/android/play/core/install/model/InstallStatus
    if (IAUInstallStatus) {
      switch (event.status) {
        case IAUInstallStatus.PENDING:
          setStatus('downloading');
          setProgress(0);
          break;

        case IAUInstallStatus.DOWNLOADING:
          setStatus('downloading');
          break;

        case IAUInstallStatus.DOWNLOADED:
          console.log('✅ InAppUpdate: Download complete!');
          setStatus('downloaded');
          setProgress(100);
          break;

        case IAUInstallStatus.INSTALLING:
          console.log('🔄 InAppUpdate: Installing...');
          break;

        case IAUInstallStatus.INSTALLED:
          console.log('✅ InAppUpdate: Installed!');
          setStatus('idle');
          // Clean up listener
          if (updaterRef.current && listenerAttached.current) {
            try {
              updaterRef.current.removeStatusUpdateListener(onStatusUpdate);
              listenerAttached.current = false;
            } catch (_e) {
              // ignore
            }
          }
          break;

        case IAUInstallStatus.CANCELED:
          console.log('❌ InAppUpdate: Download canceled by user');
          setStatus('available');
          setProgress(0);
          break;

        case IAUInstallStatus.FAILED:
          console.log('❌ InAppUpdate: Download failed');
          setStatus('available');
          setProgress(0);
          break;

        default:
          break;
      }
    }
  }, []);

  // ── Initialize updater instance ────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android' || !SpInAppUpdates) {
      return;
    }

    try {
      updaterRef.current = new SpInAppUpdates(
        false, // isDebug — set to true for verbose native logs
      );
    } catch (error) {
      console.log('❌ Failed to initialize SpInAppUpdates:', error);
    }

    // Cleanup listener on unmount
    return () => {
      if (updaterRef.current && listenerAttached.current) {
        try {
          updaterRef.current.removeStatusUpdateListener(onStatusUpdate);
          listenerAttached.current = false;
        } catch (_e) {
          // ignore
        }
      }
    };
  }, [onStatusUpdate]);

  // ── Check for update ───────────────────────────────────────────────────────
  const checkForUpdate = useCallback(async () => {
    if (!updaterRef.current) {
      return;
    }

    // Throttle: don't check more than once per interval
    const now = Date.now();
    if (
      now - lastCheckRef.current < CHECK_INTERVAL_MS &&
      lastCheckRef.current > 0
    ) {
      console.log('⏳ InAppUpdate: Skipping check (throttled)');
      return;
    }
    lastCheckRef.current = now;

    try {
      console.log('🔍 InAppUpdate: Checking for updates...');

      const result = await updaterRef.current.checkNeedsUpdate();

      if (result.shouldUpdate) {
        console.log('✅ InAppUpdate: Update available!', {
          storeVersion: result.storeVersion,
          currentVersion: result.currentVersion,
        });
        setStatus('available');
        setDismissed(false);
      } else {
        console.log('👍 InAppUpdate: App is up to date');
        setStatus('idle');
      }
    } catch (error) {
      console.log('⚠️ InAppUpdate: Check failed:', error);
      setStatus('idle');
    }
  }, []);

  // ── Check on mount + when app comes to foreground ──────────────────────────
  useEffect(() => {
    checkForUpdate();

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkForUpdate();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [checkForUpdate]);

  // ── Start flexible download ────────────────────────────────────────────────
  const startUpdate = useCallback(async () => {
    if (!updaterRef.current || !IAUUpdateKind) {
      // Fallback: open Play Store directly
      console.log('📱 InAppUpdate: Opening Play Store (library unavailable)');
      try {
        await Linking.openURL(PLAY_STORE_URL);
      } catch (e) {
        console.log('❌ Failed to open Play Store URL:', e);
      }
      return;
    }

    try {
      console.log('📥 InAppUpdate: Starting flexible update...');

      // Step 1: Attach the status listener BEFORE starting the update
      if (!listenerAttached.current) {
        updaterRef.current.addStatusUpdateListener(onStatusUpdate);
        listenerAttached.current = true;
        console.log('📥 InAppUpdate: Status listener attached');
      }

      // Step 2: Set status to downloading (optimistic)
      setStatus('downloading');
      setProgress(0);

      // Step 3: Start the update with FLEXIBLE type
      // This is the correct API — just { updateType }, no callbacks
      await updaterRef.current.startUpdate({
        updateType: IAUUpdateKind.FLEXIBLE,
      });

      console.log('📥 InAppUpdate: startUpdate() resolved');
    } catch (error: any) {
      console.log('❌ InAppUpdate: startUpdate failed:', error);

      // User might have canceled the Play Store consent dialog
      setStatus('available');
      setProgress(0);

      // Remove listener if we attached it
      if (updaterRef.current && listenerAttached.current) {
        try {
          updaterRef.current.removeStatusUpdateListener(onStatusUpdate);
          listenerAttached.current = false;
        } catch (_e) {
          // ignore
        }
      }
    }
  }, [onStatusUpdate]);

  // ── Install (restart) ──────────────────────────────────────────────────────
  const installUpdate = useCallback(() => {
    if (!updaterRef.current) {
      return;
    }

    try {
      console.log('🔄 InAppUpdate: Installing update (restarting app)...');
      updaterRef.current.installUpdate();
      // App will restart — no further code runs
    } catch (error) {
      console.log('❌ InAppUpdate: Install failed:', error);
    }
  }, []);

  // ── Dismiss banner temporarily ─────────────────────────────────────────────
  const dismissBanner = useCallback(() => {
    console.log('🔕 InAppUpdate: Banner dismissed temporarily');
    setDismissed(true);
  }, []);

  // ── Return effective status (handle dismiss) ──────────────────────────────
  const effectiveStatus: UpdateStatus =
    dismissed && status === 'available' ? 'idle' : status;

  return {
    status: effectiveStatus,
    progress,
    startUpdate,
    installUpdate,
    dismissBanner,
  };
}