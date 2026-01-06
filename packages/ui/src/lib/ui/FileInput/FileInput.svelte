<script lang="ts">
  import type { Snippet } from 'svelte';
  import { twMerge } from 'tailwind-merge';
  import Dropzone from '../Dropzone/Dropzone.svelte';
  import Icon from '../Icon/Icon.svelte';

  interface Props {
    /**
     * Currently selected file.
     */
    file?: File | null;

    /**
     * Additional class names for the container.
     */
    class?: string;

    /**
     * Content of the field label.
     */
    label?: string | Snippet;

    /**
     * Optional hint text to display below the field.
     */
    hint?: string | Snippet;

    /**
     * Optional error message to display below the field.
     */
    error?: string | Snippet;

    /**
     * The name attribute for form submission.
     */
    name?: string;

    /**
     * Accepted file types (MIME types or extensions).
     */
    accept?: string;

    /**
     * Whether the input is disabled.
     */
    disabled?: boolean;

    /**
     * Whether the input is required.
     */
    required?: boolean;

    /**
     * Custom placeholder content for the dropzone.
     * @deprecated Use the default dropzone placeholder instead.
     */
    _placeholder?: Snippet;

    /**
     * Icon to display in the placeholder.
     */
    icon?: string;

    /**
     * Text to display in the placeholder.
     */
    placeholderText?: string;

    /**
     * Called when a file is selected.
     */
    onFileSelect?: (file: File) => void;

    /**
     * Called when the file is cleared.
     */
    onClear?: () => void;
  }

  let {
    file = $bindable(null),
    class: className = '',
    label,
    hint,
    error,
    name = 'file',
    accept,
    disabled = false,
    required = false,
    _placeholder,
    icon = 'upload_file',
    placeholderText = 'Drag a file here, or click to select',
    onFileSelect,
    onClear,
  }: Props = $props();

  let inputElement = $state<HTMLInputElement | null>(null);
  let files = $state<File[]>([]);

  // Sync file to files array
  $effect(() => {
    if (file) {
      files = [file];
    } else {
      files = [];
    }
  });

  // Sync files array back to file
  function handleFilesSelect(selectedFiles: File[]) {
    const selectedFile = selectedFiles[0];
    if (selectedFile) {
      file = selectedFile;
      onFileSelect?.(selectedFile);

      // Update the hidden input element
      if (inputElement) {
        const container = new DataTransfer();
        container.items.add(selectedFile);
        inputElement.files = container.files;
      }
    }
  }

  function clear() {
    file = null;
    files = [];
    if (inputElement) {
      inputElement.value = '';
    }
    onClear?.();
  }

  const containerClasses = $derived(
    twMerge('flex flex-col gap-1', className),
  );
</script>

<div class={containerClasses}>
  {#if label}
    <div class="flex items-center justify-between px-1">
      {#if typeof label === 'string'}
        <label class="text-sm text-gray-600 dark:text-gray-400">
          {label}
          {#if required}
            <span class="text-red-500">*</span>
          {/if}
        </label>
      {:else}
        {@render label()}
      {/if}
    </div>
  {/if}

  <div class="relative">
    <input bind:this={inputElement} {accept} class="hidden" {name} type="file" />

    <Dropzone
      bind:files
      {accept}
      {disabled}
      {icon}
      onFilesSelect={handleFilesSelect}
      {placeholderText}
    >
      {#snippet placeholder()}
        {#if placeholder}
          {@render placeholder()}
        {:else if file}
          <div class="flex items-center gap-3 py-2">
            <Icon class="text-2xl text-gray-400" name="description" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                {file.name}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        {:else}
          <div class="flex flex-col items-center gap-2 text-center">
            <Icon
              class={twMerge(
                'text-3xl',
                disabled ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500',
              )}
              name={icon}
            />
            <span
              class={twMerge(
                'text-sm',
                disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400',
              )}
            >
              {placeholderText}
            </span>
          </div>
        {/if}
      {/snippet}
    </Dropzone>

    {#if file && !disabled}
      <button
        class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200
          text-gray-600 transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        onclick={clear}
        title="Remove file"
        type="button"
      >
        <Icon class="text-sm" name="close" />
      </button>
    {/if}
  </div>

  {#if hint || error}
    <div class="px-1 text-xs">
      {#if typeof error === 'string'}
        <span class="text-red-600 dark:text-red-400">{error}</span>
      {:else if error}
        {@render error()}
      {:else if typeof hint === 'string'}
        <span class="text-gray-500 dark:text-gray-400">{hint}</span>
      {:else if hint}
        {@render hint()}
      {/if}
    </div>
  {/if}
</div>
