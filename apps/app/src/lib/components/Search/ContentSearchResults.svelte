<script lang="ts">
  import BookCover from '$lib/components/BookCover.svelte';
  import { Icon } from '@colibri-hq/ui';
  import { SvelteSet } from 'svelte/reactivity';
  import type { ContentSearchResult } from '@colibri-hq/sdk';

  interface Props {
    results: ContentSearchResult[];
    query: string;
  }

  let { results, query }: Props = $props();

  // Track expanded state for each work (using SvelteSet for Svelte 5 reactivity)
  let expandedWorks = new SvelteSet<string>();

  function toggleExpanded(workId: string) {
    if (expandedWorks.has(workId)) {
      expandedWorks.delete(workId);
    } else {
      expandedWorks.add(workId);
    }
  }
</script>

{#if results.length === 0}
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <Icon name="search" class="mb-4 h-12 w-12 text-gray-400" />
    <p class="text-lg text-gray-600 dark:text-gray-400">
      No matches found for "{query}"
    </p>
    <p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
      Try different keywords or search in titles instead
    </p>
  </div>
{:else}
  <ul class="space-y-6">
    {#each results as result (result.workId)}
      {@const isExpanded = expandedWorks.has(result.workId)}
      <li class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div class="flex gap-4">
          <!-- Book cover thumbnail -->
          <a href="/works/{result.workId}" class="shrink-0">
            <BookCover
              book={result.workId}
              edition={result.editionId}
              title={result.title}
              class="w-16 transition-transform hover:scale-105"
              imageClasses="aspect-[2/3] object-cover rounded"
            />
          </a>

          <!-- Content -->
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <a href="/works/{result.workId}" class="hover:underline">
                <h3 class="font-serif text-lg font-medium text-gray-900 dark:text-gray-100">
                  {result.title}
                </h3>
              </a>
              <span class="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {result.matchCount} {result.matchCount === 1 ? 'match' : 'matches'}
              </span>
            </div>

            <!-- Matched snippets -->
            <div class="mt-3 space-y-2">
              {#each result.chunks.slice(0, isExpanded ? result.chunks.length : 2) as chunk (chunk.chunkId)}
                <div class="rounded bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-700/50 dark:text-gray-300">
                  <!--
                    @html is safe here: headline comes from PostgreSQL ts_headline() which
                    only inserts <mark> tags around search terms from the database content.
                  -->
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                  <p class="line-clamp-3">{@html chunk.headline}</p>
                </div>
              {/each}
            </div>

            {#if result.chunks.length > 2}
              <button
                type="button"
                class="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                onclick={() => toggleExpanded(result.workId)}
              >
                <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} class="h-4 w-4" />
                {isExpanded ? 'Show less' : `Show ${result.chunks.length - 2} more matches`}
              </button>
            {/if}
          </div>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  @reference "tailwindcss";

  /* Highlight matched terms from ts_headline */
  :global(mark) {
    @apply rounded bg-yellow-200 px-0.5 font-medium text-gray-900 dark:bg-yellow-500/30 dark:text-yellow-200;
  }
</style>
