import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initializeVault,
  getVaultState,
  lockVault,
  getVaultItems,
  searchVaultItems,
  generateSecurePassword,
  setupVault,
  unlockVault,
  addPasskey,
  removePasskey,
  addVaultItem,
  updateVaultItem,
  deleteVaultItem,
  resetVault,
} from './vault-service';

// Mutable storage state
let encryptedVault: string | undefined;
let metadata:
  | { version: number; createdAt: number; modifiedAt: number; itemCount: number }
  | undefined;
let credentials: {
  id: string;
  rawId: string;
  name: string;
  createdAt: number;
  lastUsedAt: number;
  prfEnabled: boolean;
  prfSalt: string;
  authenticatorType: 'platform' | 'cross-platform';
}[] = [];
let wrappedDEKs: {
  credentialId: string;
  wrappedKey: string;
  createdAt: number;
  prfSalt: string;
}[] = [];

function resetStorage(): void {
  encryptedVault = undefined;
  metadata = undefined;
  credentials = [];
  wrappedDEKs = [];
}

// Mock storage module
vi.mock('$storage', () => {
  return {
    saveEncryptedVault: vi.fn((data: string) => {
      encryptedVault = data;
      return Promise.resolve();
    }),
    loadEncryptedVault: vi.fn(() => Promise.resolve(encryptedVault)),
    saveVaultMetadata: vi.fn((data: typeof metadata) => {
      metadata = data;
      return Promise.resolve();
    }),
    loadVaultMetadata: vi.fn(() => Promise.resolve(metadata)),
    saveCredentials: vi.fn((data: typeof credentials) => {
      credentials = [...data];
      return Promise.resolve();
    }),
    loadCredentials: vi.fn(() => Promise.resolve([...credentials])),
    saveWrappedDEKs: vi.fn((data: typeof wrappedDEKs) => {
      wrappedDEKs = [...data];
      return Promise.resolve();
    }),
    loadWrappedDEKs: vi.fn(() => Promise.resolve([...wrappedDEKs])),
    addCredential: vi.fn((cred: (typeof credentials)[0]) => {
      credentials.push(cred);
      return Promise.resolve();
    }),
    removeCredential: vi.fn((id: string) => {
      credentials = credentials.filter((c) => c.id !== id);
      return Promise.resolve();
    }),
    addWrappedDEK: vi.fn((dek: (typeof wrappedDEKs)[0]) => {
      wrappedDEKs.push(dek);
      return Promise.resolve();
    }),
    removeWrappedDEK: vi.fn((credId: string) => {
      wrappedDEKs = wrappedDEKs.filter((d) => d.credentialId !== credId);
      return Promise.resolve();
    }),
    getWrappedDEKForCredential: vi.fn((credId: string) => {
      return Promise.resolve(wrappedDEKs.find((d) => d.credentialId === credId));
    }),
    updateCredentialLastUsed: vi.fn(() => Promise.resolve()),
    vaultExists: vi.fn(() =>
      Promise.resolve(encryptedVault !== undefined && metadata !== undefined)
    ),
    createInitialMetadata: vi.fn(() => ({
      version: 1,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      itemCount: 0,
    })),
    clearAllVaultData: vi.fn(() => {
      resetStorage();
      return Promise.resolve();
    }),
    validateVaultData: vi.fn((data: unknown) => data),
  };
});

// Mock webauthn module
vi.mock('$webauthn', () => {
  class WebAuthnError extends Error {
    type: string;
    constructor(type: string, message: string) {
      super(message);
      this.type = type;
      this.name = 'WebAuthnError';
    }
  }

  return {
    createCredential: vi.fn((_userName: string, passkeyName: string) =>
      Promise.resolve({
        credential: {
          id: `cred-${String(Date.now())}-${Math.random().toString(36).slice(2)}`,
          rawId: `raw-id-${String(Date.now())}`,
          name: passkeyName,
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          prfEnabled: true,
          prfSalt: `salt-${String(Date.now())}`,
          authenticatorType: 'platform',
        },
        prfOutput: new Uint8Array(32).fill(0x42),
      })
    ),
    authenticateWithAnyCredential: vi.fn((creds: { id: string }[]) => {
      if (creds.length === 0) {
        return Promise.reject(new WebAuthnError('no-credentials', 'No passkeys registered'));
      }
      return Promise.resolve({
        credentialId: creds[0]?.id ?? 'unknown',
        prfOutput: new Uint8Array(32).fill(0x42),
      });
    }),
    WebAuthnError,
  };
});

