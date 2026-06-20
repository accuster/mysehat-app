// components/common/BluetoothEventBridge.tsx — NEW FILE
/**
 * Single global subscriber for BluetoothService events.
 * Mount EXACTLY ONCE inside <ToastProvider>.
 *
 * Owns:
 *  1. Service → Redux dispatching for status changes (so the slice
 *     stays in sync without each mounted useBluetooth instance
 *     dispatching duplicate actions on every status change).
 *  2. Service → Toast for passive events the user should know about
 *     (unexpected mid-session disconnects, internal data-parse
 *     failures). User-initiated errors are still surfaced by their
 *     callers via thrown errors + showError in the screen.
 *
 * Renders nothing.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import BluetoothService from '../../store/services/BluetoothService';
import {
  setConnecting,
  setConnected,
  setDisconnected,
  resetReconnectAttempts,
  incrementReconnectAttempt,
} from '../../store/slices/bluetoothSlice';
import { useToast } from '../../contexts/ToastContext';

export default function BluetoothEventBridge() {
  const dispatch = useDispatch();
  const { showWarning, showError } = useToast();

  // ── Status → Redux (single dispatcher for the whole app) ──
  useEffect(() => {
    return BluetoothService.onStatus(next => {
      switch (next) {
        case 'connected': {
          const device = BluetoothService.getCurrentDevice();
          if (device) {
            dispatch(
              setConnected({
                id: device.id,
                name: device.name,
                address: device.address,
              }),
            );
            dispatch(resetReconnectAttempts());
          }
          break;
        }
        case 'connecting':
          dispatch(setConnecting(true));
          break;
        case 'reconnecting':
          dispatch(setConnecting(true));
          dispatch(incrementReconnectAttempt());
          break;
        case 'disconnected':
          dispatch(setDisconnected(undefined));
          break;
        case 'error':
          dispatch(setConnecting(false));
          break;
      }
    });
  }, [dispatch]);

  // ── Unexpected disconnect mid-session → warning toast ──
  useEffect(() => {
    return BluetoothService.onDisconnect(() => {
      showWarning('BMI machine disconnected. Trying to reconnect…');
    });
  }, [showWarning]);

  // ── Internal/passive errors → error toast ──
  // User-initiated failures are surfaced by callers (e.g. handleDeviceSelect
  // catches and calls showError). This handles things the user didn't trigger:
  // data parse errors, ack failures from the listener, etc.
  useEffect(() => {
    return BluetoothService.onError(err => {
      showError(err?.message ?? 'Bluetooth error');
    });
  }, [showError]);

  return null;
}