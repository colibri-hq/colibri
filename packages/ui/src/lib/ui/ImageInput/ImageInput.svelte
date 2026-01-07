<script lang="ts">
  import type { Snippet } from 'svelte';
  import { twMerge } from 'tailwind-merge';
  import Dropzone from '../Dropzone/Dropzone.svelte';
  import Icon from '../Icon/Icon.svelte';

  interface Props {
    /**
     * Currently selected image file.
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
     * Accepted file types.
     * @default 'image/*'
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
     * Whether to show image dimensions in the label.
     * @default true
     */
    showDimensions?: boolean;

    /**
     * Called when an image is selected.
     */
    onImageSelect?: (file: File) => void;

    /**
     * Called when the image is cleared.
     */
    onClear?: () => void;
  }

  let {
    file = $bindable(null),
    class: className = '',
    label,
    hint,
    error,
    name = 'image',
    accept = 'image/*',
    disabled = false,
    required = false,
    showDimensions = true,
    onImageSelect,
    onClear,
  }: Props = $props();
  const id = $props.id();

  let inputElement = $state<HTMLInputElement | null>(null);
  let previewImage = $state<HTMLImageElement | null>(null);
  let previewUrl = $state<string | null>(null);
  let dimensions = $state<{ width: number; height: number } | null>(null);
  let files = $state<File[]>([]);

  // Generate preview URL when file changes
  $effect(() => {
    if (file instanceof File) {
      previewUrl = URL.createObjectURL(file);
      files = [file];

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        dimensions = { width: img.naturalWidth, height: img.naturalHeight };
      };
      img.src = previewUrl;
    } else {
      previewUrl = null;
      dimensions = null;
      files = [];
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  });

  function handleFilesSelect(selectedFiles: File[]) {
    const selectedFile = selectedFiles[0];
    if (selectedFile) {
      file = selectedFile;
      onImageSelect?.(selectedFile);

      // Update the hidden input element
      if (inputElement) {
        const container = new DataTransfer();
        container.items.add(selectedFile);
        inputElement.files = container.files;
      }
    }
  }

  function clear(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    file = null;
    previewUrl = null;
    dimensions = null;
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
  {#if label || (showDimensions && dimensions)}
    <div class="flex items-center justify-between px-1">
      {#if typeof label === 'string'}
        <label class="text-sm text-gray-600 dark:text-gray-400" for={id}>
          {label}
          {#if required}
            <span class="text-red-500">*</span>
          {/if}
        </label>
      {:else if label}
        {@render label()}
      {:else}
        <span></span>
      {/if}

      {#if showDimensions && dimensions}
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {dimensions.width}&thinsp;&times;&thinsp;{dimensions.height}
        </span>
      {/if}
    </div>
  {/if}

  <div class="relative">
    <input bind:this={inputElement} {accept} class="hidden" {name} {id} type="file" />

    <Dropzone
      bind:files
      {accept}
      {disabled}
      icon="image"
      onFilesSelect={handleFilesSelect}
      placeholderText="Drag an image here, or click to select"
    >
      {#snippet placeholder()}
        {#if previewUrl}
          <div class="w-full">
            <img
              bind:this={previewImage}
              alt="Preview of the selected file"
              class="h-auto w-full rounded-md object-contain"
              src={previewUrl}
            />
          </div>
        {:else}
          <div class="flex h-24 w-full flex-col items-center justify-center gap-2 text-center">
            <Icon
              class={twMerge(
                'text-3xl',
                disabled ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500',
              )}
              name="image"
            />
            <span
              class={twMerge(
                'text-sm',
                disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400',
              )}
            >
              Drag an image here, or click to select
            </span>
          </div>
        {/if}
      {/snippet}
    </Dropzone>

    {#if previewUrl && !disabled}
      <button
        class="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40
          text-white backdrop-blur-md transition hover:bg-black/60"
        onclick={clear}
        title="Remove image"
        type="button"
      >
        <Icon name="delete_forever" />
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
