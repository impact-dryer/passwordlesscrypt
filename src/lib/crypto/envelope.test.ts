import { describe, it, expect } from 'vitest';
import {
  generateDEK,
  wrapDEK,
  unwrapDEK,
  createWrappedDEKForCredential,
  rotateDEKWrapper,
} from './envelope';
import { deriveKEK } from './kdf';
import { AES_KEY_LENGTH } from './constants';

describe('crypto/envelope', () => {
  // Sample PRF outputs for testing
  const prfOutput1 = new Uint8Array(32).fill(0x11);
  const prfOutput2 = new Uint8Array(32).fill(0x22);

  describe('generateDEK', () => {
    it('should generate AES-GCM 256-bit key', async () => {
      const dek = await generateDEK();

      expect(dek).toBeInstanceOf(CryptoKey);
      expect(dek.algorithm.name).toBe('AES-GCM');
      expect((dek.algorithm as AesKeyAlgorithm).length).toBe(AES_KEY_LENGTH);
    });

    it('should generate extractable key (for wrapping)', async () => {
      const dek = await generateDEK();
      expect(dek.extractable).toBe(true);
    });

    it('should have encrypt and decrypt usages', async () => {
      const dek = await generateDEK();
      expect(dek.usages).toContain('encrypt');
      expect(dek.usages).toContain('decrypt');
    });

    it('should generate unique keys each time', async () => {
      const dek1 = await generateDEK();
      const dek2 = await generateDEK();

      // Export both keys to compare
      const raw1 = await crypto.subtle.exportKey('raw', dek1);
      const raw2 = await crypto.subtle.exportKey('raw', dek2);

      expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2));
    });
  });

  describe('wrapDEK', () => {
    it('should wrap DEK with KEK and return base64 string', async () => {
      const dek = await generateDEK();
      const kek = await deriveKEK(prfOutput1);

      const wrapped = await wrapDEK(dek, kek);

      expect(typeof wrapped).toBe('string');
      // Should be valid base64
      expect(() => atob(wrapped)).not.toThrow();
    });

    it('should produce different output each time (random IV)', async () => {
      const dek = await generateDEK();
      const kek = await deriveKEK(prfOutput1);

      const wrapped1 = await wrapDEK(dek, kek);
      const wrapped2 = await wrapDEK(dek, kek);

      expect(wrapped1).not.toBe(wrapped2);
    });

    it('should include IV in output', async () => {
      const dek = await generateDEK();
      const kek = await deriveKEK(prfOutput1);

      const wrapped = await wrapDEK(dek, kek);
      const blob = Uint8Array.from(atob(wrapped), (c) => c.charCodeAt(0));

      // Should be at least IV (12 bytes) + wrapped key (32 bytes) + auth tag (16 bytes)
      expect(blob.length).toBeGreaterThanOrEqual(12 + 32 + 16);
    });
  });

  describe('unwrapDEK', () => {
    it('should unwrap DEK correctly', async () => {
      const dek = await generateDEK();
      const kek = await deriveKEK(prfOutput1);

      const wrapped = await wrapDEK(dek, kek);
      const unwrapped = await unwrapDEK(wrapped, kek);

      expect(unwrapped).toBeInstanceOf(CryptoKey);
      expect(unwrapped.algorithm.name).toBe('AES-GCM');
    });

    it('should produce functionally equivalent key', async () => {
      const dek = await generateDEK();
      const kek = await deriveKEK(prfOutput1);

      const wrapped = await wrapDEK(dek, kek);
      const unwrapped = await unwrapDEK(wrapped, kek);

      // Encrypt with original, decrypt with unwrapped
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, testData);

      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, unwrapped, encrypted);

      expect(new Uint8Array(decrypted)).toEqual(testData);
    });

    it('should fail with wrong KEK', async () => {
      const dek = await generateDEK();
      const kek1 = await deriveKEK(prfOutput1);
      const kek2 = await deriveKEK(prfOutput2);

      const wrapped = await wrapDEK(dek, kek1);

      await expect(unwrapDEK(wrapped, kek2)).rejects.toThrow();
    });

    it('should fail with tampered wrapped key', async () => {
      const dek = await generateDEK();
      const kek = await deriveKEK(prfOutput1);

      const wrapped = await wrapDEK(dek, kek);

      // Tamper with the wrapped key
      const blob = Uint8Array.from(atob(wrapped), (c) => c.charCodeAt(0));
      if (blob[20] !== undefined) {
        blob[20] ^= 0xff;
      }
      const tampered = btoa(String.fromCharCode(...blob));

      await expect(unwrapDEK(tampered, kek)).rejects.toThrow();
    });

    it('should return extractable key', async () => {
      const dek = await generateDEK();
      const kek = await deriveKEK(prfOutput1);

      const wrapped = await wrapDEK(dek, kek);
      const unwrapped = await unwrapDEK(wrapped, kek);

      // Must be extractable so it can be wrapped by other KEKs
      expect(unwrapped.extractable).toBe(true);
    });
  });

  describe('createWrappedDEKForCredential', () => {
    it('should create WrappedDEK structure', async () => {
      const dek = await generateDEK();
      const kek = await deriveKEK(prfOutput1);

      const result = await createWrappedDEKForCredential(dek, kek, 'credential-123', 'salt-abc');

      expect(result.credentialId).toBe('credential-123');
      expect(result.prfSalt).toBe('salt-abc');
      expect(typeof result.wrappedKey).toBe('string');
      expect(result.createdAt).toBeGreaterThan(0);
    });

    it('should set createdAt to current time', async () => {
      const dek = await generateDEK();
      const kek = await deriveKEK(prfOutput1);

      const before = Date.now();
      const result = await createWrappedDEKForCredential(dek, kek, 'cred', 'salt');
      const after = Date.now();

      expect(result.createdAt).toBeGreaterThanOrEqual(before);
      expect(result.createdAt).toBeLessThanOrEqual(after);
    });

    it('should create valid wrapped key', async () => {
      const dek = await generateDEK();
      const kek = await deriveKEK(prfOutput1);

      const result = await createWrappedDEKForCredential(dek, kek, 'cred', 'salt');

      // Should be able to unwrap
      const unwrapped = await unwrapDEK(result.wrappedKey, kek);
      expect(unwrapped).toBeInstanceOf(CryptoKey);
    });
  });

  describe('rotateDEKWrapper', () => {
    it('should re-wrap DEK with new KEK', async () => {
      const dek = await generateDEK();
      const oldKEK = await deriveKEK(prfOutput1);
      const newKEK = await deriveKEK(prfOutput2);

      const oldWrapped = await wrapDEK(dek, oldKEK);
      const newWrapped = await rotateDEKWrapper(oldWrapped, oldKEK, newKEK);

      // Should not be able to unwrap with old KEK
      await expect(unwrapDEK(newWrapped, oldKEK)).rejects.toThrow();

      // Should be able to unwrap with new KEK
      const unwrapped = await unwrapDEK(newWrapped, newKEK);
      expect(unwrapped).toBeInstanceOf(CryptoKey);
    });

    it('should preserve the underlying DEK', async () => {
      const dek = await generateDEK();
      const oldKEK = await deriveKEK(prfOutput1);
      const newKEK = await deriveKEK(prfOutput2);

      // Encrypt some data with the original DEK
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, testData);

      // Rotate the wrapper
      const oldWrapped = await wrapDEK(dek, oldKEK);
      const newWrapped = await rotateDEKWrapper(oldWrapped, oldKEK, newKEK);

      // Unwrap with new KEK and decrypt
      const rotatedDEK = await unwrapDEK(newWrapped, newKEK);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, rotatedDEK, encrypted);

      expect(new Uint8Array(decrypted)).toEqual(testData);
    });

    it('should fail if old KEK is wrong', async () => {
      const dek = await generateDEK();
      const correctKEK = await deriveKEK(prfOutput1);
      const wrongKEK = await deriveKEK(prfOutput2);
      const newKEK = await deriveKEK(new Uint8Array(32).fill(0x33));

      const wrapped = await wrapDEK(dek, correctKEK);

      await expect(rotateDEKWrapper(wrapped, wrongKEK, newKEK)).rejects.toThrow();
    });
  });

  describe('multi-passkey scenario', () => {
    it('should allow multiple KEKs to wrap same DEK', async () => {
      const dek = await generateDEK();

      // Simulate multiple passkeys
      const kek1 = await deriveKEK(prfOutput1);
      const kek2 = await deriveKEK(prfOutput2);
      const kek3 = await deriveKEK(new Uint8Array(32).fill(0x33));

      // Each passkey wraps the same DEK
      const wrapped1 = await wrapDEK(dek, kek1);
      const wrapped2 = await wrapDEK(dek, kek2);
      const wrapped3 = await wrapDEK(dek, kek3);

      // All should unwrap to functionally equivalent keys
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, testData);

      // Each unwrapped DEK should decrypt the data
      for (const [wrapped, kek] of [
        [wrapped1, kek1],
        [wrapped2, kek2],
        [wrapped3, kek3],
      ] as const) {
        const unwrapped = await unwrapDEK(wrapped, kek);
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          unwrapped,
          encrypted
        );
        expect(new Uint8Array(decrypted)).toEqual(testData);
      }
    });
  });
});
