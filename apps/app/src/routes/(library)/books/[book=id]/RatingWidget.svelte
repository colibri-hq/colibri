<script lang="ts">
  import { StarRating } from '@colibri-hq/ui';
  import type { MaybePromise } from '@colibri-hq/shared';
  import { page } from '$app/stores';
  import type { Book, Rating } from './+page@(library).svelte';
  import { savable, trpc } from '$lib/trpc/client';

  interface Props {
    class?: string;
    book: Pick<Book, 'id'>;
    ratings: MaybePromise<Rating[]>;
    onView?: () => unknown;
    onRating?: (rating: number) => unknown;

    [key: string]: any;
  }

  let {
    class: className = '',
    book,
    ratings,
    onRating,
    onView,
    ...rest
  }: Props = $props();
  let internalRating = $derived(
    Promise.resolve(ratings).then((ratings) => {
      const sum = ratings.reduce((sum, { rating }) => sum + rating, 0);
      const { rating } = ratings.find(
        ({ user_id }) => user_id === $page.data.user.id,
      ) ?? { rating: undefined };

      return {
        average: sum / ratings.length,
        user: rating,
      };
    }),
  );

  let loading = $state(false);

  async function updateRating(rating: number) {
    loading = true;

    try {
      await trpc($page).books.updateRating.mutate(
        savable({
          bookId: book.id,
          rating,
        }),
      );
      onRating?.(rating);
    } finally {
      loading = false;
    }
  }

  function viewAll() {
    onView?.();
  }
</script>

{#await internalRating}
  <p>Loading ratings...</p>
{:then { user, average }}
  <div
    class="group mt-2 flex max-w-max items-center
    rounded-full py-1 pl-2 pr-1 transition focus-within:bg-gray-100 hover:bg-gray-100
    dark:focus-within:bg-gray-900 dark:hover:bg-gray-900 {className}"
    {...rest}
  >
    <StarRating
      disabled={loading}
      class="text-yellow-500 dark:text-yellow-600"
      value={user ?? average}
      max="5"
      onChange={updateRating}
    />

    <button
      class="ml-2 -translate-x-2 rounded-full bg-gray-200 px-3 py-0.5 text-gray-600
      opacity-0 shadow-sm outline-none transition hover:bg-gray-300
      focus-visible:bg-gray-300 focus-visible:ring focus-visible:ring-gray-500 group-focus-within:translate-x-0
      group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100
      dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/75 dark:hover:text-gray-300
      dark:focus-visible:bg-gray-700 dark:focus-visible:text-gray-300"
      onclick={viewAll}
    >
      View all
    </button>
  </div>
{/await}
