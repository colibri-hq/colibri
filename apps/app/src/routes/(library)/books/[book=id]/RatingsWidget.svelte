<script lang="ts">
  import { Avatar } from '@colibri-hq/ui';
  import { StarRating } from '@colibri-hq/ui';
  import type { MaybePromise } from '@colibri-hq/shared';
  import type { Rating } from './+page@(library).svelte';

  interface Props {
    ratings: MaybePromise<Rating[]>;
  }

  let { ratings }: Props = $props();
</script>

<section
  class="rounded-3xl bg-gray-50 px-4 pb-6 pt-4 shadow-inner-sm dark:bg-gray-900"
>
  <header class="mb-2 px-3">
    <h3 class="font-serif text-xl font-bold dark:text-gray-200">Ratings</h3>
  </header>

  {#await Promise.resolve(ratings)}
    <span>TODO: Loading Indicator...</span>
  {:then ratings}
    {#if ratings.length}
      <ul class="flex flex-col space-y-2">
        {#each ratings as rating}
          <li class="flex items-center space-x-2">
            <Avatar user={{ email: rating.user_email }} size={16} />
            <StarRating
              starClasses="text-lg"
              disabled
              size="small"
              value={rating.rating}
            />
          </li>
        {/each}
      </ul>
    {:else}
      <div class="px-3 py-6">
        <p class="text-gray-500 dark:text-gray-600">
          There are no ratings available for this book yet.
        </p>
      </div>
    {/if}
  {/await}
</section>
