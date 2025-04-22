<script lang="ts">
  import BookCover from '$lib/components/BookCover.svelte';

  interface Props {
    book: string;
    edition: string;
    title: string;
    blurhash?: string | undefined | null;
  }

  let { book, edition, title, blurhash = undefined }: Props = $props();
</script>

<a class="contents" href="/books/{book}">
  <article class="flex h-full flex-col justify-between">
    <header class="contents">
      <BookCover
        {blurhash}
        {book}
        class="mb-2 shadow-lg transition-transform hover:scale-[1.02]"
        {edition}
        imageClasses="aspect-[50/81] object-cover"
        {title}
      />
      <h3
        class="mt-auto text-center font-serif text-base font-medium text-black dark:text-gray-200"
      >
        {title}
      </h3>
    </header>
  </article>
</a>
