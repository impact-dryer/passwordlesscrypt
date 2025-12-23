/**
 * Tests for Modal State Management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createModalState, type ModalType } from './modal-state.svelte';

describe('stores/modal-state', () => {
  describe('createModalState', () => {
    let modalState: ReturnType<typeof createModalState>;

    beforeEach(() => {
      modalState = createModalState();
    });

    it('should start with no active modal', () => {
      expect(modalState.active).toBeNull();
    });

    it('should open a modal', () => {
      modalState.open('setup');
      expect(modalState.active).toBe('setup');
    });

    it('should close an open modal', () => {
      modalState.open('addItem');
      expect(modalState.active).toBe('addItem');

      modalState.close();
      expect(modalState.active).toBeNull();
    });

    it('should check if a specific modal is open', () => {
      expect(modalState.isOpen('setup')).toBe(false);

      modalState.open('setup');
      expect(modalState.isOpen('setup')).toBe(true);
      expect(modalState.isOpen('addItem')).toBe(false);
    });

    it('should replace current modal when opening another', () => {
      modalState.open('setup');
      expect(modalState.active).toBe('setup');

      modalState.open('editItem');
      expect(modalState.active).toBe('editItem');
      expect(modalState.isOpen('setup')).toBe(false);
    });

    it('should handle all modal types', () => {
      const modalTypes: ModalType[] = [
        'setup',
        'addItem',
        'editItem',
        'deleteItem',
        'addPasskey',
        'deletePasskey',
        'fileUpload',
      ];

      for (const type of modalTypes) {
        modalState.open(type);
        expect(modalState.active).toBe(type);
        expect(modalState.isOpen(type)).toBe(true);
      }
    });

    it('should be safe to close when no modal is open', () => {
      expect(modalState.active).toBeNull();
      modalState.close();
      expect(modalState.active).toBeNull();
    });
  });
});
