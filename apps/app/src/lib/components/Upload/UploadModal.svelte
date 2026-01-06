<script lang="ts">
  import { Dropzone, Modal } from '@colibri-hq/ui';
  import BookDataForm from '$lib/components/Upload/BookDataForm.svelte';
  import type { WebWorker, WorkerMessage } from '$lib/workers/workers';
  import { loadWorker } from '$lib/workers/workers';
  import { onDestroy, onMount } from 'svelte';

  // Define types inline to match BookDataForm expectations
  interface CoverData {
    data: ArrayBuffer;
    type: string;
    width: number;
    height: number;
    hash?: string;
  }

  interface Metadata {
    author?: string;
    cover?: string;
    date?: Date;
    description?: string;
    doi?: string;
    isbn?: string;
    jdcn?: string;
    language?: string;
    publisher?: string;
    rights?: string;
    title?: string;
    uuid?: string;
    [key: string]: string | Date | undefined;
  }

  type FileRequestPayload = {
    lastModified: Date;
    name: string;
    size: number;
    type: string;
    content: ArrayBuffer | ReadableStream<Uint8Array>;
  };

  type FileResponsePayload = {
    status: boolean;
    metadata: Metadata;
    cover: CoverData;
  };

  interface Props {
    open?: boolean;
    file?: File | undefined;
  }

  let { open = $bindable(false), file = $bindable(undefined) }: Props =
    $props();

  let worker:
    | WebWorker<
        WorkerMessage<'epub', FileRequestPayload>,
        WorkerMessage<'epub', FileResponsePayload>
      >
    | undefined;
  let metadata: Metadata | undefined = $state(undefined);
  let cover: CoverData | undefined = $state(undefined);
  let loading: boolean = $state(false);

  async function processBook() {
    console.log('processing book');
    loading = true;

    if (!file) {
      return;
    }

    // Safari is unable to transfer streams, despite the standards allowing this
    const content =
      'safari' in window ? await file.arrayBuffer() : file.stream();

    const payload: FileRequestPayload = {
      lastModified: new Date(file.lastModified),
      name: file.name,
      size: file.size,
      type: file.type,
      content,
    };

    // Send message with proper WorkerMessage structure
    return worker?.postMessage(
      {
        type: 'epub',
        payload,
      },
      content instanceof ArrayBuffer ? [content] : [],
    );
  }

  onMount(async () => {
    worker = await loadWorker<
      WorkerMessage<'epub', FileRequestPayload>,
      WorkerMessage<'epub', FileResponsePayload>
    >(import('$lib/workers/epub.worker?worker'));

    worker.onmessage = async ({ data }) =>
      handleWorkerMessage(data.type, data.payload);
  });

  onDestroy(() => worker?.terminate());

  async function handleWorkerMessage(type: string, payload: FileResponsePayload) {
    switch (type) {
      case 'file':
        metadata = payload.metadata;
        cover = payload.cover;
        loading = false;
        break;

      default:
        console.log(`Unhandled message type ${type}`);
    }
  }

  function reset() {
    file = undefined;
    metadata = undefined;
    cover = undefined;
    loading = false;
    open = false;
  }

  function close() {
    open = false;
  }

  let fileChangeTriggered = $state(false);

  $effect(() => {
    if (!fileChangeTriggered && file && !loading) {
      fileChangeTriggered = true;
      processBook();
    }
  });
</script>

<Modal bind:open>
  {#snippet header()}
    <div>
      <h1 class="mb-8 text-4xl font-bold text-black md:mb-4 dark:text-gray-300">
        Add new book
      </h1>
    </div>
  {/snippet}

  <div
    class="relative flex h-full min-h-[70vh] w-screen max-w-full grow flex-col md:min-h-[60vh]"
  >
    {#if !file}
      <Dropzone
        accept="application/epub+zip"
        onFilesSelect={(files) => {
          if (files.length > 0 && files[0]) {
            file = files[0];
            processBook();
          }
        }}
        placeholderText="Drag a book here, or click to select one"
      />
    {:else if loading}
      <div class="flex h-full items-center justify-center">
        <span class="text-xl text-gray-500">
          Hang tight, your book is being analyzed…
        </span>
      </div>
    {:else if !loading && metadata && file}
      <BookDataForm
        {file}
        {cover}
        data={metadata}
        onsubmit={reset}
        oncancel={close}
      />
    {/if}
  </div>
</Modal>
