/**
 * Tests for Setup Form State Management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSetupFormState } from './setup-form-state.svelte';

describe('stores/setup-form-state', () => {
  describe('createSetupFormState', () => {
    let formState: ReturnType<typeof createSetupFormState>;

    beforeEach(() => {
      formState = createSetupFormState();
    });

    describe('initial state', () => {
      it('should have empty userName', () => {
        expect(formState.userName).toBe('');
      });

      it('should have empty passkeyName', () => {
        expect(formState.passkeyName).toBe('');
      });
    });

    describe('setters', () => {
      it('should set userName', () => {
        formState.setUserName('John Doe');
        expect(formState.userName).toBe('John Doe');
      });

      it('should set passkeyName', () => {
        formState.setPasskeyName('MacBook Pro');
        expect(formState.passkeyName).toBe('MacBook Pro');
      });
    });

    describe('reset', () => {
      it('should reset all fields', () => {
        formState.setUserName('John');
        formState.setPasskeyName('Device');

        formState.reset();

        expect(formState.userName).toBe('');
        expect(formState.passkeyName).toBe('');
      });
    });

    describe('isValid', () => {
      it('should return false when userName is empty', () => {
        formState.setPasskeyName('Device');
        expect(formState.isValid()).toBe(false);
      });

      it('should return false when passkeyName is empty', () => {
        formState.setUserName('John');
        expect(formState.isValid()).toBe(false);
      });

      it('should return false when both are whitespace only', () => {
        formState.setUserName('   ');
        formState.setPasskeyName('   ');
        expect(formState.isValid()).toBe(false);
      });

      it('should return true when both fields are set', () => {
        formState.setUserName('John Doe');
        formState.setPasskeyName('MacBook Pro');
        expect(formState.isValid()).toBe(true);
      });

      it('should return true with trimmed non-empty values', () => {
        formState.setUserName('  John  ');
        formState.setPasskeyName('  Device  ');
        expect(formState.isValid()).toBe(true);
      });
    });
  });
});
