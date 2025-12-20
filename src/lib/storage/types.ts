/**
 * Storage types for the vault system.
 */

import type { WrappedDEK } from '$crypto';
import type { StoredCredential } from '$webauthn';

/**
 * Vault metadata stored separately from encrypted data.
 */
export interface VaultMetadata {
  /** Vault format version for migrations */
  version: number;
  /** When the vault was created */
  createdAt: number;
  /** When the vault was last modified */
  modifiedAt: number;
  /** Number of items in the vault */
  itemCount: number;
}

/**
 * A single vault item (e.g., a secret, note, or password).
 */
export interface VaultItem {
  /** Unique identifier */
  id: string;
  /** Type of item */
  type: 'note' | 'password' | 'secret';
  /** Item title/name */
  title: string;
  /** The secret content */
  content: string;
  /** Optional URL for password items */
  url?: string | undefined;
  /** Optional username for password items */
  username?: string | undefined;
  /** When the item was created */
  createdAt: number;
  /** When the item was last modified */
  modifiedAt: number;
}

/**
 * The full vault data structure (stored encrypted).
 */
export interface VaultData {
  /** Vault version for migrations */
  version: number;
  /** All vault items */
  items: VaultItem[];
}

/**
 * Stored data structure containing all vault-related data.
 */
export interface StoredVaultData {
  /** Encrypted vault data (base64) */
  encryptedVault: string;
  /** Vault metadata (not encrypted) */
  metadata: VaultMetadata;
  /** List of registered credentials */
  credentials: StoredCredential[];
  /** Wrapped DEKs for each credential */
  wrappedDEKs: WrappedDEK[];
}


