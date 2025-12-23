<script lang="ts">
  import { Button, Icon } from '$components';

  interface Props {
    itemCount: number;
    showSettings: boolean;
    ontogglesettings: () => void;
    onlock: () => void;
  }

  const { itemCount, showSettings, ontogglesettings, onlock }: Props = $props();
</script>

<header class="bg-background/80 border-border sticky top-0 z-40 border-b backdrop-blur-lg">
  <div class="mx-auto max-w-4xl px-4 py-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="bg-primary-500/10 flex h-10 w-10 items-center justify-center rounded-xl">
          <Icon name="shield" size={20} class="text-primary-400" />
        </div>
        <div>
          <h1 class="text-text-primary font-semibold">Passwordless Vault</h1>
          <p class="text-text-muted text-xs">{itemCount} items • Encrypted</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="ghost" size="sm" onclick={ontogglesettings}>
          <Icon name={showSettings ? 'x' : 'settings'} size={18} />
        </Button>
        <Button variant="secondary" size="sm" onclick={onlock}>
          <Icon name="lock" size={18} />
          Lock
        </Button>
      </div>
    </div>
  </div>
</header>
