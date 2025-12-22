<script lang="ts">
  import { Modal, Input, Button, Icon } from '$components';
  import { formatFileSize, FILE_CONSTANTS } from '$crypto';

  interface Props {
    open: boolean;
    isLoading: boolean;
    onclose: () => void;
    onsubmit: (file: File, title: string) => void;
  }

  const { open, isLoading, onclose, onsubmit }: Props = $props();

  let selectedFile = $state<File | null>(null);
  let title = $state('');
  let dragActive = $state(false);
  let fileInputRef = $state<HTMLInputElement | null>(null);

  const maxFileSize = FILE_CONSTANTS.MAX_FILE_SIZE;
  const maxFileSizeFormatted = formatFileSize(maxFileSize);

  const fileSizeError: string | null = $derived.by(() => {
    if (selectedFile !== null && selectedFile.size > maxFileSize) {
      return `File size exceeds maximum (${maxFileSizeFormatted})`;
    }
    return null;
  });

  const canSubmit = $derived(selectedFile !== null && fileSizeError === null && !isLoading);

  function handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      const file = files.item(0);
      if (file) {
        selectedFile = file;
        if (title === '') {
          title = file.name;
        }
      }
    }
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    dragActive = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files.item(0);
      if (file) {
        selectedFile = file;
        if (title === '') {
          title = file.name;
        }
      }
    }
  }

  function handleDragOver(event: DragEvent): void {
    event.preventDefault();
    dragActive = true;
  }

  function handleDragLeave(): void {
    dragActive = false;
  }

  function handleSubmit(): void {
    if (selectedFile !== null && canSubmit) {
      onsubmit(selectedFile, title !== '' ? title : selectedFile.name);
    }
  }

  function handleClose(): void {
    selectedFile = null;
    title = '';
    dragActive = false;
    onclose();
  }

  function openFilePicker(): void {
    fileInputRef?.click();
  }

  function clearFile(): void {
    selectedFile = null;
    title = '';
    if (fileInputRef) {
      fileInputRef.value = '';
    }
  }

  function handleTitleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    title = target.value;
  }
</script>

<Modal
  {open}
  title="Upload File"
  description="Encrypt and store a file in your vault"
  onclose={handleClose}
>
  <div class="space-y-4">
    <!-- File drop zone -->
    <div
      class="relative rounded-lg border-2 border-dashed p-6 text-center transition-colors
        {dragActive
        ? 'border-primary-500 bg-primary-500/10'
        : 'border-border hover:border-text-muted'}"
      role="button"
      tabindex="0"
      ondrop={handleDrop}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      onclick={openFilePicker}
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          openFilePicker();
        }
      }}
    >
      <input
        bind:this={fileInputRef}
        type="file"
        class="hidden"
        onchange={handleFileSelect}
        aria-label="Select file"
      />

      {#if selectedFile}
        <div class="flex flex-col items-center gap-2">
          <div class="bg-primary-500/10 flex h-12 w-12 items-center justify-center rounded-lg">
            <Icon name="file" size={24} class="text-primary-400" />
          </div>
          <div class="text-text-primary font-medium">{selectedFile.name}</div>
          <div class="text-text-muted text-sm">{formatFileSize(selectedFile.size)}</div>
          {#if fileSizeError}
            <div class="text-error-400 text-sm">{fileSizeError}</div>
          {/if}
          <button
            type="button"
            class="text-text-muted hover:text-text-secondary mt-2 text-sm underline"
            onclick={(e: MouseEvent) => {
              e.stopPropagation();
              clearFile();
            }}
          >
            Choose different file
          </button>
        </div>
      {:else}
        <div class="flex flex-col items-center gap-2">
          <div class="bg-surface flex h-12 w-12 items-center justify-center rounded-lg">
            <Icon name="upload" size={24} class="text-text-muted" />
          </div>
          <div class="text-text-secondary">
            <span class="text-primary-400 font-medium">Click to upload</span> or drag and drop
          </div>
          <div class="text-text-muted text-sm">Maximum file size: {maxFileSizeFormatted}</div>
        </div>
      {/if}
    </div>

    <!-- Title input -->
    {#if selectedFile}
      <div>
        <label for="file-title" class="text-text-secondary mb-1.5 block text-sm font-medium">
          Title (optional)
        </label>
        <Input
          id="file-title"
          placeholder="Enter a title for this file"
          value={title}
          oninput={handleTitleInput}
        />
        <p class="text-text-muted mt-1 text-xs">Leave empty to use the filename</p>
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <Button variant="ghost" onclick={handleClose}>Cancel</Button>
    <Button variant="primary" onclick={handleSubmit} loading={isLoading} disabled={!canSubmit}>
      <Icon name="upload" size={16} />
      Upload & Encrypt
    </Button>
  {/snippet}
</Modal>
