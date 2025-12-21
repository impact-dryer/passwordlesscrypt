<script lang="ts">
  import type { VaultItem } from '$storage';
  import Icon from './Icon.svelte';
  import Button from './Button.svelte';
  import { showToast } from './toast-utils';

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

  async function copyToClipboard(): Promise<void> {
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
  class="group bg-surface-elevated border-border hover:border-text-muted rounded-xl border p-4 transition-all duration-200"
>
  <div class="flex items-start gap-3">
    <!-- Icon -->
    <div
      class="bg-primary-500/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
    >
      <Icon name={typeIcons[item.type]} size={20} class="text-primary-400" />
    </div>

    <!-- Content -->
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <h3 class="text-text-primary truncate font-medium">{item.title}</h3>
        <span class="bg-surface text-text-muted rounded-full px-2 py-0.5 text-xs capitalize">
          {item.type}
        </span>
      </div>

      {#if item.url !== undefined && item.url !== ''}
        {@const externalUrl = item.url.startsWith('http') ? item.url : `https://${item.url}`}
        <button
          type="button"
          onclick={() => {
            window.open(externalUrl, '_blank', 'noopener,noreferrer');
          }}
          class="text-primary-400 hover:text-primary-300 mt-1 flex cursor-pointer items-center gap-1 text-sm"
        >
          {item.url}
          <Icon name="external" size={12} />
        </button>
      {/if}

      {#if item.username}
        <p class="text-text-secondary mt-1 text-sm">
          <span class="text-text-muted">Username:</span>
          {item.username}
        </p>
      {/if}

      <!-- Secret content -->
      <div class="mt-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="text-text-muted hover:text-text-secondary flex items-center gap-1 text-xs transition-colors"
            onclick={() => (showContent = !showContent)}
          >
            <Icon name={showContent ? 'eye-off' : 'eye'} size={14} />
            {showContent ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            class="text-text-muted hover:text-text-secondary flex items-center gap-1 text-xs transition-colors"
            onclick={copyToClipboard}
          >
            <Icon name={copied ? 'check' : 'copy'} size={14} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {#if showContent}
          <pre
            class="bg-background text-text-secondary mt-2 overflow-x-auto rounded-lg p-3 font-mono text-sm">{item.content}</pre>
        {:else}
          <p class="text-text-muted mt-2 font-mono text-sm">••••••••••••</p>
        {/if}
      </div>

      <!-- Footer -->
      <p class="text-text-muted mt-3 text-xs">
        Modified {formatDate(item.modifiedAt)}
      </p>
    </div>

    <!-- Actions -->
    <div
      class="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
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
