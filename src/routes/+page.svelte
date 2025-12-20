<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Toast,
    showToast,
    LoadingView,
    SetupView,
    LockedView,
    SettingsView,
    VaultContentView,
    VaultHeader,
    SetupModal,
    ItemFormModal,
    ConfirmDeleteModal,
    AddPasskeyModal,
  } from '$components';
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
    type VaultState,
  } from '$services';
  import { detectCapabilities, getPRFSupportMessage, WebAuthnError } from '$webauthn';
  import type { PlatformCapabilities, StoredCredential } from '$webauthn';
  import type { VaultItem } from '$storage';

  // ============================================================================
  // State
  // ============================================================================

  // App state
  let isLoading = $state(true);
  let vaultState = $state<VaultState | null>(null);
  let capabilities = $state<PlatformCapabilities | null>(null);
  let compatibilityMessage = $state<string | null>(null);

  // UI state
  type ViewType = 'setup' | 'locked' | 'vault' | 'settings';
  let currentView = $state<ViewType>('locked');
  let searchQuery = $state('');
  let filteredItems = $state<VaultItem[]>([]);

  // Modal state
  let showSetupModal = $state(false);
  let showAddItemModal = $state(false);
  let showEditItemModal = $state(false);
  let showDeleteItemModal = $state(false);
  let showAddPasskeyModal = $state(false);
  let showDeletePasskeyModal = $state(false);

  // Form state
  let setupUserName = $state('');
  let setupPasskeyName = $state('');
  let newItemType = $state<'note' | 'password' | 'secret'>('password');
  let newItemTitle = $state('');
  let newItemContent = $state('');
  let newItemUrl = $state('');
  let newItemUsername = $state('');
  let editingItem = $state<VaultItem | null>(null);
  let deletingItem = $state<VaultItem | null>(null);
  let newPasskeyName = $state('');
  let deletingPasskey = $state<StoredCredential | null>(null);

  // Loading states
  let isUnlocking = $state(false);
  let isSettingUp = $state(false);
  let isSaving = $state(false);

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onMount(async () => {
    try {
      capabilities = await detectCapabilities();
      compatibilityMessage = getPRFSupportMessage(capabilities);
      vaultState = await initializeVault();

      if (!vaultState.isSetup) {
        currentView = 'setup';
      } else {
        currentView = 'locked';
      }
    } catch (error) {
      console.error('Initialization error:', error);
      showToast('Failed to initialize application', 'error');
    } finally {
      isLoading = false;
    }
  });

  // Update filtered items when search changes
  $effect(() => {
    if (vaultState?.isUnlocked) {
      if (searchQuery.trim() !== '') {
        filteredItems = searchVaultItems(searchQuery);
      } else {
        filteredItems = getVaultItems();
      }
    }
  });

  // ============================================================================
  // Vault Handlers
  // ============================================================================

  async function handleSetup(): Promise<void> {
    if (setupUserName.trim() === '' || setupPasskeyName.trim() === '') {
      showToast('Please fill in all fields', 'error');
      return;
    }

    isSettingUp = true;
    try {
      vaultState = await setupVault(setupUserName.trim(), setupPasskeyName.trim());
      currentView = 'vault';
      showSetupModal = false;
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

  function resetItemForm(): void {
    newItemType = 'password';
    newItemTitle = '';
    newItemContent = '';
    newItemUrl = '';
    newItemUsername = '';
  }

  async function handleAddItem(): Promise<void> {
    if (newItemTitle.trim() === '' || newItemContent.trim() === '') {
      showToast('Please fill in required fields', 'error');
      return;
    }

    isSaving = true;
    try {
      const itemData: Parameters<typeof addVaultItem>[0] = {
        type: newItemType,
        title: newItemTitle.trim(),
        content: newItemContent.trim(),
      };
      if (newItemUrl.trim() !== '') {
        itemData.url = newItemUrl.trim();
      }
      if (newItemUsername.trim() !== '') {
        itemData.username = newItemUsername.trim();
      }
      await addVaultItem(itemData);

      filteredItems = searchQuery !== '' ? searchVaultItems(searchQuery) : getVaultItems();
      showAddItemModal = false;
      resetItemForm();
      showToast('Item added successfully', 'success');
    } catch (error) {
      console.error('Add item error:', error);
      showToast('Failed to add item', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function handleUpdateItem(): Promise<void> {
    if (editingItem === null || newItemTitle.trim() === '' || newItemContent.trim() === '') {
      showToast('Please fill in required fields', 'error');
      return;
    }

    isSaving = true;
    try {
      const updates: Parameters<typeof updateVaultItem>[1] = {
        type: newItemType,
        title: newItemTitle.trim(),
        content: newItemContent.trim(),
      };
      if (newItemUrl.trim() !== '') {
        updates.url = newItemUrl.trim();
      }
      if (newItemUsername.trim() !== '') {
        updates.username = newItemUsername.trim();
      }
      await updateVaultItem(editingItem.id, updates);

      filteredItems = searchQuery !== '' ? searchVaultItems(searchQuery) : getVaultItems();
      showEditItemModal = false;
      editingItem = null;
      resetItemForm();
      showToast('Item updated successfully', 'success');
    } catch (error) {
      console.error('Update item error:', error);
      showToast('Failed to update item', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function handleDeleteItem(): Promise<void> {
    if (deletingItem === null) {
      return;
    }

    isSaving = true;
    try {
      await deleteVaultItem(deletingItem.id);
      filteredItems = searchQuery !== '' ? searchVaultItems(searchQuery) : getVaultItems();
      showDeleteItemModal = false;
      deletingItem = null;
      showToast('Item deleted', 'success');
    } catch (error) {
      console.error('Delete item error:', error);
      showToast('Failed to delete item', 'error');
    } finally {
      isSaving = false;
    }
  }

  function openEditModal(item: VaultItem): void {
    editingItem = item;
    newItemType = item.type;
    newItemTitle = item.title;
    newItemContent = item.content;
    newItemUrl = item.url ?? '';
    newItemUsername = item.username ?? '';
    showEditItemModal = true;
  }

  function openDeleteModal(item: VaultItem): void {
    deletingItem = item;
    showDeleteItemModal = true;
  }

  // ============================================================================
  // Passkey Handlers
  // ============================================================================

  async function handleAddPasskey(): Promise<void> {
    if (newPasskeyName.trim() === '') {
      showToast('Please enter a name for the passkey', 'error');
      return;
    }

    isSaving = true;
    try {
      const credentials = await addPasskey(newPasskeyName.trim());
      if (vaultState !== null) {
        vaultState = { ...vaultState, credentials };
      }
      showAddPasskeyModal = false;
      newPasskeyName = '';
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
    if (deletingPasskey === null) {
      return;
    }

    isSaving = true;
    try {
      const credentials = await removePasskey(deletingPasskey.id);
      if (vaultState !== null) {
        vaultState = { ...vaultState, credentials };
      }
      showDeletePasskeyModal = false;
      deletingPasskey = null;
      showToast('Passkey removed', 'success');
    } catch (error) {
      console.error('Delete passkey error:', error);
      showToast('Failed to remove passkey', 'error');
    } finally {
      isSaving = false;
    }
  }

  function openDeletePasskeyModal(credential: StoredCredential): void {
    deletingPasskey = credential;
    showDeletePasskeyModal = true;
  }
</script>

<svelte:head>
  <title>Passwordless Encryption</title>
</svelte:head>

<main class="min-h-dvh flex flex-col">
  {#if isLoading}
    <LoadingView />
  {:else if currentView === 'setup'}
    <SetupView
      {capabilities}
      {compatibilityMessage}
      onsetup={() => (showSetupModal = true)}
    />
  {:else if currentView === 'locked'}
    <LockedView
      credentials={vaultState?.credentials ?? []}
      {isUnlocking}
      onunlock={handleUnlock}
    />
  {:else if currentView === 'vault' || currentView === 'settings'}
    <VaultHeader
      itemCount={vaultState?.metadata?.itemCount ?? 0}
      showSettings={currentView === 'settings'}
      ontogglesettings={() => (currentView = currentView === 'settings' ? 'vault' : 'settings')}
      onlock={handleLock}
    />

    {#if currentView === 'settings'}
      <SettingsView
        credentials={vaultState?.credentials ?? []}
        currentCredentialId={vaultState?.currentCredentialId ?? null}
        onaddpasskey={() => (showAddPasskeyModal = true)}
        ondeletepasskey={openDeletePasskeyModal}
      />
    {:else}
      <VaultContentView
        items={filteredItems}
        {searchQuery}
        onsearchchange={(q) => (searchQuery = q)}
        onadditem={() => (showAddItemModal = true)}
        onedititem={openEditModal}
        ondeleteitem={openDeleteModal}
      />
    {/if}
  {/if}
</main>

<!-- Toast container -->
<Toast />

<!-- Setup Modal -->
<SetupModal
  open={showSetupModal}
  userName={setupUserName}
  passkeyName={setupPasskeyName}
  isLoading={isSettingUp}
  onclose={() => (showSetupModal = false)}
  onsubmit={handleSetup}
  onusernamechange={(v) => (setupUserName = v)}
  onpasskeynamechange={(v) => (setupPasskeyName = v)}
/>

<!-- Add Item Modal -->
<ItemFormModal
  open={showAddItemModal}
  mode="add"
  itemType={newItemType}
  title={newItemTitle}
  content={newItemContent}
  url={newItemUrl}
  username={newItemUsername}
  isLoading={isSaving}
  onclose={() => {
    showAddItemModal = false;
    resetItemForm();
  }}
  onsubmit={handleAddItem}
  ongeneratepassword={() => (newItemContent = generateSecurePassword(24))}
  ontypechange={(t) => (newItemType = t)}
  ontitlechange={(v) => (newItemTitle = v)}
  oncontentchange={(v) => (newItemContent = v)}
  onurlchange={(v) => (newItemUrl = v)}
  onusernamechange={(v) => (newItemUsername = v)}
/>

<!-- Edit Item Modal -->
<ItemFormModal
  open={showEditItemModal}
  mode="edit"
  itemType={newItemType}
  title={newItemTitle}
  content={newItemContent}
  url={newItemUrl}
  username={newItemUsername}
  isLoading={isSaving}
  onclose={() => {
    showEditItemModal = false;
    editingItem = null;
    resetItemForm();
  }}
  onsubmit={handleUpdateItem}
  ongeneratepassword={() => (newItemContent = generateSecurePassword(24))}
  ontypechange={(t) => (newItemType = t)}
  ontitlechange={(v) => (newItemTitle = v)}
  oncontentchange={(v) => (newItemContent = v)}
  onurlchange={(v) => (newItemUrl = v)}
  onusernamechange={(v) => (newItemUsername = v)}
/>

<!-- Delete Item Modal -->
<ConfirmDeleteModal
  open={showDeleteItemModal}
  title="Delete Item"
  description="This action cannot be undone"
  itemName={deletingItem?.title ?? ''}
  confirmLabel="Delete"
  warningMessage="This will permanently remove it from your vault."
  isLoading={isSaving}
  onclose={() => {
    showDeleteItemModal = false;
    deletingItem = null;
  }}
  onconfirm={handleDeleteItem}
/>

<!-- Add Passkey Modal -->
<AddPasskeyModal
  open={showAddPasskeyModal}
  passkeyName={newPasskeyName}
  isLoading={isSaving}
  onclose={() => {
    showAddPasskeyModal = false;
    newPasskeyName = '';
  }}
  onsubmit={handleAddPasskey}
  onpasskeyname={(v) => (newPasskeyName = v)}
/>

<!-- Delete Passkey Modal -->
<ConfirmDeleteModal
  open={showDeletePasskeyModal}
  title="Remove Passkey"
  description="This passkey will no longer be able to unlock your vault"
  itemName={deletingPasskey?.name ?? ''}
  confirmLabel="Remove"
  warningMessage="You will no longer be able to unlock your vault with this passkey."
  isLoading={isSaving}
  onclose={() => {
    showDeletePasskeyModal = false;
    deletingPasskey = null;
  }}
  onconfirm={handleDeletePasskey}
/>
