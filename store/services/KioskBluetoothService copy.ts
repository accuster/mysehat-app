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
const KIOSK_PREFIX   = 'BMI_';
const ACK_TIMEOUT_MS = 10_000; // 10 s wait for kiosk ACK

// ─────────────────────────────────────────────
//  Encryption  (App → Kiosk)
//  mirrors kiosk encrypt_and_send():
//  each ASCII char of the decimal string is XOR'd with key,
//  result sent as raw bytes (NOT hex-encoded)
// ─────────────────────────────────────────────
export function encryptAmount(amount: number): string {
  if (amount <= 0 || amount > MAX_CREDIT) {
    throw new Error(`Amount must be between 1 and ${MAX_CREDIT}`);
  }

  const plain = amount.toString(); // e.g. "110"
  let encrypted = '';

  for (let i = 0; i < plain.length; i++) {
    // XOR each ASCII char with the key, keep as raw char
    encrypted += String.fromCharCode(plain.charCodeAt(i) ^ XOR_KEY);
  }

  return encrypted; // e.g. "kkj"
}

// ─────────────────────────────────────────────
//  Decryption  (Kiosk → App)
//  Kiosk sends a HEX string e.g. "6B6B6A"
//  Each 2-char hex pair is a byte → XOR with key → ASCII digit
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

  // Validate digits only
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
//  Bluetooth Helpers
// ─────────────────────────────────────────────

/** Scan paired devices and return the first BMI_ kiosk found */
export async function findKiosk(): Promise<BluetoothDevice> {
  const paired: BluetoothDevice[] =
    await RNBluetoothClassic.getBondedDevices();

  const kiosk = paired.find(d =>
    d.name?.toUpperCase().startsWith(KIOSK_PREFIX),
  );

  if (!kiosk) {
    throw new Error(
      'No BMI kiosk found in paired devices. Please pair first.',
    );
  }

  return kiosk;
}

/** Connect to a kiosk device */
export async function connectToKiosk(
  device: BluetoothDevice,
): Promise<BluetoothDevice> {
  const connected = await device.connect();

  if (!connected) {
    throw new Error(`Failed to connect to ${device.name}`);
  }

  return device;
}

/** Wait for a single data message from the kiosk with timeout */
function waitForAck(device: BluetoothDevice): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      subscription.remove();
      reject(new Error('ACK timeout: kiosk did not respond in time'));
    }, ACK_TIMEOUT_MS);

    const subscription = device.onDataReceived(({ data }) => {
      clearTimeout(timer);
      subscription.remove();
      resolve(data.trim());
    });
  });
}

// ─────────────────────────────────────────────
//  Main Recharge Flow
// ─────────────────────────────────────────────

export interface RechargeResult {
  success: boolean;
  confirmedAmount: number; // amount echoed back by kiosk
}

/**
 * Full recharge flow:
 *  1. Find & connect to kiosk
 *  2. Send "R" command
 *  3. Encrypt and send amount
 *  4. Wait for encrypted ACK
 *  5. Decrypt ACK and return confirmed amount
 */
export async function performRecharge(
  amount: number,
): Promise<RechargeResult> {
  let device: BluetoothDevice | null = null;

  try {
    // 1. Discover kiosk
    const found = await findKiosk();
    device = await connectToKiosk(found);

    // 2. Send initiation command (plain, no encryption)
    await device.write(RECHARGE_CMD);

    // 3. Encrypt amount and send
    const encryptedPayload = encryptAmount(amount);
    await device.write(encryptedPayload);

    // 4. Wait for kiosk ACK (hex-encoded XOR string e.g. "6B6B6A")
    const rawAck = await waitForAck(device);

    // 5. Decrypt and validate ACK
    const confirmedAmount = decryptAck(rawAck);

    return { success: true, confirmedAmount };
  } finally {
    // Always disconnect cleanly
    if (device) {
      try {
        await device.disconnect();
      } catch (_) {
        // ignore disconnect errors
      }
    }
  }
}