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

<div class="flex flex-1 items-center justify-center p-4">
  <div class="w-full max-w-md">
    <Card variant="elevated" padding="lg">
      <div class="mb-8 text-center">
        <div class="bg-surface mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
          <Icon name="lock" size={32} class="text-text-muted" />
        </div>
        <h1 class="text-text-primary text-2xl font-bold">Vault Locked</h1>
        <p class="text-text-secondary mt-2">
          Authenticate with your passkey to unlock your encrypted vault.
        </p>
      </div>

      {#if credentials.length > 0}
        <div class="mb-6 space-y-2">
          <p class="text-text-muted text-xs tracking-wide uppercase">Registered passkeys</p>
          {#each credentials as credential (credential.id)}
            <div class="bg-surface flex items-center gap-3 rounded-lg p-3">
              <Icon
                name={credential.authenticatorType === 'platform' ? 'fingerprint' : 'key'}
                size={20}
                class="text-text-muted"
              />
              <span class="text-text-secondary text-sm">{credential.name}</span>
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







