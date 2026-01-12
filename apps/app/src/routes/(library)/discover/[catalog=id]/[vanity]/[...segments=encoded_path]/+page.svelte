<script lang="ts" module>
  import type { PageData } from './$types';

  export type Feed = Awaited<PageData['feed']>;
  export type Category = Feed['categories'][number];
  export type Entry = Feed['entries'][number];
</script>

<script lang="ts">
  import CategoryItem, { type NavigateEventDetail } from './Category.svelte';
  import LoadingSpinner from '$lib/LoadingSpinner.svelte';
  import { fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { encodeBreadcrumbs } from './breadcrumbs';
  import Breadcrumbs from './Breadcrumbs.svelte';
  import EntryItem from './Entry.svelte';
  import { Icon } from '@colibri-hq/ui';

  import type { PageProps } from './$types';
  import { resolve } from '$app/paths';

  let { data }: PageProps = $props();

  const transition = { duration: 100 };

  let catalog = $derived(data.catalog);
  let feed = $derived(data.feed);
  let breadcrumbs = $derived(data.breadcrumbs);

  function showCategory({ link, title }: NavigateEventDetail) {
    const encoded = encodeBreadcrumbs([link, title ?? '']);
    // @ts-expect-error page.url is always defined in a page component
    const newUrl = resolve(`${page.url.pathname}/${encoded}`);

    return goto(newUrl);
  }
</script>

<article>
  <header class="mb-8">
    <h1 class="font-serif text-3xl font-bold">{catalog.title}</h1>
    <p class="mt-1 text-sm text-gray-700">{catalog.description}</p>

    <Breadcrumbs items={breadcrumbs} />
  </header>

  {#await feed}
    <div
      class="flex items-center justify-center"
      in:fade={transition}
      out:fade={transition}
    >
      <LoadingSpinner class="my-16" />
    </div>
  {:then feed}
    <div in:fade={{ delay: 10, ...transition }} out:fade={transition}>
      <nav>
        <ul class="grid grid-cols-2 gap-4">
          {#each feed.categories as entry, index (index)}
            <li>
              <CategoryItem {entry} onnavigate={showCategory} />
            </li>
          {/each}
        </ul>
      </nav>

      <section>
        <ul class="columns-2 gap-4">
          {#each feed.entries as entry, index (index)}
            <li class="py-2">
              <EntryItem {entry} />
            </li>
          {/each}
        </ul>

        {#if feed.entries.length + feed.categories.length === 0}
          <div
            class="rounded-xl bg-blue-50 p-4 text-blue-950 shadow-lg ring shadow-blue-500/10 ring-blue-100"
          >
            <strong class="inline-flex items-center text-lg font-semibold">
              <Icon name="info" class="mr-2 text-blue-500" weight={800} />
              <span>No entries found</span>
            </strong>
            <p>
              There are no entries in this catalog. Try another catalog or check
              back later.
            </p>
          </div>
        {/if}
      </section>
    </div>
  {:catch error}
    <div
      class="rounded-xl bg-red-50 p-4 text-red-950 shadow-lg ring shadow-red-500/10 ring-red-200"
    >
      <strong class="inline-flex items-center text-lg font-semibold">
        <Icon name="error" class="mr-2 text-red-500" weight={800} />
        Something went wrong
      </strong>
      <p>
        It seems like something went wrong trying to load this catalog. Please
        try again later.
      </p>

      <details class="mt-4">
        <summary class="cursor-pointer">View technical details</summary>
        <strong class="font-semibold">{error.message}</strong>
        <pre
          class="mt-2 overflow-x-auto rounded-xl bg-red-100 p-4 text-sm shadow-inner-sm">{JSON.stringify(
          error,
          null,
          2,
        )}</pre>
      </details>
    </div>
  {/await}
</article>