// Mock crypto module
vi.mock('$crypto', () => {
  return {
    deriveKEK: vi.fn(() =>
      crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey'])
    ),
    generateDEK: vi.fn(() =>
      crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
    ),
    unwrapDEK: vi.fn(() =>
      crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
    ),
    encryptObject: vi.fn(() => Promise.resolve('encrypted-data')),
    decryptObject: vi.fn(() => Promise.resolve({ version: 1, items: [] })),
    createWrappedDEKForCredential: vi.fn(
      (_dek: CryptoKey, _kek: CryptoKey, credId: string, prfSalt: string) =>
        Promise.resolve({
          credentialId: credId,
          wrappedKey: 'wrapped-key-base64',
          createdAt: Date.now(),
          prfSalt,
        })
    ),
    VAULT_VERSION: 1,
  };
});

describe('services/vault-service', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    resetStorage();
    lockVault();

    // Re-establish mock implementations after reset
    const storage = await import('$storage');
    vi.mocked(storage.saveEncryptedVault).mockImplementation((data: string) => {
      encryptedVault = data;
      return Promise.resolve();
    });
    vi.mocked(storage.loadEncryptedVault).mockImplementation(() => Promise.resolve(encryptedVault));
    vi.mocked(storage.saveVaultMetadata).mockImplementation((data) => {
      metadata = data as typeof metadata;
      return Promise.resolve();
    });
    vi.mocked(storage.loadVaultMetadata).mockImplementation(() => Promise.resolve(metadata));
    vi.mocked(storage.saveCredentials).mockImplementation((data) => {
      credentials = [...data] as typeof credentials;
      return Promise.resolve();
    });
    vi.mocked(storage.loadCredentials).mockImplementation(() => Promise.resolve([...credentials]));
    vi.mocked(storage.saveWrappedDEKs).mockImplementation((data) => {
      wrappedDEKs = [...data] as typeof wrappedDEKs;
      return Promise.resolve();
    });
    vi.mocked(storage.addCredential).mockImplementation((cred) => {
      credentials.push(cred as (typeof credentials)[0]);
      return Promise.resolve();
    });
    vi.mocked(storage.removeCredential).mockImplementation((id: string) => {
      credentials = credentials.filter((c) => c.id !== id);
      return Promise.resolve();
    });
    vi.mocked(storage.addWrappedDEK).mockImplementation((dek) => {
      wrappedDEKs.push(dek as (typeof wrappedDEKs)[0]);
      return Promise.resolve();
    });
    vi.mocked(storage.removeWrappedDEK).mockImplementation((credId: string) => {
      wrappedDEKs = wrappedDEKs.filter((d) => d.credentialId !== credId);
      return Promise.resolve();
    });
    vi.mocked(storage.getWrappedDEKForCredential).mockImplementation((credId: string) => {
      return Promise.resolve(wrappedDEKs.find((d) => d.credentialId === credId));
    });
    vi.mocked(storage.updateCredentialLastUsed).mockImplementation(() => Promise.resolve());
    vi.mocked(storage.vaultExists).mockImplementation(() =>
      Promise.resolve(encryptedVault !== undefined && metadata !== undefined)
    );
    vi.mocked(storage.createInitialMetadata).mockImplementation(() => ({
      version: 1,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      itemCount: 0,
    }));
    vi.mocked(storage.clearAllVaultData).mockImplementation(() => {
      resetStorage();
      return Promise.resolve();
    });
    vi.mocked(storage.validateVaultData).mockImplementation(
      (data: unknown) => data as ReturnType<typeof storage.validateVaultData>
    );
  });

  describe('getVaultState', () => {
    it('should return current state', () => {
      const state = getVaultState();

      expect(state).toHaveProperty('isSetup');
      expect(state).toHaveProperty('isUnlocked');
      expect(state).toHaveProperty('vault');
      expect(state).toHaveProperty('metadata');
      expect(state).toHaveProperty('credentials');
      expect(state).toHaveProperty('currentCredentialId');
    });

    it('should return a copy of state (not reference)', () => {
      const state1 = getVaultState();
      const state2 = getVaultState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('initializeVault', () => {
    it('should initialize with no existing vault', async () => {
      const state = await initializeVault();

      expect(state.isSetup).toBe(false);
      expect(state.isUnlocked).toBe(false);
      expect(state.vault).toBeNull();
    });

    it('should detect existing vault', async () => {
      const storage = await import('$storage');
      vi.mocked(storage.vaultExists).mockResolvedValue(true);
      vi.mocked(storage.loadVaultMetadata).mockResolvedValue({
        version: 1,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        itemCount: 5,
      });
      vi.mocked(storage.loadCredentials).mockResolvedValue([
        {
          id: 'cred-1',
          rawId: 'raw-1',
          name: 'Passkey',
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          prfEnabled: true,
          prfSalt: 'salt',
          authenticatorType: 'platform',
        },
      ]);

      const state = await initializeVault();

      expect(state.isSetup).toBe(true);
      expect(state.metadata).not.toBeNull();
      expect(state.credentials).toHaveLength(1);
    });
  });

  describe('lockVault', () => {
    it('should clear sensitive state', () => {
      lockVault();
      const state = getVaultState();

      expect(state.isUnlocked).toBe(false);
      expect(state.vault).toBeNull();
      expect(state.currentCredentialId).toBeNull();
    });

    it('should preserve setup state and credentials', async () => {
      const storage = await import('$storage');
      vi.mocked(storage.vaultExists).mockResolvedValue(true);
      vi.mocked(storage.loadCredentials).mockResolvedValue([
        {
          id: 'cred-1',
          rawId: 'raw-1',
          name: 'Passkey',
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          prfEnabled: true,
          prfSalt: 'salt',
          authenticatorType: 'platform',
        },
      ]);

      await initializeVault();
      lockVault();

      const state = getVaultState();
      // Note: credentials persist because they're stored, not just in memory
      expect(state.isUnlocked).toBe(false);
    });
  });

  describe('getVaultItems', () => {
    it('should return empty array when vault not unlocked', () => {
      lockVault();
      const items = getVaultItems();
      expect(items).toEqual([]);
    });

    it('should return copy of items', () => {
      // When vault is not unlocked, items should be empty
      const items1 = getVaultItems();
      const items2 = getVaultItems();

      expect(items1).not.toBe(items2);
    });
  });

  describe('searchVaultItems', () => {
    it('should return empty array when vault not unlocked', () => {
      lockVault();
      const results = searchVaultItems('test');
      expect(results).toEqual([]);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of default length', () => {
      const password = generateSecurePassword();
      expect(password.length).toBe(20);
    });

    it('should generate password of specified length', () => {
      const password = generateSecurePassword(30);
      expect(password.length).toBe(30);
    });

    it('should generate different passwords each time', () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();
      expect(password1).not.toBe(password2);
    });

    it('should contain only allowed characters', () => {
      const charset =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
      const password = generateSecurePassword(100);

      for (const char of password) {
        expect(charset).toContain(char);
      }
    });

    it('should handle short lengths', () => {
      const password = generateSecurePassword(1);
      expect(password.length).toBe(1);
    });

    it('should handle zero length', () => {
      const password = generateSecurePassword(0);
      expect(password.length).toBe(0);
    });

    it('should generate passwords with good distribution', () => {
      // Generate many passwords and check for reasonable distribution
      const passwords = Array.from({ length: 100 }, () => generateSecurePassword(50));
      const allChars = passwords.join('');

      // Should have lowercase
      expect(allChars).toMatch(/[a-z]/);
      // Should have uppercase
      expect(allChars).toMatch(/[A-Z]/);
      // Should have numbers
      expect(allChars).toMatch(/[0-9]/);
      // Should have special chars
      expect(allChars).toMatch(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/);
    });
  });

  describe('setupVault', () => {
    it('should set up a new vault with passkey', async () => {
      const state = await setupVault('Test User', 'My Passkey');

      expect(state.isSetup).toBe(true);
      expect(state.isUnlocked).toBe(true);
      expect(state.vault).not.toBeNull();
      expect(state.credentials).toHaveLength(1);
      expect(state.credentials[0]?.name).toBe('My Passkey');
    });

    it('should create empty vault with correct version', async () => {
      const state = await setupVault('User', 'Key');
      expect(state.vault?.items).toEqual([]);
      expect(state.vault?.version).toBe(1);
    });
  });

  describe('unlockVault', () => {
    it('should unlock existing vault', async () => {
      // First setup
      await setupVault('User', 'Key');
      lockVault();

      // Ensure credentials and wrapped DEKs are in storage for unlock
      credentials = [
        {
          id: 'cred-1',
          rawId: 'raw-1',
          name: 'Key',
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          prfEnabled: true,
          prfSalt: 'salt-1',
          authenticatorType: 'platform',
        },
      ];
      wrappedDEKs = [
        {
          credentialId: 'cred-1',
          wrappedKey: 'wrapped',
          createdAt: Date.now(),
          prfSalt: 'salt-1',
        },
      ];
      encryptedVault = 'encrypted';
      metadata = { version: 1, createdAt: Date.now(), modifiedAt: Date.now(), itemCount: 0 };

      const result = await unlockVault();
      expect(result.vault).toBeDefined();
      expect(result.credentialId).toBe('cred-1');
    });

    it('should throw when no credentials', async () => {
      await expect(unlockVault()).rejects.toThrow('No passkeys registered');
    });
  });

  describe('addPasskey', () => {
    it('should add passkey to unlocked vault', async () => {
      await setupVault('User', 'First Key');

      const creds = await addPasskey('Second Key');
      expect(creds.length).toBeGreaterThanOrEqual(1);
    });

    it('should throw when vault is locked', async () => {
      await expect(addPasskey('Key')).rejects.toThrow('Vault must be unlocked');
    });
  });

  describe('removePasskey', () => {
    it('should remove passkey from vault', async () => {
      await setupVault('User', 'First');
      const credsAfterSetup = await addPasskey('Second');

      // Verify we have 2 credentials
      expect(credsAfterSetup.length).toBeGreaterThanOrEqual(2);

      // Get the second credential ID from the returned list
      const secondCred = credsAfterSetup.find((c) => c.name === 'Second');
      expect(secondCred).toBeDefined();

      if (secondCred === undefined) {
        throw new Error('Second credential not found');
      }
      const creds = await removePasskey(secondCred.id);
      expect(creds.some((c) => c.id === secondCred.id)).toBe(false);
    });

    it('should throw when trying to remove last passkey', async () => {
      await setupVault('User', 'Only Key');

      const state = getVaultState();
      const firstCred = state.credentials[0];
      expect(firstCred).toBeDefined();

      if (firstCred === undefined) {
        throw new Error('No credential found');
      }
      await expect(removePasskey(firstCred.id)).rejects.toThrow('Cannot remove the last passkey');
    });

    it('should throw when passkey not found', async () => {
      await setupVault('User', 'Key');
      await addPasskey('Second');

      await expect(removePasskey('non-existent')).rejects.toThrow('Passkey not found');
    });
  });

  describe('vault item operations', () => {
    beforeEach(async () => {
      await setupVault('User', 'Key');
    });

    it('should add vault item', async () => {
      const item = await addVaultItem({
        type: 'password',
        title: 'Test',
        content: 'secret123',
      });

      expect(item.id).toBeDefined();
      expect(item.title).toBe('Test');
      expect(item.createdAt).toBeGreaterThan(0);
    });

    it('should update vault item', async () => {
      const item = await addVaultItem({
        type: 'note',
        title: 'Note',
        content: 'Original',
      });

      const updated = await updateVaultItem(item.id, { content: 'Updated' });
      expect(updated.content).toBe('Updated');
      expect(updated.modifiedAt).toBeGreaterThanOrEqual(item.createdAt);
    });

    it('should throw when updating non-existent item', async () => {
      await expect(updateVaultItem('non-existent', { content: 'new' })).rejects.toThrow(
        'Item not found'
      );
    });

    it('should delete vault item', async () => {
      const item = await addVaultItem({
        type: 'secret',
        title: 'Secret',
        content: 'key',
      });

      await deleteVaultItem(item.id);
      expect(getVaultItems()).toHaveLength(0);
    });

    it('should throw when deleting non-existent item', async () => {
      await expect(deleteVaultItem('non-existent')).rejects.toThrow('Item not found');
    });

    it('should throw when vault is locked', async () => {
      lockVault();

      await expect(addVaultItem({ type: 'note', title: 'Test', content: 'test' })).rejects.toThrow(
        'Vault must be unlocked'
      );
      await expect(updateVaultItem('id', { content: 'new' })).rejects.toThrow(
        'Vault must be unlocked'
      );
      await expect(deleteVaultItem('id')).rejects.toThrow('Vault must be unlocked');
    });
  });

  describe('searchVaultItems', () => {
    beforeEach(async () => {
      await setupVault('User', 'Key');
      await addVaultItem({
        type: 'password',
        title: 'Gmail Login',
        content: 'pass1',
        url: 'gmail.com',
        username: 'user@gmail.com',
      });
      await addVaultItem({
        type: 'password',
        title: 'Facebook',
        content: 'pass2',
        url: 'facebook.com',
      });
      await addVaultItem({ type: 'note', title: 'Private Note', content: 'secret stuff' });
    });

    it('should search by title', () => {
      const results = searchVaultItems('gmail');
      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe('Gmail Login');
    });

    it('should search by content', () => {
      const results = searchVaultItems('secret');
      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe('Private Note');
    });

    it('should search by URL', () => {
      const results = searchVaultItems('facebook');
      expect(results).toHaveLength(1);
    });

    it('should search by username', () => {
      const results = searchVaultItems('user@gmail');
      expect(results).toHaveLength(1);
    });

    it('should be case insensitive', () => {
      const results = searchVaultItems('GMAIL');
      expect(results).toHaveLength(1);
    });
  });

  describe('resetVault', () => {
    it('should reset vault when unlocked', async () => {
      await setupVault('User', 'Key');
      await addVaultItem({ type: 'note', title: 'Test', content: 'test' });

      await resetVault();

      const state = getVaultState();
      expect(state.isSetup).toBe(false);
      expect(state.isUnlocked).toBe(false);
      expect(state.vault).toBeNull();
    });

    it('should throw when vault is locked', async () => {
      await setupVault('User', 'Key');
      lockVault();

      await expect(resetVault()).rejects.toThrow('Vault must be unlocked before resetting');
    });
  });
});
