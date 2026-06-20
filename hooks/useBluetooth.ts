// hooks/useBluetooth.ts — REPLACEMENT
/**
 * Production Bluetooth hook (read-only flavor).
 *
 * What this hook does NOT do:
 *  - Service-event → Redux dispatching. That's in BluetoothEventBridge,
 *    mounted once at app root. With this hook, multiple screens mounted
 *    simultaneously no longer cause N dispatches per status change.
 *  - Show alerts/toasts. Action methods throw on failure; the SCREEN
 *    that initiated the call catches and surfaces its own feedback.
 *
 * What it does:
 *  - Local re-render state (status, currentDevice, lastData, etc.)
 *  - Module-scoped guard: one silent auto-reconnect per app session
 *  - Action methods that proxy the singleton and throw on failure
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import BluetoothService, {
  BTStatus,
  BTData,
  BTDevice,
} from '../store/services/BluetoothService';
import { connectionFailed } from '../store/slices/bluetoothSlice';
import { RootState } from '../store';

let autoReconnectAttemptedThisSession = false;

export interface UseBluetoothReturn {
  status: BTStatus;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  currentDevice: BTDevice | null;
  lastData: BTData;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  lastConnectedDevice: { address: string; name: string } | null;
  autoReconnectEnabled: boolean;
  requestPermissions: () => Promise<boolean>;
  getPairedDevices: () => Promise<BTDevice[]>;
  connect: (device: BTDevice) => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  sendData: (data: string) => Promise<void>;
  clearData: () => void;
  sendRechargeCommand: () => Promise<void>;
  sendEncryptedAmount: (amount: number) => Promise<number>;
  setRechargeMode: () => void;
  setBMIMode: () => void;
}

export function useBluetooth(): UseBluetoothReturn {
  const dispatch = useDispatch();
  const bluetoothState = useSelector((state: RootState) => state.bluetooth);

  const [status, setStatus] = useState<BTStatus>(() =>
    BluetoothService.getStatus(),
  );
  const [currentDevice, setCurrentDevice] = useState<BTDevice | null>(() =>
    BluetoothService.getCurrentDevice(),
  );
  const [lastData, setLastData] = useState<BTData>(() =>
    BluetoothService.getLastData(),
  );
  const [reconnectAttempts, setReconnectAttempts] = useState(() =>
    BluetoothService.getReconnectAttempts(),
  );

  const isMounted = useRef(true);

  // ─── Auto-reconnect: one silent shot per session ────────────
  useEffect(() => {
    const run = async () => {
      if (autoReconnectAttemptedThisSession) return;
      if (!bluetoothState.autoReconnect) return;
      if (!bluetoothState.lastConnectedDevice) return;
      if (BluetoothService.getStatus() === 'connected') return;

      autoReconnectAttemptedThisSession = true;

      try {
        await new Promise(r => setTimeout(r, 1500));
        const devices = await BluetoothService.getPairedDevices();
        const last = devices.find(
          d => d.address === bluetoothState.lastConnectedDevice?.address,
        );
        if (last) {
          // isReconnect=false → one quiet attempt, no retry cascade.
          await BluetoothService.connect(last.device, false);
        }
      } catch (err) {
        console.log('🤫 Auto-reconnect gave up:', err);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Local state subscriptions (no dispatches) ──────────────
  useEffect(() => {
    isMounted.current = true;

    const unsubStatus = BluetoothService.onStatus(next => {
      if (!isMounted.current) return;
      setStatus(next);
      setCurrentDevice(BluetoothService.getCurrentDevice());
      setReconnectAttempts(BluetoothService.getReconnectAttempts());
    });

    const unsubData = BluetoothService.onData(data => {
      if (!isMounted.current) return;
      setLastData(data);
    });

    return () => {
      isMounted.current = false;
      unsubStatus();
      unsubData();
    };
  }, []);

  // ─── Actions: throw on failure; callers handle UI ───────────

  const requestPermissions = useCallback(
    () => BluetoothService.requestPermissions(),
    [],
  );

  const getPairedDevices = useCallback(
    () => BluetoothService.getPairedDevices(),
    [],
  );

  const connect = useCallback(
    async (device: BTDevice): Promise<void> => {
      const ok = await BluetoothService.connect(device.device, false);
      if (!ok) {
        // History logging in the slice needs device context that the
        // bridge can't supply from a status change alone — keep here.
        dispatch(
          connectionFailed({
            deviceAddress: device.address,
            error: 'Connection failed',
          }),
        );
        throw new Error(`Could not connect to ${device.name}`);
      }
    },
    [dispatch],
  );

  const disconnect = useCallback(
    () => BluetoothService.disconnect(),
    [],
  );

  const reconnect = useCallback(async (): Promise<void> => {
    if (!bluetoothState.lastConnectedDevice) {
      throw new Error('No previous device to reconnect to');
    }
    const devices = await BluetoothService.getPairedDevices();
    const last = devices.find(
      d => d.address === bluetoothState.lastConnectedDevice?.address,
    );
    if (!last) throw new Error('Previous device is no longer paired');
    const ok = await BluetoothService.reconnect();
    if (!ok) throw new Error(`Could not reconnect to ${last.name}`);
  }, [bluetoothState.lastConnectedDevice]);

  const sendData = useCallback(
    (data: string) => BluetoothService.sendData(data).then(() => undefined),
    [],
  );

  const clearData = useCallback(() => {
    BluetoothService.clearLastData();
    setLastData({ timestamp: 0 });
  }, []);

  const sendRechargeCommand = useCallback(
    () => BluetoothService.sendRechargeCommand(),
    [],
  );

  const sendEncryptedAmount = useCallback(
    (amount: number) => BluetoothService.sendEncryptedAmount(amount),
    [],
  );

  const setRechargeMode = useCallback(
    () => BluetoothService.setRechargeMode(),
    [],
  );
  const setBMIMode = useCallback(() => BluetoothService.setBMIMode(), []);

  return {
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isReconnecting: status === 'reconnecting',
    currentDevice,
    lastData,
    reconnectAttempts,
    maxReconnectAttempts: BluetoothService.getMaxReconnectAttempts(),
    lastConnectedDevice: bluetoothState.lastConnectedDevice,
    autoReconnectEnabled: bluetoothState.autoReconnect,
    requestPermissions,
    getPairedDevices,
    connect,
    disconnect,
    reconnect,
    sendData,
    clearData,
    sendRechargeCommand,
    sendEncryptedAmount,
    setRechargeMode,
    setBMIMode,
  };
}