/* eslint-disable no-bitwise */
// store/services/BluetoothService.ts
/**
 * Production-Grade Centralized Bluetooth Service
 * ✅ Connection persistence
 * ✅ Auto-reconnection with exponential backoff
 * ✅ Connection health monitoring
 * ✅ Background/Foreground handling
 * ✅ Error recovery mechanisms
 */

import {
  Platform,
  PermissionsAndroid,
  AppState,
  AppStateStatus,
} from 'react-native';
import RNBluetoothClassic, {
  BluetoothDevice,
} from 'react-native-bluetooth-classic';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type BTStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'reconnecting';
export type BTMode = 'bmi' | 'recharge'; // ✅ NEW: Operation mode

export interface BTData {
  height?: number;
  weight?: number;
  timestamp: number;
}

export interface BTDevice {
  id: string;
  name: string;
  address: string;
  device: BluetoothDevice;
}

export type BTDataCallback = (data: BTData) => void;
export type BTStatusCallback = (status: BTStatus) => void;
export type BTErrorCallback = (error: Error) => void;
export type BTDisconnectCallback = () => void;
export type BTAckCallback = (ack: string) => void; // ✅ NEW: For recharge ACK

// ═══════════════════════════════════════════════════════════════════════════
// RECHARGE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const XOR_KEY = 0x5a;
const RECHARGE_CMD = 'R';
const CMD_TERMINATOR = '\n';
const MAX_CREDIT = 50_000;
const ACK_TIMEOUT_MS = 50_000;

// ═══════════════════════════════════════════════════════════════════════════
// BLUETOOTH SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

class BluetoothService {
  private static instance: BluetoothService;

  // Connection state
  private currentDevice: BluetoothDevice | null = null;
  private dataSubscription: any = null;
  private status: BTStatus = 'disconnected';

  // Callbacks
  private dataCallbacks: Set<BTDataCallback> = new Set();
  private statusCallbacks: Set<BTStatusCallback> = new Set();
  private errorCallbacks: Set<BTErrorCallback> = new Set();
  private disconnectCallbacks: Set<BTDisconnectCallback> = new Set();
  private ackCallbacks: Set<BTAckCallback> = new Set(); // ✅ NEW: For recharge ACK

  // Data cache
  private lastData: BTData = { timestamp: 0 };

  // ✅ NEW: Operation mode
  private currentMode: BTMode = 'bmi';
  private ackResolver: ((value: string) => void) | null = null;
  private ackRejecter: ((reason: Error) => void) | null = null;
  private ackTimer: NodeJS.Timeout | null = null;

  // ✅ NEW: Connection monitoring
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private isReconnecting: boolean = false;

  // ✅ NEW: AppState management
  private appStateSubscription: any = null;
  private wasConnectedBeforeBackground: boolean = false;

