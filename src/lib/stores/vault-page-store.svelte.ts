/**
 * Vault Page State Store
 *
 * Centralized state management for the vault page using Svelte 5 runes.
 * This store coordinates between the UI and the vault service layer.
 *
 * **Architecture:**
 * - UI state is managed here (views, modals, forms)
 * - Domain state is managed by vault-service
 * - This store orchestrates interactions between UI and domain
 */

import {
  initializeVault,
  setupVault,
  unlockVault,
  lockVault,
  addPasskey,
  removePasskey,
  addVaultItem,
  updateVaultItem,
  deleteVaultItem,
  getVaultItems,
  searchVaultItems,
  generateSecurePassword,
  addFileItem,
  downloadFileItem,
  type VaultState,
} from '$services';
import { detectCapabilities, getPRFSupportMessage, WebAuthnError } from '$webauthn';
import type { PlatformCapabilities } from '$webauthn';
import type { VaultItem } from '$storage';
import { showToast } from '$components';

import { createModalState, type ModalType } from './modal-state.svelte';
import { createItemFormState } from './item-form-state.svelte';
import { createSetupFormState } from './setup-form-state.svelte';
import { createPasskeyFormState } from './passkey-form-state.svelte';

export type ViewType = 'setup' | 'locked' | 'vault' | 'settings';

/**
 * Creates the vault page store with all state and handlers.
 */
