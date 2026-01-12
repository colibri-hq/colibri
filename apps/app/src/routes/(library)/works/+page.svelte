<script lang="ts">
  import { Field, Tabs } from '@colibri-hq/ui';
  import WorkLink from '$lib/components/Links/WorkLink.svelte';
  import ContentSearchResults from '$lib/components/Search/ContentSearchResults.svelte';
  import { trpc } from '$lib/trpc/client';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import type { PageProps } from './$types';
  import type { ContentSearchResult } from '@colibri-hq/sdk';

  let { data }: PageProps = $props();
  let works = $derived(data.works);

  // Search state
  let searchTerm = $state($page.url.searchParams.get('q') || '');
  let searchMode = $state<'titles' | 'content'>('titles');
  let contentResults = $state<ContentSearchResult[]>([]);
  let isSearchingContent = $state(false);

  // Debounced content search
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  async function performContentSearch(query: string) {
    if (!query.trim()) {
      contentResults = [];
      return;
    }

    isSearchingContent = true;
    try {
      const results = await trpc($page).search.content.query({
        query,
        limit: 20,
        chunksPerWork: 5,
      });
      contentResults = results;
    } catch (error) {
      console.error('Content search failed:', error);
      contentResults = [];
    } finally {
      isSearchingContent = false;
    }
  }

  function handleSearchInput(value: string) {
    searchTerm = value;

    if (searchMode === 'titles') {
      // Update URL for title search
      const url = new URL($page.url);
      if (value.trim()) {
        url.searchParams.set('q', value);
      } else {
        url.searchParams.delete('q');
      }
      goto(url.toString(), { replaceState: true, keepFocus: true });
    } else {
      // Debounced content search
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      searchTimeout = setTimeout(() => {
        performContentSearch(value);
      }, 300);
    }
  }

  function handleModeChange(mode: 'titles' | 'content') {
    searchMode = mode;

    if (mode === 'content' && searchTerm.trim()) {
      performContentSearch(searchTerm);
    } else if (mode === 'titles') {
      // Clear content results when switching to titles
      contentResults = [];
    }
  }

  const searchTabs = {
    titles: 'Titles',
    content: 'Content',
  };
</script>

<article>
  <header class="flex flex-col gap-4 pb-8">
    <div class="flex items-center justify-between">
      <h1 class="font-serif text-4xl font-medium">Works</h1>

      <div class="actions">
        <Field
          appendIcon="search"
          value={searchTerm}
          oninput={(e: Event & { currentTarget: HTMLInputElement }) => handleSearchInput(e.currentTarget.value)}
          placeholder="Search"
          type="search"
        />
      </div>
    </div>

    {#if searchTerm.trim()}
      <div class="max-w-xs">
        <Tabs
          tabs={searchTabs}
          value={searchMode}
          onChange={(mode) => handleModeChange(mode as 'titles' | 'content')}
          class="!gap-0 !mb-0"
        >
          {#snippet titlesContent()}{/snippet}
          {#snippet contentContent()}{/snippet}
        </Tabs>
      </div>
    {/if}
  </header>

  {#if searchMode === 'content' && searchTerm.trim()}
    {#if isSearchingContent}
      <div class="flex items-center justify-center py-16">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <span class="ml-3 text-gray-600 dark:text-gray-400">Searching book contents...</span>
      </div>
    {:else}
      <ContentSearchResults results={contentResults} query={searchTerm} />
    {/if}
  {:else}
    <ul class="grid grid-cols-2 items-start gap-8 md:grid-cols-4 xl:grid-cols-6">
      {#each works as work, index (index)}
        <li class="contents">
          <WorkLink
            work={work.work_id ?? work.id}
            title={work.title ?? 'Untitled'}
            edition={work.main_edition_id ?? work.id}
            blurhash={work.cover_blurhash}
            creators={work.creators}
          />
        </li>
      {/each}
    </ul>
  {/if}
</article>
