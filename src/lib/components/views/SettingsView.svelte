<script lang="ts">
  import { Button, Icon, PasskeyCard } from '$components';
  import type { StoredCredential } from '$webauthn';

  interface Props {
    credentials: StoredCredential[];
    currentCredentialId: string | null;
    onaddpasskey: () => void;
    ondeletepasskey: (credential: StoredCredential) => void;
  }

  const { credentials, currentCredentialId, onaddpasskey, ondeletepasskey }: Props = $props();
</script>

<div class="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
  <h2 class="text-lg font-semibold text-text-primary mb-4">Passkeys</h2>
  <p class="text-sm text-text-secondary mb-6">
    Manage the passkeys that can unlock your vault. Add multiple passkeys for backup access.
  </p>

  <div class="space-y-3 mb-6">
    {#each credentials as credential (credential.id)}
      <PasskeyCard
        {credential}
        isCurrentSession={credential.id === currentCredentialId}
        canDelete={credentials.length > 1}
        ondelete={() => {
          ondeletepasskey(credential);
        }}
      />
    {/each}
  </div>

  <Button variant="secondary" onclick={onaddpasskey}>
    <Icon name="plus" size={18} />
    Add Passkey
  </Button>
</div>

