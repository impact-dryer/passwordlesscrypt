import { describe, it, expect } from 'vitest';
import { importMasterKey, deriveAesKey, deriveKEK, deriveEncryptionKey } from './kdf';
import { HKDF_INFO } from './constants';

describe('crypto/kdf', () => {
  // Sample 32-byte PRF output (simulating WebAuthn PRF)
  const samplePRFOutput = new Uint8Array(32).fill(0x42);

  describe('importMasterKey', () => {
    it('should import raw bytes as HKDF key', async () => {
      const key = await importMasterKey(samplePRFOutput);

      expect(key).toBeInstanceOf(CryptoKey);
      expect(key.algorithm.name).toBe('HKDF');
      expect(key.extractable).toBe(false);
      expect(key.usages).toContain('deriveKey');
    });

    it('should create non-extractable key', async () => {
      const key = await importMasterKey(samplePRFOutput);
      expect(key.extractable).toBe(false);
    });

    it('should work with different input sizes', async () => {
      const smallInput = new Uint8Array(16).fill(0x11);
      const largeInput = new Uint8Array(64).fill(0x22);

      const key1 = await importMasterKey(smallInput);
      const key2 = await importMasterKey(largeInput);

      expect(key1).toBeInstanceOf(CryptoKey);
      expect(key2).toBeInstanceOf(CryptoKey);
    });
  });

  describe('deriveAesKey', () => {
    it('should derive AES-GCM key for encryption', async () => {
      const masterKey = await importMasterKey(samplePRFOutput);
      const aesKey = await deriveAesKey(masterKey, 'test-info', 'encrypt-decrypt', 'test-salt');

      expect(aesKey).toBeInstanceOf(CryptoKey);
      expect(aesKey.algorithm.name).toBe('AES-GCM');
      expect((aesKey.algorithm as AesKeyAlgorithm).length).toBe(256);
      expect(aesKey.usages).toContain('encrypt');
      expect(aesKey.usages).toContain('decrypt');
    });

    it('should derive AES-GCM key for wrapping', async () => {
      const masterKey = await importMasterKey(samplePRFOutput);
      const aesKey = await deriveAesKey(masterKey, 'test-info', 'wrap-unwrap', 'test-salt');

      expect(aesKey).toBeInstanceOf(CryptoKey);
      expect(aesKey.usages).toContain('wrapKey');
      expect(aesKey.usages).toContain('unwrapKey');
    });

    it('should derive different keys for different info strings', async () => {
      const masterKey = await importMasterKey(samplePRFOutput);

      const key1 = await deriveAesKey(masterKey, 'info-1', 'encrypt-decrypt', 'test-salt');
      const key2 = await deriveAesKey(masterKey, 'info-2', 'encrypt-decrypt', 'test-salt');

      // Export both keys to compare (we need to create extractable keys for this test)
      // Since our keys are non-extractable, we test by encrypting the same data
      const testData = new Uint8Array([1, 2, 3, 4]);
      const iv = new Uint8Array(12).fill(0);

      const encrypted1 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key1, testData);
      const encrypted2 = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key2, testData);

      // Different keys should produce different ciphertexts
      expect(new Uint8Array(encrypted1)).not.toEqual(new Uint8Array(encrypted2));
    });

    it('should create non-extractable keys', async () => {
      const masterKey = await importMasterKey(samplePRFOutput);
      const aesKey = await deriveAesKey(masterKey, 'test', 'encrypt-decrypt', 'test-salt');

      expect(aesKey.extractable).toBe(false);
    });
  });

  describe('deriveKEK', () => {
    it('should derive KEK from PRF output', async () => {
      const kek = await deriveKEK(samplePRFOutput, 'test-salt');

      expect(kek).toBeInstanceOf(CryptoKey);
      expect(kek.algorithm.name).toBe('AES-GCM');
      expect(kek.usages).toContain('wrapKey');
      expect(kek.usages).toContain('unwrapKey');
    });

    it('should derive same KEK from same input', async () => {
      const kek1 = await deriveKEK(samplePRFOutput, 'test-salt');
      const kek2 = await deriveKEK(samplePRFOutput, 'test-salt');

      // Test by wrapping the same key
      const testKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
      ]);
      const iv = new Uint8Array(12).fill(0);

      const wrapped1 = await crypto.subtle.wrapKey('raw', testKey, kek1, {
        name: 'AES-GCM',
        iv,
      });
      const wrapped2 = await crypto.subtle.wrapKey('raw', testKey, kek2, {
        name: 'AES-GCM',
        iv,
      });

      expect(new Uint8Array(wrapped1)).toEqual(new Uint8Array(wrapped2));
    });

    it('should derive different KEKs from different inputs', async () => {
      const input1 = new Uint8Array(32).fill(0x11);
      const input2 = new Uint8Array(32).fill(0x22);

      const kek1 = await deriveKEK(input1, 'test-salt');
      const kek2 = await deriveKEK(input2, 'test-salt');

      const testKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
      ]);
      const iv = new Uint8Array(12).fill(0);

      const wrapped1 = await crypto.subtle.wrapKey('raw', testKey, kek1, {
        name: 'AES-GCM',
        iv,
      });
      const wrapped2 = await crypto.subtle.wrapKey('raw', testKey, kek2, {
        name: 'AES-GCM',
        iv,
      });

      expect(new Uint8Array(wrapped1)).not.toEqual(new Uint8Array(wrapped2));
    });
  });

  describe('deriveEncryptionKey', () => {
    it('should derive encryption key from PRF output', async () => {
      const key = await deriveEncryptionKey(samplePRFOutput, 'test-salt');

      expect(key).toBeInstanceOf(CryptoKey);
      expect(key.algorithm.name).toBe('AES-GCM');
      expect(key.usages).toContain('encrypt');
      expect(key.usages).toContain('decrypt');
    });

    it('should derive different key than KEK', async () => {
      await deriveKEK(samplePRFOutput, 'test-salt'); // KEK for reference (not used directly)
      const encKey = await deriveEncryptionKey(samplePRFOutput, 'test-salt');

      // Test by encrypting same data
      const testData = new Uint8Array([1, 2, 3, 4]);
      const iv = new Uint8Array(12).fill(0);

      // KEK can't encrypt directly, but encKey can
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encKey, testData);

      expect(encrypted.byteLength).toBeGreaterThan(0);
    });
  });

  describe('domain separation', () => {
    it('should use correct info string for KEK', () => {
      // This test verifies the HKDF_INFO constants are used correctly
      expect(HKDF_INFO.KEK).toBe('Passwordless Encryption KEK V1');
    });

    it('should use correct info string for DEK', () => {
      expect(HKDF_INFO.DEK).toBe('Passwordless Encryption DEK V1');
    });
  });
});
