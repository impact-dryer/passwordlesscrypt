<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'default' | 'elevated' | 'bordered';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    class?: string;
    children: Snippet;
  }

  const {
    variant = 'default',
    padding = 'md',
    class: className = '',
    children,
  }: Props = $props();

  const baseStyles = 'rounded-xl transition-all duration-200';

  const variantStyles = {
    default: 'bg-surface',
    elevated: 'bg-surface-elevated shadow-lg shadow-black/20',
    bordered: 'bg-surface border border-border',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
</script>

<!-- eslint-disable-next-line security/detect-object-injection -->
<div class="{baseStyles} {variantStyles[variant]} {paddingStyles[padding]} {className}">
  {@render children()}
</div>

