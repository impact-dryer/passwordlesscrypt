import { describe, it, expect, beforeEach } from 'vitest';
import { encryptData, decryptData, encryptObject, decryptObject } from './encryption';
import { AES_GCM_IV_LENGTH } from './constants';

describe('crypto/encryption', () => {
  let testKey: CryptoKey;

  beforeEach(async () => {
    // Generate a test key for each test
    testKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
  });

  describe('encryptData', () => {
    it('should encrypt data and prepend IV', async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const encrypted = await encryptData(testKey, plaintext);

      expect(encrypted).toBeInstanceOf(Uint8Array);
      // Result should be IV (12 bytes) + ciphertext (>= plaintext + auth tag)
      expect(encrypted.length).toBeGreaterThan(AES_GCM_IV_LENGTH + plaintext.length);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);

      const encrypted1 = await encryptData(testKey, plaintext);
      const encrypted2 = await encryptData(testKey, plaintext);

      // IVs should be different
      const iv1 = encrypted1.slice(0, AES_GCM_IV_LENGTH);
      const iv2 = encrypted2.slice(0, AES_GCM_IV_LENGTH);
      expect(iv1).not.toEqual(iv2);

      // Full ciphertexts should be different
      expect(encrypted1).not.toEqual(encrypted2);
    });

    it('should handle empty plaintext', async () => {
      const plaintext = new Uint8Array([]);
      const encrypted = await encryptData(testKey, plaintext);

      // Should still have IV + auth tag
      expect(encrypted.length).toBeGreaterThan(AES_GCM_IV_LENGTH);
    });

    it('should handle large plaintext', async () => {
      const plaintext = new Uint8Array(10000).fill(42);
      const encrypted = await encryptData(testKey, plaintext);

      expect(encrypted.length).toBeGreaterThan(plaintext.length);
    });

    it('should support additional authenticated data', async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const aad = new Uint8Array([10, 20, 30]);

      const encrypted = await encryptData(testKey, plaintext, aad);
      expect(encrypted).toBeInstanceOf(Uint8Array);
    });
  });

  describe('decryptData', () => {
    it('should decrypt data encrypted with encryptData', async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const encrypted = await encryptData(testKey, plaintext);
      const decrypted = await decryptData(testKey, encrypted);

      expect(decrypted).toEqual(plaintext);
    });

    it('should handle empty plaintext round-trip', async () => {
      const plaintext = new Uint8Array([]);
      const encrypted = await encryptData(testKey, plaintext);
      const decrypted = await decryptData(testKey, encrypted);

      expect(decrypted).toEqual(plaintext);
    });

    it('should handle large data round-trip', async () => {
      const plaintext = new Uint8Array(10000);
      const len = plaintext.length;
      for (let i = 0; i < len; i++) {
        plaintext.set([i % 256], i);
      }

      const encrypted = await encryptData(testKey, plaintext);
      const decrypted = await decryptData(testKey, encrypted);

      expect(decrypted).toEqual(plaintext);
    });

    it('should fail with wrong key', async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const encrypted = await encryptData(testKey, plaintext);

      const wrongKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ]);

      await expect(decryptData(wrongKey, encrypted)).rejects.toThrow();
    });

    it('should fail with tampered ciphertext', async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const encrypted = await encryptData(testKey, plaintext);

      // Tamper with the ciphertext (not the IV)
      const tamperedIndex = AES_GCM_IV_LENGTH + 5;
      const currentValue = encrypted.at(tamperedIndex);
      if (currentValue !== undefined) {
        encrypted.set([currentValue ^ 0xff], tamperedIndex);
      }

      await expect(decryptData(testKey, encrypted)).rejects.toThrow();
    });

    it('should fail with tampered IV', async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const encrypted = await encryptData(testKey, plaintext);

      // Tamper with the IV
      if (encrypted[0] !== undefined) {
        encrypted[0] ^= 0xff;
      }

      await expect(decryptData(testKey, encrypted)).rejects.toThrow();
    });

    it('should require matching AAD', async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const aad = new Uint8Array([10, 20, 30]);

      const encrypted = await encryptData(testKey, plaintext, aad);

      // Should fail with different AAD
      const wrongAad = new Uint8Array([10, 20, 31]);
      await expect(decryptData(testKey, encrypted, wrongAad)).rejects.toThrow();

      // Should fail with no AAD
      await expect(decryptData(testKey, encrypted)).rejects.toThrow();

      // Should succeed with correct AAD
      const decrypted = await decryptData(testKey, encrypted, aad);
      expect(decrypted).toEqual(plaintext);
    });
  });

  describe('encryptObject', () => {
    it('should encrypt JSON object to base64 string', async () => {
      const obj = { name: 'test', value: 123 };
      const encrypted = await encryptObject(testKey, obj);

      expect(typeof encrypted).toBe('string');
      // Should be valid base64
      expect(() => atob(encrypted)).not.toThrow();
    });

    it('should handle complex objects', async () => {
      const obj = {
        array: [1, 2, 3],
        nested: { a: { b: { c: 'deep' } } },
        boolean: true,
        null: null,
      };
      const encrypted = await encryptObject(testKey, obj);

      expect(typeof encrypted).toBe('string');
    });

    it('should handle arrays', async () => {
      const arr = [1, 'two', { three: 3 }];
      const encrypted = await encryptObject(testKey, arr);

      expect(typeof encrypted).toBe('string');
    });
  });

  describe('decryptObject', () => {
    it('should decrypt to original object', async () => {
      const obj = { name: 'test', value: 123, nested: { a: 1 } };
      const encrypted = await encryptObject(testKey, obj);
      const decrypted = await decryptObject<typeof obj>(testKey, encrypted);

      expect(decrypted).toEqual(obj);
    });

    it('should preserve types', async () => {
      const obj = {
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
      };
      const encrypted = await encryptObject(testKey, obj);
      const decrypted = await decryptObject<typeof obj>(testKey, encrypted);

      expect(typeof decrypted.string).toBe('string');
      expect(typeof decrypted.number).toBe('number');
      expect(typeof decrypted.boolean).toBe('boolean');
      expect(decrypted.null).toBeNull();
      expect(Array.isArray(decrypted.array)).toBe(true);
    });

    it('should fail with wrong key', async () => {
      const obj = { secret: 'data' };
      const encrypted = await encryptObject(testKey, obj);

      const wrongKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ]);

      await expect(decryptObject(wrongKey, encrypted)).rejects.toThrow();
    });

    it('should fail with invalid base64', async () => {
      await expect(decryptObject(testKey, 'not-valid-base64!!!')).rejects.toThrow();
    });

    it('should handle unicode in strings', async () => {
      const obj = { emoji: '🔐', chinese: '你好', arabic: 'مرحبا' };
      const encrypted = await encryptObject(testKey, obj);
      const decrypted = await decryptObject<typeof obj>(testKey, encrypted);

      expect(decrypted).toEqual(obj);
    });
  });

  describe('round-trip consistency', () => {
    it('should maintain data integrity through multiple round-trips', async () => {
      const original = { count: 0, data: 'test' };

      let current = original;
      for (let i = 0; i < 10; i++) {
        const encrypted = await encryptObject(testKey, current);
        current = await decryptObject<typeof original>(testKey, encrypted);
        current.count = i + 1;
      }

      expect(current.count).toBe(10);
      expect(current.data).toBe('test');
    });
  });
});




