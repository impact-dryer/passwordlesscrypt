<script lang="ts">
  import { Card, Icon, Button, CompatibilityBanner } from '$components';
  import type { PlatformCapabilities } from '$webauthn';

  interface Props {
    capabilities: PlatformCapabilities | null;
    compatibilityMessage: string | null;
    onsetup: () => void;
  }

  const { capabilities, compatibilityMessage, onsetup }: Props = $props();
</script>

<div class="flex flex-1 items-center justify-center p-4">
  <div class="w-full max-w-md">
    <Card variant="elevated" padding="lg">
      <div class="mb-8 text-center">
        <div
          class="bg-primary-500/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
        >
          <Icon name="shield" size={32} class="text-primary-400" />
        </div>
        <h1 class="text-text-primary text-2xl font-bold">Passwordless Encryption</h1>
        <p class="text-text-secondary mt-2">
          Secure your secrets with hardware-backed encryption. No passwords to remember.
        </p>
      </div>

      {#if compatibilityMessage}
        <div class="mb-6">
          <CompatibilityBanner message={compatibilityMessage} variant="warning" />
        </div>
      {/if}

      <div class="space-y-4">
        <div class="bg-surface rounded-xl p-4">
          <h3 class="text-text-primary flex items-center gap-2 font-medium">
            <Icon name="fingerprint" size={20} class="text-accent-500" />
            How it works
          </h3>
          <ul class="text-text-secondary mt-3 space-y-2 text-sm">
            <li class="flex items-start gap-2">
              <span class="text-primary-400">1.</span>
              Create a passkey using your device's biometrics or security key
            </li>
            <li class="flex items-start gap-2">
              <span class="text-primary-400">2.</span>
              Your secrets are encrypted with a key derived from your passkey
            </li>
            <li class="flex items-start gap-2">
              <span class="text-primary-400">3.</span>
              Only you can unlock your vault with your registered passkeys
            </li>
          </ul>
        </div>

        <Button
          variant="primary"
          size="lg"
          class="w-full"
          onclick={onsetup}
          disabled={capabilities?.webAuthnSupported !== true}
        >
          <Icon name="key" size={20} />
          Create Your Vault
        </Button>
      </div>
    </Card>
  </div>
</div>







