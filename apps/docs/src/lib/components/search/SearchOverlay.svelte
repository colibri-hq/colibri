<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    CommandPalette,
    type CommandPaletteGroup,
    type CommandPaletteOption,
    Icon,
    LoadingIndicator,
  } from '@colibri-hq/ui';
  import {
    addRecentSearch,
    getRecentSearches,
    initSearch,
    removeRecentSearch,
    search,
    type SearchResult,
  } from '$lib/search.js';
  import {HistoryIcon, XIcon} from '@lucide/svelte';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let query = $state('');
  let results = $state<SearchResult[]>([]);
  let recentSearches = $state<string[]>([]);
  let isLoading = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  const SEARCH_DEBOUNCE_MS = 300;

  // Initialize search and load recent searches when dialog opens
  $effect(() => {
    if (open) {
      recentSearches = getRecentSearches();
      initSearch();
    }
  });

  // Perform debounced search when query changes
  $effect(() => {
    // Clear any pending search
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }

    if (query.length >= 2) {
      isLoading = true;

      // Debounce the search to avoid excessive API calls
      searchTimeout = setTimeout(() => {
        search(query)
          .then((updatedResults) => (results = updatedResults))
          .finally(() => (isLoading = false));
      }, SEARCH_DEBOUNCE_MS);
    } else {
      results = [];
      isLoading = false;
    }
  });

  function handleResultSelect(url: string) {
    // Save to recent searches if there was a query
    if (query.trim()) {
      addRecentSearch(query.trim());
    }
    open = false;
    goto(url);
  }

  function handleRecentSelect(recentQuery: string) {
    query = recentQuery;
  }

  function createRemoveHandler(recentQuery: string) {
    return (event: MouseEvent) => {
      event.stopPropagation();
      removeRecentSearch(recentQuery);
      recentSearches = getRecentSearches();
    };
  }

  function handleValueChange(value: string) {
    query = value;
  }

  function getResultData(option: CommandPaletteOption): SearchResult {
    return (option.data as { result: SearchResult }).result;
  }

  // Build groups based on current state
  const groups = $derived.by((): CommandPaletteGroup[] => {
    if (!query && recentSearches.length > 0) {
      return [
        {
          id: 'recent',
          heading: 'Recent Searches',
          items: recentSearches.map(
            (recentQuery): CommandPaletteOption => ({
              id: `recent-${recentQuery}`,
              title: recentQuery,
              icon: 'history',
              filterValue: `recent-${recentQuery}`,
              onselect: () => handleRecentSelect(recentQuery),
              data: { type: 'recent', query: recentQuery },
            }),
          ),
        },
      ];
    }

    if (results.length > 0) {
      return [
        {
          id: 'results',
          heading: 'Results',
          items: results.map(
            (result): CommandPaletteOption => ({
              id: result.id,
              title: result.title,
              filterValue: result.id,
              onselect: () => handleResultSelect(result.url),
              data: { type: 'result', result },
            }),
          ),
        },
      ];
    }

    return [];
  });
</script>

<CommandPalette
  bind:open
  bind:value={query}
  placeholder="Search documentation…"
  emptyMessage={query.length >= 2 ? 'No results found' : 'Type to search…'}
  shouldFilter={false}
  {isLoading}
  {groups}
  onValueChange={handleValueChange}
>
  {#snippet loading()}
    <div class="flex flex-col items-center justify-center gap-2">
      <LoadingIndicator size="small" />
      <span>Searching…</span>
    </div>
  {/snippet}

  {#snippet item(option, group)}
    {#if group.id === 'recent'}
      <HistoryIcon class="size-4 shrink-0 opacity-75" />
      <span class="flex-1">{option.title}</span>
      <button
        type="button"
        onclick={createRemoveHandler(option.title)}
        class="flex justify-center items-center rounded-full size-5 text-gray-400 opacity-0 group-hover:opacity-100
        hover:bg-gray-200 hover:text-gray-600 group-data-highlighted:opacity-100 dark:hover:bg-gray-700
        dark:hover:text-gray-300 transition"
        aria-label={`Remove "${option.title}" from recent searches`}
      >
        <XIcon class="size-4" />
      </button>
    {:else if group.id === 'results'}
      {@const result = getResultData(option)}
      <div class="flex flex-col gap-1 w-full">
        {#if result.breadcrumb.length > 1}
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {result.breadcrumb.slice(0, -1).join(' > ')}
          </span>
        {/if}

        <strong class="font-semibold text-gray-900 dark:text-gray-100">
          {result.title}
        </strong>

        <div
          class="line-clamp-2 text-sm text-gray-600 dark:text-gray-400 [&_mark]:rounded [&_mark]:bg-yellow-200
          [&_mark]:px-0.5 [&_mark]:dark:bg-yellow-900"
        >
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html result.excerpt}
        </div>
      </div>
    {/if}
  {/snippet}
</CommandPalette>
