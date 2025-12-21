<script lang="ts">
  type ItemType = 'note' | 'password' | 'secret';

  interface Props {
    selected: ItemType;
    onselect: (type: ItemType) => void;
  }

  const { selected, onselect }: Props = $props();

  const types: ItemType[] = ['password', 'note', 'secret'];

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
