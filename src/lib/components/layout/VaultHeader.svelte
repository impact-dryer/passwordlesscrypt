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

<header class="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
  <div class="max-w-4xl mx-auto px-4 py-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
          <Icon name="shield" size={20} class="text-primary-400" />
        </div>
        <div>
          <h1 class="font-semibold text-text-primary">Passwordless Vault</h1>
          <p class="text-xs text-text-muted">{itemCount} items • Encrypted</p>
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


