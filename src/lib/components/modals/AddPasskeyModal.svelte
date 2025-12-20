<script lang="ts">
  import { Modal, Input, Button } from '$components';

  interface Props {
    open: boolean;
    passkeyName: string;
    isLoading: boolean;
    onclose: () => void;
    onsubmit: () => void;
    onpasskeyname: (value: string) => void;
  }

  const { open, passkeyName, isLoading, onclose, onsubmit, onpasskeyname }: Props = $props();

  function handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    onpasskeyname(target.value);
  }
</script>

<Modal
  {open}
  title="Add Passkey"
  description="Add another passkey for backup access"
  {onclose}
>
  <div class="space-y-4">
    <Input
      label="Passkey Name"
      placeholder="e.g., iPhone, YubiKey Backup"
      value={passkeyName}
      oninput={handleInput}
    />
    <p class="text-xs text-text-muted">
      You'll be prompted to authenticate with your device's biometrics or security key.
    </p>
  </div>

  {#snippet footer()}
    <Button variant="ghost" onclick={onclose}>Cancel</Button>
    <Button variant="primary" onclick={onsubmit} loading={isLoading}>Add Passkey</Button>
  {/snippet}
</Modal>
