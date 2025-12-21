<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';

  interface Props {
    readonly children: Snippet;
  }

  const { children }: Props = $props();
</script>

<div class="bg-background min-h-dvh">
  {@render children()}
</div>

