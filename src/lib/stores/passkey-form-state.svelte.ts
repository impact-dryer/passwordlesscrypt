/**
 * Passkey Form State Management
 *
 * Manages the form state for adding/deleting passkeys.
 * Uses Svelte 5 runes for reactive state.
 */

import type { StoredCredential } from '$webauthn';

/**
 * Creates a passkey form state manager.
 */
export function createPasskeyFormState() {
  let newPasskeyName = $state('');
  let deletingPasskey = $state<StoredCredential | null>(null);

  function reset(): void {
    newPasskeyName = '';
  }

  function setForDelete(credential: StoredCredential): void {
    deletingPasskey = credential;
  }

  function clearDelete(): void {
    deletingPasskey = null;
  }

  function isValid(): boolean {
    return newPasskeyName.trim() !== '';
  }

  return {
    get name() {
      return newPasskeyName;
    },
    get deletingPasskey() {
      return deletingPasskey;
    },

    setName(value: string): void {
      newPasskeyName = value;
    },

    reset,
    setForDelete,
    clearDelete,
    isValid,
  };
}

export type PasskeyFormState = ReturnType<typeof createPasskeyFormState>;

