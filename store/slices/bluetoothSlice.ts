// store/slices/bluetoothSlice.ts
/**
 * Production-Grade Bluetooth State Management
 * - Connection persistence across app restarts
 * - Auto-reconnection history
 * - Device preferences
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  lastConnected?: number;
  connectionCount?: number;
}

export interface ConnectionAttempt {
  timestamp: number;
  success: boolean;
  deviceAddress: string;
  error?: string;
}

export interface BluetoothState {
  // Current connection
  isConnected: boolean;
  isConnecting: boolean;
  currentDevice: BluetoothDevice | null;
  
  // Last successful connection (for auto-reconnect)
  lastConnectedDevice: BluetoothDevice | null;
  
  // Connection history
  connectionHistory: ConnectionAttempt[];
  
  // Settings
  autoReconnect: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  // Health monitoring
  lastDisconnectTime: number | null;
  disconnectCount: number;
  
  // Preferences
  preferredDevices: BluetoothDevice[];
}

const initialState: BluetoothState = {
  isConnected: false,
  isConnecting: false,
  currentDevice: null,
  lastConnectedDevice: null,
  connectionHistory: [],
  autoReconnect: true,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  lastDisconnectTime: null,
  disconnectCount: 0,
  preferredDevices: [],
};

const bluetoothSlice = createSlice({
  name: 'bluetooth',
  initialState,
  reducers: {
    // ═══════════════════════════════════════════════════════════════════════
    // CONNECTION STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    setConnecting: (state, action: PayloadAction<boolean>) => {
      state.isConnecting = action.payload;
    },

    setConnected: (state, action: PayloadAction<BluetoothDevice>) => {
      state.isConnected = true;
      state.isConnecting = false;
      state.currentDevice = action.payload;
      state.lastConnectedDevice = action.payload;
      state.reconnectAttempts = 0;
      
      // Update connection history
      state.connectionHistory.unshift({
        timestamp: Date.now(),
        success: true,
        deviceAddress: action.payload.address,
      });
      
      // Keep only last 20 connection attempts
      if (state.connectionHistory.length > 20) {
        state.connectionHistory = state.connectionHistory.slice(0, 20);
      }

      // Update preferred devices
      const existingIndex = state.preferredDevices.findIndex(
        d => d.address === action.payload.address
      );
      
      if (existingIndex !== -1) {
        // Update existing
        state.preferredDevices[existingIndex] = {
          ...state.preferredDevices[existingIndex],
          lastConnected: Date.now(),
          connectionCount: (state.preferredDevices[existingIndex].connectionCount || 0) + 1,
        };
      } else {
        // Add new
        state.preferredDevices.unshift({
          ...action.payload,
          lastConnected: Date.now(),
          connectionCount: 1,
        });
      }

      console.log('✅ Redux: Device connected -', action.payload.name);
    },

    setDisconnected: (state, action: PayloadAction<{ error?: string } | undefined>) => {
      state.isConnected = false;
      state.isConnecting = false;
      state.currentDevice = null;
      state.lastDisconnectTime = Date.now();
      state.disconnectCount += 1;

      // Log disconnect in history
      if (state.lastConnectedDevice) {
        state.connectionHistory.unshift({
          timestamp: Date.now(),
          success: false,
          deviceAddress: state.lastConnectedDevice.address,
          error: action.payload?.error || 'Disconnected',
        });
        
        if (state.connectionHistory.length > 20) {
          state.connectionHistory = state.connectionHistory.slice(0, 20);
        }
      }

      console.log('🔌 Redux: Device disconnected');
    },

    connectionFailed: (state, action: PayloadAction<{ deviceAddress: string; error: string }>) => {
      state.isConnecting = false;
      state.reconnectAttempts += 1;

      // Log failed attempt
      state.connectionHistory.unshift({
        timestamp: Date.now(),
        success: false,
        deviceAddress: action.payload.deviceAddress,
        error: action.payload.error,
      });

      if (state.connectionHistory.length > 20) {
        state.connectionHistory = state.connectionHistory.slice(0, 20);
      }

      console.log('❌ Redux: Connection failed -', action.payload.error);
    },

    // ═══════════════════════════════════════════════════════════════════════
    // RECONNECTION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    incrementReconnectAttempt: (state) => {
      state.reconnectAttempts += 1;
      console.log(`🔄 Reconnect attempt: ${state.reconnectAttempts}/${state.maxReconnectAttempts}`);
    },

    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0;
      console.log('✅ Reconnect attempts reset');
    },

    setAutoReconnect: (state, action: PayloadAction<boolean>) => {
      state.autoReconnect = action.payload;
      console.log(`🔧 Auto-reconnect: ${action.payload ? 'ON' : 'OFF'}`);
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DEVICE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    addPreferredDevice: (state, action: PayloadAction<BluetoothDevice>) => {
      const exists = state.preferredDevices.find(
        d => d.address === action.payload.address
      );
      
      if (!exists) {
        state.preferredDevices.push(action.payload);
        console.log('✅ Added preferred device:', action.payload.name);
      }
    },

    removePreferredDevice: (state, action: PayloadAction<string>) => {
      state.preferredDevices = state.preferredDevices.filter(
        d => d.address !== action.payload
      );
      console.log('🗑️ Removed preferred device');
    },

    clearConnectionHistory: (state) => {
      state.connectionHistory = [];
      state.disconnectCount = 0;
      console.log('🧹 Connection history cleared');
    },

    // ═══════════════════════════════════════════════════════════════════════
    // RESET
    // ═══════════════════════════════════════════════════════════════════════

    resetBluetoothState: (state) => {
      state.isConnected = false;
      state.isConnecting = false;
      state.currentDevice = null;
      state.reconnectAttempts = 0;
      state.lastDisconnectTime = null;
      console.log('🔄 Bluetooth state reset');
    },

    clearLastConnectedDevice: (state) => {
      state.lastConnectedDevice = null;
      console.log('🧹 Last connected device cleared');
    },
  },
});

export const {
  setConnecting,
  setConnected,
  setDisconnected,
  connectionFailed,
  incrementReconnectAttempt,
  resetReconnectAttempts,
  setAutoReconnect,
  addPreferredDevice,
  removePreferredDevice,
  clearConnectionHistory,
  resetBluetoothState,
  clearLastConnectedDevice,
} = bluetoothSlice.actions;

export default bluetoothSlice.reducer;