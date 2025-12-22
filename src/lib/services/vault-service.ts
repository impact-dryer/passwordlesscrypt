/**
 * Vault Service - Orchestrates encryption, WebAuthn, and storage.
 *
 * This is the main service that provides the high-level API for:
 * - Creating and unlocking vaults
 * - Adding/removing passkeys
 * - Managing vault items (secrets, notes, passwords)
 *
 * Follows the Envelope Encryption pattern from NIST SP 800-57.
 */

import {
  deriveKEK,
  generateDEK,
  unwrapDEK,
  encryptObject,
  decryptObject,
  createWrappedDEKForCredential,
  VAULT_VERSION,
  encryptFile,
  decryptFile,
  downloadFile,
  validateFileSize,
  FILE_CONSTANTS,
} from '$crypto';
import { createCredential, authenticateWithAnyCredential, WebAuthnError } from '$webauthn';
import type { StoredCredential } from '$webauthn';
import {
  saveEncryptedVault,
  loadEncryptedVault,
  saveVaultMetadata,
  loadVaultMetadata,
  saveCredentials,
  loadCredentials,
  saveWrappedDEKs,
  addCredential,
  removeCredential,
  addWrappedDEK,
  removeWrappedDEK,
  getWrappedDEKForCredential,
  updateCredentialLastUsed,
  vaultExists,
  createInitialMetadata,
  clearAllVaultData,
  validateVaultData,
  saveEncryptedFile,
  loadEncryptedFile,
  deleteEncryptedFile,
  clearAllFiles,
} from '$storage';
import type { VaultData, VaultItem, VaultMetadata } from '$storage';

/**
 * Result of vault unlock operation.
 */
export interface UnlockResult {
  vault: VaultData;
  credentialId: string;
  credentialName: string;
}

/**
 * Current vault state.
 */
export interface VaultState {
  isSetup: boolean;
  isUnlocked: boolean;
  vault: VaultData | null;
  metadata: VaultMetadata | null;
  credentials: StoredCredential[];
  currentCredentialId: string | null;
}

/**
 * Creates the initial state.
 */
function createInitialState(): VaultState {
  return {
    isSetup: false,
    isUnlocked: false,
    vault: null,
    metadata: null,
    credentials: [],
    currentCredentialId: null,
  };
}

// In-memory state (not persisted)
let currentDEK: CryptoKey | null = null;
let state: VaultState = createInitialState();

/**
 * Gets the current vault state.
 */
export function getVaultState(): VaultState {
  return { ...state };
}

/**
 * Initializes the vault service by loading stored data.
 */
export async function initializeVault(): Promise<VaultState> {
  const [exists, metadata, credentials] = await Promise.all([
    vaultExists(),
    loadVaultMetadata(),
    loadCredentials(),
  ]);

  state = {
    isSetup: exists,
    isUnlocked: false,
    vault: null,
    metadata: metadata ?? null,
    credentials,
    currentCredentialId: null,
  };

  return getVaultState();
}

/**
 * Sets up a new vault with the first passkey.
 *
 * @param userName - Display name for the user
 * @param passkeyName - User-friendly name for the first passkey
 * @returns The initial vault state
 */
export async function setupVault(userName: string, passkeyName: string): Promise<VaultState> {
  // Create the passkey and get PRF output
  const { credential, prfOutput } = await createCredential(userName, passkeyName);

  if (!prfOutput) {
    throw new WebAuthnError('prf-not-enabled', 'PRF output not available');
  }

  // Derive KEK from PRF output
  const kek = await deriveKEK(prfOutput);

  // Generate a new DEK for the vault
  const dek = await generateDEK();
  currentDEK = dek;

  // Wrap DEK with KEK
  const wrappedDEK = await createWrappedDEKForCredential(
    dek,
    kek,
    credential.id,
    credential.prfSalt
  );

  // Create initial empty vault
  const vault: VaultData = {
    version: VAULT_VERSION,
    items: [],
  };

  // Encrypt the vault
  const encryptedVault = await encryptObject(dek, vault);

  // Create metadata
  const metadata = createInitialMetadata();

  // Save everything
  await Promise.all([
    saveEncryptedVault(encryptedVault),
    saveVaultMetadata(metadata),
    saveCredentials([credential]),
    saveWrappedDEKs([wrappedDEK]),
  ]);

  // Update state
  state = {
    isSetup: true,
    isUnlocked: true,
    vault,
    metadata,
    credentials: [credential],
    currentCredentialId: credential.id,
  };

  return getVaultState();
}

