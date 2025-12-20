<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    onclick?: (event: MouseEvent) => void;
    children: Snippet;
  }

  const {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    type = 'button',
    class: className = '',
    onclick,
    children,
  }: Props = $props();

  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary:
      'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500 shadow-lg shadow-primary-500/20',
    secondary:
      'bg-surface-elevated text-text-primary border border-border hover:bg-border hover:border-text-muted focus-visible:ring-primary-500',
    danger:
      'bg-danger-500 text-white hover:bg-danger-600 focus-visible:ring-danger-500',
    ghost:
      'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated focus-visible:ring-primary-500',
  };

  const sizeStyles = {
    sm: 'text-sm px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2',
  };
</script>

<!-- eslint-disable-next-line security/detect-object-injection -->
<button
  {type}
  class="{baseStyles} {variantStyles[variant]} {sizeStyles[size]} {className}"
  disabled={disabled || loading}
  {onclick}
>
  {#if loading}
    <svg
      class="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  {/if}
  {@render children()}
</button>


