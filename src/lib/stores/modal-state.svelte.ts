/**
 * Modal State Management
 *
 * Centralized modal state using Svelte 5 runes for type-safe,
 * reactive modal management.
 */

export type ModalType =
  | 'setup'
  | 'addItem'
  | 'editItem'
  | 'deleteItem'
  | 'addPasskey'
  | 'deletePasskey'
  | 'fileUpload';

/**
 * Creates a modal state manager with Svelte 5 runes.
 */
export function createModalState() {
  let activeModal = $state<ModalType | null>(null);

  return {
    get active() {
      return activeModal;
    },

    isOpen(modal: ModalType): boolean {
      return activeModal === modal;
    },

    open(modal: ModalType): void {
      activeModal = modal;
    },

    close(): void {
      activeModal = null;
    },
  };
}

export type ModalState = ReturnType<typeof createModalState>;

