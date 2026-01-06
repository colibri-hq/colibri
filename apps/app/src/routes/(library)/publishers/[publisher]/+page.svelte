<script lang="ts">
  import { Icon, Markdown } from '@colibri-hq/ui';
  import WorkLink from '$lib/components/Links/WorkLink.svelte';
  import type { PageProps } from './$types';
  import CreatorLink from '$lib/components/Links/CreatorLink.svelte';

  let { data }: PageProps = $props();
  let publisher = $derived(data.publisher);
  let works = $derived(data.works);
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
        {#if publisher.image_id}
          <img
            src="/publishers/{publisher.id}/picture"
            alt="Picture representing publisher {publisher.name}"
            class="h-full w-full rounded-full object-cover"
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
          <Markdown
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
          class="flex cursor-pointer items-center self-start text-sm text-blue-500 select-none"
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
            {#each creators as creator, index (index)}
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

      {#await works}
        <span>Loading...</span>
      {:then works}
        <ul class="grid grid-cols-2 gap-8 md:grid-cols-4 xl:grid-cols-6">
          {#each works as work, index (index)}
            <li class="contents">
              <WorkLink
                work={work.work_id ?? work.id}
                title={work.title ?? 'Untitled'}
                edition={work.main_edition_id ?? work.id}
                blurhash={work.cover_blurhash}
              />
            </li>
          {/each}
        </ul>
      {/await}
    </section>
  </article>
</div>
