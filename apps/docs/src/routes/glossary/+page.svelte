<script lang="ts">
  import { getAllGlossaryEntries, searchGlossary } from '$lib/components/glossary';
  import { SearchIcon } from '@lucide/svelte';

  let searchQuery = $state('');

  const allEntries = getAllGlossaryEntries();

  const filteredEntries = $derived(
    searchQuery.trim() ? searchGlossary(searchQuery) : allEntries
  );

  // Group entries by first letter
  const groupedEntries = $derived(() => {
    const groups = new Map<string, typeof filteredEntries>();

    for (const entry of filteredEntries) {
      const firstLetter = entry.displayTerm[0].toUpperCase();
      if (!groups.has(firstLetter)) {
        groups.set(firstLetter, []);
      }
      groups.get(firstLetter)!.push(entry);
    }

    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  });
</script>

<svelte:head>
  <title>Glossary - Colibri Documentation</title>
  <meta
    name="description"
    content="Definitions of technical terms, ebook concepts, and Colibri-specific terminology."
  />
</svelte:head>

<div class="container mx-auto px-4 py-12 max-w-4xl">
  <header class="mb-12">
    <h1 class="text-4xl md:text-5xl font-bold font-serif text-gray-900 dark:text-white mb-4">
      Glossary
    </h1>
    <p class="text-lg text-gray-600 dark:text-gray-400">
      Definitions of technical terms, ebook concepts, and Colibri-specific terminology.
    </p>
  </header>

  <!-- Search box -->
  <div class="mb-8">
    <label for="glossary-search" class="sr-only">Search glossary</label>
    <div class="relative">
      <SearchIcon class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
      <input
        id="glossary-search"
        type="search"
        bind:value={searchQuery}
        placeholder="Search terms..."
        class="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700
               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
               focus:ring-2 focus:ring-blue-500 focus:border-transparent
               placeholder:text-gray-500 dark:placeholder:text-gray-400"
      />
    </div>
  </div>

  <!-- Results count -->
  {#if searchQuery.trim()}
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
      Found {filteredEntries.length} {filteredEntries.length === 1 ? 'term' : 'terms'}
    </p>
  {/if}

  <!-- Glossary entries grouped by letter -->
  <div class="space-y-12">
    {#each groupedEntries() as [letter, entries] (letter)}
      <section>
        <!-- Letter heading -->
        <h2
          class="text-2xl font-bold text-gray-900 dark:text-white mb-4 pb-2
                 border-b-2 border-gray-200 dark:border-gray-700"
        >
          {letter}
        </h2>

        <!-- Terms in this letter group -->
        <dl class="space-y-6">
          {#each entries as entry (entry.id)}
            <div class="group">
              <dt class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {entry.displayTerm}
                {#if entry.aliases && entry.aliases.length > 0}
                  <span class="text-sm font-normal text-gray-500 dark:text-gray-400">
                    (also: {entry.aliases.join(', ')})
                  </span>
                {/if}
              </dt>
              <dd class="text-gray-700 dark:text-gray-300 ml-0">
                {entry.definition}
                {#if entry.learnMoreUrl}
                  <a
                    href={entry.learnMoreUrl}
                    class="ml-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Learn more →
                  </a>
                {/if}
              </dd>
            </div>
          {/each}
        </dl>
      </section>
    {/each}
  </div>

  <!-- No results -->
  {#if filteredEntries.length === 0}
    <div class="text-center py-12">
      <p class="text-gray-600 dark:text-gray-400">
        No terms found matching "<span class="font-semibold">{searchQuery}</span>".
      </p>
      <button
        onclick={() => (searchQuery = '')}
        class="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
      >
        Clear search
      </button>
    </div>
  {/if}

  <!-- Back to top link (for long glossaries) -->
  {#if filteredEntries.length > 20}
    <div class="mt-12 text-center">
      <a
        href="#top"
        class="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
      >
        ↑ Back to top
      </a>
    </div>
  {/if}
</div>
