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

<div class="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
  <h2 class="text-text-primary mb-4 text-lg font-semibold">Passkeys</h2>
  <p class="text-text-secondary mb-6 text-sm">
    Manage the passkeys that can unlock your vault. Add multiple passkeys for backup access.
  </p>

  <div class="mb-6 space-y-3">
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