/**
 * Unlocks the vault with any available passkey.
 *
 * @returns The unlocked vault data
 */
export async function unlockVault(): Promise<UnlockResult> {
  const credentials = await loadCredentials();

  if (credentials.length === 0) {
    throw new WebAuthnError('no-credentials', 'No passkeys registered');
  }

  // Authenticate and get PRF output
  const authResult = await authenticateWithAnyCredential(credentials);

  // Find the credential and wrapped DEK
  const credential = credentials.find((c) => c.id === authResult.credentialId);
  if (!credential) {
    throw new Error('Credential not found');
  }

  const wrappedDEK = await getWrappedDEKForCredential(authResult.credentialId);
  if (!wrappedDEK) {
    throw new Error('Wrapped DEK not found for credential');
  }

  // Derive KEK and unwrap DEK
  const kek = await deriveKEK(authResult.prfOutput);
  const dek = await unwrapDEK(wrappedDEK.wrappedKey, kek);
  currentDEK = dek;

  // Load and decrypt vault
  const encryptedVault = await loadEncryptedVault();
  if (encryptedVault === undefined || encryptedVault === '') {
    throw new Error('Encrypted vault not found');
  }

  const decryptedData = await decryptObject<unknown>(dek, encryptedVault);

  // Validate decrypted data to ensure integrity
  // This protects against corrupted or tampered data
  let vault: VaultData;
  try {
    vault = validateVaultData(decryptedData);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
    throw new Error(`Vault data validation failed: ${errorMessage}`);
  }

  const metadata = await loadVaultMetadata();

  // Update last used timestamp
  await updateCredentialLastUsed(credential.id);

  // Update state
  state = {
    isSetup: true,
    isUnlocked: true,
    vault,
    metadata: metadata ?? null,
    credentials,
    currentCredentialId: credential.id,
  };

  return {
    vault,
    credentialId: credential.id,
    credentialName: credential.name,
  };
}

/**
 * Locks the vault, clearing sensitive data from memory.
 *
 * Note: Setting references to null doesn't guarantee memory is cleared
 * in JavaScript due to garbage collection. This is a known limitation
 * of browser-based cryptography. The actual key material in CryptoKey
 * objects is managed by the browser's crypto implementation.
 */
export function lockVault(): void {
  currentDEK = null;
  state = {
    ...state,
    isUnlocked: false,
    vault: null,
    currentCredentialId: null,
  };
}

/**
 * Adds a new passkey to an existing vault.
 *
 * @param passkeyName - User-friendly name for the new passkey
 * @returns The updated credentials list
 */
export async function addPasskey(passkeyName: string): Promise<StoredCredential[]> {
  if (!state.isUnlocked || !currentDEK) {
    throw new Error('Vault must be unlocked to add a passkey');
  }

  // Create new credential
  const { credential, prfOutput } = await createCredential('User', passkeyName);

  if (!prfOutput) {
    throw new WebAuthnError('prf-not-enabled', 'PRF output not available');
  }

  // Derive KEK and wrap the existing DEK
  const kek = await deriveKEK(prfOutput);
  const wrappedDEK = await createWrappedDEKForCredential(
    currentDEK,
    kek,
    credential.id,
    credential.prfSalt
  );

  // Save the new credential and wrapped DEK
  await addCredential(credential);
  await addWrappedDEK(wrappedDEK);

  // Update state
  const credentials = await loadCredentials();
  state = { ...state, credentials };

  return credentials;
}

/**
 * Removes a passkey from the vault.
 * Cannot remove the last passkey.
 *
 * @param credentialId - The credential ID to remove
 */
export async function removePasskey(credentialId: string): Promise<StoredCredential[]> {
  const credentials = await loadCredentials();

  if (credentials.length <= 1) {
    throw new Error('Cannot remove the last passkey');
  }

  if (!credentials.some((c) => c.id === credentialId)) {
    throw new Error('Passkey not found');
  }

  await removeCredential(credentialId);
  await removeWrappedDEK(credentialId);

  // Update state
  const updatedCredentials = await loadCredentials();
  state = { ...state, credentials: updatedCredentials };

  return updatedCredentials;
}

/**
 * Adds a new item to the vault.
 */
