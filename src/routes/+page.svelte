<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Toast,
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
    FileUploadModal,
  } from '$components';
  import { createVaultPageStore } from '$stores';
  import type { StoredCredential } from '$webauthn';
  import type { VaultItem } from '$storage';

  // Create the page store instance
  const store = createVaultPageStore();

  // Initialize on mount
  onMount(() => {
    void store.initialize();
  });

  // Reactive search effect
  $effect(() => {
    if (store.vaultState?.isUnlocked === true) {
      // Trigger re-filter when search changes
      void store.searchQuery;
    }
  });

  // Helper to handle passkey deletion modal
  function openDeletePasskeyModal(credential: StoredCredential): void {
    store.passkeyForm.setForDelete(credential);
    store.openModal('deletePasskey');
  }
</script>

<svelte:head>
  <title>Passwordless Encryption</title>
</svelte:head>

<main class="flex min-h-dvh flex-col">
  {#if store.isLoading}
    <LoadingView />
  {:else if store.currentView === 'setup'}
    <SetupView
      capabilities={store.capabilities}
      compatibilityMessage={store.compatibilityMessage}
      onsetup={() => {
        store.openModal('setup');
      }}
    />
  {:else if store.currentView === 'locked'}
    <LockedView
      credentials={store.vaultState?.credentials ?? []}
      isUnlocking={store.isUnlocking}
      onunlock={store.handleUnlock}
    />
  {:else if store.currentView === 'vault' || store.currentView === 'settings'}
    <VaultHeader
      itemCount={store.vaultState?.metadata?.itemCount ?? 0}
      showSettings={store.currentView === 'settings'}
      ontogglesettings={store.toggleSettings}
      onlock={store.handleLock}
    />

    {#if store.currentView === 'settings'}
      <SettingsView
        credentials={store.vaultState?.credentials ?? []}
        currentCredentialId={store.vaultState?.currentCredentialId ?? null}
        onaddpasskey={() => {
          store.openModal('addPasskey');
        }}
        ondeletepasskey={openDeletePasskeyModal}
      />
    {:else}
      <VaultContentView
        items={store.filteredItems}
        searchQuery={store.searchQuery}
        onsearchchange={(q: string) => {
          store.setSearchQuery(q);
        }}
        onadditem={() => {
          store.openModal('addItem');
        }}
        onuploadfile={() => {
          store.openModal('fileUpload');
        }}
        onedititem={(item: VaultItem) => {
          store.openEditModal(item);
        }}
        ondeleteitem={(item: VaultItem) => {
          store.openDeleteModal(item);
        }}
        ondownloaditem={(item: VaultItem) => {
          void store.handleFileDownload(item);
        }}
      />
    {/if}
  {/if}
</main>

<!-- Toast container -->
<Toast />

<!-- Setup Modal -->
<SetupModal
  open={store.modals.isOpen('setup')}
  userName={store.setupForm.userName}
  passkeyName={store.setupForm.passkeyName}
  isLoading={store.isSettingUp}
  onclose={() => {
    store.modals.close();
  }}
  onsubmit={store.handleSetup}
  onusernamechange={(v: string) => {
    store.setupForm.setUserName(v);
  }}
  onpasskeynamechange={(v: string) => {
    store.setupForm.setPasskeyName(v);
  }}
/>

<!-- Add Item Modal -->
<ItemFormModal
  open={store.modals.isOpen('addItem')}
  mode="add"
  itemType={store.itemForm.type}
  title={store.itemForm.title}
  content={store.itemForm.content}
  url={store.itemForm.url}
  username={store.itemForm.username}
  isLoading={store.isSaving}
  onclose={() => {
    store.modals.close();
    store.itemForm.reset();
  }}
  onsubmit={store.handleAddItem}
  ongeneratepassword={() => {
    store.itemForm.setContent(store.generatePassword(24));
  }}
  ontypechange={(t: 'note' | 'password' | 'secret') => {
    store.itemForm.setType(t);
  }}
  ontitlechange={(v: string) => {
    store.itemForm.setTitle(v);
  }}
  oncontentchange={(v: string) => {
    store.itemForm.setContent(v);
  }}
  onurlchange={(v: string) => {
    store.itemForm.setUrl(v);
  }}
  onusernamechange={(v: string) => {
    store.itemForm.setUsername(v);
  }}
/>

<!-- Edit Item Modal -->
<ItemFormModal
  open={store.modals.isOpen('editItem')}
  mode="edit"
  itemType={store.itemForm.type}
  title={store.itemForm.title}
  content={store.itemForm.content}
  url={store.itemForm.url}
  username={store.itemForm.username}
  isLoading={store.isSaving}
  onclose={() => {
    store.modals.close();
    store.itemForm.reset();
  }}
  onsubmit={store.handleUpdateItem}
  ongeneratepassword={() => {
    store.itemForm.setContent(store.generatePassword(24));
  }}
  ontypechange={(t: 'note' | 'password' | 'secret') => {
    store.itemForm.setType(t);
  }}
  ontitlechange={(v: string) => {
    store.itemForm.setTitle(v);
  }}
  oncontentchange={(v: string) => {
    store.itemForm.setContent(v);
  }}
  onurlchange={(v: string) => {
    store.itemForm.setUrl(v);
  }}
  onusernamechange={(v: string) => {
    store.itemForm.setUsername(v);
  }}
/>

<!-- Delete Item Modal -->
<ConfirmDeleteModal
  open={store.modals.isOpen('deleteItem')}
  title="Delete Item"
  description="This action cannot be undone"
  itemName={store.itemForm.deletingItem?.title ?? ''}
  confirmLabel="Delete"
  warningMessage="This will permanently remove it from your vault."
  isLoading={store.isSaving}
  onclose={() => {
    store.modals.close();
    store.itemForm.clearDelete();
  }}
  onconfirm={store.handleDeleteItem}
/>

<!-- Add Passkey Modal -->
<AddPasskeyModal
  open={store.modals.isOpen('addPasskey')}
  passkeyName={store.passkeyForm.name}
  isLoading={store.isSaving}
  onclose={() => {
    store.modals.close();
    store.passkeyForm.reset();
  }}
  onsubmit={store.handleAddPasskey}
  onpasskeyname={(v: string) => {
    store.passkeyForm.setName(v);
  }}
/>

<!-- Delete Passkey Modal -->
<ConfirmDeleteModal
  open={store.modals.isOpen('deletePasskey')}
  title="Remove Passkey"
  description="This passkey will no longer be able to unlock your vault"
  itemName={store.passkeyForm.deletingPasskey?.name ?? ''}
  confirmLabel="Remove"
  warningMessage="You will no longer be able to unlock your vault with this passkey."
  isLoading={store.isSaving}
  onclose={() => {
    store.modals.close();
    store.passkeyForm.clearDelete();
  }}
  onconfirm={store.handleDeletePasskey}
/>

<!-- File Upload Modal -->
<FileUploadModal
  open={store.modals.isOpen('fileUpload')}
  isLoading={store.isSaving}
  onclose={() => {
    store.modals.close();
  }}
  onsubmit={store.handleFileUpload}
/>
