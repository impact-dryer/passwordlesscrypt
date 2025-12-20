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

<div class="flex flex-col items-center justify-center text-center py-12 px-4">
  <div class="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mb-4">
    <Icon name={icon} size={32} class="text-text-muted" />
  </div>

  <h3 class="text-lg font-medium text-text-primary">{title}</h3>

  {#if description}
    <p class="mt-2 text-sm text-text-secondary max-w-sm">{description}</p>
  {/if}

  {#if children}
    <div class="mt-6">
      {@render children()}
    </div>
  {/if}
</div>


