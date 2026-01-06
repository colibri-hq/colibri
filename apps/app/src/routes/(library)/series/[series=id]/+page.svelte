<script lang="ts">
  import type { PageProps } from './$types';
  import { Icon } from '@colibri-hq/ui';
  import WorkLink from '$lib/components/Links/WorkLink.svelte';

  let { data }: PageProps = $props();
  let series = $derived(data.series);
  let works = $derived(data.works);
</script>

<article>
  <header class="mb-8 grid grid-cols-[min-content_auto] grid-rows-[auto_1fr] gap-4">
    <div
      class="row-span-2 flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-blue-100 shadow dark:bg-blue-900/50"
    >
      <Icon name="library_books" class="text-4xl leading-none text-blue-600 dark:text-blue-400" />
    </div>
    <h1 class="font-serif text-3xl font-bold">{series.name ?? 'Unnamed Series'}</h1>
    <p class="text-sm text-gray-500">
      {#await works}
        Loading books...
      {:then worksList}
        {worksList.length} {worksList.length === 1 ? 'book' : 'books'} in this series
      {/await}
    </p>
  </header>

  <section>
    <header class="mb-4">
      <h2 class="text-2xl">Books in Series</h2>
    </header>

    {#await works}
      <p class="text-gray-500">Loading...</p>
    {:then worksList}
      {#if worksList.length === 0}
        <p class="text-gray-500">No books in this series yet.</p>
      {:else}
        <ul class="grid grid-cols-2 gap-8 md:grid-cols-4 xl:grid-cols-6">
          {#each worksList as work, index (index)}
            <li class="relative">
              {#if work.series_position}
                <span
                  class="absolute -top-2 -left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow"
                >
                  {work.series_position}
                </span>
              {/if}
              <WorkLink
                work={work.id?.toString() ?? ''}
                edition={work.main_edition_id?.toString() ?? ''}
                title={work.edition_title ?? 'Untitled'}
                blurhash={work.cover_blurhash}
              />
            </li>
          {/each}
        </ul>
      {/if}
    {/await}
  </section>
</article>
