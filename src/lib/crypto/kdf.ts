/**
 * Key Derivation Functions using HKDF (HMAC-based Key Derivation Function).
 * Following RFC 5869 and Yubico's PRF guide best practices.
 *
 * The PRF output from WebAuthn is treated as Input Keying Material (IKM),
 * which is then derived into purpose-bound keys using HKDF.
 */

import { AES_KEY_LENGTH, HKDF_INFO } from './constants';
import { stringToBytes } from './utils';

/**
 * Imports raw bytes as an HKDF master key.
 * This key can only be used to derive other keys, not for encryption directly.
 *
 * @param ikm - Input Keying Material (e.g., PRF output from WebAuthn)
 * @returns A CryptoKey that can only be used for key derivation
 */
export async function importMasterKey(ikm: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    ikm.buffer as ArrayBuffer,
    'HKDF',
    false, // Non-extractable for security
    ['deriveKey']
  );
}

/**
 * Derives an AES-GCM key from a master key using HKDF.
 *
 * @param masterKey - The HKDF master key (from importMasterKey)
 * @param info - Purpose-binding info string (domain separation)
 * @param usage - Key usage: 'encrypt' for DEK, 'wrapKey' for KEK
 * @returns A derived AES-GCM CryptoKey
 */
export async function deriveAesKey(
  masterKey: CryptoKey,
  info: string,
  usage: 'encrypt-decrypt' | 'wrap-unwrap',
  salt: string
): Promise<CryptoKey> {
  const keyUsages: KeyUsage[] =
    usage === 'encrypt-decrypt' ? ['encrypt', 'decrypt'] : ['wrapKey', 'unwrapKey'];

  const infoBytes = stringToBytes(info);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: stringToBytes(salt).buffer as ArrayBuffer,
      hash: 'SHA-256',
      info: infoBytes.buffer as ArrayBuffer,
    },
    masterKey,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false, // Non-extractable
    keyUsages
  );
}

/**
 * Derives a Key Encryption Key (KEK) from PRF output.
 * The KEK is used to wrap/unwrap the Data Encryption Key.
 *
 * @param prfOutput - The raw PRF output from WebAuthn
 * @returns A CryptoKey for wrapping/unwrapping the DEK
 */
export async function deriveKEK(prfOutput: Uint8Array, salt: string): Promise<CryptoKey> {
  const masterKey = await importMasterKey(prfOutput);
  return deriveAesKey(masterKey, HKDF_INFO.KEK, 'wrap-unwrap', salt);
}

/**
 * Derives the encryption key directly from PRF output.
 * Used for simpler single-key scenarios (not envelope encryption).
 *
 * @param prfOutput - The raw PRF output from WebAuthn
 * @returns A CryptoKey for encrypting/decrypting data
 */
export async function deriveEncryptionKey(prfOutput: Uint8Array, salt: string): Promise<CryptoKey> {
  const masterKey = await importMasterKey(prfOutput);
  return deriveAesKey(masterKey, HKDF_INFO.DEK, 'encrypt-decrypt', salt);
}
