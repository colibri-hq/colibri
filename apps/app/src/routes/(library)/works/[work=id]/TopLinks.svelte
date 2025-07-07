<script lang="ts">
  import type { Author, Book, Publisher } from '@prisma/client';

  interface Props {
    class?: string;
    book: Book & { author: Author; publisher?: Publisher };
  }

  let { class: className = '', book }: Props = $props();
</script>

<nav class={className}>
  <a href="/books/similar?id={book.id}">Similar books</a>
  <a href="/authors/{book.author?.id}">Other books by {book.author?.name}</a>

  {#if book.publisher}
    <a href="/publishers/{book.publisher?.id}"
      >Other books by {book.publisher?.name}</a
    >
  {/if}
</nav>

<style lang="postcss">
  nav {
    @apply opacity-60 transition hover:opacity-100;
  }

  a {
    @apply text-gray-600 underline underline-offset-8 transition hover:text-black dark:text-gray-400 dark:hover:text-gray-100;
  }
</style>
