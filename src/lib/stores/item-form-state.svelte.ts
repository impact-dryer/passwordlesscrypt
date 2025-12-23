/**
 * Item Form State Management
 *
 * Manages the form state for adding/editing vault items.
 * Uses Svelte 5 runes for reactive state.
 */

import type { VaultItem } from '$storage';

export type ItemType = 'note' | 'password' | 'secret';

export interface ItemFormData {
  type: ItemType;
  title: string;
  content: string;
  url: string;
  username: string;
}

/**
 * Creates an item form state manager.
 */
export function createItemFormState() {
  let type = $state<ItemType>('password');
  let title = $state('');
  let content = $state('');
  let url = $state('');
  let username = $state('');
  let editingItem = $state<VaultItem | null>(null);
  let deletingItem = $state<VaultItem | null>(null);

  function reset(): void {
    type = 'password';
    title = '';
    content = '';
    url = '';
    username = '';
    editingItem = null;
  }

  function setForEdit(item: VaultItem): void {
    editingItem = item;
    type = item.type as ItemType;
    title = item.title;
    content = item.content;
    url = item.url ?? '';
    username = item.username ?? '';
  }

  function setForDelete(item: VaultItem): void {
    deletingItem = item;
  }

  function clearDelete(): void {
    deletingItem = null;
  }

  function getData(): ItemFormData {
    return {
      type,
      title: title.trim(),
      content: content.trim(),
      url: url.trim(),
      username: username.trim(),
    };
  }

  function isValid(): boolean {
    return title.trim() !== '' && content.trim() !== '';
  }

  return {
    // Getters
    get type() {
      return type;
    },
    get title() {
      return title;
    },
    get content() {
      return content;
    },
    get url() {
      return url;
    },
    get username() {
      return username;
    },
    get editingItem() {
      return editingItem;
    },
    get deletingItem() {
      return deletingItem;
    },

    // Setters
    setType(value: ItemType): void {
      type = value;
    },
    setTitle(value: string): void {
      title = value;
    },
    setContent(value: string): void {
      content = value;
    },
    setUrl(value: string): void {
      url = value;
    },
    setUsername(value: string): void {
      username = value;
    },

    // Actions
    reset,
    setForEdit,
    setForDelete,
    clearDelete,
    getData,
    isValid,
  };
}

export type ItemFormState = ReturnType<typeof createItemFormState>;

