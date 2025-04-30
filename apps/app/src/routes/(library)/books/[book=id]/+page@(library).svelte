<script lang="ts" module>
  import type { PageData } from './$types';

  export type Book = PageData['book'];
  export type Creator = Awaited<PageData['creators']>[number];
  export type Publisher = Awaited<PageData['publisher']>;
  export type Rating = Awaited<PageData['ratings']>[number];
  export type Review = Awaited<PageData['reviews']>[number];
</script>

<script lang="ts">
  import 'bytemd/dist/index.css';
  import CollectionModal from './CollectionModal.svelte';
  import Meta from './Meta.svelte';
  import BookCover from '$lib/components/BookCover.svelte';
  import { Icon } from '@colibri-hq/ui';
  import ContentSection from '$lib/components/ContentSection.svelte';
  import HeaderButton from '../HeaderButton.svelte';
  import MarkdownContent from '$lib/components/MarkdownContent.svelte';
  import CommentsPanel from '$lib/components/Comments/CommentsPanel.svelte';
  import type { CommentWithUserAndReactions } from '@colibri-hq/sdk';
  import ReviewWidget from './ReviewWidget.svelte';
  import RatingsWidget from './RatingsWidget.svelte';
  import HeaderBackground from './HeaderBackground.svelte';
  import RatingWidget from './RatingWidget.svelte';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let book = $derived(data.book);
  let creators = $derived(data.creators);
  let publisher = $derived(data.publisher);
  let ratings = $derived(data.ratings);
  let reviews = $derived(data.reviews);

  const comments: CommentWithUserAndReactions[] = [];
  let commentsPanel: CommentsPanel = $state();

  let collectionModalOpen = $state(false);
</script>

