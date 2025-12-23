<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  interface Props {
    open: boolean;
    title: string;
    description?: string;
    onclose: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  const { open, title, description, onclose, children, footer }: Props = $props();

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      onclose();
    }
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
    class="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-4"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

    <!-- Modal -->
    <div
      class="bg-surface-elevated animate-slide-up relative w-full max-w-md rounded-2xl shadow-2xl shadow-black/40"
    >
      <!-- Header -->
      <div class="flex items-start justify-between p-6 pb-0">
        <div>
          <h2 id="modal-title" class="text-text-primary text-xl font-semibold">
            {title}
          </h2>
          {#if description}
            <p class="text-text-secondary mt-1 text-sm">{description}</p>
          {/if}
        </div>
        <button
          type="button"
          class="text-text-muted hover:text-text-primary hover:bg-surface -m-1 rounded-lg p-1 transition-colors"
          onclick={onclose}
          aria-label="Close modal"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        {@render children()}
      </div>

      <!-- Footer -->
      {#if footer}
        <div class="flex items-center justify-end gap-3 px-6 pb-6">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

