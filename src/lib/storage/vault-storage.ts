/**
 * IndexedDB storage for the encrypted vault.
 * Uses idb-keyval for simple key-value storage.
 */

import { get, set, del, createStore, type UseStore } from 'idb-keyval';
import { STORAGE_KEYS, VAULT_VERSION } from '$crypto';
import type { WrappedDEK } from '$crypto';
import type { StoredCredential } from '$webauthn';
import type { StoredVaultData, VaultMetadata } from './types';

// Create a custom store for vault data
const vaultStore: UseStore = createStore('passwordless-vault-db', 'vault-store');

/**
 * Saves the encrypted vault data.
 */
export async function saveEncryptedVault(encryptedData: string): Promise<void> {
  await set(STORAGE_KEYS.VAULT, encryptedData, vaultStore);
}

/**
 * Loads the encrypted vault data.
 */
export async function loadEncryptedVault(): Promise<string | undefined> {
  return get<string>(STORAGE_KEYS.VAULT, vaultStore);
}

/**
 * Saves vault metadata.
 */
export async function saveVaultMetadata(metadata: VaultMetadata): Promise<void> {
  await set(STORAGE_KEYS.VAULT_METADATA, metadata, vaultStore);
}

/**
 * Loads vault metadata.
 */
export async function loadVaultMetadata(): Promise<VaultMetadata | undefined> {
  return get<VaultMetadata>(STORAGE_KEYS.VAULT_METADATA, vaultStore);
}

/**
 * Saves the list of registered credentials.
 */
export async function saveCredentials(credentials: StoredCredential[]): Promise<void> {
  await set(STORAGE_KEYS.CREDENTIALS, credentials, vaultStore);
}

/**
 * Loads the list of registered credentials.
 */
export async function loadCredentials(): Promise<StoredCredential[]> {
  const credentials = await get<StoredCredential[]>(STORAGE_KEYS.CREDENTIALS, vaultStore);
  return credentials ?? [];
}

/**
 * Adds a new credential to storage.
 */
export async function addCredential(credential: StoredCredential): Promise<void> {
  const credentials = await loadCredentials();
  credentials.push(credential);
  await saveCredentials(credentials);
}

/**
 * Removes a credential from storage.
 */
export async function removeCredential(credentialId: string): Promise<void> {
  const credentials = await loadCredentials();
  const filtered = credentials.filter((c) => c.id !== credentialId);
  await saveCredentials(filtered);
}

/**
 * Updates a credential's last used timestamp.
 */
export async function updateCredentialLastUsed(credentialId: string): Promise<void> {
  const credentials = await loadCredentials();
  const credential = credentials.find((c) => c.id === credentialId);
  if (credential) {
    credential.lastUsedAt = Date.now();
    await saveCredentials(credentials);
  }
}

/**
 * Saves wrapped DEKs for all credentials.
 */
export async function saveWrappedDEKs(wrappedDEKs: WrappedDEK[]): Promise<void> {
  await set(STORAGE_KEYS.WRAPPED_DEKS, wrappedDEKs, vaultStore);
}

/**
 * Loads wrapped DEKs.
 */
export async function loadWrappedDEKs(): Promise<WrappedDEK[]> {
  const deks = await get<WrappedDEK[]>(STORAGE_KEYS.WRAPPED_DEKS, vaultStore);
  return deks ?? [];
}

/**
 * Adds a wrapped DEK for a new credential.
 */
export async function addWrappedDEK(wrappedDEK: WrappedDEK): Promise<void> {
  const deks = await loadWrappedDEKs();
  deks.push(wrappedDEK);
  await saveWrappedDEKs(deks);
}

/**
 * Removes a wrapped DEK when a credential is deleted.
 */
export async function removeWrappedDEK(credentialId: string): Promise<void> {
  const deks = await loadWrappedDEKs();
  const filtered = deks.filter((d) => d.credentialId !== credentialId);
  await saveWrappedDEKs(filtered);
}

/**
 * Gets the wrapped DEK for a specific credential.
 */
export async function getWrappedDEKForCredential(
  credentialId: string
): Promise<WrappedDEK | undefined> {
  const deks = await loadWrappedDEKs();
  return deks.find((d) => d.credentialId === credentialId);
}

/**
 * Checks if a vault exists.
 */
export async function vaultExists(): Promise<boolean> {
  const [vault, metadata] = await Promise.all([loadEncryptedVault(), loadVaultMetadata()]);
  return vault !== undefined && metadata !== undefined;
}

/**
 * Creates initial vault metadata.
 */
export function createInitialMetadata(): VaultMetadata {
  const now = Date.now();
  return {
    version: VAULT_VERSION,
    createdAt: now,
    modifiedAt: now,
    itemCount: 0,
  };
}

/**
 * Clears all vault data. Use with caution!
 */
export async function clearAllVaultData(): Promise<void> {
  await Promise.all([
    del(STORAGE_KEYS.VAULT, vaultStore),
    del(STORAGE_KEYS.VAULT_METADATA, vaultStore),
    del(STORAGE_KEYS.CREDENTIALS, vaultStore),
    del(STORAGE_KEYS.WRAPPED_DEKS, vaultStore),
  ]);
}

/**
 * Exports all vault data for backup.
 */
export async function exportVaultData(): Promise<StoredVaultData | null> {
  const [encryptedVault, metadata, credentials, wrappedDEKs] = await Promise.all([
    loadEncryptedVault(),
    loadVaultMetadata(),
    loadCredentials(),
    loadWrappedDEKs(),
  ]);

  if (encryptedVault === undefined || metadata === undefined) {
    return null;
  }

  return {
    encryptedVault,
    metadata,
    credentials,
    wrappedDEKs,
  };
}

/**
 * Imports vault data from backup.
 */
export async function importVaultData(data: StoredVaultData): Promise<void> {
  await Promise.all([
    saveEncryptedVault(data.encryptedVault),
    saveVaultMetadata(data.metadata),
    saveCredentials(data.credentials),
    saveWrappedDEKs(data.wrappedDEKs),
  ]);
}




