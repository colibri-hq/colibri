<script lang="ts">
  import { Icon, Markdown, Modal } from '@colibri-hq/ui';
  import type { MaybePromise } from '@colibri-hq/shared';
  import type { Review } from './+page@(library).svelte';
  import ContentSection from '$lib/components/ContentSection.svelte';
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';

  dayjs.extend(relativeTime);

  interface Props {
    reviews: MaybePromise<Review[]>;
  }

  let { reviews }: Props = $props();
  let internalReviews = $derived(Promise.resolve(reviews));

  let reviewModalOpen = $state(false);
  let activeReview: Review | undefined = $state(undefined);

  function showReview(review: Review) {
    return () => {
      activeReview = review;
      reviewModalOpen = true;
    };
  }

  function handleModalClosed() {
    activeReview = undefined;
  }
</script>

<section
  class="rounded-3xl bg-gray-50 px-4 pt-4 pb-6 shadow-inner-sm dark:bg-gray-900"
>
  <header class="mb-2 px-3">
    <h3 class="font-serif text-xl font-bold dark:text-gray-200">Reviews</h3>
  </header>

  {#await internalReviews}
    <span>TODO: Loading Indicator...</span>
  {:then reviews}
    {#if reviews.length > 0}
      <ul class="flex flex-col gap-y-2">
        {#each reviews as review, index (index)}
          <li class="flex items-center space-x-2">
            <button
              onclick={showReview(review)}
              type="button"
              tabindex="0"
              class="group flex flex-col rounded-xl px-3
              py-1 transition outline-none hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:ring dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
              aria-labelledby="review-label-{review.id}"
            >
              <!-- region Reviewer and publication -->
              <strong
                class="inline-flex items-center font-semibold dark:text-gray-300"
              >
                {#if review.reviewer}
                  <span>{review.reviewer.name}</span>
                {/if}
                {#if review.reviewer && review.publication_name}
                  <span class="text-gray-500 dark:text-gray-400"
                  >&hairsp;—&hairsp;</span
                  >
                {/if}
                {#if review.publication_name}
                  <span>{review.publication_name}</span>
                {/if}
              </strong>
              <!-- endregion -->

              <!-- region Review excerpt -->
              <span
                class="block text-left leading-normal text-gray-700 dark:text-gray-300"
              >
                {review.excerpt}
              </span>
              <!-- endregion -->

              <!-- region "Read full" button -->
              <span
                class="mt-1 ml-auto flex items-center text-sm text-gray-500 transition group-hover:text-gray-900
                group-focus-visible:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-200
                dark:group-focus-visible:text-gray-200"
              >
                <span class="mr-1" id="review-label-{review.id}"
                >Read full review</span
                >
                <Icon
                  name="arrow_right_alt"
                  class="text-lg transition-transform group-hover:translate-x-0.5
                  group-focus-visible:translate-x-0.5"
                />
              </span>
              <!-- endregion -->
            </button>
          </li>
        {/each}
      </ul>

      <Modal bind:open={reviewModalOpen} onClose={handleModalClosed}>
        {#snippet header()}
          <h2 class="font-bold dark:text-gray-200">Review</h2>
        {/snippet}

        <ContentSection narrow>
          {#if activeReview}
            <Markdown source={activeReview.content} />

            <footer
              class="mt-8 mb-4 flex items-center justify-between text-sm text-gray-500"
            >
              {#if activeReview.url}
                <span>
                  Originally published at:
                  <a
                    href={activeReview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-500 hover:underline dark:text-blue-400"
                  >
                    {new URL(activeReview.url).hostname}
                  </a>
                </span>
              {/if}

              <span
              >Last updated: {dayjs(activeReview.created_at).fromNow()}</span
              >
            </footer>
          {/if}
        </ContentSection>
      </Modal>
    {:else}
      <div class="px-3 py-6">
        <p class="text-gray-500 dark:text-gray-600">
          There are no reviews available for this book yet.
        </p>
      </div>
    {/if}
  {/await}
</section>
