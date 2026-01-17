<script lang="ts">
  import BookCover from '$lib/components/BookCover.svelte';
  import {resolve} from '$app/paths';

  interface Creator {
    id: string | null;
    name: string | null;
  }

  interface Props {
    work: string;
    edition: string;
    title: string;
    creators?: Creator[] | null;
    blurhash?: string | undefined | null;
    draggable?: boolean;
  }

  let { work, edition, title, creators = null, blurhash = undefined, draggable = true }: Props = $props();

  // Filter out null creators and format the author names
  const authorNames = $derived(
    creators
      ?.filter((c): c is Creator => c !== null && c.name !== null)
      .map((c) => c.name)
      .join(', ') || '',
  );

  function handleDragStart(event: DragEvent) {
    if (!draggable || !event.dataTransfer) {
      return;
    }

    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(
      'application/x-colibri-work',
      JSON.stringify({ workId: work, editionId: edition, title }),
    );
  }
</script>

<a
  class="contents"
  href={resolve('/(library)/works/[work=id]', {work})}
  draggable={draggable ? 'true' : 'false'}
  ondragstart={handleDragStart}
>
  <article class="flex h-full flex-col">
    <BookCover
      {blurhash}
      book={work}
      class="mb-3 transition-transform hover:scale-[1.02]"
      {edition}
      imageClasses="aspect-[2/3] object-cover"
      {title}
    />
    <header class="flex flex-col gap-0.5">
      <h3
        class="line-clamp-2 text-center font-serif text-base font-medium leading-tight text-black dark:text-gray-200"
      >
        {title}
      </h3>
      {#if authorNames}
        <p class="line-clamp-1 text-center text-sm text-gray-500 dark:text-gray-400">
          {authorNames}
        </p>
      {/if}
    </header>
  </article>
</a>