  private constructor() {
    console.log('🔵 BluetoothService: Initialized (Production Mode)');
    this.setupAppStateListener();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLETON PATTERN
  // ═══════════════════════════════════════════════════════════════════════════

  public static getInstance(): BluetoothService {
    if (!BluetoothService.instance) {
      BluetoothService.instance = new BluetoothService();
    }
    return BluetoothService.instance;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APP STATE LISTENER (Background/Foreground Handling)
  // ═══════════════════════════════════════════════════════════════════════════

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this),
    );
    console.log('✅ AppState listener registered');
  }

  private async handleAppStateChange(
    nextAppState: AppStateStatus,
  ): Promise<void> {
    console.log('📱 AppState changed to:', nextAppState);

    if (nextAppState === 'background') {
      // App going to background
      if (this.currentDevice) {
        this.wasConnectedBeforeBackground = true;
        console.log('📱 App backgrounded - keeping connection alive');
        // Don't disconnect - keep connection alive
      }
    } else if (nextAppState === 'active') {
      // App coming to foreground
      console.log('📱 App foregrounded');

      if (this.wasConnectedBeforeBackground && this.currentDevice) {
        // Check if still connected
        const stillConnected = await this.isConnected();

        if (!stillConnected) {
          console.log(
            '⚠️ Connection lost while backgrounded - attempting reconnect',
          );
          this.handleUnexpectedDisconnect();
        } else {
          console.log('✅ Connection maintained through background');
        }
      }

      this.wasConnectedBeforeBackground = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      if (Platform.Version >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ]);

        return (
          result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
            'granted' &&
          result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted'
        );
      }

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return result === 'granted';
    } catch (error) {
      console.log('❌ Permission request error:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVICE DISCOVERY
  // ═══════════════════════════════════════════════════════════════════════════

  public async getPairedDevices(): Promise<BTDevice[]> {
    try {
      console.log('🔍 Fetching paired Bluetooth devices...');
      const devices = await RNBluetoothClassic.getBondedDevices();

      return devices.map(device => ({
        id: device.address,
        name: device.name || 'Unknown Device',
        address: device.address,
        device,
      }));
    } catch (error: any) {
      console.log('❌ Error fetching paired devices:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  public async connect(
    device: BluetoothDevice,
    isReconnect: boolean = false,
  ): Promise<boolean> {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(
        `🔵 ${isReconnect ? 'Reconnecting' : 'Connecting'} to device:`,
        device.name,
        device.address,
      );

      this.updateStatus(isReconnect ? 'reconnecting' : 'connecting');

      // ✅ Clear any existing reconnect attempts
      this.clearReconnectTimer();

      // Check if already connected
      const isConnected = await device.isConnected();
      if (isConnected) {
        console.log('✅ Device already connected');
        this.currentDevice = device;
        this.startDataListener(device);
        this.startHealthMonitoring();
        this.updateStatus('connected');
        this.reconnectAttempts = 0;
        return true;
      }

      // Try standard connection
      try {
        const connected = await device.connect({
          connectorType: 'rfcomm',
          DELIMITER: '\n',
          DEVICE_CHARSET: 'utf-8',
          CONNECTION_TIMEOUT: 30000,
        });

        if (connected) {
          console.log('✅ Standard connection successful');
          this.currentDevice = device;
          this.startDataListener(device);
          this.startHealthMonitoring();
          this.updateStatus('connected');
          this.reconnectAttempts = 0;
          return true;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (standardError) {
        console.log('⚠️ Standard connection failed, trying SPP UUID...');
      }

      // Try with SPP UUID fallback
      const sppConnected = await device.connect({
        connectorType: 'rfcomm',
        DELIMITER: '\n',
        DEVICE_CHARSET: 'utf-8',
        CONNECTION_TIMEOUT: 30000,
        UUID: '00001101-0000-1000-8000-00805F9B34FB',
      });

      if (sppConnected) {
        console.log('✅ SPP connection successful');
        this.currentDevice = device;
        this.startDataListener(device);
        this.startHealthMonitoring();
        this.updateStatus('connected');
        this.reconnectAttempts = 0;
        return true;
      }

      throw new Error('Connection failed');
    } catch (error: any) {
      console.log('❌ Connection error:', error);
      this.updateStatus('error');

      // ✅ If this was a reconnect attempt, schedule next retry
      if (isReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect(device);
      }

      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      console.log('🔌 Disconnecting Bluetooth...');

      // ✅ Stop monitoring and reconnection
      this.stopHealthMonitoring();
      this.clearReconnectTimer();
      this.reconnectAttempts = 0;
      this.isReconnecting = false;

      // Remove data listener
      if (this.dataSubscription) {
        this.dataSubscription.remove();
        this.dataSubscription = null;
      }

      // Disconnect device
      if (this.currentDevice) {
        const isConnected = await this.currentDevice.isConnected();
        if (isConnected) {
          await this.currentDevice.disconnect();
          console.log('✅ Device disconnected');
        }
        this.currentDevice = null;
      }

      this.updateStatus('disconnected');
    } catch (error: any) {
      console.log('❌ Disconnect error:', error);
      this.currentDevice = null;
      this.dataSubscription = null;
      this.updateStatus('disconnected');
      throw error;
    }
  }

  public async isConnected(): Promise<boolean> {
    if (!this.currentDevice) {
      return false;
    }

    try {
      return await this.currentDevice.isConnected();
    } catch (error) {
      console.log('❌ isConnected error:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ NEW: CONNECTION HEALTH MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  private startHealthMonitoring(): void {
    // Clear any existing interval
    this.stopHealthMonitoring();

    console.log('💓 Starting connection health monitoring (every 15s)');

    this.healthCheckInterval = setInterval(async () => {
      if (!this.currentDevice) {
        this.stopHealthMonitoring();
        return;
      }

      try {
        const connected = await this.currentDevice.isConnected();

        if (!connected && this.status === 'connected') {
          console.log('⚠️ Health check failed - connection lost');
          this.handleUnexpectedDisconnect();
        } else if (connected) {
          console.log('💓 Health check passed');
        }
      } catch (error) {
        console.log('❌ Health check error:', error);
      }
    }, 15000); // Check every 15 seconds
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 Health monitoring stopped');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ NEW: AUTO-RECONNECTION LOGIC
  // ═══════════════════════════════════════════════════════════════════════════

  private handleUnexpectedDisconnect(): void {
    console.log('⚠️ Unexpected disconnect detected');

    // Notify disconnect callbacks
    this.notifyDisconnect();

    this.updateStatus('disconnected');

    // Clean up current connection
    if (this.dataSubscription) {
      this.dataSubscription.remove();
      this.dataSubscription = null;
    }

    // Attempt reconnection if we have a device and haven't exceeded max attempts
    if (this.currentDevice && !this.isReconnecting) {
      console.log('🔄 Initiating auto-reconnection...');
      this.scheduleReconnect(this.currentDevice);
    }
  }

  private scheduleReconnect(device: BluetoothDevice): void {
    this.clearReconnectTimer();

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(
        `❌ Max reconnect attempts (${this.maxReconnectAttempts}) reached`,
      );
      this.isReconnecting = false;
      this.currentDevice = null;
      this.updateStatus('disconnected');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
    const delay = Math.min(
      2000 * Math.pow(2, this.reconnectAttempts - 1),
      32000,
    );

    console.log(
      `⏱️ Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimeout = setTimeout(async () => {
      console.log(
        `🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
      );

      const success = await this.connect(device, true);

      if (!success) {
        // connect() will handle scheduling next retry
        console.log(`❌ Reconnect attempt ${this.reconnectAttempts} failed`);
      } else {
        console.log(
          `✅ Reconnected successfully on attempt ${this.reconnectAttempts}`,
        );
        this.isReconnecting = false;
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // ✅ Manual reconnect (called from hook/UI)
  public async reconnect(): Promise<boolean> {
    if (!this.currentDevice) {
      throw new Error('No device to reconnect to');
    }

    console.log('🔄 Manual reconnect requested');
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.clearReconnectTimer();

    return await this.connect(this.currentDevice, true);
  }

  // ✅ Reset reconnect attempts (useful after successful connection elsewhere)
  public resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.clearReconnectTimer();
    console.log('✅ Reconnect attempts reset');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  private startDataListener(device: BluetoothDevice): void {
    console.log('👂 Starting data listener...');

    // Remove old listener if exists
    if (this.dataSubscription) {
      this.dataSubscription.remove();
    }

    // Create new listener
    this.dataSubscription = device.onDataReceived(data => {
      console.log('📥 Raw data received:', data);

      try {
        const dataStr = (data.data || data).toString();
        if (!dataStr) return; // ignore empty frames, no noise in logs
        console.log('📊 Parsed data string:', dataStr);
        console.log('🎯 Current mode:', this.currentMode);

        // ═══════════════════════════════════════════════════════════════════
        // BMI MODE - Parse health data
        //
        // IMPORTANT: We ONLY extract Height and Weight from the kiosk.
        // Everything else (BMI, ideal weight, fat %, health score) is
        // calculated app-side in healthMetricsCalculator.ts. This makes us
        // robust to firmware variations:
        //   - Old kiosks send "HEIGHT=", "WEIGHT=", "BODY MASS INDEX="
        //   - Newer kiosks send "Height=", "Weight=", "B.M.I.=", plus
        //     extra lines like "Ideal Weight = 26.0kg - 32.9kg" that used
        //     to falsely match our Weight regex.
        //
        // Rules:
        //   - Height/Weight labels must be at start-of-string (^) or after a
        //     whitespace/newline (\s) — never mid-word. This prevents
        //     "Ideal Weight = 26" from being read as Weight = 26.
        //   - Case-insensitive to handle both HEIGHT and Height.
        // ═══════════════════════════════════════════════════════════════════
        const receivedData: BTData = {
          timestamp: Date.now(),
        };

        // Parse HEIGHT — but skip frames containing "Ideal Height" (future-proof).
        // Each BT frame is parsed independently, so a simple guard is enough.
        const isIdealHeightFrame = /Ideal\s+Height/i.test(dataStr);
        const heightMatch =
          !isIdealHeightFrame &&
          dataStr.match(/Height\s*[=:]\s*(\d+\.?\d*)\s*cm/i);
        if (heightMatch && heightMatch[1]) {
          receivedData.height = parseFloat(heightMatch[1]);
          console.log('📏 Height:', receivedData.height, 'cm');
        }

        // Parse WEIGHT — but reject frames containing "Ideal Weight" like
        // "  Ideal Weight = 26.0kg - 32.9kg" which would otherwise be
        // mistaken for a real Weight reading and overwrite the correct one.
        const isIdealWeightFrame = /Ideal\s+Weight/i.test(dataStr);
        const weightMatch =
          !isIdealWeightFrame &&
          dataStr.match(/Weight\s*[=:]\s*(\d+\.?\d*)\s*(?:kg|Kg)/i);
        if (weightMatch && weightMatch[1]) {
          receivedData.weight = parseFloat(weightMatch[1]);
          console.log('⚖️ Weight:', receivedData.weight, 'kg');
        }

        // BMI, RESULT, Ideal Weight etc. are intentionally NOT parsed here.
        // The app calculates them from Height + Weight in healthMetricsCalculator.

        // If we got valid data, cache it and notify listeners
        if (receivedData.height || receivedData.weight) {
          this.lastData = receivedData;
          this.notifyData(receivedData);
        }
      } catch (error) {
        console.log('❌ Error parsing data:', error);
        this.notifyError(error as Error);
      }
    });

    console.log('✅ Data listener started');
  }

  public getLastData(): BTData {
    return { ...this.lastData };
  }

  public clearLastData(): void {
    this.lastData = { timestamp: 0 };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  public onData(callback: BTDataCallback): () => void {
    this.dataCallbacks.add(callback);
    return () => this.dataCallbacks.delete(callback);
  }

  public onStatus(callback: BTStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.status);
    return () => this.statusCallbacks.delete(callback);
  }

  public onError(callback: BTErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  public onDisconnect(callback: BTDisconnectCallback): () => void {
    this.disconnectCallbacks.add(callback);
    return () => this.disconnectCallbacks.delete(callback);
  }

  private notifyData(data: BTData): void {
    this.dataCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.log('Error in data callback:', error);
      }
    });
  }

  private notifyError(error: Error): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.log('Error in error callback:', err);
      }
    });
  }

  private notifyDisconnect(): void {
    this.disconnectCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.log('Error in disconnect callback:', error);
      }
    });
  }

  private updateStatus(status: BTStatus): void {
    this.status = status;
    console.log('📡 Status updated:', status);

    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.log('Error in status callback:', error);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  public getStatus(): BTStatus {
    return this.status;
  }

  public getCurrentDevice(): BTDevice | null {
    if (!this.currentDevice) {
      return null;
    }

    return {
      id: this.currentDevice.address,
      name: this.currentDevice.name || 'Unknown Device',
      address: this.currentDevice.address,
      device: this.currentDevice,
    };
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  public getMaxReconnectAttempts(): number {
    return this.maxReconnectAttempts;
  }

  public setMaxReconnectAttempts(attempts: number): void {
    this.maxReconnectAttempts = Math.max(1, Math.min(attempts, 10)); // Between 1-10
    console.log(
      `🔧 Max reconnect attempts set to: ${this.maxReconnectAttempts}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECHARGE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Switch to recharge mode
   * This changes how incoming data is interpreted
   */
  public setRechargeMode(): void {
    console.log('💰 Switching to RECHARGE mode');
    this.currentMode = 'recharge';
  }

  /**
   * Switch back to BMI mode
   */
  public setBMIMode(): void {
    console.log('📊 Switching to BMI mode');
    this.currentMode = 'bmi';
  }

  /**
   * Get current operation mode
   */
  public getCurrentMode(): BTMode {
    return this.currentMode;
  }

  /**
   * Send recharge initiation command "R"
   */
  public async sendRechargeCommand(): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No device connected');
    }

    try {
      const isConnected = await this.currentDevice.isConnected();
      if (!isConnected) {
        throw new Error('Device not connected');
      }

      console.log('💰 Sending recharge command: "R\\n"');
      await RNBluetoothClassic.writeToDevice(
        this.currentDevice.address,
        RECHARGE_CMD + CMD_TERMINATOR, // ← "R\n" instead of just "R"
      );
      console.log('✅ Recharge command sent');

      this.setRechargeMode();
    } catch (error: any) {
      console.log('❌ Send recharge command error:', error);
      throw error;
    }
  }

  /**
   * Encrypt amount using XOR encryption
   */
  // public encryptAmount(amount: number): string {
  //   if (amount <= 0 || amount > MAX_CREDIT) {
  //     throw new Error(`Amount must be between 1 and ${MAX_CREDIT}`);
  //   }

  //   const plain = amount.toString();
  //   let encrypted = '';

  //   for (let i = 0; i < plain.length; i++) {
  //     encrypted += String.fromCharCode(plain.charCodeAt(i) ^ XOR_KEY);
  //   }

  //   console.log(`🔐 Encrypted ${amount} → "${encrypted}"`);
  //   return encrypted;
  // }

  /**
   * Encrypt amount using XOR + HEX encoding
   * Format expected by kiosk firmware: XOR each char with 0x5A, then HEX-encode the bytes
   * Example: 50 → '5'^0x5A='o'(0x6F), '0'^0x5A='j'(0x6A) → "6F6A"
   */
  public encryptAmount(amount: number): string {
    if (amount <= 0 || amount > MAX_CREDIT) {
      throw new Error(`Amount must be between 1 and ${MAX_CREDIT}`);
    }

    const plain = amount.toString();
    let hex = '';

    for (let i = 0; i < plain.length; i++) {
      const xored = plain.charCodeAt(i) ^ XOR_KEY;
      hex += xored.toString(16).padStart(2, '0').toUpperCase();
    }

    console.log(`🔐 Encrypted ${amount} → "${hex}" (${hex.length} chars)`);
    return hex;
  }

  /**
   * Decrypt ACK from kiosk (HEX string)
   */
  public decryptAck(hexAck: string): number {
    const trimmed = hexAck.trim();

    if (trimmed.length === 0 || trimmed.length % 2 !== 0) {
      throw new Error('Invalid ACK: bad hex length');
    }

    let plain = '';
    for (let i = 0; i < trimmed.length; i += 2) {
      const byte = parseInt(trimmed.substring(i, i + 2), 16);
      if (isNaN(byte)) {
        throw new Error(`Invalid ACK: non-hex chars at position ${i}`);
      }
      plain += String.fromCharCode(byte ^ XOR_KEY);
    }

    if (!/^\d+$/.test(plain)) {
      throw new Error(`Invalid ACK: decrypted value "${plain}" is not numeric`);
    }

    const value = parseInt(plain, 10);
    if (value <= 0 || value > MAX_CREDIT) {
      throw new Error(`Invalid ACK: value ${value} out of range`);
    }

    console.log(`🔓 Decrypted ACK "${hexAck}" → ${value}`);
    return value;
  }

  /**
   * Send encrypted amount and wait for ACK
   */
  // public async sendEncryptedAmount(amount: number): Promise<number> {
  //   if (!this.currentDevice) {
  //     throw new Error('No device connected');
  //   }

  //   try {
  //     const isConnected = await this.currentDevice.isConnected();
  //     if (!isConnected) {
  //       throw new Error('Device not connected');
  //     }

  //     // Encrypt the amount
  //     const encrypted = this.encryptAmount(amount);

  //     console.log(`💰 Sending encrypted amount: ${amount}`);

  //     // Switch to recharge mode for ACK handling
  //     this.setRechargeMode();

  //     // Send encrypted data
  //     await this.currentDevice.write(encrypted);
  //     console.log('✅ Encrypted amount sent, waiting for ACK...');

  //     // Wait for ACK
  //     const ackData = await this.waitForAck();

  //     // Decrypt ACK
  //     const confirmedAmount = this.decryptAck(ackData);
  //     console.log(`✅ ACK confirmed amount: ${confirmedAmount}`);

  //     // Switch back to BMI mode
  //     this.setBMIMode();

  //     return confirmedAmount;
  //   } catch (error: any) {
  //     // Switch back to BMI mode on error
  //     this.setBMIMode();

  //     console.log('❌ Send encrypted amount error:', error);
  //     throw error;
  //   }
  // }

  async sendEncryptedAmount(amount: number): Promise<number> {
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_CREDIT) {
      throw new Error(`Invalid amount: ${amount}`);
    }
    if (!this.currentDevice || !this.isConnected) {
      throw new Error('Not connected to kiosk');
    }

    // ✅ CORRECT: send RAW XOR bytes (not hex-encoded).
    // Firmware decrypt_value() does character-by-character XOR
    // and expects the result to be ASCII digits.
    //
    // Example: 10 → "10" → XOR each char → "kj" (bytes 0x6B, 0x6A)
    // NOT "6B6A" — that would be hex encoding and firmware rejects it.
    const asciiAmount = amount.toString();
    const rawXor = Array.from(asciiAmount)
      .map(ch => String.fromCharCode(ch.charCodeAt(0) ^ XOR_KEY))
      .join('');

    // Nice log so you can see both the raw string and its hex representation
    const hexPreview = Array.from(rawXor)
      .map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    console.log(
      `🔐 Encrypted ${amount} → raw "${rawXor}" (bytes: ${hexPreview})`,
    );

    this.setRechargeMode();
    const ackPromise = this.waitForAck();

    try {
      // writeToDevice sends the string as bytes. Our XOR'd result for
      // digits 0-9 always lands in the lowercase-letter range (a-o),
      // so plain string encoding works.
      await RNBluetoothClassic.writeToDevice(
        this.currentDevice.address,
        rawXor + CMD_TERMINATOR,
      );
    } catch (err: any) {
      this.setBMIMode();
      throw new Error(`Write failed: ${err?.message ?? err}`);
    }

    console.log('⏳ Waiting for ACK...');
    try {
      const ackHex = await ackPromise; // string like "6B6A"
      const confirmed = this.decryptAck(ackHex); // decrypt → number like 10
      console.log(`✅ ACK received: "${ackHex}" → ${confirmed}`);
      return confirmed;
    } finally {
      this.setBMIMode();
    }
  }

  /**
   * Wait for ACK response from kiosk
   */
  public waitForAck(): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('⏳ Waiting for ACK...');

      // Set timeout
      this.ackTimer = setTimeout(() => {
        console.log('❌ ACK timeout');
        this.ackResolver = null;
        this.ackRejecter = null;
        reject(new Error('ACK timeout: kiosk did not respond in time'));
      }, ACK_TIMEOUT_MS);

      // Store resolvers for data listener
      this.ackResolver = resolve;
      this.ackRejecter = reject;
    });
  }

  /**
   * Handle ACK data (called from data listener in recharge mode)
   */
  private handleAckData(data: string): void {
    console.log('📥 ACK data received:', data);

    // Clear timeout
    if (this.ackTimer) {
      clearTimeout(this.ackTimer);
      this.ackTimer = null;
    }

    // Resolve promise if waiting
    if (this.ackResolver) {
      this.ackResolver(data.trim());
      this.ackResolver = null;
      this.ackRejecter = null;
    }

    // Notify ACK callbacks
    this.notifyAck(data.trim());
  }

  /**
   * Subscribe to ACK events
   */
  public onAck(callback: BTAckCallback): () => void {
    this.ackCallbacks.add(callback);
    return () => this.ackCallbacks.delete(callback);
  }

  /**
   * Notify ACK callbacks
   */
  private notifyAck(ack: string): void {
    this.ackCallbacks.forEach(callback => {
      try {
        callback(ack);
      } catch (error) {
        console.log('Error in ACK callback:', error);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND DATA
  // ═══════════════════════════════════════════════════════════════════════════

  public async sendData(data: string): Promise<boolean> {
    if (!this.currentDevice) {
      throw new Error('No device connected');
    }

    try {
      const isConnected = await this.currentDevice.isConnected();
      if (!isConnected) {
        throw new Error('Device not connected');
      }

      console.log('📤 Sending data:', data);
      await this.currentDevice.write(data);
      console.log('✅ Data sent successfully');
      return true;
    } catch (error: any) {
      console.log('❌ Send data error:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  public cleanup(): void {
    console.log('🧹 Cleaning up Bluetooth service...');

    this.stopHealthMonitoring();
    this.clearReconnectTimer();

    // Clear ACK timer if waiting
    if (this.ackTimer) {
      clearTimeout(this.ackTimer);
      this.ackTimer = null;
    }

    // Reject pending ACK promise
    if (this.ackRejecter) {
      this.ackRejecter(new Error('Service cleanup - ACK cancelled'));
      this.ackResolver = null;
      this.ackRejecter = null;
    }

    if (this.dataSubscription) {
      this.dataSubscription.remove();
      this.dataSubscription = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.dataCallbacks.clear();
    this.statusCallbacks.clear();
    this.errorCallbacks.clear();
    this.disconnectCallbacks.clear();
    this.ackCallbacks.clear(); // ✅ NEW

    // Reset to BMI mode
    this.currentMode = 'bmi';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

export default BluetoothService.getInstance();
