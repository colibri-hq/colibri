<script lang="ts">
  import { preventDefault } from 'svelte/legacy';

  import QueueStatusWidget from '$lib/components/Upload/QueueStatusWidget.svelte';
  import { queue, resume, supportedUploadFormats, upload } from '$lib/uploads';
  import { onMount } from 'svelte';

  const allowedMimeTypes = supportedUploadFormats.flatMap((format) =>
    Array.from(new Set(Object.keys(format.accept))),
  );

  let showDragOverlay = $state(false);
  let pendingUploads = $derived($queue.length > 0);

  onMount(() => {
    if (pendingUploads) {
      resume();
    }
  });

  function handleDragEnter(event: DragEvent) {
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }

    showDragOverlay = true;
  }

  async function handleDrop(event: DragEvent) {
    showDragOverlay = false;

    if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0) {
      return;
    }

    const files = Array.from(event.dataTransfer.files)

      // Remove obviously invalid file types to avoid unnecessary work. If the type cannot be
      // inferred by the browser, it will be an empty string; in these cases, we defer the decision
      // to the worker to avoid blocking the main thread.
      .filter(({ type }) => !type || allowedMimeTypes.includes(type));

    // TODO: Show some kind of notification if no valid files are uploaded
    console.log('Uploading files', { files });

    if (files.length > 0) {
      await upload(files);
    }
  }

  function handleDragLeave(
    event: DragEvent & { fromElement?: HTMLElement | null },
  ) {
    if (event.fromElement !== null) {
      return;
    }

    event.stopPropagation();
    showDragOverlay = false;
  }

  function continueDragging(event: DragEvent) {
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }
</script>

<svelte:window
  ondragenter={handleDragEnter}
  ondragexit={handleDragLeave}
  ondragleave={handleDragLeave}
  ondragover={preventDefault(continueDragging)}
  ondrop={preventDefault(handleDrop)}
/>

<div
  class="fixed left-0 top-0 z-50 flex h-full w-full bg-blue-500/25 p-8
     backdrop-blur-xl backdrop-saturate-200 transition"
  class:opacity-0={!showDragOverlay}
  class:opacity-100={showDragOverlay}
  class:pointer-events-none={!showDragOverlay}
  id="drag-overlay"
>
  <div
    class="flex h-full w-full animate-breathe items-center justify-center rounded-3xl border-4
    border-dashed border-white"
  >
    <span class="text-3xl text-white drop-shadow-md"
      >Drop books here to upload</span
    >
  </div>
</div>

{#if pendingUploads}
  <QueueStatusWidget />
{/if}
