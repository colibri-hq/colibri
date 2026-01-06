<script lang="ts">
  import QueueStatusWidget from '$lib/components/Upload/QueueStatusWidget.svelte';
  import { activeUploads, resume, supportedUploadFormats, upload } from '$lib/uploads';
  import { warning } from '$lib/notifications';
  import { onMount } from 'svelte';

  const allowedMimeTypes = supportedUploadFormats.flatMap((format) =>
    Array.from(new Set(Object.keys(format.accept))),
  );

  let showDragOverlay = $state(false);

  onMount(() => {
    // Resume any pending uploads from OPFS that weren't completed
    if ($activeUploads.some((upload) => upload.resumable)) {
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
    event.preventDefault();
    showDragOverlay = false;

    if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0) {
      return;
    }

    const files = Array.from(event.dataTransfer.files)

      // Remove obviously invalid file types to avoid unnecessary work. If the type cannot be
      // inferred by the browser, it will be an empty string; in these cases, we defer the decision
      // to the worker to avoid blocking the main thread.
      .filter(({ type }) => !type || allowedMimeTypes.includes(type));

    if (files.length === 0) {
      warning('No valid files', { message: 'Please upload EPUB, MOBI, or PDF files' });
      return;
    }

    await upload(files);
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
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }
</script>

<svelte:window
  ondragenter={handleDragEnter}
  ondragexit={handleDragLeave}
  ondragleave={handleDragLeave}
  ondragover={continueDragging}
  ondrop={handleDrop}
/>

<div
  class="fixed top-0 left-0 z-50 flex h-full w-full bg-blue-500/25 p-8
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

<!-- QueueStatusWidget handles its own visibility based on active uploads -->
<QueueStatusWidget />
