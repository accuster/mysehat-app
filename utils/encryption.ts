// utils/encryption.ts
/**
 * XOR key must match the device
 */
const XOR_KEY = 66;

/**
 * Decrypts Base64(XOR(bytes, XOR_KEY)) into vitals.
 * Returns: { height, weight, bmi, deviceId }
 * Throws on malformed payload.
 */
export function decryptVitals(ciphertext: string): {
  height: number;
  weight: number;
  bmi: number;
  deviceId: string;
  plainText: string;
} {
  try {
    // Base64 decode
    const base64Decoded = atob(ciphertext);
    
    // Convert to byte array
    const xored = new Uint8Array(base64Decoded.length);
    for (let i = 0; i < base64Decoded.length; i++) {
      xored[i] = base64Decoded.charCodeAt(i);
    }

    // XOR back to original bytes
    const bytes = new Uint8Array(xored.length);
    for (let i = 0; i < xored.length; i++) {
      bytes[i] = xored[i] ^ XOR_KEY;
    }

    // Convert bytes to string
    const plain = String.fromCharCode(...bytes);
    console.log('Decrypted plain text:', plain);

    // Expected format: H=###;W=###;B=###;D=device_id
    const match = plain.match(/^H=(\d+);W=(\d+);B=(\d+);D=(.+)$/);
    if (!match) {
      const err = new Error('Malformed payload - expected H=###;W=###;B=###;D=device_id');
      (err as any).payload = plain;
      throw err;
    }

    const H = parseInt(match[1], 10);
    const W = parseInt(match[2], 10);
    const B = parseInt(match[3], 10);
    const D = match[4];

    return {
      height: H,
      weight: W / 10,
      bmi: B / 10,
      deviceId: D,
      plainText: plain,
    };
  } catch (error) {
    console.log('Decryption error:', error);
    throw error;
  }
}

/**
 * Convenience wrapper that maps deviceId -> machine_id
 * Also handles WhatsApp URL format: https://wa.me/###?text=SEHAT_BMI<base64_data>
 */
export function decrypt(input: string): {
  height: number;
  weight: number;
  bmi: number;
  machine_id: string;
} {
  let ciphertext = input;
  
  // Check if it's a WhatsApp URL
  if (input.includes('SEHAT_BMI')) {
    console.log('📱 WhatsApp URL detected, extracting payload...');
    
    // Extract everything after SEHAT_BMI
    const match = input.match(/SEHAT_BMI(.+)$/);
    if (!match || !match[1]) {
      throw new Error('Could not extract payload from WhatsApp URL');
    }
    
    // URL decode the extracted part
    let extracted = decodeURIComponent(match[1]);
    console.log('📦 URL decoded payload:', extracted);
    
    // Remove < and > if present
    extracted = extracted.replace(/^</, '').replace(/>$/, '');
    console.log('🔓 Cleaned payload:', extracted);
    
    ciphertext = extracted;
  }
  
  const v = decryptVitals(ciphertext);
  return {
    height: v.height,
    weight: v.weight,
    bmi: v.bmi,
    machine_id: v.deviceId,
  };
}