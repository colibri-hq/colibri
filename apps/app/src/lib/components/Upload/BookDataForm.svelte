<script lang="ts">
  import type { SubmitFunction } from '@sveltejs/kit';
  import { enhance } from '$app/forms';
  import AuthorInput from '$lib/components/Form/AuthorInput.svelte';
  import { Button, Field, Icon, ImageInput } from '@colibri-hq/ui';
  import PublisherInput from '$lib/components/Form/PublisherInput.svelte';
  import { encodeImageToBlurHash } from '@colibri-hq/shared';
  import type { BlurhashRequest, BlurhashResponse } from '$lib/workers/image.worker';
  import { workerOperation } from '$lib/workers/workers';
  import { Editor } from 'bytemd';
  import 'bytemd/dist/index.css';
  import { tick } from 'svelte';
  // @ts-expect-error - No type definitions available for turndown
  import Turndown from 'turndown';

  // Define types inline since epub.worker.ts is commented out
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

  interface Props {
    file: File;
    cover: CoverData | undefined;
    data: Metadata;
    onsubmit?: () => void;
    oncancel?: () => void;
  }

  let { file, cover, data, onsubmit, oncancel }: Props = $props();

  let loading: boolean = $state(false);
  let fileInput: HTMLInputElement | undefined = $state(undefined);

  type KnownProperty = keyof Metadata;
  type MetadataEntries = [KnownProperty, string][];
  let author: string | undefined = $state(undefined);
  let authorName: string = $state('');
  let description: string = $state('');
  let doi: string | undefined = $state(undefined);
  let isbn: string = $state('');
  let jdcn: string | undefined = $state(undefined);
  let language: string = $state('');
  let publisher: string | undefined = $state(undefined);
  let publisherName: string = $state('');
  let publishingDate: Date | undefined = $state(undefined);
  let rights: string = $state('');
  let title: string = $state('');
  let uuid: string | undefined = $state(undefined);
  let metadata: [string, string][] = $state([]);
  let coverFile: File | undefined = $state(undefined);
  let coverHash: string | undefined = $state(undefined);
  let coverWidth: number | undefined = $state(undefined);
  let coverHeight: number | undefined = $state(undefined);

  const turndown = new Turndown();

  function removeMetaProperty(
    data: [string, string][],
    property: string,
  ): [string, string][] {
    return data.filter((entry) => entry[0] !== property);
  }

  async function init() {
    // Known book metadata properties
    authorName = data.author ?? '';
    description = parseDescription(data.description);
    doi = data.doi;
    isbn = data.isbn ?? '';
    jdcn = data.jdcn;
    language = data.language ?? '';
    publisherName = data.publisher ?? '';
    publishingDate = data.date;
    rights = data.rights ?? '';
    title = data.title ?? '';
    uuid = data.uuid;

    const knownProperties: KnownProperty[] = [
      'author',
      'cover',
      'date',
      'description',
      'doi',
      'isbn',
      'jdcn',
      'language',
      'publisher',
      'rights',
      'title',
      'uuid',
    ];

    // ...everything else.
    metadata = Object.entries(data).filter(
      (pair): pair is [string, string] =>
        !knownProperties.includes(pair[0] as KnownProperty) &&
        typeof pair[1] === 'string'
    );

    loading = false;

    // Wait for the image element to be created in the DOM
    await tick();

    if (!cover) {
      return;
    }

    const { data: coverBuffer, type, width, height } = cover;

    coverFile = new File([coverBuffer], 'cover', { type });
    coverHash = await getCoverHash(coverFile, width, height);
    coverWidth = width;
    coverHeight = height;
  }

  function parseDescription(description: string | undefined): string {
    if (!description) {
      return '';
    }

    return turndown.turndown(description);
  }

  async function getCoverHash(
    coverFile: File,
    width: number,
    height: number,
  ): Promise<string> {
    const canvasNode = document.createElement('canvas');

    // Assigning the proper width is crucial to calculate the right hash
    canvasNode.width = width;
    canvasNode.height = height;

    // Try to encode the blurhash in a worker thread, if supported
    if (canvasNode.transferControlToOffscreen) {
      return encodeBlurhashInWorker(
        await coverFile.arrayBuffer(),
        canvasNode.transferControlToOffscreen(),
      );
    }

    const context = canvasNode.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D canvas context');
    }

    return encodeImageToBlurHash(coverFile, { width, height });
  }

  async function encodeBlurhashInWorker(
    data: ArrayBuffer,
    canvas: OffscreenCanvas,
  ): Promise<string> {
    const result = (await workerOperation(
      import('$lib/workers/image.worker?worker'),
      { type: 'blurhash', payload: { data, canvas } },
      [data, canvas],
    )) as BlurhashResponse;

    return result.hash;
  }

  $effect(() => {
    if (file) {
      init();
    }
  });

  $effect(() => {
    if (file && fileInput) {
      const container = new DataTransfer();
      container.items.add(file);
      fileInput.files = container.files;
    }
  });

  const submit: SubmitFunction = () => {
    onsubmit?.();

    return async ({ update }) => {
      await update();
    };
  };

  function cancel() {
    oncancel?.();
  }
