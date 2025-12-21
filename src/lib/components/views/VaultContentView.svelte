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

<div class="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
  <!-- Search and add -->
  <div class="mb-6 flex items-center gap-3">
    <div class="relative flex-1">
      <Icon
        name="search"
        size={18}
        class="text-text-muted absolute top-1/2 left-3 -translate-y-1/2"
      />
      <label for="vault-search" class="sr-only">Search vault</label>
      <input
        id="vault-search"
        type="search"
        placeholder="Search vault..."
        value={searchQuery}
        oninput={handleSearchInput}
        class="bg-surface border-border text-text-primary placeholder:text-text-muted focus:ring-primary-500 w-full rounded-lg border py-2.5 pr-4 pl-10 transition-all focus:border-transparent focus:ring-2 focus:outline-none"
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
      <EmptyState
        icon="search"
        title="No results found"
        description="Try a different search term"
      />
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




