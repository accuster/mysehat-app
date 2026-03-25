/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-bitwise */
/**
 * MySehaat – BMI Kiosk Bluetooth Recharge Service
 *
 * Protocol (confirmed from firmware + logs):
 *  - Bluetooth type  : Classic BT / SPP (device prefix "BMI_")
 *  - XOR key         : 0x5A
 *  - App → Kiosk     : Raw XOR-encrypted ASCII bytes  e.g. "kkj"  for 110
 *  - Kiosk → App     : HEX string of XOR-encrypted bytes e.g. "6B6B6A" for 110
 *  - Initiation cmd  : Plain ASCII "R" (not encrypted)
 *  - Max credit      : 50,000
 */

import RNBluetoothClassic, {
  BluetoothDevice,
} from 'react-native-bluetooth-classic';

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const XOR_KEY        = 0x5a;
const RECHARGE_CMD   = 'R';
const MAX_CREDIT     = 50_000;
const ACK_TIMEOUT_MS = 50_000;

// ─────────────────────────────────────────────
//  Encryption  (App → Kiosk)
// ─────────────────────────────────────────────
export function encryptAmount(amount: number): string {
  if (amount <= 0 || amount > MAX_CREDIT) {
    throw new Error(`Amount must be between 1 and ${MAX_CREDIT}`);
  }
  const plain = amount.toString();
  let encrypted = '';
  for (let i = 0; i < plain.length; i++) {
    encrypted += String.fromCharCode(plain.charCodeAt(i) ^ XOR_KEY);
  }
  return encrypted;
}

// ─────────────────────────────────────────────
//  Decryption  (Kiosk → App)
// ─────────────────────────────────────────────
export function decryptAck(hexAck: string): number {
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
  return value;
}

// ─────────────────────────────────────────────
//  ✅ NEW — Get ALL paired BT devices (no filter)
//  Used by the device picker bottom sheet
// ─────────────────────────────────────────────
export async function getPairedDevices(): Promise<BluetoothDevice[]> {
  try {
    const devices = await RNBluetoothClassic.getBondedDevices();
    return devices;
  } catch (err: any) {
    throw new Error(err?.message ?? 'Failed to fetch paired devices');
  }
}

// ─────────────────────────────────────────────
//  Connect to a specific device
// ─────────────────────────────────────────────
export async function connectToDevice(
  device: BluetoothDevice,
): Promise<BluetoothDevice> {
  const connected = await device.connect();
  if (!connected) {
    throw new Error(`Failed to connect to ${device.name ?? device.address}`);
  }
  return device;
}

// ─────────────────────────────────────────────
//  Wait for a single ACK from the kiosk
// ─────────────────────────────────────────────
export function waitForAck(device: BluetoothDevice): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      sub.remove();
      reject(new Error('ACK timeout: kiosk did not respond in time'));
    }, ACK_TIMEOUT_MS);

    const sub = device.onDataReceived(({ data }) => {
      clearTimeout(timer);
      sub.remove();
      resolve(data.trim());
    });
  });
}