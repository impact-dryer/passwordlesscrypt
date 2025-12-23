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

  const {
    type = 'text',
    value = '',
    placeholder = '',
    label,
    error,
    disabled = false,
    readonly: readonlyProp = false,
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
  {#if label !== undefined}
    <label for={inputId} class="text-text-secondary mb-1.5 block text-sm font-medium">
      {label}
    </label>
  {/if}

  <div class="relative">
    <input
      id={inputId}
      {name}
      type={actualType}
      {value}
      {placeholder}
      {disabled}
      readonly={readonlyProp}
      {autocomplete}
      class="bg-surface-elevated text-text-primary placeholder:text-text-muted focus:ring-primary-500 w-full rounded-lg border px-4 py-2.5 transition-all duration-200 focus:border-transparent focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 {type ===
      'password'
        ? 'pr-10'
        : ''} {error !== undefined && error !== ''
        ? 'border-danger-500'
        : 'border-border hover:border-text-muted'}"
      {oninput}
      {onkeydown}
    />

    {#if type === 'password'}
      <button
        type="button"
        class="text-text-muted hover:text-text-primary absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
        onclick={() => {
          showPassword = !showPassword;
        }}
        tabindex={-1}
      >
        <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
      </button>
    {/if}
  </div>

  {#if error !== undefined && error !== ''}
    <p class="text-danger-500 mt-1.5 text-sm">{error}</p>
  {/if}
</div>

