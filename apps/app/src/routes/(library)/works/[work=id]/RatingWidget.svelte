<script lang="ts">
  import { StarRating } from '@colibri-hq/ui';
  import type { MaybePromise } from '@colibri-hq/shared';
  import { page } from '$app/state';
  import type { Work, Rating } from './+page@(library).svelte';
  import { savable, trpc } from '$lib/trpc/client';

  interface Props {
    class?: string;
    work: Pick<Work, 'id'>;
    ratings: MaybePromise<Rating[]>;
    onView?: () => unknown;
    onRating?: (rating: number) => unknown;
    [key: string]: unknown;
  }

  let {
    class: className = '',
    work,
    ratings,
    onRating,
    onView,
    ...rest
  }: Props = $props();

  let resolvedRatings = $state<{ average: number; user: number | undefined } | null>(null);
  let localUserRating = $state<number | undefined>(undefined);
  let loading = $state(false);

  $effect(() => {
    Promise.resolve(ratings).then((data) => {
      const sum = data.reduce((acc, { rating }) => acc + rating, 0);
      const userRating = data.find(({ user_id }) => user_id === page.data.user.id);

      resolvedRatings = {
        average: data.length > 0 ? sum / data.length : 0,
        user: userRating?.rating,
      };
    });
  });

  let displayValue = $derived(
    localUserRating ?? resolvedRatings?.user ?? resolvedRatings?.average ?? 0,
  );

  async function updateRating(rating: number) {
    loading = true;
    localUserRating = rating;

    try {
      await trpc(page).books.updateRating.mutate(savable({ workId: work.id, rating }));
      onRating?.(rating);
    } catch {
      localUserRating = undefined;
    } finally {
      loading = false;
    }
  }
</script>

{#if resolvedRatings === null}
  <p>Loading ratings...</p>
{:else}
  <div
    class="group mt-2 flex max-w-max items-center rounded-full py-1 pr-1 pl-2 transition
    focus-within:bg-gray-100 hover:bg-gray-100
    dark:focus-within:bg-gray-900 dark:hover:bg-gray-900 {className}"
    {...rest}
  >
    <StarRating
      disabled={loading}
      class="text-yellow-500 dark:text-yellow-600"
      value={displayValue}
      max="5"
      onChange={updateRating}
    />

    <button
      class="ml-2 -translate-x-2 rounded-full bg-gray-200 px-3 py-0.5 text-gray-600
      opacity-0 shadow-sm transition outline-none group-focus-within:translate-x-0
      group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100 hover:bg-gray-300
      focus-visible:bg-gray-300 focus-visible:ring focus-visible:ring-gray-500
      dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/75 dark:hover:text-gray-300
      dark:focus-visible:bg-gray-700 dark:focus-visible:text-gray-300"
      onclick={() => onView?.()}
    >
      View all
    </button>
  </div>
{/if}
