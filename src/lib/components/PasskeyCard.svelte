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
  class="group bg-surface-elevated flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 {isCurrentSession
    ? 'border-primary-500 shadow-glow'
    : 'border-border hover:border-text-muted'}"
>
  <!-- Icon -->
  <div
    class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl {credential.authenticatorType ===
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
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-2">
      <h3 class="text-text-primary truncate font-medium">{credential.name}</h3>
      {#if isCurrentSession}
        <span class="bg-primary-500/20 text-primary-400 rounded-full px-2 py-0.5 text-xs">
          Current session
        </span>
      {/if}
    </div>
    <p class="text-text-secondary mt-0.5 text-sm">
      {credential.authenticatorType === 'platform' ? 'Built-in authenticator' : 'Security key'}
    </p>
    <p class="text-text-muted mt-1 text-xs">
      Last used: {formatDate(credential.lastUsedAt)}
    </p>
  </div>

  <!-- Delete button -->
  {#if canDelete && ondelete}
    <Button variant="ghost" size="sm" onclick={ondelete}>
      <Icon name="trash" size={16} class="text-danger-500" />
      <span class="sr-only">Remove passkey</span>
    </Button>
  {/if}
</div>