export function createVaultPageStore() {
  // ============================================================================
  // Sub-stores
  // ============================================================================

  const modals = createModalState();
  const itemForm = createItemFormState();
  const setupForm = createSetupFormState();
  const passkeyForm = createPasskeyFormState();

  // ============================================================================
  // Core State
  // ============================================================================

  let isLoading = $state(true);
  let vaultState = $state<VaultState | null>(null);
  let capabilities = $state<PlatformCapabilities | null>(null);
  let compatibilityMessage = $state<string | null>(null);

  // UI State
  let currentView = $state<ViewType>('locked');
  let searchQuery = $state('');
  let filteredItems = $state<VaultItem[]>([]);

  // Loading States
  let isUnlocking = $state(false);
  let isSettingUp = $state(false);
  let isSaving = $state(false);

  // ============================================================================
  // Initialization
  // ============================================================================

  async function initialize(): Promise<void> {
    try {
      capabilities = await detectCapabilities();
      compatibilityMessage = getPRFSupportMessage(capabilities);
      vaultState = await initializeVault();

      currentView = vaultState.isSetup ? 'locked' : 'setup';
    } catch (error) {
      console.error('Initialization error:', error);
      showToast('Failed to initialize application', 'error');
    } finally {
      isLoading = false;
    }
  }

  // ============================================================================
  // Search Effect
  // ============================================================================

  function updateFilteredItems(): void {
    if (vaultState?.isUnlocked === true) {
      filteredItems =
        searchQuery.trim() !== '' ? searchVaultItems(searchQuery) : getVaultItems();
    }
  }

  // ============================================================================
  // Vault Handlers
  // ============================================================================

  async function handleSetup(): Promise<void> {
    if (!setupForm.isValid()) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    isSettingUp = true;
    try {
      vaultState = await setupVault(setupForm.userName.trim(), setupForm.passkeyName.trim());
      currentView = 'vault';
      modals.close();
      filteredItems = getVaultItems();
      showToast('Vault created successfully!', 'success');
    } catch (error) {
      console.error('Setup error:', error);
      if (error instanceof WebAuthnError) {
        showToast(error.message, 'error');
      } else {
        showToast('Failed to create vault', 'error');
      }
    } finally {
      isSettingUp = false;
    }
  }

  async function handleUnlock(): Promise<void> {
    isUnlocking = true;
    try {
      const result = await unlockVault();
      if (vaultState === null) {
        throw new Error('Vault state not initialized');
      }
      vaultState = {
        ...vaultState,
        isUnlocked: true,
        vault: result.vault,
        currentCredentialId: result.credentialId,
      };
      currentView = 'vault';
      filteredItems = getVaultItems();
      showToast(`Unlocked with ${result.credentialName}`, 'success');
    } catch (error) {
      console.error('Unlock error:', error);
      if (error instanceof WebAuthnError) {
        if (error.type === 'cancelled') {
          return;
        }
        showToast(error.message, 'error');
      } else {
        showToast('Failed to unlock vault', 'error');
      }
    } finally {
      isUnlocking = false;
    }
  }

  function handleLock(): void {
    lockVault();
    if (vaultState === null) {
      return;
    }
    vaultState = {
      ...vaultState,
      isUnlocked: false,
      vault: null,
      currentCredentialId: null,
    };
    currentView = 'locked';
    searchQuery = '';
    filteredItems = [];
    showToast('Vault locked', 'info');
  }

  // ============================================================================
  // Item Handlers
  // ============================================================================

  async function handleAddItem(): Promise<void> {
    if (!itemForm.isValid()) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    isSaving = true;
    try {
      const data = itemForm.getData();
      const itemData: Parameters<typeof addVaultItem>[0] = {
        type: data.type,
        title: data.title,
        content: data.content,
      };
      if (data.url !== '') {
        itemData.url = data.url;
      }
      if (data.username !== '') {
        itemData.username = data.username;
      }
      await addVaultItem(itemData);

      updateFilteredItems();
      modals.close();
      itemForm.reset();
      showToast('Item added successfully', 'success');
    } catch (error) {
      console.error('Add item error:', error);
      showToast('Failed to add item', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function handleUpdateItem(): Promise<void> {
    const editing = itemForm.editingItem;
    if (editing === null || !itemForm.isValid()) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    isSaving = true;
    try {
      const data = itemForm.getData();
      const updates: Parameters<typeof updateVaultItem>[1] = {
        type: data.type,
        title: data.title,
        content: data.content,
      };
      if (data.url !== '') {
        updates.url = data.url;
      }
      if (data.username !== '') {
        updates.username = data.username;
      }
      await updateVaultItem(editing.id, updates);

      updateFilteredItems();
      modals.close();
      itemForm.reset();
      showToast('Item updated successfully', 'success');
    } catch (error) {
      console.error('Update item error:', error);
      showToast('Failed to update item', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function handleDeleteItem(): Promise<void> {
    const deleting = itemForm.deletingItem;
    if (deleting === null) {
      return;
    }

    isSaving = true;
    try {
      await deleteVaultItem(deleting.id);
      updateFilteredItems();
      modals.close();
      itemForm.clearDelete();
      showToast('Item deleted', 'success');
    } catch (error) {
      console.error('Delete item error:', error);
      showToast('Failed to delete item', 'error');
    } finally {
      isSaving = false;
    }
  }

  function openEditModal(item: VaultItem): void {
    // Files cannot be edited, only deleted and re-uploaded
    if (item.type === 'file') {
      return;
    }
    itemForm.setForEdit(item);
    modals.open('editItem');
  }

  function openDeleteModal(item: VaultItem): void {
    itemForm.setForDelete(item);
    modals.open('deleteItem');
  }

  // ============================================================================
  // File Handlers
  // ============================================================================

  async function handleFileUpload(file: File, title: string): Promise<void> {
    isSaving = true;
    try {
      await addFileItem(file, title);
      updateFilteredItems();
      modals.close();
      showToast('File uploaded successfully', 'success');
    } catch (error) {
      console.error('File upload error:', error);
      if (error instanceof Error) {
        showToast(error.message, 'error');
      } else {
        showToast('Failed to upload file', 'error');
      }
    } finally {
      isSaving = false;
    }
  }

  async function handleFileDownload(item: VaultItem): Promise<void> {
    try {
      await downloadFileItem(item.id);
      showToast('File download started', 'success');
    } catch (error) {
      console.error('File download error:', error);
      if (error instanceof Error) {
        showToast(error.message, 'error');
      } else {
        showToast('Failed to download file', 'error');
      }
    }
  }

  // ============================================================================
  // Passkey Handlers
  // ============================================================================

  async function handleAddPasskey(): Promise<void> {
    if (!passkeyForm.isValid()) {
      showToast('Please enter a name for the passkey', 'error');
      return;
    }

    isSaving = true;
    try {
      const credentials = await addPasskey(passkeyForm.name.trim());
      if (vaultState !== null) {
        vaultState = { ...vaultState, credentials };
      }
      modals.close();
      passkeyForm.reset();
      showToast('Passkey added successfully', 'success');
    } catch (error) {
      console.error('Add passkey error:', error);
      if (error instanceof WebAuthnError) {
        showToast(error.message, 'error');
      } else {
        showToast('Failed to add passkey', 'error');
      }
    } finally {
      isSaving = false;
    }
  }

  async function handleDeletePasskey(): Promise<void> {
    const deleting = passkeyForm.deletingPasskey;
    if (deleting === null) {
      return;
    }

    isSaving = true;
    try {
      const credentials = await removePasskey(deleting.id);
      if (vaultState !== null) {
        vaultState = { ...vaultState, credentials };
      }
      modals.close();
      passkeyForm.clearDelete();
      showToast('Passkey removed', 'success');
    } catch (error) {
      console.error('Delete passkey error:', error);
      showToast('Failed to remove passkey', 'error');
    } finally {
      isSaving = false;
    }
  }

  // ============================================================================
  // View Navigation
  // ============================================================================

  function toggleSettings(): void {
    currentView = currentView === 'settings' ? 'vault' : 'settings';
  }

  function setSearchQuery(query: string): void {
    searchQuery = query;
    updateFilteredItems();
  }

  // ============================================================================
  // Modal Helpers
  // ============================================================================

  function openModal(modal: ModalType): void {
    modals.open(modal);
  }

  function closeModal(): void {
    modals.close();
    // Reset relevant form state based on what was open
    if (modals.active === 'addItem' || modals.active === 'editItem') {
      itemForm.reset();
    } else if (modals.active === 'deleteItem') {
      itemForm.clearDelete();
    } else if (modals.active === 'addPasskey') {
      passkeyForm.reset();
    } else if (modals.active === 'deletePasskey') {
      passkeyForm.clearDelete();
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  return {
    // Sub-stores
    modals,
    itemForm,
    setupForm,
    passkeyForm,

    // Core state getters
    get isLoading() {
      return isLoading;
    },
    get vaultState() {
      return vaultState;
    },
    get capabilities() {
      return capabilities;
    },
    get compatibilityMessage() {
      return compatibilityMessage;
    },
    get currentView() {
      return currentView;
    },
    get searchQuery() {
      return searchQuery;
    },
    get filteredItems() {
      return filteredItems;
    },
    get isUnlocking() {
      return isUnlocking;
    },
    get isSettingUp() {
      return isSettingUp;
    },
    get isSaving() {
      return isSaving;
    },

    // Initialization
    initialize,

    // Vault handlers
    handleSetup,
    handleUnlock,
    handleLock,

    // Item handlers
    handleAddItem,
    handleUpdateItem,
    handleDeleteItem,
    openEditModal,
    openDeleteModal,

    // File handlers
    handleFileUpload,
    handleFileDownload,

    // Passkey handlers
    handleAddPasskey,
    handleDeletePasskey,

    // Navigation
    toggleSettings,
    setSearchQuery,

    // Modal helpers
    openModal,
    closeModal,

    // Utilities
    generatePassword: generateSecurePassword,
  };
}

export type VaultPageStore = ReturnType<typeof createVaultPageStore>;

