<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    message: string;
    variant?: 'warning' | 'error' | 'info';
  }

  const { message, variant = 'warning' }: Props = $props();

  const variantStyles = {
    warning: 'bg-warning-500/10 border-warning-500/30 text-warning-500',
    error: 'bg-danger-500/10 border-danger-500/30 text-danger-500',
    info: 'bg-primary-500/10 border-primary-500/30 text-primary-400',
  };
</script>

<!-- eslint-disable-next-line security/detect-object-injection -->
<div class="rounded-xl border p-4 {variantStyles[variant]}">
  <div class="flex gap-3">
    <Icon name={variant === 'error' ? 'alert' : variant === 'info' ? 'info' : 'alert'} size={20} class="flex-shrink-0 mt-0.5" />
    <div class="flex-1">
      <p class="text-sm font-medium">{message}</p>
      <p class="text-xs mt-1 opacity-80">
        For best results, use Chrome 116+, Safari 18+, or Firefox 130+.
      </p>
    </div>
  </div>
</div>


