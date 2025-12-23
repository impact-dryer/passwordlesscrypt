/**
 * Tests for file storage operations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveEncryptedFile,
  loadEncryptedFile,
  deleteEncryptedFile,
  getAllFileIds,
  getFileStorageUsage,
  clearAllFiles,
} from './file-storage';

// Mock idb-keyval
vi.mock('idb-keyval', () => {
  const store = new Map<string, unknown>();

  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key))),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    del: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    keys: vi.fn(() => Promise.resolve(Array.from(store.keys()))),
    createStore: vi.fn(() => ({})),
    // Expose store for testing
    __store: store,
    __clearStore: () => {
      store.clear();
    },
  };
});

describe('file-storage', () => {
  const testFileId = 'test-file-id-123';
  const testData = new Uint8Array([1, 2, 3, 4, 5]);

  beforeEach(async () => {
    // Clear the mock store before each test
    const idbModule = (await import('idb-keyval')) as {
      __clearStore?: () => void;
    };

    const clearFn = idbModule.__clearStore;
    if (typeof clearFn === 'function') {
      clearFn();
    }
    vi.clearAllMocks();
  });

  describe('saveEncryptedFile and loadEncryptedFile', () => {
    it('should save and load encrypted file data', async () => {
      await saveEncryptedFile(testFileId, testData);

      const loaded = await loadEncryptedFile(testFileId);

      expect(loaded).toEqual(testData);
    });

    it('should return undefined for non-existent file', async () => {
      const loaded = await loadEncryptedFile('non-existent-id');

      expect(loaded).toBeUndefined();
    });

    it('should overwrite existing file data', async () => {
      await saveEncryptedFile(testFileId, testData);

      const newData = new Uint8Array([10, 20, 30]);
      await saveEncryptedFile(testFileId, newData);

      const loaded = await loadEncryptedFile(testFileId);
      expect(loaded).toEqual(newData);
    });
  });

  describe('deleteEncryptedFile', () => {
    it('should delete file data', async () => {
      await saveEncryptedFile(testFileId, testData);
      await deleteEncryptedFile(testFileId);

      const loaded = await loadEncryptedFile(testFileId);
      expect(loaded).toBeUndefined();
    });

    it('should not throw when deleting non-existent file', async () => {
      await expect(deleteEncryptedFile('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('getAllFileIds', () => {
    it('should return empty array when no files exist', async () => {
      const ids = await getAllFileIds();
      expect(ids).toEqual([]);
    });

    it('should return all file IDs', async () => {
      await saveEncryptedFile('file-1', testData);
      await saveEncryptedFile('file-2', testData);
      await saveEncryptedFile('file-3', testData);

      const ids = await getAllFileIds();

      expect(ids).toHaveLength(3);
      expect(ids).toContain('file-1');
      expect(ids).toContain('file-2');
      expect(ids).toContain('file-3');
    });
  });

  describe('getFileStorageUsage', () => {
    it('should return 0 when no files exist', async () => {
      const usage = await getFileStorageUsage();
      expect(usage).toBe(0);
    });

    it('should return total size of all files', async () => {
      const data1 = new Uint8Array([1, 2, 3]); // 3 bytes
      const data2 = new Uint8Array([1, 2, 3, 4, 5]); // 5 bytes

      await saveEncryptedFile('file-1', data1);
      await saveEncryptedFile('file-2', data2);

      const usage = await getFileStorageUsage();
      expect(usage).toBe(8);
    });

    it('should handle missing file data gracefully', async () => {
      // Save files first
      await saveEncryptedFile('file-1', new Uint8Array([1, 2, 3]));
      await saveEncryptedFile('file-2', new Uint8Array([4, 5]));

      // Get reference to the mock store
      const idbModule = (await import('idb-keyval')) as {
        __store?: Map<string, unknown>;
      };
      const store = idbModule.__store;

      // Set file-2's data to undefined (simulating corruption/race)
      // The key still exists but the value is undefined
      if (store !== undefined) {
        const file2Key = Array.from(store.keys()).find((k) => k.includes('file-2'));
        if (file2Key !== undefined && file2Key !== '') {
          store.set(file2Key, undefined);
        }
      }

      const usage = await getFileStorageUsage();
      // Only file-1 should be counted (3 bytes)
      expect(usage).toBe(3);
    });
  });

  describe('clearAllFiles', () => {
    it('should delete all files', async () => {
      await saveEncryptedFile('file-1', testData);
      await saveEncryptedFile('file-2', testData);

      await clearAllFiles();

      const ids = await getAllFileIds();
      expect(ids).toHaveLength(0);
    });
  });
});