export async function addVaultItem(
  item: Omit<VaultItem, 'id' | 'createdAt' | 'modifiedAt'>
): Promise<VaultItem> {
  if (!state.isUnlocked || !currentDEK || !state.vault) {
    throw new Error('Vault must be unlocked');
  }

  const now = Date.now();
  const newItem: VaultItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: now,
    modifiedAt: now,
  };

  state.vault.items.push(newItem);

  // Re-encrypt and save
  await saveVaultData();

  return newItem;
}

/**
 * Updates an existing vault item.
 */
export async function updateVaultItem(
  id: string,
  updates: Partial<Omit<VaultItem, 'id' | 'createdAt' | 'modifiedAt'>>
): Promise<VaultItem> {
  if (!state.isUnlocked || !currentDEK || !state.vault) {
    throw new Error('Vault must be unlocked');
  }

  const existingItem = state.vault.items.find((item) => item.id === id);
  if (existingItem === undefined) {
    throw new Error('Item not found');
  }

  const updatedItem: VaultItem = {
    ...existingItem,
    ...updates,
    modifiedAt: Date.now(),
  };

  // Find and update the item in the array
  const itemIndex = state.vault.items.findIndex((item) => item.id === id);
  state.vault.items.splice(itemIndex, 1, updatedItem);

  // Re-encrypt and save
  await saveVaultData();

  return updatedItem;
}

/**
 * Deletes a vault item.
 * If the item is a file, also deletes the associated encrypted blob.
 */
export async function deleteVaultItem(id: string): Promise<void> {
  if (!state.isUnlocked || !currentDEK || !state.vault) {
    throw new Error('Vault must be unlocked');
  }

  const item = state.vault.items.find((i) => i.id === id);
  if (!item) {
    throw new Error('Item not found');
  }

  // If it's a file item, delete the encrypted blob
  if (item.type === 'file' && item.fileId !== undefined && item.fileId !== '') {
    await deleteEncryptedFile(item.fileId);
  }

  const itemIndex = state.vault.items.indexOf(item);
  state.vault.items.splice(itemIndex, 1);

  // Re-encrypt and save
  await saveVaultData();
}

/**
 * Gets all vault items.
 */
export function getVaultItems(): VaultItem[] {
  if (!state.vault) {
    return [];
  }
  return [...state.vault.items];
}

/**
 * Searches vault items by title, content, or filename.
 */
