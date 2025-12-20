import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveEncryptedVault,
  loadEncryptedVault,
  saveVaultMetadata,
  loadVaultMetadata,
  saveCredentials,
  loadCredentials,
  addCredential,
  removeCredential,
  updateCredentialLastUsed,
  saveWrappedDEKs,
  loadWrappedDEKs,
  addWrappedDEK,
  removeWrappedDEK,
  getWrappedDEKForCredential,
  vaultExists,
  createInitialMetadata,
  clearAllVaultData,
  exportVaultData,
  importVaultData,
} from './vault-storage';
import type { VaultMetadata } from './types';
import type { StoredCredential } from '$webauthn';
import type { WrappedDEK } from '$crypto';
import { VAULT_VERSION } from '$crypto';

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
    createStore: vi.fn(() => ({})),
    // Expose store for testing
    __store: store,
    __clearStore: () => { store.clear(); },
  };
});

describe('storage/vault-storage', () => {
  beforeEach(async () => {
    // Clear the mock store before each test
    const idbModule = await import('idb-keyval');
     
    const clearFn = (idbModule as any).__clearStore;
    if (typeof clearFn === 'function') {
      clearFn();
    }
    vi.clearAllMocks();
  });

  describe('encrypted vault operations', () => {
    it('should save and load encrypted vault', async () => {
      const encrypted = 'base64encodedencrypteddata';
      await saveEncryptedVault(encrypted);
      const loaded = await loadEncryptedVault();
      expect(loaded).toBe(encrypted);
    });

    it('should return undefined for non-existent vault', async () => {
      const loaded = await loadEncryptedVault();
      expect(loaded).toBeUndefined();
    });
  });

  describe('vault metadata operations', () => {
    const testMetadata: VaultMetadata = {
      version: VAULT_VERSION,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      itemCount: 5,
    };

    it('should save and load metadata', async () => {
      await saveVaultMetadata(testMetadata);
      const loaded = await loadVaultMetadata();
      expect(loaded).toEqual(testMetadata);
    });

    it('should return undefined for non-existent metadata', async () => {
      const loaded = await loadVaultMetadata();
      expect(loaded).toBeUndefined();
    });
  });

  describe('credential operations', () => {
    const testCredential: StoredCredential = {
      id: 'cred-123',
      rawId: 'rawid123',
      name: 'My Passkey',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      prfEnabled: true,
      prfSalt: 'salt123',
      authenticatorType: 'platform',
    };

    it('should save and load credentials', async () => {
      await saveCredentials([testCredential]);
      const loaded = await loadCredentials();
      expect(loaded).toEqual([testCredential]);
    });

    it('should return empty array for no credentials', async () => {
      const loaded = await loadCredentials();
      expect(loaded).toEqual([]);
    });

    it('should add credential', async () => {
      await addCredential(testCredential);
      const loaded = await loadCredentials();
      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toEqual(testCredential);
    });

    it('should add multiple credentials', async () => {
      const cred2: StoredCredential = { ...testCredential, id: 'cred-456' };
      await addCredential(testCredential);
      await addCredential(cred2);
      const loaded = await loadCredentials();
      expect(loaded).toHaveLength(2);
    });

    it('should remove credential', async () => {
      await addCredential(testCredential);
      await removeCredential(testCredential.id);
      const loaded = await loadCredentials();
      expect(loaded).toHaveLength(0);
    });

    it('should update lastUsedAt', async () => {
      const oldTime = Date.now() - 10000;
      const cred = { ...testCredential, lastUsedAt: oldTime };
      await addCredential(cred);

      await updateCredentialLastUsed(cred.id);

      const loaded = await loadCredentials();
      expect(loaded[0]?.lastUsedAt).toBeGreaterThan(oldTime);
    });

    it('should not fail when updating non-existent credential', async () => {
      await expect(updateCredentialLastUsed('non-existent')).resolves.not.toThrow();
    });
  });

  describe('wrapped DEK operations', () => {
    const testWrappedDEK: WrappedDEK = {
      credentialId: 'cred-123',
      wrappedKey: 'wrappedkeybase64',
      createdAt: Date.now(),
      prfSalt: 'salt123',
    };

    it('should save and load wrapped DEKs', async () => {
      await saveWrappedDEKs([testWrappedDEK]);
      const loaded = await loadWrappedDEKs();
      expect(loaded).toEqual([testWrappedDEK]);
    });

    it('should return empty array for no DEKs', async () => {
      const loaded = await loadWrappedDEKs();
      expect(loaded).toEqual([]);
    });

    it('should add wrapped DEK', async () => {
      await addWrappedDEK(testWrappedDEK);
      const loaded = await loadWrappedDEKs();
      expect(loaded).toHaveLength(1);
    });

    it('should remove wrapped DEK', async () => {
      await addWrappedDEK(testWrappedDEK);
      await removeWrappedDEK(testWrappedDEK.credentialId);
      const loaded = await loadWrappedDEKs();
      expect(loaded).toHaveLength(0);
    });

    it('should get wrapped DEK for credential', async () => {
      await addWrappedDEK(testWrappedDEK);
      const loaded = await getWrappedDEKForCredential(testWrappedDEK.credentialId);
      expect(loaded).toEqual(testWrappedDEK);
    });

    it('should return undefined for non-existent credential', async () => {
      const loaded = await getWrappedDEKForCredential('non-existent');
      expect(loaded).toBeUndefined();
    });
  });

  describe('vaultExists', () => {
    it('should return false when vault does not exist', async () => {
      const exists = await vaultExists();
      expect(exists).toBe(false);
    });

    it('should return false when only vault exists (no metadata)', async () => {
      await saveEncryptedVault('encrypted');
      const exists = await vaultExists();
      expect(exists).toBe(false);
    });

    it('should return false when only metadata exists (no vault)', async () => {
      await saveVaultMetadata(createInitialMetadata());
      const exists = await vaultExists();
      expect(exists).toBe(false);
    });

    it('should return true when both vault and metadata exist', async () => {
      await saveEncryptedVault('encrypted');
      await saveVaultMetadata(createInitialMetadata());
      const exists = await vaultExists();
      expect(exists).toBe(true);
    });
  });

  describe('createInitialMetadata', () => {
    it('should create metadata with correct version', () => {
      const metadata = createInitialMetadata();
      expect(metadata.version).toBe(VAULT_VERSION);
    });

    it('should set timestamps to current time', () => {
      const before = Date.now();
      const metadata = createInitialMetadata();
      const after = Date.now();

      expect(metadata.createdAt).toBeGreaterThanOrEqual(before);
      expect(metadata.createdAt).toBeLessThanOrEqual(after);
      expect(metadata.modifiedAt).toBeGreaterThanOrEqual(before);
      expect(metadata.modifiedAt).toBeLessThanOrEqual(after);
    });

    it('should set itemCount to 0', () => {
      const metadata = createInitialMetadata();
      expect(metadata.itemCount).toBe(0);
    });
  });

  describe('clearAllVaultData', () => {
    it('should clear all data', async () => {
      // Set up data
      await saveEncryptedVault('encrypted');
      await saveVaultMetadata(createInitialMetadata());
      await saveCredentials([
        {
          id: 'cred',
          rawId: 'raw',
          name: 'test',
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          prfEnabled: true,
          prfSalt: 'salt',
          authenticatorType: 'platform',
        },
      ]);
      await saveWrappedDEKs([
        {
          credentialId: 'cred',
          wrappedKey: 'key',
          createdAt: Date.now(),
          prfSalt: 'salt',
        },
      ]);

      // Clear everything
      await clearAllVaultData();

      // Verify all cleared
      expect(await loadEncryptedVault()).toBeUndefined();
      expect(await loadVaultMetadata()).toBeUndefined();
      expect(await loadCredentials()).toEqual([]);
      expect(await loadWrappedDEKs()).toEqual([]);
    });
  });

  describe('export/import', () => {
    it('should export vault data', async () => {
      const encryptedVault = 'encrypted-vault-data';
      const metadata = createInitialMetadata();
      const credentials: StoredCredential[] = [
        {
          id: 'cred-1',
          rawId: 'raw-1',
          name: 'Passkey 1',
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          prfEnabled: true,
          prfSalt: 'salt-1',
          authenticatorType: 'platform',
        },
      ];
      const wrappedDEKs: WrappedDEK[] = [
        {
          credentialId: 'cred-1',
          wrappedKey: 'wrapped-key-1',
          createdAt: Date.now(),
          prfSalt: 'salt-1',
        },
      ];

      await saveEncryptedVault(encryptedVault);
      await saveVaultMetadata(metadata);
      await saveCredentials(credentials);
      await saveWrappedDEKs(wrappedDEKs);

      const exported = await exportVaultData();

      expect(exported).not.toBeNull();
      expect(exported?.encryptedVault).toBe(encryptedVault);
      expect(exported?.metadata).toEqual(metadata);
      expect(exported?.credentials).toEqual(credentials);
      expect(exported?.wrappedDEKs).toEqual(wrappedDEKs);
    });

    it('should return null when vault does not exist', async () => {
      const exported = await exportVaultData();
      expect(exported).toBeNull();
    });

    it('should import vault data', async () => {
      const data = {
        encryptedVault: 'imported-vault',
        metadata: createInitialMetadata(),
        credentials: [
          {
            id: 'imp-cred',
            rawId: 'imp-raw',
            name: 'Imported',
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
            prfEnabled: true,
            prfSalt: 'imp-salt',
            authenticatorType: 'platform' as const,
          },
        ],
        wrappedDEKs: [
          {
            credentialId: 'imp-cred',
            wrappedKey: 'imp-key',
            createdAt: Date.now(),
            prfSalt: 'imp-salt',
          },
        ],
      };

      await importVaultData(data);

      expect(await loadEncryptedVault()).toBe(data.encryptedVault);
      expect(await loadVaultMetadata()).toEqual(data.metadata);
      expect(await loadCredentials()).toEqual(data.credentials);
      expect(await loadWrappedDEKs()).toEqual(data.wrappedDEKs);
    });
  });
});


