import { describe, it, expect } from 'vitest';
import { WebAuthnError } from './types';

describe('webauthn/types', () => {
  describe('WebAuthnError', () => {
    it('should create error with type and message', () => {
      const error = new WebAuthnError('not-supported', 'WebAuthn not supported');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(WebAuthnError);
      expect(error.type).toBe('not-supported');
      expect(error.message).toBe('WebAuthn not supported');
      expect(error.name).toBe('WebAuthnError');
    });

    it('should store original error', () => {
      const originalError = new Error('Original');
      const error = new WebAuthnError('unknown', 'Wrapped error', originalError);

      expect(error.originalError).toBe(originalError);
    });

    it('should work without original error', () => {
      const error = new WebAuthnError('cancelled', 'User cancelled');

      expect(error.originalError).toBeUndefined();
    });

    it('should support all error types', () => {
      const types = [
        'not-supported',
        'not-allowed',
        'cancelled',
        'timeout',
        'security-error',
        'prf-not-supported',
        'prf-not-enabled',
        'no-credentials',
        'unknown',
      ] as const;

      for (const type of types) {
        const error = new WebAuthnError(type, `Error: ${type}`);
        expect(error.type).toBe(type);
      }
    });
  });
});


