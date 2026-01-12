<script lang="ts" module>
  import type { PageData } from './$types';

  export type Work = PageData['work'];
  export type Creator = Awaited<PageData['creators']>[number];
  export type Publisher = Awaited<PageData['publisher']>;
  export type Rating = Awaited<PageData['ratings']>[number];
  export type Review = Awaited<PageData['reviews']>[number];
  export type SeriesInfo = Awaited<PageData['series']>[number];
</script>

<script lang="ts">
  import 'bytemd/dist/index.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { writable } from 'svelte/store';
  import CollectionModal from './CollectionModal.svelte';
  import Meta from './Meta.svelte';
  import BookCover from '$lib/components/BookCover.svelte';
  import { Icon, Markdown } from '@colibri-hq/ui';
  import ContentSection from '$lib/components/ContentSection.svelte';
  import HeaderButton from '../HeaderButton.svelte';
  import CommentsPanel from '$lib/components/Comments/CommentsPanel.svelte';
  import ReviewWidget from './ReviewWidget.svelte';
  import RatingsWidget from './RatingsWidget.svelte';
  import HeaderBackground from './HeaderBackground.svelte';
  import RatingWidget from './RatingWidget.svelte';
  import { trpc } from '$lib/trpc/client';
  import type { RouterOutputs } from '$lib/trpc/router';
  import EnrichmentBadge from '$lib/components/Enrichment/EnrichmentBadge.svelte';
  import EnrichmentReviewModal from '$lib/components/Enrichment/EnrichmentReviewModal.svelte';
  import { getEnrichmentStatus, markEnriching, markEnrichmentAvailable, clearEnrichmentStatus } from '$lib/enrichment';
  import SeriesBadge from '$lib/components/SeriesBadge.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let work = $derived(data.work);
  let creators = $derived(data.creators);
  let publisher = $derived(data.publisher);
  let ratings = $derived(data.ratings);
  let reviews = $derived(data.reviews);
  let series = $derived(data.series);

  let comments = writable<RouterOutputs['comments']['load']>([]);
  let commentsLoading = $state(true);

  let collectionModalOpen = $state(false);

  // Enrichment state - reactive from store for SSE updates
  const enrichmentStore = getEnrichmentStatus(page.params.work!);
  let enrichmentStatus = $derived($enrichmentStore.status);
  let storeImprovementCount = $derived($enrichmentStore.improvementCount ?? 0);
  let storeSources = $derived($enrichmentStore.sources ?? []);

  // Local enrichment state for modal
  let enrichmentData = $state<RouterOutputs['books']['getEnrichmentPreview']>(null);
  let enrichmentModalOpen = $state(false);
  let enrichmentLoading = $state(false);

  onMount(async () => {
    await Promise.all([
      refreshComments(),
      checkEnrichment(),
    ]);
  });

  async function checkEnrichment() {
    try {
      const result = await trpc(page).books.hasEnrichment.query({ workId: page.params.work! });

      if (result.hasEnrichment) {

        // Type narrowing: when hasEnrichment is true, these properties exist
        const { improvementCount, sources } = result as {
          hasEnrichment: true;
          improvementCount: number;
          sources: string[];
        };

        if (improvementCount > 0) {
          markEnrichmentAvailable(page.params.work!, improvementCount, sources ?? []);
        }
      }
    } catch (error) {
      console.warn('Failed to check enrichment:', error);
    }
  }

  async function openEnrichmentModal() {
    if (enrichmentStatus === 'none') {

      // Trigger manual enrichment
      markEnriching(page.params.work!);

      try {
        await trpc(page).books.triggerEnrichment.mutate({ workId: page.params.work! });
        await checkEnrichment();

        // Re-check the current status after checkEnrichment updates the store
        const currentStatus = $enrichmentStore.status;

        if (currentStatus === 'available') {
          await loadEnrichmentPreview();
          enrichmentModalOpen = true;
        }
      } catch (error) {
        console.error('Failed to trigger enrichment:', error);

        clearEnrichmentStatus(page.params.work!);
      }
    } else if (enrichmentStatus === 'available') {
      await loadEnrichmentPreview();

      enrichmentModalOpen = true;
    }
  }

  async function loadEnrichmentPreview() {
    enrichmentLoading = true;

    try {
      enrichmentData = await trpc(page).books.getEnrichmentPreview.query({ workId: page.params.work! });
    } finally {
      enrichmentLoading = false;
    }
  }

  async function applyEnrichment(selectedFields: string[]) {
    if (!enrichmentData) {
      return;
    }

    enrichmentLoading = true;

    try {
      await trpc(page).books.applyEnrichment.mutate({
        enrichmentId: enrichmentData.id,
        selectedFields,
      });

      enrichmentModalOpen = false;
      clearEnrichmentStatus(page.params.work!);

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Failed to apply enrichment:', error);
    } finally {
      enrichmentLoading = false;
    }
  }

  async function dismissEnrichment() {
    if (!enrichmentData) {
      return;
    }

    enrichmentLoading = true;

    try {
      await trpc(page).books.dismissEnrichment.mutate({
        enrichmentId: enrichmentData.id,
      });

      enrichmentModalOpen = false;
      clearEnrichmentStatus(page.params.work!);
      enrichmentData = null;
    } finally {
      enrichmentLoading = false;
    }
  }

  async function refreshComments() {
    commentsLoading = true;

    try {
      const result = await trpc(page).comments.load.query({
        entityType: 'work',
        entityId: page.params.work!,
      });

      comments.set(result);
    } finally {
      commentsLoading = false;
    }
  }

  async function addComment({ content, reset }: {
    content: string;
    reset: () => void;
  }) {
    commentsLoading = true;

    try {
      await trpc(page).comments.add.mutate({
        entityType: 'work',
        entityId: page.params.work!,
        content,
      });

      await refreshComments();

      reset();
    } finally {
      commentsLoading = false;
    }
  }

  async function addReaction({ commentId, emoji }: {
    commentId: string;
    emoji: string;
  }) {
    await trpc(page).comments.addReaction.mutate({ commentId, emoji });
    await refreshComments();
  }

  async function removeReaction({ commentId, emoji }: {
    commentId: string;
    emoji: string;
  }) {
    await trpc(page).comments.removeReaction.mutate({ commentId, emoji });
    await refreshComments();
  }
