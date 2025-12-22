/**
 * Cryptographic constants for the passwordless encryption system.
 * Following NIST and Yubico best practices.
 */

// AES-GCM constants
export const AES_KEY_LENGTH = 256; // bits
export const AES_GCM_IV_LENGTH = 12; // bytes (96 bits as recommended by NIST SP 800-38D)
export const AES_GCM_TAG_LENGTH = 128; // bits

// HKDF info strings for domain separation
// These bind derived keys to specific purposes, preventing key reuse vulnerabilities
export const HKDF_INFO = {
  // Key Encryption Key for wrapping the DEK
  KEK: 'Passwordless Encryption KEK V1',
  // Data Encryption Key for encrypting vault data
  DEK: 'Passwordless Encryption DEK V1',
  // Authentication key for HMAC operations (if needed)
  AUTH: 'Passwordless Encryption Auth V1',
} as const;

// PRF salt for key derivation (should be unique per credential in production)
// This is used as input to the WebAuthn PRF extension
export const DEFAULT_PRF_SALT = 'passwordless-encryption-v1';

// Storage keys
export const STORAGE_KEYS = {
  VAULT: 'encrypted-vault',
  CREDENTIALS: 'passkey-credentials',
  WRAPPED_DEKS: 'wrapped-deks',
  VAULT_METADATA: 'vault-metadata',
  FILE_BLOBS: 'encrypted-files',
} as const;

// Vault version for migration support
export const VAULT_VERSION = 1;

// File encryption constants
export const FILE_CONSTANTS = {
  /** Maximum file size in bytes (100MB) */
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  /** Chunk size for streaming encryption (64KB) */
  CHUNK_SIZE: 64 * 1024,
  /** Allowed MIME types for security (empty means all allowed) */
  ALLOWED_MIME_TYPES: [] as string[],
} as const;
