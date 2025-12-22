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
 * Type of vault item.
 */
export type VaultItemType = 'note' | 'password' | 'secret' | 'file';

/**
 * A single vault item (e.g., a secret, note, password, or file).
 */
export interface VaultItem {
  /** Unique identifier */
  id: string;
  /** Type of item */
  type: VaultItemType;
  /** Item title/name */
  title: string;
  /** The secret content (empty string for file items) */
  content: string;
  /** Optional URL for password items */
  url?: string | undefined;
  /** Optional username for password items */
  username?: string | undefined;
  /** When the item was created */
  createdAt: number;
  /** When the item was last modified */
  modifiedAt: number;
  /** Reference to encrypted blob in file storage (file items only) */
  fileId?: string | undefined;
  /** Original filename (file items only) */
  fileName?: string | undefined;
  /** File size in bytes (file items only) */
  fileSize?: number | undefined;
  /** MIME type for preview/download (file items only) */
  mimeType?: string | undefined;
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