</script>

<article>
  <HeaderBackground
    blurhash={work.cover_blurhash}
    class="sticky top-0 h-72 border-b shadow transition border-gray-200 dark:border-gray-800"
    data-animatable="blur"
  />

  <header class="sticky top-0 z-10 mb-10 flex flex-col">
    <ContentSection
      class="-mt-24 grid grid-cols-[max-content_auto] grid-rows-[auto_1fr] gap-x-12 gap-y-10 transition will-change-auto"
      data-animatable="header"
    >
      <!-- region Work Cover + Back Button -->
      <div class="relative row-span-2 w-48">
        <div data-animatable="cover">
          <BookCover
            blurhash={work.cover_blurhash}
            book={work.id}
            class="max-h-80 w-48 rounded-md shadow-lg"
            edition={work.edition_id}
            imageClasses="aspect-[50/81]"
            title={work.title}
          />
        </div>

        <!-- Back button appears in cover area when scrolled -->
        <div class="absolute top-0 left-0" data-animatable="back-button">
          <HeaderButton class="-ms-1" href="." tag="a">
            <Icon name="chevron_left" />
            <span class="ms-1">Back</span>
          </HeaderButton>
        </div>
      </div>
      <!-- endregion -->

      <!-- region Header Actions - stays visible when scrolled -->
      <nav class="-mt-px flex h-24 grow items-center justify-end gap-2" data-animatable="actions">
        <HeaderButton onclick={() => (collectionModalOpen = true)}>
          <Icon name="library_add" />
          <span class="ms-2">Add to collection</span>
        </HeaderButton>

        <HeaderButton href="/works/{work.id}/edit" tag="a">
          <Icon name="edit" />
          <span class="ms-2">Edit</span>
        </HeaderButton>

        <HeaderButton download="{work.title}.epub" href="{work.id}/download" tag="a">
          <Icon name="download" />
          <span class="ms-2">Download</span>
        </HeaderButton>
      </nav>
      <!-- endregion -->

      <!-- region Work Title -->
      <div class="flex items-start justify-between md:flex-wrap">
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <h1 class="font-serif text-4xl font-bold text-gray-900 dark:text-gray-100" data-animatable="title">
              {work.title}
            </h1>
            <EnrichmentBadge
              status={enrichmentStatus}
              improvementCount={storeImprovementCount}
              sources={storeSources}
              onclick={openEnrichmentModal}
            />
          </div>
          {#await creators}
            <span class="text-lg text-gray-600 dark:text-gray-300">
              Loading…
            </span>
          {:then creators}
            {@const essentialCreators = creators.filter((creator) => creator.essential)}

            {#if essentialCreators.length > 0}
              <span class="mt-2 text-xl text-gray-600 dark:text-gray-300" data-animatable="creators">
                by
                {#each essentialCreators as creator, index (index)}
                  <a href={resolve('/(library)/creators/[creator=id]', {creator: creator.id})} class="hover:underline">
                    {creator.name}
                  </a>

                  <span>{index < essentialCreators.length - 1 ? ' & ' : ''}</span>
                {/each}
              </span>
            {/if}
          {/await}

          {#await series then seriesList}
            {#if seriesList.length > 0}
              <div class="mt-2 flex flex-wrap gap-2">
                {#each seriesList as s (s.id)}
                  <SeriesBadge series={s} />
                {/each}
              </div>
            {/if}
          {/await}

          <RatingWidget work={work} class="-ml-3" data-animatable="ratings" {ratings} />
        </div>
      </div>
      <!-- endregion -->
    </ContentSection>
  </header>

  <ContentSection class="z-0 pb-8">
    <div class="min-h-fit">
      {#if work.synopsis}
        <section>
          <header class="mb-2">
            <h3 class="text-xl font-bold">Synopsis</h3>
          </header>
          <Markdown source={work.synopsis} />
        </section>
      {/if}
    </div>

    <div class="mt-8 grid grid-cols-2 gap-2">
      <ReviewWidget {reviews} />
      <RatingsWidget {ratings} />
    </div>

    {#if work.legal_information}
      <section class="mt-8 text-xs text-gray-500 dark:text-gray-600">
        <header class="mb-1">
          <h3 class="font-semibold">Legal Information</h3>
        </header>
        <Markdown class="text-xs leading-snug" source={work.legal_information} />
      </section>
    {/if}

    <footer
      class="sticky bottom-0 mt-12 flex flex-col gap-8 bg-white py-8 shadow-[0_-8px_24px_16px_transparent]
      shadow-white dark:bg-gray-950 dark:shadow-gray-950"
    >
      <Meta {work} {publisher} />

      <CommentsPanel
        comments={$comments}
        loading={commentsLoading}
        entityType="work"
        entityId={page.params.work ?? ''}
        moderationEnabled={page.data.moderationEnabled}
        onReaction={addReaction}
        onReactionRemoved={removeReaction}
        onSubmit={addComment}
        onRefresh={refreshComments}
      />
    </footer>
  </ContentSection>
</article>

<CollectionModal bind:open={collectionModalOpen} {work} />

<EnrichmentReviewModal
  bind:open={enrichmentModalOpen}
  preview={enrichmentData?.preview ?? null}
  improvements={enrichmentData?.improvements ?? {}}
  sources={enrichmentData?.sources ?? []}
  loading={enrichmentLoading}
  onApply={applyEnrichment}
  onDismiss={dismissEnrichment}
/>

<style lang="postcss">
    article :global([data-animatable]) {
        /*noinspection CssInvalidFunction*/
        animation-timeline: scroll();
        animation-fill-mode: both;
        animation-timing-function: linear;
        animation-range: 0 12rem;
    }

    article :global([data-animatable='blur']) {
        animation-name: squeeze-blur;
    }

    article :global([data-animatable='cover']) {
        animation-name: squeeze-cover;
        transform-origin: top center;
    }

    article :global([data-animatable='back-button']) {
        animation-name: appear-back-button;
    }

    article :global([data-animatable='header']) {
        animation-name: squeeze-header;
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

    article :global([data-animatable='actions']) {
        animation-name: stay-visible;
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

    @keyframes appear-back-button {
        0%, 40% {
            opacity: 0;
            pointer-events: none;
            transform: translateY(0);
        }

        60%, 100% {
            opacity: 1;
            pointer-events: auto;
            /* Move down to center in visible blurhash area */
            transform: translateY(9rem);
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

    @keyframes squeeze-title {
        0% {
            transform: scale(1);
            color: rgb(17 24 39); /* gray-900 */
            text-shadow: none;
        }

        40%,
        100% {
            transform: scale(0.8);
            color: white;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }
    }

    @media (prefers-color-scheme: dark) {
        @keyframes squeeze-title {
            0% {
                transform: scale(1);
                color: rgb(243 244 246); /* gray-100 */
                text-shadow: none;
            }

            40%,
            100% {
                transform: scale(0.8);
                color: white;
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
            }
        }
    }

    @keyframes squeeze-creators {
        0% {
            transform: translateY(0);
            color: rgb(75 85 99); /* gray-600 */
        }

        60%,
        100% {
            transform: translateY(-0.5rem);
            color: rgba(255, 255, 255, 0.9);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
    }

    @media (prefers-color-scheme: dark) {
        @keyframes squeeze-creators {
            0% {
                transform: translateY(0);
                color: rgb(209 213 219); /* gray-300 */
            }

            60%,
            100% {
                transform: translateY(-0.5rem);
                color: rgba(255, 255, 255, 0.9);
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
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

    @keyframes stay-visible {
        0% {
            opacity: 1;
            transform: translateY(0);
        }

        40%, 100% {
            opacity: 1;
            /* Move down to center in visible blurhash area */
            transform: translateY(7rem);
        }
    }
</style>
