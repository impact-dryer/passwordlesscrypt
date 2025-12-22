/**
 * IndexedDB storage for encrypted file blobs.
 * Uses idb-keyval for simple key-value storage with a separate database for files.
 *
 * Note: We use a separate database ('passwordless-files-db') instead of adding
 * a store to the vault database because IndexedDB requires version upgrades
 * to add new object stores, which would require complex migration logic.
 */

import { get, set, del, keys, createStore, type UseStore } from 'idb-keyval';
import { STORAGE_KEYS } from '$crypto';

// Create a dedicated database for encrypted file blobs
// Using a separate database avoids IndexedDB version upgrade issues
const fileStore: UseStore = createStore('passwordless-files-db', 'file-store');

/**
 * Saves an encrypted file blob.
 *
 * @param fileId - Unique identifier for the file
 * @param encryptedBlob - The encrypted file data as Uint8Array
 */
export async function saveEncryptedFile(fileId: string, encryptedBlob: Uint8Array): Promise<void> {
  const key = `${STORAGE_KEYS.FILE_BLOBS}:${fileId}`;
  await set(key, encryptedBlob, fileStore);
}

/**
 * Loads an encrypted file blob.
 *
 * @param fileId - Unique identifier for the file
 * @returns The encrypted file data, or undefined if not found
 */
export async function loadEncryptedFile(fileId: string): Promise<Uint8Array | undefined> {
  const key = `${STORAGE_KEYS.FILE_BLOBS}:${fileId}`;
  return get<Uint8Array>(key, fileStore);
}

/**
 * Deletes an encrypted file blob.
 *
 * @param fileId - Unique identifier for the file to delete
 */
export async function deleteEncryptedFile(fileId: string): Promise<void> {
  const key = `${STORAGE_KEYS.FILE_BLOBS}:${fileId}`;
  await del(key, fileStore);
}

/**
 * Gets all file IDs stored in the file store.
 *
 * @returns Array of file IDs
 */
export async function getAllFileIds(): Promise<string[]> {
  const allKeys = await keys<string>(fileStore);
  const prefix = `${STORAGE_KEYS.FILE_BLOBS}:`;
  return allKeys.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
}

/**
 * Calculates the total storage used by encrypted files.
 *
 * @returns Total size in bytes
 */
export async function getFileStorageUsage(): Promise<number> {
  const fileIds = await getAllFileIds();
  let totalSize = 0;

  for (const fileId of fileIds) {
    const blob = await loadEncryptedFile(fileId);
    if (blob) {
      totalSize += blob.byteLength;
    }
  }

  return totalSize;
}

/**
 * Clears all encrypted file blobs.
 * Use with caution - this permanently deletes all files!
 */
export async function clearAllFiles(): Promise<void> {
  const fileIds = await getAllFileIds();
  await Promise.all(fileIds.map((fileId) => deleteEncryptedFile(fileId)));
}
