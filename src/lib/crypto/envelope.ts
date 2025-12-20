/**
 * Envelope Encryption implementation following NIST SP 800-57.
 *
 * This pattern decouples data encryption from authentication:
 * - A Data Encryption Key (DEK) encrypts the actual data
 * - A Key Encryption Key (KEK) wraps the DEK
 * - Each passkey can produce its own KEK to wrap the same DEK
 *
 * This allows multiple passkeys to unlock the same vault.
 */

import { AES_KEY_LENGTH, AES_GCM_IV_LENGTH } from './constants';
import { concatBytes, generateRandomBytes } from './utils';

/**
 * Wrapped DEK structure stored per passkey.
 */
export interface WrappedDEK {
  /** Credential ID this wrapped DEK belongs to */
  credentialId: string;
  /** Base64-encoded wrapped DEK blob (IV + wrapped key) */
  wrappedKey: string;
  /** Timestamp when this wrapped DEK was created */
  createdAt: number;
  /** Salt used for PRF (stored for re-derivation) */
  prfSalt: string;
}

/**
 * Generates a new Data Encryption Key (DEK).
 * This is a symmetric key used to encrypt the actual vault data.
 *
 * @returns A new AES-GCM CryptoKey with extractable set for wrapping
 */
export async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: AES_KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Wraps (encrypts) a DEK using a KEK.
 *
 * @param dek - The Data Encryption Key to wrap
 * @param kek - The Key Encryption Key (derived from passkey PRF)
 * @returns Base64-encoded wrapped DEK blob (IV + ciphertext)
 */
export async function wrapDEK(dek: CryptoKey, kek: CryptoKey): Promise<string> {
  // Generate fresh IV for wrapping
  const iv = generateRandomBytes(AES_GCM_IV_LENGTH);

  const wrappedKey = await crypto.subtle.wrapKey('raw', dek, kek, {
    name: 'AES-GCM',
    iv: iv.buffer as ArrayBuffer,
  });

  // Combine IV and wrapped key
  const blob = concatBytes(iv, new Uint8Array(wrappedKey));

  // Return as base64 for storage
  return btoa(String.fromCharCode(...blob));
}

/**
 * Unwraps (decrypts) a DEK using a KEK.
 *
 * @param wrappedKeyBase64 - Base64-encoded wrapped DEK blob
 * @param kek - The Key Encryption Key (derived from passkey PRF)
 * @returns The unwrapped Data Encryption Key
 */
export async function unwrapDEK(wrappedKeyBase64: string, kek: CryptoKey): Promise<CryptoKey> {
  const blob = Uint8Array.from(atob(wrappedKeyBase64), (c) => c.charCodeAt(0));

  // Extract IV and wrapped key
  // Note: slice() creates a view with shared buffer, so we need to copy
  // the data to get proper ArrayBuffers for the crypto API
  const iv = blob.slice(0, AES_GCM_IV_LENGTH);
  const wrappedKey = blob.slice(AES_GCM_IV_LENGTH);

  // Create new ArrayBuffers to avoid buffer offset issues
  const ivBuffer = new ArrayBuffer(iv.length);
  new Uint8Array(ivBuffer).set(iv);

  const wrappedKeyBuffer = new ArrayBuffer(wrappedKey.length);
  new Uint8Array(wrappedKeyBuffer).set(wrappedKey);

  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyBuffer,
    kek,
    { name: 'AES-GCM', iv: ivBuffer },
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true, // Extractable so it can be wrapped by other KEKs
    ['encrypt', 'decrypt']
  );
}

/**
 * Creates a wrapped DEK for a new passkey credential.
 * Used when adding a new passkey to an existing vault.
 *
 * @param dek - The existing DEK (unwrapped from another passkey)
 * @param kek - The new passkey's KEK
 * @param credentialId - The new credential's ID
 * @param prfSalt - The PRF salt used for this credential
 * @returns A WrappedDEK structure to store
 */
export async function createWrappedDEKForCredential(
  dek: CryptoKey,
  kek: CryptoKey,
  credentialId: string,
  prfSalt: string
): Promise<WrappedDEK> {
  const wrappedKey = await wrapDEK(dek, kek);

  return {
    credentialId,
    wrappedKey,
    createdAt: Date.now(),
    prfSalt,
  };
}

/**
 * Performs atomic key rotation: unwrap with old KEK, re-wrap with new KEK.
 * Used for periodic key rotation as recommended by NIST SP 800-57.
 *
 * @param wrappedKeyBase64 - Current wrapped DEK
 * @param oldKEK - The old KEK (being rotated out)
 * @param newKEK - The new KEK (to wrap with)
 * @returns New wrapped DEK blob
 */
export async function rotateDEKWrapper(
  wrappedKeyBase64: string,
  oldKEK: CryptoKey,
  newKEK: CryptoKey
): Promise<string> {
  // Unwrap with old KEK
  const dek = await unwrapDEK(wrappedKeyBase64, oldKEK);

  // Re-wrap with new KEK
  return wrapDEK(dek, newKEK);
}
