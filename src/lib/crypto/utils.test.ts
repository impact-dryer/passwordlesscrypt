import { describe, it, expect } from 'vitest';
import {
  stringToBytes,
  bytesToString,
  bytesToBase64,
  base64ToBytes,
  bytesToBase64Url,
  base64UrlToBytes,
  generateRandomBytes,
  constantTimeEquals,
  concatBytes,
  clearBytes,
  bufferToBytes,
} from './utils';

describe('crypto/utils', () => {
  describe('stringToBytes', () => {
    it('should convert ASCII string to bytes', () => {
      const result = stringToBytes('hello');
      expect(result.constructor.name).toBe('Uint8Array');
      expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]);
    });

    it('should convert empty string to empty array', () => {
      const result = stringToBytes('');
      expect(Array.from(result)).toEqual([]);
    });

    it('should handle UTF-8 characters', () => {
      const result = stringToBytes('héllo');
      expect(result.length).toBeGreaterThan(5); // UTF-8 encoding
    });

    it('should handle emoji', () => {
      const result = stringToBytes('🔐');
      expect(result.length).toBe(4); // 4 bytes for this emoji
    });
  });

  describe('bytesToString', () => {
    it('should convert bytes to ASCII string', () => {
      const bytes = new Uint8Array([104, 101, 108, 108, 111]);
      expect(bytesToString(bytes)).toBe('hello');
    });

    it('should convert empty array to empty string', () => {
      expect(bytesToString(new Uint8Array([]))).toBe('');
    });

    it('should round-trip with stringToBytes', () => {
      const original = 'Hello, World! 🔐';
      const bytes = stringToBytes(original);
      const result = bytesToString(bytes);
      expect(result).toBe(original);
    });
  });

  describe('bytesToBase64', () => {
    it('should convert bytes to base64', () => {
      const bytes = new Uint8Array([104, 101, 108, 108, 111]);
      expect(bytesToBase64(bytes)).toBe('aGVsbG8=');
    });

    it('should handle empty array', () => {
      expect(bytesToBase64(new Uint8Array([]))).toBe('');
    });

    it('should handle binary data', () => {
      const bytes = new Uint8Array([0, 255, 128, 64]);
      const base64 = bytesToBase64(bytes);
      expect(base64).toBe('AP+AQA==');
    });
  });

  describe('base64ToBytes', () => {
    it('should convert base64 to bytes', () => {
      const result = base64ToBytes('aGVsbG8=');
      expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]);
    });

    it('should handle empty string', () => {
      expect(Array.from(base64ToBytes(''))).toEqual([]);
    });

    it('should round-trip with bytesToBase64', () => {
      const original = new Uint8Array([0, 1, 2, 255, 254, 253]);
      const base64 = bytesToBase64(original);
      const result = base64ToBytes(base64);
      expect(Array.from(result)).toEqual(Array.from(original));
    });
  });

  describe('bytesToBase64Url', () => {
    it('should convert bytes to URL-safe base64', () => {
      // Bytes that would produce + and / in standard base64
      const bytes = new Uint8Array([251, 255, 254]);
      const result = bytesToBase64Url(bytes);
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('should handle empty array', () => {
      expect(bytesToBase64Url(new Uint8Array([]))).toBe('');
    });
  });

  describe('base64UrlToBytes', () => {
    it('should convert URL-safe base64 to bytes', () => {
      const bytes = new Uint8Array([251, 255, 254]);
      const base64Url = bytesToBase64Url(bytes);
      const result = base64UrlToBytes(base64Url);
      expect(Array.from(result)).toEqual(Array.from(bytes));
    });

    it('should handle padding', () => {
      // Test with various lengths that require different padding
      for (const len of [1, 2, 3, 4, 5, 10, 32]) {
        const original = new Uint8Array(len).fill(42);
        const encoded = bytesToBase64Url(original);
        const decoded = base64UrlToBytes(encoded);
        expect(Array.from(decoded)).toEqual(Array.from(original));
      }
    });
  });

  describe('generateRandomBytes', () => {
    it('should generate bytes of requested length', () => {
      const result = generateRandomBytes(32);
      expect(result.constructor.name).toBe('Uint8Array');
      expect(result.length).toBe(32);
    });

    it('should generate different values each time', () => {
      const a = generateRandomBytes(32);
      const b = generateRandomBytes(32);
      expect(Array.from(a)).not.toEqual(Array.from(b));
    });

    it('should handle zero length', () => {
      const result = generateRandomBytes(0);
      expect(result.length).toBe(0);
    });

    it('should handle large lengths', () => {
      const result = generateRandomBytes(1024);
      expect(result.length).toBe(1024);
    });
  });

  describe('constantTimeEquals', () => {
    it('should return true for equal arrays', () => {
      const a = new Uint8Array([1, 2, 3, 4, 5]);
      const b = new Uint8Array([1, 2, 3, 4, 5]);
      expect(constantTimeEquals(a, b)).toBe(true);
    });

    it('should return false for different arrays', () => {
      const a = new Uint8Array([1, 2, 3, 4, 5]);
      const b = new Uint8Array([1, 2, 3, 4, 6]);
      expect(constantTimeEquals(a, b)).toBe(false);
    });

    it('should return false for different lengths', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 3, 4]);
      expect(constantTimeEquals(a, b)).toBe(false);
    });

    it('should return true for empty arrays', () => {
      const a = new Uint8Array([]);
      const b = new Uint8Array([]);
      expect(constantTimeEquals(a, b)).toBe(true);
    });

    it('should detect single bit difference', () => {
      const a = new Uint8Array([0b11111111]);
      const b = new Uint8Array([0b11111110]);
      expect(constantTimeEquals(a, b)).toBe(false);
    });
  });

  describe('concatBytes', () => {
    it('should concatenate multiple arrays', () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array([3, 4]);
      const c = new Uint8Array([5, 6]);
      const result = concatBytes(a, b, c);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle empty arrays', () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array([]);
      const c = new Uint8Array([3, 4]);
      const result = concatBytes(a, b, c);
      expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    });

    it('should handle single array', () => {
      const a = new Uint8Array([1, 2, 3]);
      const result = concatBytes(a);
      expect(Array.from(result)).toEqual(Array.from(a));
    });

    it('should handle no arrays', () => {
      const result = concatBytes();
      expect(Array.from(result)).toEqual([]);
    });
  });

  describe('clearBytes', () => {
    it('should zero out array', () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      clearBytes(bytes);
      expect(Array.from(bytes)).toEqual([0, 0, 0, 0, 0]);
    });

    it('should handle empty array', () => {
      const bytes = new Uint8Array([]);
      clearBytes(bytes);
      expect(Array.from(bytes)).toEqual([]);
    });
  });

  describe('bufferToBytes', () => {
    it('should convert ArrayBuffer to Uint8Array', () => {
      const buffer = new ArrayBuffer(4);
      new Uint8Array(buffer).set([1, 2, 3, 4]);
      const result = bufferToBytes(buffer);
      expect(result.constructor.name).toBe('Uint8Array');
      expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    });

    it('should handle empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      const result = bufferToBytes(buffer);
      expect(result.length).toBe(0);
    });
  });
});


