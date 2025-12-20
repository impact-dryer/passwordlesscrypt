import { describe, it, expect } from 'vitest';
import {
  AES_KEY_LENGTH,
  AES_GCM_IV_LENGTH,
  AES_GCM_TAG_LENGTH,
  HKDF_INFO,
  DEFAULT_PRF_SALT,
  STORAGE_KEYS,
  VAULT_VERSION,
} from './constants';

describe('crypto/constants', () => {
  describe('AES constants', () => {
    it('should have 256-bit key length', () => {
      expect(AES_KEY_LENGTH).toBe(256);
    });

    it('should have 12-byte IV length (96 bits per NIST)', () => {
      expect(AES_GCM_IV_LENGTH).toBe(12);
    });

    it('should have 128-bit auth tag', () => {
      expect(AES_GCM_TAG_LENGTH).toBe(128);
    });
  });

  describe('HKDF info strings', () => {
    it('should have KEK info string', () => {
      expect(HKDF_INFO.KEK).toBe('Passwordless Encryption KEK V1');
    });

    it('should have DEK info string', () => {
      expect(HKDF_INFO.DEK).toBe('Passwordless Encryption DEK V1');
    });

    it('should have AUTH info string', () => {
      expect(HKDF_INFO.AUTH).toBe('Passwordless Encryption Auth V1');
    });

    it('should have different info strings for domain separation', () => {
      expect(HKDF_INFO.KEK).not.toBe(HKDF_INFO.DEK);
      expect(HKDF_INFO.KEK).not.toBe(HKDF_INFO.AUTH);
      expect(HKDF_INFO.DEK).not.toBe(HKDF_INFO.AUTH);
    });
  });

  describe('PRF salt', () => {
    it('should have default PRF salt', () => {
      expect(DEFAULT_PRF_SALT).toBe('passwordless-encryption-v1');
    });
  });

  describe('storage keys', () => {
    it('should have all required storage keys', () => {
      expect(STORAGE_KEYS.VAULT).toBe('encrypted-vault');
      expect(STORAGE_KEYS.CREDENTIALS).toBe('passkey-credentials');
      expect(STORAGE_KEYS.WRAPPED_DEKS).toBe('wrapped-deks');
      expect(STORAGE_KEYS.VAULT_METADATA).toBe('vault-metadata');
    });
  });

  describe('vault version', () => {
    it('should have positive vault version', () => {
      expect(VAULT_VERSION).toBeGreaterThan(0);
    });
  });
});


