<script lang="ts">
  import BookCover from '$lib/components/BookCover.svelte';

  interface Props {
    work: string;
    edition: string;
    title: string;
    blurhash?: string | undefined | null;
    draggable?: boolean;
  }

  let { work, edition, title, blurhash = undefined, draggable = true }: Props = $props();

  function handleDragStart(event: DragEvent) {
    if (!draggable || !event.dataTransfer) return;

    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(
      'application/x-colibri-work',
      JSON.stringify({ workId: work, editionId: edition, title }),
    );
  }
</script>

<a
  class="contents"
  href="/works/{work}"
  draggable={draggable ? 'true' : 'false'}
  ondragstart={handleDragStart}
>
  <article class="flex h-full flex-col justify-between">
    <header class="contents">
      <BookCover
        {blurhash}
        book={work}
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