</script>

<form action="/books/add" method="POST" use:enhance={submit}>
  <input bind:this={fileInput} class="hidden" name="file" type="file" />

  <div class="metadata flex flex-col md:grid md:grid-cols-5 md:gap-2">
    <dl
      class="col-span-3 mb-auto grid grid-cols-[max-content_auto] items-center gap-2"
    >
      <dt class="mr-2 font-bold">Title</dt>
      <dd>
        <Field name="title" required value={title || 'Unknown'} />
      </dd>

      <dt class="mr-2 font-bold">Author</dt>
      <dd>
        <AuthorInput
          bind:query={authorName}
          bind:value={author}
          name="author"
        />
        <input name="authorName" type="hidden" value={authorName || ''} />
      </dd>

      <dt class="mr-2 font-bold">Publisher</dt>
      <dd>
        <PublisherInput
          bind:value={publisher}
          name="publisher"
          query={publisherName}
        />
        <input name="publisherName" type="hidden" value={publisherName || ''} />
      </dd>

      <dt class="mr-2 font-bold">Description</dt>
      <dd>
        <Field name="description">
          {#snippet control()}
            <div class="contents">
              <input type="hidden" name="description" value={description || ''} />
              <Editor
                bind:value={description}
                on:change={(event) => (description = event.detail.value)}
                mode="tab"
              />
            </div>
          {/snippet}
        </Field>
      </dd>

      <dt class="mr-2 font-bold">Rights</dt>
      <dd>
        <Field name="rights">
          {#snippet control()}
            <div class="contents">
              <input type="hidden" name="rights" value={rights || ''} />
              <Editor
                bind:value={rights}
                on:change={(event) => (rights = event.detail.value)}
                mode="tab"
              />
            </div>
          {/snippet}
        </Field>
      </dd>

      <dt class="mr-2 font-bold">Publishing Date</dt>
      <dd>
        <Field
          name="publishingDate"
          type="date"
          value={publishingDate?.toISOString() || ''}
        />
      </dd>

      <dt class="mr-2 font-bold">Language</dt>
      <dd>
        <Field name="language" value={language || 'en'} />
      </dd>

      <dt class="mr-2 font-bold">ISBN</dt>
      <dd>
        <Field name="isbn" value={isbn || ''} />
      </dd>

      {#each metadata as [property, value]}
        <dt class="mr-2 font-bold">{property}</dt>
        <dd class="flex items-center">
          <Field class="grow" name="metadata[{property}]" value={value || ''}>
            <Button
              variant="subtle"
              icon
              class="order-3 ml-2"
              onClick={() =>
                (metadata = removeMetaProperty(metadata, property))}
            >
              <Icon name="do_not_disturb_on" />
            </Button>
          </Field>
        </dd>
      {/each}
    </dl>

    <div class="mt-8 md:col-span-2 md:mt-0">
      <input name="coverHash" type="hidden" value={coverHash ?? ''} />
      <input name="coverWidth" type="hidden" value={coverWidth ?? ''} />
      <input name="coverHeight" type="hidden" value={coverHeight ?? ''} />
      <ImageInput
        accept="*/*"
        bind:file={coverFile}
        label="Cover"
        name="cover"
      />
    </div>
  </div>

  <footer
    class="sticky -bottom-4 mt-8 flex w-full items-center bg-white pt-8 pb-8 md:static md:bottom-0 md:pb-0 dark:bg-gray-900"
  >
    <Button disabled={loading} label="Add to library" type="submit" />
    <Button
      class="ml-4"
      disabled={loading}
      label="Cancel"
      variant="subtle"
      onClick={cancel}
    />
  </footer>
</form>

<style lang="postcss">
</style>
