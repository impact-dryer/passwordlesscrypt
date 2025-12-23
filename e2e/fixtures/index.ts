/**
 * E2E Test Fixtures Index
 *
 * Re-exports all fixtures and utilities for E2E testing.
 */

export { test, expect, setupVirtualAuthenticator } from './webauthn.fixture';
export type {
  VirtualAuthenticatorContext,
  VirtualAuthenticatorOptions,
  WebAuthnCredential,
} from './webauthn.fixture';

export {
  BasePage,
  SetupPage,
  LockedPage,
  VaultPage,
  ItemFormModal,
  ConfirmDeleteModal,
  SettingsPage,
  AddPasskeyModal,
  FileUploadModal,
} from './page-objects';
