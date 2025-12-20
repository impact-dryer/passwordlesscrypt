<script lang="ts">
  import { Card, Icon, Button } from '$components';
  import type { StoredCredential } from '$webauthn';

  interface Props {
    credentials: StoredCredential[];
    isUnlocking: boolean;
    onunlock: () => void;
  }

  const { credentials, isUnlocking, onunlock }: Props = $props();
</script>

<div class="flex-1 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <Card variant="elevated" padding="lg">
      <div class="text-center mb-8">
        <div class="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mx-auto mb-4">
          <Icon name="lock" size={32} class="text-text-muted" />
        </div>
        <h1 class="text-2xl font-bold text-text-primary">Vault Locked</h1>
        <p class="text-text-secondary mt-2">
          Authenticate with your passkey to unlock your encrypted vault.
        </p>
      </div>

      {#if credentials.length > 0}
        <div class="mb-6 space-y-2">
          <p class="text-xs text-text-muted uppercase tracking-wide">Registered passkeys</p>
          {#each credentials as credential (credential.id)}
            <div class="flex items-center gap-3 p-3 bg-surface rounded-lg">
              <Icon
                name={credential.authenticatorType === 'platform' ? 'fingerprint' : 'key'}
                size={20}
                class="text-text-muted"
              />
              <span class="text-sm text-text-secondary">{credential.name}</span>
            </div>
          {/each}
        </div>
      {/if}

      <Button variant="primary" size="lg" class="w-full" onclick={onunlock} loading={isUnlocking}>
        <Icon name="unlock" size={20} />
        {isUnlocking ? 'Authenticating...' : 'Unlock Vault'}
      </Button>
    </Card>
  </div>
</div>


