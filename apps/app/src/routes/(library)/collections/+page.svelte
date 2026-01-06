<script lang="ts">
  import { Icon, IconRenderer } from '@colibri-hq/ui';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let collections = $derived(data.collections);

  type FilterType = 'all' | 'mine' | 'shared' | 'public';
  let filter = $state<FilterType>('all');
  let searchTerm = $state('');

  let filteredCollections = $derived.by(() => {
    let result = collections;

    // Apply visibility filter
    if (filter === 'mine') {
      result = result.filter(({ shared }) => shared === false);
    } else if (filter === 'shared') {
      result = result.filter(({ shared }) => shared === null);
    } else if (filter === 'public') {
      result = result.filter(({ shared }) => shared === true);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();

      result = result.filter(
        ({ description, name }) =>
          name.toLowerCase().includes(term) ||
          description?.toLowerCase().includes(term),
      );
    }

    return result;
  });

  // Convert color buffer to hex
  function bufferToHex(buffer: { type: 'Buffer'; data: number[] } | null | undefined): string {
    if (!buffer || buffer.type !== 'Buffer') {
      return '';
    }
    const bytes = buffer.data;
    return '#' + bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function getVisibilityIcon(shared: boolean | null | undefined): string {
    if (shared === false) {
      return 'lock';
    }
    if (shared === true) {
      return 'public';
    }
    return 'group';
  }

  function getVisibilityLabel(shared: boolean | null | undefined): string {
    if (shared === false) {
      return 'Private';
    }
    if (shared === true) {
      return 'Public';
    }
    return 'Shared';
  }
</script>

<article>
  <header class="flex flex-wrap items-center justify-between gap-4 pb-8">
    <h1 class="font-serif text-4xl font-medium dark:text-gray-200">Collections</h1>

    <div class="flex items-center gap-4">
      <!-- Filter tabs -->
      <div class="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        <button
          class="rounded-md px-3 py-1.5 text-sm font-medium transition
            {filter === 'all'
            ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
          onclick={() => (filter = 'all')}
        >
          All
        </button>
        <button
          class="rounded-md px-3 py-1.5 text-sm font-medium transition
            {filter === 'mine'
            ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
          onclick={() => (filter = 'mine')}
        >
          <Icon name="lock" class="mr-1 text-sm" />
          Private
        </button>
        <button
          class="rounded-md px-3 py-1.5 text-sm font-medium transition
            {filter === 'shared'
            ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
          onclick={() => (filter = 'shared')}
        >
          <Icon name="group" class="mr-1 text-sm" />
          Shared
        </button>
        <button
          class="rounded-md px-3 py-1.5 text-sm font-medium transition
            {filter === 'public'
            ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
          onclick={() => (filter = 'public')}
        >
          <Icon name="public" class="mr-1 text-sm" />
          Public
        </button>
      </div>

      <!-- Search -->
      <div class="relative">
        <Icon
          name="search"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          bind:value={searchTerm}
          placeholder="Search collections..."
          class="rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm
            placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1
            focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        />
      </div>
    </div>
  </header>

  {#if filteredCollections.length > 0}
    <ul class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each filteredCollections as collection (collection.id)}
        {@const colorHex = bufferToHex(collection.color)}
        <li>
          <a
            href="/collections/{collection.id}"
            class="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5
              transition hover:border-gray-300 hover:shadow-lg dark:border-gray-700
              dark:bg-gray-800 dark:hover:border-gray-600"
            style={colorHex ? `border-color: ${colorHex}40` : ''}
          >
            <!-- Header with icon and visibility -->
            <div class="mb-3 flex items-start justify-between">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-xl
                  {colorHex ? '' : 'bg-gray-100 dark:bg-gray-700'}"
                style={colorHex ? `background-color: ${colorHex}20` : ''}
              >
                <IconRenderer
                  icon={collection.icon}
                  class="text-2xl"
                  fallback="collections_bookmark"
                />
              </div>

              <div
                class="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs
                  font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                title={getVisibilityLabel(collection.shared)}
              >
                <Icon name={getVisibilityIcon(collection.shared)} class="text-sm" />
              </div>
            </div>

            <!-- Title -->
            <h2
              class="mb-1 font-serif text-lg font-medium text-gray-900 group-hover:text-primary-600
                dark:text-gray-100 dark:group-hover:text-primary-400"
            >
              {collection.name}
            </h2>

            <!-- Description (truncated) -->
            {#if collection.description}
              <p class="mb-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                {collection.description}
              </p>
            {:else}
              <p class="mb-3 text-sm italic text-gray-400 dark:text-gray-500">
                No description
              </p>
            {/if}

            <!-- Footer with stats -->
            <div class="mt-auto flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
              {#if collection.like_count && collection.like_count > 0}
                <span class="flex items-center gap-1">
                  <Icon name="favorite" class="text-sm text-red-400" />
                  {collection.like_count}
                </span>
              {/if}

              {#if collection.age_requirement}
                <span class="flex items-center gap-1">
                  <Icon name="18_up_rating" class="text-sm" />
                  {collection.age_requirement}+
                </span>
              {/if}
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {:else if searchTerm || filter !== 'all'}
    <div
      class="flex flex-col items-center justify-center rounded-3xl bg-gray-100 py-20
        dark:bg-gray-900"
    >
      <Icon name="search_off" class="mb-4 text-5xl text-gray-300 dark:text-gray-600" />
      <h2 class="font-serif text-2xl text-gray-500 dark:text-gray-400">
        No collections found
      </h2>
      <p class="mt-2 text-gray-400 dark:text-gray-500">
        Try adjusting your search or filter.
      </p>
      <button
        class="mt-4 text-primary-500 hover:text-primary-600"
        onclick={() => {
          searchTerm = '';
          filter = 'all';
        }}
      >
        Clear filters
      </button>
    </div>
  {:else}
    <div
      class="flex flex-col items-center justify-center rounded-3xl bg-gray-100 py-20
        dark:bg-gray-900"
    >
      <Icon
        name="collections_bookmark"
        class="mb-4 text-5xl text-gray-300 dark:text-gray-600"
      />
      <h2 class="font-serif text-2xl text-gray-500 dark:text-gray-400">
        No collections yet
      </h2>
      <p class="mt-2 text-gray-400 dark:text-gray-500">
        Create your first collection from the sidebar or by clicking "Add to collection" on a work.
      </p>
    </div>
  {/if}
</article>
