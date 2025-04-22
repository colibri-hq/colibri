<script lang="ts">
  import { run } from 'svelte/legacy';

  import Dropzone from '$lib/components/Form/Dropzone.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import BookDataForm from '$lib/components/Upload/BookDataForm.svelte';
  import type { WebWorker, WorkerMessage } from '$lib/workers/workers';
  import { loadWorker } from '$lib/workers/workers';
  import { onDestroy, onMount } from 'svelte';

  type FileRequestMessage = {
    content: string;
  };
  type FileResponse = {
    status: boolean;
    metadata: Record<string, string>;
    cover: string;
  };

  interface Props {
    open?: boolean;
    file?: File | undefined;
  }

  let { open = $bindable(false), file = $bindable(undefined) }: Props =
    $props();

  let worker:
    | WebWorker<
        WorkerMessage<'epub', FileRequestMessage>,
        WorkerMessage<'epub', FileResponse>
      >
    | undefined;
  let metadata: Record<string, string> | undefined = $state(undefined);
  let cover: string | undefined = $state(undefined);
  let loading: boolean = $state(false);

  async function processBook() {
    console.log('processing book');
    loading = true;

    if (!file) {
      return;
    }

    const payload: Omit<FileRequestMessage['payload'], 'content'> = {
      lastModified: new Date(file.lastModified),
      name: file.name,
      size: file.size,
      type: file.type,
    };

    // Safari is unable to transfer streams, despite the standards allowing this
    const content =
      'safari' in window ? await file.arrayBuffer() : file.stream();

    // noinspection TypeScriptValidateTypes
    return worker?.postMessage(
      {
        type: 'epub',
        payload: { ...payload, content },
      } as FileRequestMessage,
      [content],
    );
  }

  onMount(async () => {
    worker = await loadWorker<
      WorkerMessage<'epub', FileRequestMessage>,
      WorkerMessage<'epub', FileResponse>
    >(import('$lib/workers/epub.worker?worker'));

    worker.onmessage = async ({ data }) =>
      handleWorkerMessage(data.type, data.payload);
  });

  onDestroy(() => worker?.terminate());

  async function handleWorkerMessage(type: string, payload: FileResponse) {
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

  run(() => {
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
      <Dropzone accept="application/epub+zip" bind:file on:load={processBook}>
        {#snippet placeholder()}
          <span class="text-gray-500"
            >Drag a book here, or click to select one</span
          >
        {/snippet}
      </Dropzone>
    {:else if loading}
      <div class="flex h-full items-center justify-center">
        <span class="text-xl text-gray-500">
          Hang tight, your book is being analyzed…
        </span>
      </div>
    {:else if !loading && metadata}
      <BookDataForm
        bind:file
        bind:cover
        bind:data={metadata}
        on:submit={reset}
        on:cancel={close}
      />
    {/if}
  </div>
</Modal>
