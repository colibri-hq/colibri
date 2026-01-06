<script lang="ts">
  import type { Snippet } from 'svelte';
  import FileDropzone from 'svelte-file-dropzone';
  import { twMerge } from 'tailwind-merge';
  import Icon from '../Icon/Icon.svelte';

  interface FileRejection {
    file: File;
    errors: Array<{ code: string; message: string }>;
  }

  interface DropEvent {
    detail: {
      acceptedFiles: File[];
      fileRejections: FileRejection[];
    };
  }

  interface Props {
    /**
     * Currently selected file(s).
     */
    files?: File[];

    /**
     * Additional class names for the dropzone container.
     */
    class?: string;

    /**
     * Accepted file types (MIME types or extensions).
     * @example "image/*" or ".pdf,.doc"
     */
    accept?: string;

    /**
     * Whether to allow multiple file selection.
     * @default false
     */
    multiple?: boolean;

    /**
     * Whether the dropzone is disabled.
     * @default false
     */
    disabled?: boolean;

    /**
     * Custom placeholder content.
     */
    placeholder?: Snippet;

    /**
     * Icon to display in the placeholder.
     * @default 'upload_file'
     */
    icon?: string;

    /**
     * Text to display in the placeholder.
     * @default 'Drag a file here, or click to select'
     */
    placeholderText?: string;

    /**
     * Called when files are selected.
     */
    onFilesSelect?: (files: File[]) => void;

    /**
     * Called when files are rejected.
     */
    onFilesReject?: (rejections: FileRejection[]) => void;
  }

  let {
    files = $bindable([]),
    class: className = '',
    accept,
    multiple = false,
    disabled = false,
    placeholder,
    icon = 'upload_file',
    placeholderText = 'Drag a file here, or click to select',
    onFilesSelect,
    onFilesReject,
  }: Props = $props();

  let draggedOver = $state(false);

  function handleDrop(event: DropEvent) {
    draggedOver = false;
    const { acceptedFiles, fileRejections } = event.detail;

    if (fileRejections.length > 0) {
      onFilesReject?.(fileRejections);
      return;
    }

    if (acceptedFiles.length > 0) {
      files = multiple ? [...files, ...acceptedFiles] : acceptedFiles;
      onFilesSelect?.(acceptedFiles);
    }
  }

  function handleDragOver() {
    draggedOver = true;
  }

  function handleDragLeave() {
    draggedOver = false;
  }

  const containerClasses = $derived(
    twMerge(
      'flex w-full flex-col',
      className,
    ),
  );

  const dropzoneClasses = $derived(
    twMerge(
      'flex h-full min-h-32 items-center justify-center rounded-lg border-2 border-dashed p-4',
      'transition-colors duration-200',
      disabled
        ? 'cursor-not-allowed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
        : 'cursor-pointer border-gray-300 bg-white hover:border-gray-400 dark:border-gray-600 dark:bg-gray-950 dark:hover:border-gray-500',
      draggedOver && !disabled && 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950',
    ),
  );
</script>

<div class={containerClasses}>
  <FileDropzone
    {accept}
    containerClasses={dropzoneClasses}
    {disabled}
    {multiple}
    on:dragleave={handleDragLeave}
    on:dragover={handleDragOver}
    on:drop={handleDrop}
  >
    {#if placeholder}
      {@render placeholder()}
    {:else}
      <div class="flex flex-col items-center gap-2 text-center">
        <Icon
          class={twMerge(
            'text-3xl',
            disabled ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500',
            draggedOver && !disabled && 'text-blue-500 dark:text-blue-400',
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
  </FileDropzone>
</div>
