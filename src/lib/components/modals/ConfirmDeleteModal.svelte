<script lang="ts">
  import { Modal, Button } from '$components';

  interface Props {
    open: boolean;
    title: string;
    description: string;
    itemName: string;
    confirmLabel?: string;
    warningMessage: string;
    isLoading: boolean;
    onclose: () => void;
    onconfirm: () => void;
  }

  const {
    open,
    title,
    description,
    itemName,
    confirmLabel = 'Delete',
    warningMessage,
    isLoading,
    onclose,
    onconfirm,
  }: Props = $props();
</script>

<Modal {open} {title} {description} {onclose}>
  <p class="text-text-secondary">
    Are you sure you want to {confirmLabel.toLowerCase()}
    <strong class="text-text-primary">{itemName}</strong>?
    {warningMessage}
  </p>

  {#snippet footer()}
    <Button variant="ghost" onclick={onclose}>Cancel</Button>
    <Button variant="danger" onclick={onconfirm} loading={isLoading}>{confirmLabel}</Button>
  {/snippet}
</Modal>

