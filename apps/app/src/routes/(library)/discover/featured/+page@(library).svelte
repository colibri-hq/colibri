<script lang="ts">
  import type { PageProps } from './$types';
  import ContentSection from '$lib/components/ContentSection.svelte';

  let { data }: PageProps = $props();
  let featured = $derived(data.featured);
</script>

<article>
  <header class="mb-8">
    <ContentSection padding>
      <h1 class="font-serif text-6xl">Featured Books</h1>

      <span class="mt-2 text-gray-500">
        Discover new books from various stores.
      </span>
    </ContentSection>
  </header>

  <ContentSection>
    <section
      class="rounded-3xl bg-gray-50 p-6 shadow-inner"
      id="project-gutenberg"
    >
      <header class="mb-6">
        <h2 class="font-serif text-4xl">Project Gutenberg</h2>
      </header>

      {#await featured.gutendex}
        <p>Loading…</p>
      {:then books}
        <ul class="grid grid-cols-4 gap-4">
          {#each books as book, index (index)}
            {@const htmlUrl = book.formats['text/html'] || book.formats['text/html; charset=utf-8']}
            <li
              class="flex flex-col items-center justify-between rounded-lg bg-white p-4 shadow-md"
            >
              <div>
                <h3 class="font-serif text-xl">{book.title}</h3>
                <p class="text-gray-500">
                  {book.authors.map(({ name }) => name).join(' & ')}
                </p>
              </div>
              {#if htmlUrl}
                <a href={htmlUrl} target="_blank" class="text-blue-500">Read</a>
              {/if}
            </li>
          {/each}
        </ul>
      {:catch error}
        <p>{error.message}</p>
      {/await}
    </section>
  </ContentSection>
</article>
