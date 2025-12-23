/**
 * Setup Form State Management
 *
 * Manages the form state for vault setup.
 * Uses Svelte 5 runes for reactive state.
 */

/**
 * Creates a setup form state manager.
 */
export function createSetupFormState() {
  let userName = $state('');
  let passkeyName = $state('');

  function reset(): void {
    userName = '';
    passkeyName = '';
  }

  function isValid(): boolean {
    return userName.trim() !== '' && passkeyName.trim() !== '';
  }

  return {
    get userName() {
      return userName;
    },
    get passkeyName() {
      return passkeyName;
    },

    setUserName(value: string): void {
      userName = value;
    },
    setPasskeyName(value: string): void {
      passkeyName = value;
    },

    reset,
    isValid,
  };
}

export type SetupFormState = ReturnType<typeof createSetupFormState>;
