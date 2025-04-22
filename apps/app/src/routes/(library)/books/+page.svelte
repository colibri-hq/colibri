<script lang="ts">
  import { Field } from '@colibri-hq/ui';
  import BookLink from '$lib/components/Links/BookLink.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let books = $derived(data.books);
  let searchTerm = $state('');
</script>

<article>
  <header class="flex items-center justify-between pb-8">
    <h1 class="font-serif text-4xl font-medium">Books</h1>

    <div class="actions">
      <Field
        appendIcon="search"
        bind:value={searchTerm}
        placeholder="Search"
        type="search"
      />
    </div>
  </header>

  <ul class="grid grid-cols-2 gap-8 md:grid-cols-4 xl:grid-cols-6">
    {#each books as book}
      <li class="contents">
        <BookLink
          book={book.book_id ?? book.id}
          title={book.title}
          edition={book.main_edition_id}
          blurhash={book.cover_blurhash}
        />
      </li>
    {/each}
  </ul>
</article>
