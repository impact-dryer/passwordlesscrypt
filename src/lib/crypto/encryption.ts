/**
 * AES-GCM encryption and decryption operations.
 * Following NIST SP 800-38D recommendations.
 */

import { AES_GCM_IV_LENGTH } from './constants';
import { concatBytes, generateRandomBytes, stringToBytes, bytesToString } from './utils';

/**
 * Encrypted data structure: [IV (12 bytes)][Ciphertext + Auth Tag]
 */
export interface EncryptedData {
  /** Base64-encoded encrypted blob (IV + ciphertext) */
  data: string;
  /** Version for future migration support */
  version: number;
}

/**
 * Encrypts data using AES-GCM.
 * The IV is prepended to the ciphertext for storage.
 *
 * @param key - AES-GCM CryptoKey with 'encrypt' usage
 * @param plaintext - Data to encrypt
 * @param additionalData - Optional additional authenticated data (AAD)
 * @returns Encrypted blob (IV + ciphertext)
 */
export async function encryptData(
  key: CryptoKey,
  plaintext: Uint8Array,
  additionalData?: Uint8Array
): Promise<Uint8Array> {
  // Generate a fresh random IV for each encryption
  // CRITICAL: Never reuse IVs with the same key in AES-GCM
  const iv = generateRandomBytes(AES_GCM_IV_LENGTH);

  const params: AesGcmParams = {
    name: 'AES-GCM',
    iv: iv.buffer as ArrayBuffer,
  };
  if (additionalData) {
    params.additionalData = additionalData.buffer as ArrayBuffer;
  }

  const ciphertext = await crypto.subtle.encrypt(params, key, plaintext.buffer as ArrayBuffer);

  // Prepend IV to ciphertext
  return concatBytes(iv, new Uint8Array(ciphertext));
}

/**
 * Decrypts data encrypted with AES-GCM.
 *
 * @param key - AES-GCM CryptoKey with 'decrypt' usage
 * @param encryptedBlob - Encrypted blob (IV + ciphertext)
 * @param additionalData - Optional additional authenticated data (must match encryption)
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export async function decryptData(
  key: CryptoKey,
  encryptedBlob: Uint8Array,
  additionalData?: Uint8Array
): Promise<Uint8Array> {
  // Extract IV and ciphertext
  // Note: slice() creates a view with shared buffer, so we need to copy
  // the data to get proper ArrayBuffers for the crypto API
  const iv = encryptedBlob.slice(0, AES_GCM_IV_LENGTH);
  const ciphertext = encryptedBlob.slice(AES_GCM_IV_LENGTH);

  // Create new ArrayBuffers to avoid buffer offset issues
  const ivBuffer = new ArrayBuffer(iv.length);
  new Uint8Array(ivBuffer).set(iv);

  const ciphertextBuffer = new ArrayBuffer(ciphertext.length);
  new Uint8Array(ciphertextBuffer).set(ciphertext);

  const params: AesGcmParams = {
    name: 'AES-GCM',
    iv: ivBuffer,
  };
  if (additionalData) {
    const aadBuffer = new ArrayBuffer(additionalData.length);
    new Uint8Array(aadBuffer).set(additionalData);
    params.additionalData = aadBuffer;
  }

  const plaintext = await crypto.subtle.decrypt(params, key, ciphertextBuffer);

  return new Uint8Array(plaintext);
}

/**
 * Encrypts a JSON-serializable object.
 *
 * @param key - AES-GCM CryptoKey
 * @param data - Object to encrypt
 * @returns Base64-encoded encrypted string
 */
export async function encryptObject<T>(key: CryptoKey, data: T): Promise<string> {
  const json = JSON.stringify(data);
  const plaintext = stringToBytes(json);
  const encrypted = await encryptData(key, plaintext);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...encrypted));
}

/**
 * Decrypts a JSON object.
 *
 * @param key - AES-GCM CryptoKey
 * @param encryptedBase64 - Base64-encoded encrypted string
 * @returns Decrypted object
 */
export async function decryptObject<T>(key: CryptoKey, encryptedBase64: string): Promise<T> {
  const encrypted = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const plaintext = await decryptData(key, encrypted);
  const json = bytesToString(plaintext);
  return JSON.parse(json) as T;
}
