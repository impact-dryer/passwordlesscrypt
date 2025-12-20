<script lang="ts">
  import type { VaultItem } from '$storage';
  import Icon from './Icon.svelte';
  import Button from './Button.svelte';
  import { showToast } from './Toast.svelte';

  interface Props {
    item: VaultItem;
    onedit: () => void;
    ondelete: () => void;
  }

  const { item, onedit, ondelete }: Props = $props();

  let showContent = $state(false);
  let copied = $state(false);

  const typeIcons = {
    note: 'note',
    password: 'password',
    secret: 'key',
  } as const;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(item.content);
      copied = true;
      showToast('Copied to clipboard', 'success');

      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  }

  function formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(timestamp));
  }
</script>

<div
  class="group bg-surface-elevated border border-border rounded-xl p-4 hover:border-text-muted transition-all duration-200"
>
  <div class="flex items-start gap-3">
    <!-- Icon -->
    <div
      class="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center"
    >
      <Icon name={typeIcons[item.type]} size={20} class="text-primary-400" />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h3 class="font-medium text-text-primary truncate">{item.title}</h3>
        <span
          class="text-xs px-2 py-0.5 rounded-full bg-surface text-text-muted capitalize"
        >
          {item.type}
        </span>
      </div>

      {#if item.url}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 mt-1"
        >
          {item.url}
          <Icon name="external" size={12} />
        </a>
      {/if}

      {#if item.username}
        <p class="text-sm text-text-secondary mt-1">
          <span class="text-text-muted">Username:</span>
          {item.username}
        </p>
      {/if}

      <!-- Secret content -->
      <div class="mt-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors"
            onclick={() => (showContent = !showContent)}
          >
            <Icon name={showContent ? 'eye-off' : 'eye'} size={14} />
            {showContent ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            class="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors"
            onclick={copyToClipboard}
          >
            <Icon name={copied ? 'check' : 'copy'} size={14} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {#if showContent}
          <pre
            class="mt-2 p-3 bg-background rounded-lg text-sm text-text-secondary font-mono overflow-x-auto">{item.content}</pre>
        {:else}
          <p class="mt-2 text-sm text-text-muted font-mono">••••••••••••</p>
        {/if}
      </div>

      <!-- Footer -->
      <p class="text-xs text-text-muted mt-3">
        Modified {formatDate(item.modifiedAt)}
      </p>
    </div>

    <!-- Actions -->
    <div
      class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <Button variant="ghost" size="sm" onclick={onedit}>
        <Icon name="edit" size={16} />
      </Button>
      <Button variant="ghost" size="sm" onclick={ondelete}>
        <Icon name="trash" size={16} class="text-danger-500" />
      </Button>
    </div>
  </div>
</div>


