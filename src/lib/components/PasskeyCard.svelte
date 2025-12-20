<script lang="ts">
  import type { StoredCredential } from '$webauthn';
  import Icon from './Icon.svelte';
  import Button from './Button.svelte';

  interface Props {
    credential: StoredCredential;
    isCurrentSession?: boolean;
    canDelete?: boolean;
    ondelete?: () => void;
  }

  const { credential, isCurrentSession = false, canDelete = true, ondelete }: Props = $props();

  function formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  }
</script>

<div
  class="flex items-center gap-4 p-4 bg-surface-elevated border rounded-xl transition-all duration-200 {isCurrentSession
    ? 'border-primary-500 shadow-glow'
    : 'border-border hover:border-text-muted'}"
>
  <!-- Icon -->
  <div
    class="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center {credential.authenticatorType ===
    'platform'
      ? 'bg-accent-500/10'
      : 'bg-primary-500/10'}"
  >
    <Icon
      name={credential.authenticatorType === 'platform' ? 'fingerprint' : 'key'}
      size={24}
      class={credential.authenticatorType === 'platform' ? 'text-accent-500' : 'text-primary-400'}
    />
  </div>

  <!-- Info -->
  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2">
      <h3 class="font-medium text-text-primary truncate">{credential.name}</h3>
      {#if isCurrentSession}
        <span class="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
          Current session
        </span>
      {/if}
    </div>
    <p class="text-sm text-text-secondary mt-0.5">
      {credential.authenticatorType === 'platform' ? 'Built-in authenticator' : 'Security key'}
    </p>
    <p class="text-xs text-text-muted mt-1">
      Last used: {formatDate(credential.lastUsedAt)}
    </p>
  </div>

  <!-- Delete button -->
  {#if canDelete && ondelete}
    <Button variant="ghost" size="sm" onclick={ondelete}>
      <Icon name="trash" size={16} class="text-danger-500" />
    </Button>
  {/if}
</div>

