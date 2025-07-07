<script lang="ts">
  import MetaItem from './MetaItem.svelte';
  import type { Book, Publisher } from './+page@(library).svelte';
  import { humanReadableFileSize } from '@colibri-hq/shared';

  interface Props {
    class?: string;
    book: Book;
    publisher: Promise<Publisher>;
  }

  let { class: className = '', book, publisher }: Props = $props();

  let publishingYear: number | undefined = book.published_at
    ? new Date(book.published_at).getUTCFullYear()
    : undefined;

  const size = humanReadableFileSize(book.assets?.at(0)?.size);
</script>

<div class={className}>
  <ul class="flex items-stretch justify-center">
    <!-- TODO: Parse actual thrillers -->
    <MetaItem name="Genre" value="Thriller" />

    {#if book.published_at}
      <MetaItem name="Published" value={publishingYear} />
    {/if}

    {#await publisher}
      <span class="hidden" aria-hidden="true"></span>
    {:then publisher}
      {#if publisher}
        <MetaItem name="Publisher">
          <a href="/publishers/{publisher.id}">{publisher.name}</a>
        </MetaItem>
      {/if}
    {/await}

    {#if book.language}
      <MetaItem name="Language" value={book.language.toUpperCase()}>
        {#snippet secondary()}
          <span>{book.language_name}</span>
        {/snippet}
      </MetaItem>
    {/if}

    <MetaItem name="Size" value={size} />
  </ul>
</div>
