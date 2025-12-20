<script lang="ts">
  import { Button, Icon, EmptyState, VaultItemCard } from '$components';
  import type { VaultItem } from '$storage';

  interface Props {
    items: VaultItem[];
    searchQuery: string;
    onsearchchange: (query: string) => void;
    onadditem: () => void;
    onedititem: (item: VaultItem) => void;
    ondeleteitem: (item: VaultItem) => void;
  }

  const { items, searchQuery, onsearchchange, onadditem, onedititem, ondeleteitem }: Props =
    $props();

  function handleSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    onsearchchange(target.value);
  }
</script>

<div class="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
  <!-- Search and add -->
  <div class="flex items-center gap-3 mb-6">
    <div class="flex-1 relative">
      <Icon name="search" size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
      <label for="vault-search" class="sr-only">Search vault</label>
      <input
        id="vault-search"
        type="search"
        placeholder="Search vault..."
        value={searchQuery}
        oninput={handleSearchInput}
        class="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
      />
    </div>
    <Button variant="primary" onclick={onadditem}>
      <Icon name="plus" size={18} />
      Add Item
    </Button>
  </div>

  <!-- Items list -->
  {#if items.length === 0}
    {#if searchQuery.trim() !== ''}
      <EmptyState icon="search" title="No results found" description="Try a different search term" />
    {:else}
      <EmptyState
        icon="lock"
        title="Your vault is empty"
        description="Add your first secret to get started"
      >
        <Button variant="primary" onclick={onadditem}>
          <Icon name="plus" size={18} />
          Add Your First Item
        </Button>
      </EmptyState>
    {/if}
  {:else}
    <div class="space-y-3">
      {#each items as item (item.id)}
        <VaultItemCard
          {item}
          onedit={() => {
            onedititem(item);
          }}
          ondelete={() => {
            ondeleteitem(item);
          }}
        />
      {/each}
    </div>
  {/if}
</div>

