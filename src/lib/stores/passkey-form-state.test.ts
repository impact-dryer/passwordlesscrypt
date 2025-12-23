/**
 * Tests for Passkey Form State Management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPasskeyFormState } from './passkey-form-state.svelte';
import type { StoredCredential } from '$webauthn';

describe('stores/passkey-form-state', () => {
  describe('createPasskeyFormState', () => {
    let formState: ReturnType<typeof createPasskeyFormState>;

    beforeEach(() => {
      formState = createPasskeyFormState();
    });

    describe('initial state', () => {
      it('should have empty name', () => {
        expect(formState.name).toBe('');
      });

      it('should have null deletingPasskey', () => {
        expect(formState.deletingPasskey).toBeNull();
      });
    });

    describe('setName', () => {
      it('should set the passkey name', () => {
        formState.setName('iPhone 15');
        expect(formState.name).toBe('iPhone 15');
      });
    });

    describe('reset', () => {
      it('should reset name to empty', () => {
        formState.setName('Some Device');
        formState.reset();
        expect(formState.name).toBe('');
      });
    });

    describe('setForDelete / clearDelete', () => {
      const mockCredential: StoredCredential = {
        id: 'cred-123',
        rawId: 'rawId-123',
        name: 'MacBook Pro',
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        prfEnabled: true,
        prfSalt: 'base64-salt-string',
        authenticatorType: 'platform',
      };

      it('should set credential for deletion', () => {
        formState.setForDelete(mockCredential);
        expect(formState.deletingPasskey).toStrictEqual(mockCredential);
      });

      it('should clear deleting credential', () => {
        formState.setForDelete(mockCredential);
        formState.clearDelete();
        expect(formState.deletingPasskey).toBeNull();
      });
    });

    describe('isValid', () => {
      it('should return false when name is empty', () => {
        expect(formState.isValid()).toBe(false);
      });

      it('should return false when name is whitespace only', () => {
        formState.setName('   ');
        expect(formState.isValid()).toBe(false);
      });

      it('should return true when name is set', () => {
        formState.setName('My Device');
        expect(formState.isValid()).toBe(true);
      });

      it('should return true with trimmed non-empty name', () => {
        formState.setName('  Device  ');
        expect(formState.isValid()).toBe(true);
      });
    });
  });
});

