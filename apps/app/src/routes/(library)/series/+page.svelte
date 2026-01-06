<script lang="ts">
  import type { PageProps } from './$types';
  import PaginatedList from '$lib/components/Pagination/PaginatedList.svelte';
  import SeriesLink from '$lib/components/Links/SeriesLink.svelte';

  let { data }: PageProps = $props();
  let series = $derived(data.series);
</script>

<article>
  <header class="mb-4">
    <h1 class="font-serif text-3xl font-bold">Series</h1>
    <p class="mt-1 text-sm text-gray-500">
      Browse book series in your library. Series group related books in reading order.
    </p>
  </header>

  <PaginatedList data={series}>
    {#snippet children({ items })}
      {#if items.length === 0}
        <p class="text-gray-500">No series found in your library yet.</p>
      {:else}
        <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each items as seriesItem, index (index)}
            <li>
              <SeriesLink series={seriesItem} />
            </li>
          {/each}
        </ul>
      {/if}
    {/snippet}
  </PaginatedList>
</article>
