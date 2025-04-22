<script lang="ts">
    import { Icon } from '@colibri-hq/ui';
  import Book from '$lib/components/Links/BookLink.svelte';
  import type { PageData } from './$types';
  import MarkdownContent from '$lib/components/MarkdownContent.svelte';
  import CreatorLink from '$lib/components/Links/CreatorLink.svelte';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let publisher = $derived(data.publisher);
  let books = $derived(data.books);
  let creators = $derived(data.creators);

  let publisherInfoLoading: boolean = false;
</script>

<div class="mx-auto flex w-full max-w-6xl px-8 py-16">
  <article class="grow space-y-12">
    <header
      class="grid grid-cols-[max-content_auto] grid-rows-[min-content_1fr] gap-x-8 gap-y-4"
    >
      <div
        class="row-span-2 flex h-32 w-32 items-center justify-center rounded-full border
        border-gray-200 bg-gray-100 object-cover shadow-lg
        dark:border-gray-800 dark:bg-gray-700"
      >
        {#if publisher.image}
          <img
            src={publisher.image}
            alt="Picture representing publisher {publisher.name}"
            class="h-full w-full"
          />
        {:else}
          <div class="flex items-center justify-center">
            <Icon name="domain" class="text-4xl text-gray-500" />
          </div>
        {/if}
      </div>

      <h1 class="font-serif text-4xl font-bold">{publisher.name}</h1>

      {#if publisher.description}
        <div>
          <MarkdownContent
            class="text-lg text-gray-700 dark:text-gray-300"
            source={publisher.description}
          />
          {#if publisher.wikipedia_url}
            <a
              target="_blank"
              href={publisher.wikipedia_url}
              class="text-blue-500 underline"
            >
              Wikipedia
            </a>
          {/if}
        </div>
      {:else}
        <div
          class="flex cursor-pointer select-none items-center self-start text-sm text-blue-500"
        >
          <div class="mr-1">
            {#if publisherInfoLoading}
              <Icon name="sync" class="text-lg" />
            {:else}
              <Icon name="lightbulb" class="text-lg" />
            {/if}
          </div>

          <span class="text-blue-500 underline">
            It seems like there is no information available on this publisher
            yet. Search the web
          </span>
        </div>
      {/if}
    </header>

    <section>
      <header class="mb-4">
        <h2 class="font-serif text-2xl font-medium">Published Authors</h2>
      </header>

      {#await creators}
        <span>Loading...</span>
      {:then creators}
        {#if creators.length === 0}
          <p>No authors found.</p>
        {:else}
          <ul class="grid grid-cols-3 gap-4">
            {#each creators as creator}
              <li class="contents">
                <CreatorLink {creator} />
              </li>
            {/each}
          </ul>
        {/if}
      {/await}
    </section>

    <section>
      <header class="mb-4">
        <h2 class="font-serif text-2xl font-medium">Published Works</h2>
      </header>

      {#await books}
        <span>Loading...</span>
      {:then books}
        <ul class="grid grid-cols-2 gap-8 md:grid-cols-4 xl:grid-cols-6">
          {#each books as book}
            <li class="contents">
              <Book {book} />
            </li>
          {/each}
        </ul>
      {/await}
    </section>
  </article>
</div>
