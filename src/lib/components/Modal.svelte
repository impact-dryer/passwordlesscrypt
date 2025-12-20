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

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onclose();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

    <!-- Modal -->
    <div
      class="relative w-full max-w-md bg-surface-elevated rounded-2xl shadow-2xl shadow-black/40 animate-slide-up"
    >
      <!-- Header -->
      <div class="flex items-start justify-between p-6 pb-0">
        <div>
          <h2 id="modal-title" class="text-xl font-semibold text-text-primary">
            {title}
          </h2>
          {#if description}
            <p class="mt-1 text-sm text-text-secondary">{description}</p>
          {/if}
        </div>
        <button
          type="button"
          class="p-1 -m-1 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-surface"
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


