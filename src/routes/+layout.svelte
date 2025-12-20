<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';

  interface Props {
    readonly children: Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="min-h-dvh bg-background">
  {@render children()}
</div>
