<script lang="ts">
  import type { VaultItemType } from '$storage';

  interface Props {
    selected: VaultItemType;
    onselect: (type: VaultItemType) => void;
    /** Whether to show the file type option */
    showFileType?: boolean;
  }

  const { selected, onselect, showFileType = false }: Props = $props();

  const baseTypes: VaultItemType[] = ['password', 'note', 'secret'];
  const types: VaultItemType[] = $derived(showFileType ? [...baseTypes, 'file'] : baseTypes);

  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
</script>

<fieldset>
  <legend class="text-text-secondary mb-1.5 block text-sm font-medium">Type</legend>
  <div class="flex gap-2" role="group" aria-label="Item type">
    {#each types as type (type)}
      <button
        type="button"
        class="flex-1 rounded-lg border px-3 py-2 text-sm transition-all {selected === type
          ? 'bg-primary-500/10 border-primary-500 text-primary-400'
          : 'bg-surface border-border text-text-secondary hover:border-text-muted'}"
        onclick={() => {
          onselect(type);
        }}
        aria-pressed={selected === type}
      >
        {capitalize(type)}
      </button>
    {/each}
  </div>
</fieldset>
