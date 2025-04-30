<script lang="ts">
  import { run } from 'svelte/legacy';

  import type { SubmitFunction } from '$app/forms';
  import { enhance } from '$app/forms';
  import AuthorInput from '$lib/components/Form/AuthorInput.svelte';
  import { Button } from '@colibri-hq/ui';
  import { Field } from '@colibri-hq/ui';
  import ImageInput from '$lib/components/Form/ImageInput.svelte';
  import PublisherInput from '$lib/components/Form/PublisherInput.svelte';
  import { Icon } from '@colibri-hq/ui';
  import { encodeImageToBlurHash } from '@colibri-hq/shared';
  import type { FileResponse } from '$lib/workers/epub.worker';
  import type {
    BlurhashRequest,
    BlurhashResponse,
  } from '$lib/workers/image.worker';
  import { workerOperation } from '$lib/workers/workers';
  import { Editor } from 'bytemd';
  import 'bytemd/dist/index.css';
  import { createEventDispatcher, tick } from 'svelte';
  import Turndown from 'turndown';

  interface Props {
    file: File;
    cover: File | undefined;
    data: FileResponse['metadata'];
  }

  let { file, cover, data }: Props = $props();

  let loading: boolean = $state(false);
  let fileInput: HTMLInputElement = $state();

  type KnownProperty = keyof typeof data;
  type MetadataEntries = [KnownProperty, string][];
  let author: string = $state();
  let authorName: string = $state();
  let description: string = $state();
  let doi: string;
  let isbn: string = $state();
  let jdcn: string;
  let language: string = $state();
  let publisher: string = $state();
  let publisherName: string = $state();
  let publishingDate: Date = $state();
  let rights: string = $state();
  let title: string = $state();
  let uuid: string;
  let metadata: [string, string][] = $state([]);
  let coverFile: File | undefined = $state(undefined);
  let coverHash: string | undefined = $state(undefined);
  let coverWidth: number | undefined = $state(undefined);
  let coverHeight: number | undefined = $state(undefined);

  const turndown = new Turndown();

  const dispatch = createEventDispatcher<{
    submit: never;
    cancel: never;
  }>();

  function removeMetaProperty<
    A extends MetadataEntries,
    K extends A[number][0],
    T extends K,
  >(data: A, property: T) {
    type NotT<E extends [K]> = Exclude<(typeof E)[0], T>;

    return data.filter(
      (entry): entry is [NotT<typeof entry>, string] => entry[0] !== property,
    );
  }

  async function init() {
    // Known book metadata properties
    authorName = data.author;
    description = parseDescription(data.description);
    doi = data.doi;
    isbn = data.isbn;
    jdcn = data.jdcn;
    language = data.language;
    publisherName = data.publisher || '';
    publishingDate = data.date;
    rights = data.rights || '';
    title = data.title;
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
      (pair): pair is [string, string] => !knownProperties.includes(pair[0]),
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

    return encodeImageToBlurHash(coverFile, canvasNode.getContext('2d'));
  }

  async function encodeBlurhashInWorker(
    data: ArrayBuffer,
    canvas: OffscreenCanvas,
  ): Promise<string> {
    const { hash } = await workerOperation<BlurhashRequest, BlurhashResponse>(
      import('$lib/workers/image.worker?worker'),
      'blurhash',
      { data, canvas },
      [data, canvas],
    );

    return hash;
  }

  run(() => {
    if (file) {
      init();
    }
  });

  run(() => {
    if (file && fileInput) {
      const container = new DataTransfer();
      container.items.add(file);
      fileInput.files = container.files;
    }
  });

  const submit: SubmitFunction = () => {
    dispatch('submit');

    return ({ update }) => update();
  };

  function cancel() {
    dispatch('cancel');
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
        <input name="authorName" type="hidden" value={authorName} />
      </dd>

      <dt class="mr-2 font-bold">Publisher</dt>
      <dd>
        <PublisherInput
          bind:value={publisher}
          name="publisher"
          query={publisherName}
        />
        <input name="publisherName" type="hidden" value={publisherName} />
      </dd>

      <dt class="mr-2 font-bold">Description</dt>
      <dd>
        <Field name="description">
          {#snippet control()}
            <div class="contents">
              <input type="hidden" name="description" value={description} />
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
              <input type="hidden" name="rights" value={rights} />
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
      <input name="coverHash" type="hidden" value={coverHash} />
      <input name="coverWidth" type="hidden" value={coverWidth} />
      <input name="coverHeight" type="hidden" value={coverHeight} />
      <ImageInput
        accept="*/*"
        bind:value={coverFile}
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
