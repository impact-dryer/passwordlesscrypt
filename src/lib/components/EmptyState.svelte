<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  interface Props {
    icon?: 'lock' | 'key' | 'shield' | 'search' | 'note';
    title: string;
    description?: string;
    children?: Snippet;
  }

  const { icon = 'lock', title, description, children }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center px-4 py-12 text-center">
  <div class="bg-surface-elevated mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
    <Icon name={icon} size={32} class="text-text-muted" />
  </div>

  <h3 class="text-text-primary text-lg font-medium">{title}</h3>

  {#if description}
    <p class="text-text-secondary mt-2 max-w-sm text-sm">{description}</p>
  {/if}

  {#if children}
    <div class="mt-6">
      {@render children()}
    </div>
  {/if}
</div>

