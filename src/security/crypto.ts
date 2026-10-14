/**
 * Smartlance Edge Security & Local-First Encryption Service
 * Implements AES-GCM-256 with PBKDF2 key derivation using the browser's native Web Crypto API.
 * Data remains 100% on-device; keys are never transmitted.
 */

export interface EncryptedPayload {
  cipherBase64: string;
  ivBase64: string;
  saltBase64: string;
  timestamp: string;
  version: string;
}

// Convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives an AES-GCM-256 encryption key from a user passphrase using PBKDF2
 */
export async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts an arbitrary JSON object with AES-GCM-256
 */
export async function encryptVaultData(data: unknown, passphrase: string): Promise<EncryptedPayload> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassphrase(passphrase, salt);

  const jsonString = JSON.stringify(data);
  const encodedData = new TextEncoder().encode(jsonString);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encodedData
  );

  return {
    cipherBase64: bufferToBase64(encryptedBuffer),
    ivBase64: bufferToBase64(iv.buffer),
    saltBase64: bufferToBase64(salt.buffer),
    timestamp: new Date().toISOString(),
    version: '1.0.0-aes256-gcm'
  };
}

/**
 * Decrypts an EncryptedPayload using the user's passphrase
 */
export async function decryptVaultData<T>(payload: EncryptedPayload, passphrase: string): Promise<T> {
  const salt = base64ToBuffer(payload.saltBase64);
  const iv = base64ToBuffer(payload.ivBase64);
  const cipherBytes = base64ToBuffer(payload.cipherBase64);

  const key = await deriveKeyFromPassphrase(passphrase, salt);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      cipherBytes as BufferSource
    );

    const decryptedString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decryptedString) as T;
  } catch (err) {
    console.error("Decryption failed:", err);
    throw new Error("Invalid passphrase or corrupted encrypted vault data.");
  }
}
