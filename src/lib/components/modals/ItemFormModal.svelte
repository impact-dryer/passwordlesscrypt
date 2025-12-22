<script lang="ts">
  import { Modal, Input, Button } from '$components';
  import ItemTypeSelector from '../ItemTypeSelector.svelte';
  import type { VaultItemType } from '$storage';

  /** Non-file item types for text-based items */
  type TextItemType = 'note' | 'password' | 'secret';

  interface Props {
    open: boolean;
    mode: 'add' | 'edit';
    itemType: TextItemType;
    title: string;
    content: string;
    url: string;
    username: string;
    isLoading: boolean;
    onclose: () => void;
    onsubmit: () => void;
    ongeneratepassword: () => void;
    ontypechange: (type: TextItemType) => void;
    ontitlechange: (value: string) => void;
    oncontentchange: (value: string) => void;
    onurlchange: (value: string) => void;
    onusernamechange: (value: string) => void;
  }

  const {
    open,
    mode,
    itemType,
    title,
    content,
    url,
    username,
    isLoading,
    onclose,
    onsubmit,
    ongeneratepassword,
    ontypechange,
    ontitlechange,
    oncontentchange,
    onurlchange,
    onusernamechange,
  }: Props = $props();

  function handleTypeChange(type: VaultItemType): void {
    // Only pass non-file types to parent
    if (type !== 'file') {
      ontypechange(type);
    }
  }

  const modalTitle = $derived(mode === 'add' ? 'Add New Item' : 'Edit Item');
  const modalDescription = $derived(
    mode === 'add' ? 'Store a new secret in your vault' : 'Update this vault item'
  );
  const submitLabel = $derived(mode === 'add' ? 'Add Item' : 'Save Changes');

  function handleTitleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    ontitlechange(target.value);
  }

  function handleContentInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    oncontentchange(target.value);
  }

  function handleUrlInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    onurlchange(target.value);
  }

  function handleUsernameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    onusernamechange(target.value);
  }
</script>

<Modal {open} title={modalTitle} description={modalDescription} {onclose}>
  <div class="space-y-4">
    <ItemTypeSelector selected={itemType} onselect={handleTypeChange} />

    <div>
      <label for="item-title" class="text-text-secondary mb-1.5 block text-sm font-medium">
        Title <span class="text-error-400">*</span>
      </label>
      <Input id="item-title" placeholder="Enter a title" value={title} oninput={handleTitleInput} />
    </div>

    {#if itemType === 'password'}
      <Input
        label="Website URL (optional)"
        type="url"
        placeholder="https://example.com"
        value={url}
        oninput={handleUrlInput}
      />
      <Input
        label="Username (optional)"
        placeholder="Enter username or email"
        value={username}
        oninput={handleUsernameInput}
      />
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label for="password-input" class="text-text-secondary text-sm font-medium"
            >Password <span class="text-error-400">*</span></label
          >
          <button
            type="button"
            class="text-primary-400 hover:text-primary-300 text-xs"
            onclick={ongeneratepassword}
          >
            {mode === 'add' ? 'Generate' : 'Generate new'}
          </button>
        </div>
        <Input
          id="password-input"
          type="password"
          placeholder="Enter or generate password"
          value={content}
          oninput={handleContentInput}
        />
      </div>
    {:else}
      <div>
        <label for="content-textarea" class="text-text-secondary mb-1.5 block text-sm font-medium">
          Content <span class="text-error-400">*</span>
        </label>
        <textarea
          id="content-textarea"
          value={content}
          oninput={handleContentInput}
          placeholder="Enter your secret content"
          rows="4"
          class="bg-surface-elevated border-border text-text-primary placeholder:text-text-muted focus:ring-primary-500 w-full resize-none rounded-lg border px-4 py-2.5 transition-all focus:border-transparent focus:ring-2 focus:outline-none"
        ></textarea>
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <Button variant="ghost" onclick={onclose}>Cancel</Button>
    <Button variant="primary" onclick={onsubmit} loading={isLoading}>{submitLabel}</Button>
  {/snippet}
</Modal>
