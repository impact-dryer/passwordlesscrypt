<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    type?: 'text' | 'password' | 'email' | 'url' | 'search';
    value?: string;
    placeholder?: string;
    label?: string;
    error?: string;
    disabled?: boolean;
    readonly?: boolean;
    id?: string;
    name?: string;
    autocomplete?: AutoFill;
    class?: string;
    oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void;
    onkeydown?: (event: KeyboardEvent) => void;
  }

  let {
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    label,
    error,
    disabled = false,
    readonly = false,
    id,
    name,
    autocomplete,
    class: className = '',
    oninput,
    onkeydown,
  }: Props = $props();

  let showPassword = $state(false);
  const generatedId = `input-${Math.random().toString(36).slice(2, 9)}`;
  const inputId = $derived(id ?? generatedId);
  const actualType = $derived(type === 'password' && showPassword ? 'text' : type);
</script>

<div class="w-full {className}">
  {#if label}
    <label for={inputId} class="block text-sm font-medium text-text-secondary mb-1.5">
      {label}
    </label>
  {/if}

  <div class="relative">
    <input
      id={inputId}
      {name}
      type={actualType}
      bind:value
      {placeholder}
      {disabled}
      {readonly}
      {autocomplete}
      class="w-full bg-surface-elevated border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed {type ===
      'password'
        ? 'pr-10'
        : ''} {error ? 'border-danger-500' : 'border-border hover:border-text-muted'}"
      {oninput}
      {onkeydown}
    />

    {#if type === 'password'}
      <button
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
        onclick={() => (showPassword = !showPassword)}
        tabindex={-1}
      >
        <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
      </button>
    {/if}
  </div>

  {#if error}
    <p class="mt-1.5 text-sm text-danger-500">{error}</p>
  {/if}
</div>

