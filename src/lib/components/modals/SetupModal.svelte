<script lang="ts">
  import { Modal, Input, Button } from '$components';

  interface Props {
    open: boolean;
    userName: string;
    passkeyName: string;
    isLoading: boolean;
    onclose: () => void;
    onsubmit: () => void;
    onusernamechange: (value: string) => void;
    onpasskeynamechange: (value: string) => void;
  }

  const {
    open,
    userName,
    passkeyName,
    isLoading,
    onclose,
    onsubmit,
    onusernamechange,
    onpasskeynamechange,
  }: Props = $props();

  function handleUserNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    onusernamechange(target.value);
  }

  function handlePasskeyNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    onpasskeynamechange(target.value);
  }
</script>

<Modal
  {open}
  title="Create Your Vault"
  description="Set up your first passkey to secure your vault"
  {onclose}
>
  <div class="space-y-4">
    <Input
      label="Your Name"
      placeholder="Enter your name"
      value={userName}
      oninput={handleUserNameInput}
      autocomplete="name"
    />
    <Input
      label="Passkey Name"
      placeholder="e.g., MacBook Pro, YubiKey"
      value={passkeyName}
      oninput={handlePasskeyNameInput}
    />
    <p class="text-xs text-text-muted">
      You'll be prompted to use your device's biometrics or security key.
    </p>
  </div>

  {#snippet footer()}
    <Button variant="ghost" onclick={onclose}>Cancel</Button>
    <Button variant="primary" onclick={onsubmit} loading={isLoading}>Create Vault</Button>
  {/snippet}
</Modal>


