<script lang="ts">
  import Dropzone from 'svelte-file-dropzone';

  let disabled: boolean = false;
  let draggedOver: boolean = $state(false);

  interface Props {
    class?: string;
    accept?: string | undefined;
    multiple?: boolean;
    file?: File | undefined;
    placeholder?: import('svelte').Snippet;
    onLoad?: (event: { file: File }) => unknown;
  }

  let {
    class: className = '',
    accept = undefined,
    multiple = false,
    file = $bindable(undefined),
    placeholder,
    onLoad,
  }: Props = $props();

  function handleFilesSelect(event: DragEvent) {
    const { acceptedFiles, fileRejections } = event.detail;

    if (fileRejections.length > 0) {
      const { code, message } = fileRejections[0].errors[0];

      // TODO: Show a message to users
      console.error(`Invalid file (${code}): ${message}`);
      return;
    }

    if (acceptedFiles.length > 0) {
      file = acceptedFiles[0];
      onLoad?.({ file: file as File });
    }
  }

  function handleDragOver() {
    draggedOver = true;
  }

  function handleDragLeave() {
    draggedOver = false;
  }
</script>

<div
  class="{className || ''} dropzone-container flex w-full grow flex-col"
  class:ghost={draggedOver}
>
  <Dropzone
    {accept}
    containerClasses="book-upload-dropzone"
    {disabled}
    {multiple}
    on:dragleave={handleDragLeave}
    on:dragover={handleDragOver}
    on:drop={handleFilesSelect}
  >
    {#if placeholder}{@render placeholder()}{:else}
      <span class="text-gray-500">Drag a file here, or click to select one</span
      >
    {/if}
  </Dropzone>
</div>

<style>
  @reference "../../../style.css";

  .dropzone-container {
    & > :global(.book-upload-dropzone) {
      @apply flex h-full items-center justify-center rounded-lg border-2 border-dashed border-gray-100 bg-white p-0 dark:border-gray-700 dark:bg-black;
    }

    &.ghost > :global(.book-upload-dropzone) {
      @apply border-blue-500 bg-blue-50 dark:bg-blue-900;
    }
  }
</style>
