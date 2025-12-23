<script lang="ts">
  import Icon from './Icon.svelte';
  import { toasts, dismissToast } from './toast-utils';

  const typeStyles = {
    success: 'bg-accent-500/10 border-accent-500 text-accent-500',
    error: 'bg-danger-500/10 border-danger-500 text-danger-500',
    warning: 'bg-warning-500/10 border-warning-500 text-warning-500',
    info: 'bg-primary-500/10 border-primary-500 text-primary-500',
  };

  const typeIcons = {
    success: 'check',
    error: 'alert',
    warning: 'alert',
    info: 'info',
  } as const;
</script>

<div
  class="fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-2"
  aria-live="polite"
  aria-atomic="true"
>
  {#each $toasts as toast (toast.id)}
    <div
      class="animate-slide-up flex items-center gap-3 rounded-lg border px-4 py-3 backdrop-blur-sm {typeStyles[
        toast.type
      ]}"
      role="alert"
    >
      <Icon name={typeIcons[toast.type]} size={20} />
      <p class="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        class="p-0.5 transition-opacity hover:opacity-70"
        onclick={() => {
          dismissToast(toast.id);
        }}
        aria-label="Dismiss"
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  {/each}
</div>

