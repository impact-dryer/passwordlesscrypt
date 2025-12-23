/**
 * Tests for Item Form State Management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createItemFormState } from './item-form-state.svelte';
import type { VaultItem } from '$storage';

describe('stores/item-form-state', () => {
  describe('createItemFormState', () => {
    let formState: ReturnType<typeof createItemFormState>;

    beforeEach(() => {
      formState = createItemFormState();
    });

    describe('initial state', () => {
      it('should have default type as password', () => {
        expect(formState.type).toBe('password');
      });

      it('should have empty title', () => {
        expect(formState.title).toBe('');
      });

      it('should have empty content', () => {
        expect(formState.content).toBe('');
      });

      it('should have empty url', () => {
        expect(formState.url).toBe('');
      });

      it('should have empty username', () => {
        expect(formState.username).toBe('');
      });

      it('should have null editingItem', () => {
        expect(formState.editingItem).toBeNull();
      });

      it('should have null deletingItem', () => {
        expect(formState.deletingItem).toBeNull();
      });
    });

    describe('setters', () => {
      it('should set type', () => {
        formState.setType('note');
        expect(formState.type).toBe('note');

        formState.setType('secret');
        expect(formState.type).toBe('secret');
      });

      it('should set title', () => {
        formState.setTitle('My Password');
        expect(formState.title).toBe('My Password');
      });

      it('should set content', () => {
        formState.setContent('secret123');
        expect(formState.content).toBe('secret123');
      });

      it('should set url', () => {
        formState.setUrl('https://example.com');
        expect(formState.url).toBe('https://example.com');
      });

      it('should set username', () => {
        formState.setUsername('john@example.com');
        expect(formState.username).toBe('john@example.com');
      });
    });

    describe('reset', () => {
      it('should reset all fields to defaults', () => {
        formState.setType('note');
        formState.setTitle('Test');
        formState.setContent('Content');
        formState.setUrl('https://test.com');
        formState.setUsername('user');

        formState.reset();

        expect(formState.type).toBe('password');
        expect(formState.title).toBe('');
        expect(formState.content).toBe('');
        expect(formState.url).toBe('');
        expect(formState.username).toBe('');
        expect(formState.editingItem).toBeNull();
      });
    });

    describe('setForEdit', () => {
      it('should populate form with item data', () => {
        const item: VaultItem = {
          id: '123',
          type: 'password',
          title: 'GitHub',
          content: 'mypassword',
          url: 'https://github.com',
          username: 'myuser',
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };

        formState.setForEdit(item);

        expect(formState.editingItem).toStrictEqual(item);
        expect(formState.type).toBe('password');
        expect(formState.title).toBe('GitHub');
        expect(formState.content).toBe('mypassword');
        expect(formState.url).toBe('https://github.com');
        expect(formState.username).toBe('myuser');
      });

      it('should handle items without optional fields', () => {
        const item: VaultItem = {
          id: '456',
          type: 'note',
          title: 'My Note',
          content: 'Note content',
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };

        formState.setForEdit(item);

        expect(formState.url).toBe('');
        expect(formState.username).toBe('');
      });
    });

    describe('setForDelete / clearDelete', () => {
      it('should set item for deletion', () => {
        const item: VaultItem = {
          id: '789',
          type: 'secret',
          title: 'API Key',
          content: 'key123',
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };

        formState.setForDelete(item);
        expect(formState.deletingItem).toStrictEqual(item);
      });

      it('should clear deleting item', () => {
        const item: VaultItem = {
          id: '789',
          type: 'secret',
          title: 'API Key',
          content: 'key123',
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        };

        formState.setForDelete(item);
        formState.clearDelete();
        expect(formState.deletingItem).toBeNull();
      });
    });

    describe('getData', () => {
      it('should return trimmed form data', () => {
        formState.setType('password');
        formState.setTitle('  My Title  ');
        formState.setContent('  content  ');
        formState.setUrl('  https://url.com  ');
        formState.setUsername('  user  ');

        const data = formState.getData();

        expect(data.type).toBe('password');
        expect(data.title).toBe('My Title');
        expect(data.content).toBe('content');
        expect(data.url).toBe('https://url.com');
        expect(data.username).toBe('user');
      });
    });

    describe('isValid', () => {
      it('should return false when title is empty', () => {
        formState.setContent('content');
        expect(formState.isValid()).toBe(false);
      });

      it('should return false when content is empty', () => {
        formState.setTitle('title');
        expect(formState.isValid()).toBe(false);
      });

      it('should return false when both are whitespace only', () => {
        formState.setTitle('   ');
        formState.setContent('   ');
        expect(formState.isValid()).toBe(false);
      });

      it('should return true when title and content are set', () => {
        formState.setTitle('My Title');
        formState.setContent('My Content');
        expect(formState.isValid()).toBe(true);
      });
    });
  });
});

