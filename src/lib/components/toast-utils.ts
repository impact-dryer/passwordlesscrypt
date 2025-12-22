/**
 * Toast utility functions and types.
 * Separated from Toast.svelte for better TypeScript inference.
 */

import { writable } from 'svelte/store';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export const toasts = writable<ToastMessage[]>([]);

export function showToast(
  message: string,
  type: ToastMessage['type'] = 'info',
  duration = 4000
): void {
  const id = Math.random().toString(36).slice(2, 9);
  const toast: ToastMessage = { id, type, message, duration };

  toasts.update((all) => [...all, toast]);

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }
}

export function dismissToast(id: string): void {
  toasts.update((all) => all.filter((t) => t.id !== id));
}