<article>
  <HeaderBackground
    blurhash={book.cover_blurhash}
    class="sticky top-0 h-72 border-b shadow transition dark:border-gray-800"
    data-animatable="blur"
  />

  <header class="sticky top-0 mb-10 flex flex-col">
    <ContentSection
      class="-mt-24 grid grid-cols-[max-content_auto] grid-rows-[auto_1fr] gap-x-12 gap-y-10 transition will-change-auto"
      data-animatable="header"
    >
      <!-- region Book Cover -->
      <div class="row-span-2" data-animatable="cover">
        <BookCover
          blurhash={book.cover_blurhash}
          book={book.id}
          class="max-h-80 max-w-xs rounded-md shadow-lg"
          edition={book.edition_id}
          imageClasses="aspect-[50/81]"
          title={book.title}
        />
      </div>
      <!-- endregion -->

      <!-- region Header Actions -->
      <nav
        class="-mt-px flex h-24 grow items-center space-x-2"
        data-animatable="header-links"
      >
        <HeaderButton class="mr-auto -ml-1" href="." tag="a">
          <Icon name="chevron_left" />
          <span class="ml-1">Back</span>
        </HeaderButton>

        <HeaderButton
          class="ml-auto"
          onClick={() => (collectionModalOpen = true)}
        >
          <Icon name="library_add" />
          <span class="ml-2">Add to collection</span>
        </HeaderButton>

        <HeaderButton href="/books/{book.id}/edit" tag="a">
          <Icon name="edit" />
          <span class="ml-2">Edit</span>
        </HeaderButton>

        <HeaderButton
          download="{book.title}.epub"
          href="{book.id}/download"
          tag="a"
        >
          <Icon name="download" />
          <span class="ml-2">Download</span>
        </HeaderButton>
      </nav>
      <!-- endregion -->

      <!-- region Book Title -->
      <div class="flex items-start justify-between md:flex-wrap">
        <div class="flex flex-col">
          <h1 class="font-serif text-4xl font-bold" data-animatable="title">
            {book.title}
          </h1>
          {#await creators}
            <span class="text-lg text-gray-600 dark:text-gray-300"
              >Loading...</span
            >
          {:then creators}
            {@const essentialCreators = creators.filter(
              (creator) => creator.essential,
            )}

            <span
              class="mt-2 text-xl text-gray-600 dark:text-gray-300"
              data-animatable="creators"
            >
              by
              {#each essentialCreators as creator, index (index)}
                <a href="/creators/{creator.id}" class="hover:underline"
                  >{creator.name}</a
                >
                <span>{index < essentialCreators.length - 1 ? ' & ' : ''}</span>
              {/each}
            </span>
          {/await}

          <RatingWidget
            {book}
            class="-ml-3"
            data-animatable="ratings"
            {ratings}
          />
        </div>
      </div>
      <!-- endregion -->
    </ContentSection>
  </header>

  <ContentSection class="z-0 pb-8">
    <div class="min-h-fit">
      {#if book.synopsis}
        <section>
          <header class="mb-2">
            <h3 class="text-xl font-bold">Synopsis</h3>
          </header>
          <MarkdownContent source={book.synopsis} />
        </section>
      {/if}
    </div>

    <div class="mt-8 grid grid-cols-2 gap-2">
      <ReviewWidget {reviews} />
      <RatingsWidget {ratings} />
    </div>

    {#if book.legal_information}
      <section class="mt-8 text-xs text-gray-500 dark:text-gray-600">
        <header class="mb-1">
          <h3 class="font-semibold">Legal Information</h3>
        </header>
        <MarkdownContent
          class="text-xs leading-snug"
          source={book.legal_information}
        />
      </section>
    {/if}

    <footer
      class="sticky bottom-10 mt-12 bg-white py-8 shadow-[0_-8px_24px_16px_transparent] shadow-white dark:bg-gray-950
      dark:shadow-gray-950"
    >
      <Meta {book} {publisher} />
    </footer>
  </ContentSection>

  <CommentsPanel bind:this={commentsPanel} {comments} />
</article>

<CollectionModal bind:open={collectionModalOpen} {book} />

<style lang="postcss">
  article :global([data-animatable]) {
    /*noinspection CssInvalidFunction*/
    animation-timeline: scroll();
    animation-fill-mode: both;
    animation-timing-function: linear;
    animation-range: 0% 12rem;
  }

  article :global([data-animatable='blur']) {
    animation-name: squeeze-blur;
  }

  article :global([data-animatable='cover']) {
    animation-name: squeeze-cover;
    transform-origin: top center;
  }

  article :global([data-animatable='header']) {
    animation-name: squeeze-header;
  }

  article :global([data-animatable='header-links']) {
    animation-name: squeeze-header-links;
  }

  article :global([data-animatable='title']) {
    animation-name: squeeze-title;
    display: block;
    transform-origin: top left;
  }

  article :global([data-animatable='creators']) {
    animation-name: squeeze-creators;
  }

  article :global([data-animatable='ratings']) {
    animation-name: squeeze-ratings;
  }

  @keyframes squeeze-blur {
    0% {
      transform: translateY(0);
    }

    100% {
      transform: translateY(-12rem);
    }
  }

  @keyframes squeeze-cover {
    0% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }

    60%,
    100% {
      opacity: 0;
    }

    100% {
      transform: scale(0.75) translateY(-8rem);
    }
  }

  @keyframes squeeze-header {
    0%,
    40% {
      transform: translateY(0);
    }

    100% {
      transform: translateY(-1.5rem);
    }
  }

  @keyframes squeeze-header-links {
    0% {
      opacity: 1;
    }

    40%,
    100% {
      opacity: 0;
    }
  }

  @keyframes squeeze-title {
    0% {
      transform: scale(1);
    }

    40%,
    100% {
      transform: scale(0.8);
    }
  }

  @keyframes squeeze-header {
    0%,
    40% {
      transform: translateY(0);
    }

    100% {
      transform: translateY(-1.5rem);
    }
  }

  @keyframes squeeze-creators {
    0% {
      transform: translateY(0);
    }

    60%,
    100% {
      transform: translateY(-0.5rem);
    }
  }

  @keyframes squeeze-ratings {
    0% {
      opacity: 1;
    }

    60%,
    100% {
      opacity: 0;
      visibility: hidden;
    }
  }
</style>