export function searchVaultItems(query: string): VaultItem[] {
  if (!state.vault) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  return state.vault.items.filter((item) => {
    if (item.title.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    if (item.content.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    if (item.url?.toLowerCase().includes(lowerQuery) === true) {
      return true;
    }
    if (item.username?.toLowerCase().includes(lowerQuery) === true) {
      return true;
    }
    // Search by filename for file items
    if (item.fileName?.toLowerCase().includes(lowerQuery) === true) {
      return true;
    }
    return false;
  });
}

/**
 * Saves the current vault data (encrypted).
 */
async function saveVaultData(): Promise<void> {
  if (!currentDEK || !state.vault) {
    throw new Error('Cannot save: vault not unlocked');
  }

  const encryptedVault = await encryptObject(currentDEK, state.vault);
  await saveEncryptedVault(encryptedVault);

  // Update metadata
  const metadata: VaultMetadata = {
    ...(state.metadata ?? createInitialMetadata()),
    modifiedAt: Date.now(),
    itemCount: state.vault.items.length,
  };

  await saveVaultMetadata(metadata);
  state.metadata = metadata;
}

/**
 * Completely resets the vault (deletes everything).
 * Requires unlocking first for safety to prevent accidental data loss.
 */
export async function resetVault(): Promise<void> {
  if (!state.isUnlocked) {
    throw new Error('Vault must be unlocked before resetting. This prevents accidental data loss.');
  }

  // Clear all vault data and encrypted files
  await Promise.all([clearAllVaultData(), clearAllFiles()]);
  currentDEK = null;
  state = createInitialState();
}

/**
 * Adds a file to the vault.
 *
 * Domain Rules:
 * - Vault must be unlocked (DEK must be in memory)
 * - File size must not exceed maximum (100MB)
 * - File is encrypted with the vault's DEK
 * - Encrypted blob stored separately from vault metadata
 *
 * @param file - The file to encrypt and store
 * @param title - Optional title (defaults to filename)
 * @returns The created vault item with file metadata
 * @throws Error if vault is not unlocked or file exceeds size limit
 */
export async function addFileItem(file: File, title?: string): Promise<VaultItem> {
  if (!state.isUnlocked || !currentDEK || !state.vault) {
    throw new Error('Vault must be unlocked to add a file');
  }

  // Validate file size
  validateFileSize(file.size);

  // Generate unique file ID
  const fileId = crypto.randomUUID();

  // Encrypt the file
  const { encryptedData, metadata } = await encryptFile(currentDEK, file);

  // Store encrypted blob separately
  await saveEncryptedFile(fileId, encryptedData);

  // Create vault item with file reference
  const now = Date.now();
  const newItem: VaultItem = {
    id: crypto.randomUUID(),
    type: 'file',
    title: title !== undefined && title !== '' ? title : file.name,
    content: '', // No content for file items
    fileId,
    fileName: metadata.fileName,
    fileSize: metadata.originalSize,
    mimeType: metadata.mimeType,
    createdAt: now,
    modifiedAt: now,
  };

  state.vault.items.push(newItem);

  // Re-encrypt and save vault metadata
  await saveVaultData();

  return newItem;
}

/**
 * Downloads a file item from the vault.
 *
 * Domain Rules:
 * - Vault must be unlocked (DEK must be in memory)
 * - Item must exist and be a file type
 * - File is decrypted on-demand
 *
 * @param itemId - The vault item ID
 * @throws Error if vault is not unlocked or item not found
 */
export async function downloadFileItem(itemId: string): Promise<void> {
  if (!state.isUnlocked || !currentDEK || !state.vault) {
    throw new Error('Vault must be unlocked to download a file');
  }

  const item = state.vault.items.find((i) => i.id === itemId);
  if (!item) {
    throw new Error('Item not found');
  }

  if (item.type !== 'file' || item.fileId === undefined || item.fileId === '') {
    throw new Error('Item is not a file');
  }

  // Load encrypted blob
  const encryptedData = await loadEncryptedFile(item.fileId);
  if (!encryptedData) {
    throw new Error('Encrypted file data not found');
  }

  // Decrypt the file
  const decryptedFile = await decryptFile(currentDEK, encryptedData, {
    fileName: item.fileName ?? 'download',
    mimeType: item.mimeType ?? 'application/octet-stream',
  });

  // Trigger download
  downloadFile(decryptedFile);
}

/**
 * Gets a decrypted file for preview (returns File object without triggering download).
 *
 * @param itemId - The vault item ID
 * @returns The decrypted File object
 * @throws Error if vault is not unlocked or item not found
 */
export async function getDecryptedFile(itemId: string): Promise<File> {
  if (!state.isUnlocked || !currentDEK || !state.vault) {
    throw new Error('Vault must be unlocked to access a file');
  }

  const item = state.vault.items.find((i) => i.id === itemId);
  if (!item) {
    throw new Error('Item not found');
  }

  if (item.type !== 'file' || item.fileId === undefined || item.fileId === '') {
    throw new Error('Item is not a file');
  }

  // Load encrypted blob
  const encryptedData = await loadEncryptedFile(item.fileId);
  if (!encryptedData) {
    throw new Error('Encrypted file data not found');
  }

  // Decrypt and return the file
  return decryptFile(currentDEK, encryptedData, {
    fileName: item.fileName ?? 'file',
    mimeType: item.mimeType ?? 'application/octet-stream',
  });
}

/**
 * Gets the maximum allowed file size.
 */
export function getMaxFileSize(): number {
  return FILE_CONSTANTS.MAX_FILE_SIZE;
}

/**
 * Generates a secure random password without modulo bias.
 * Uses rejection sampling to ensure uniform distribution.
 */
export function generateSecurePassword(length = 20): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  // Calculate the largest multiple of charset.length that fits in a byte
  // to avoid modulo bias
  const maxValidByte = Math.floor(256 / charset.length) * charset.length;
  let password = '';

  while (password.length < length) {
    // Generate more random bytes than needed to account for rejected values
    const randomBytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const byte of randomBytes) {
      // Reject bytes that would cause modulo bias
      if (byte < maxValidByte && password.length < length) {
        const charIndex = byte % charset.length;
        password += charset.charAt(charIndex);
      }
    }
  }

  return password;
}
