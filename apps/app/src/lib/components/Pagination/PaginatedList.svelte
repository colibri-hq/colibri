<script generics="T" lang="ts">
  import LoadingSpinner from '$lib/LoadingSpinner.svelte';
  import Pagination from '$lib/components/Pagination/Pagination.svelte';
  import type { MaybePromise } from '@colibri-hq/shared';
  import type { PaginationData } from '$lib/trpc/client';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { fade } from 'svelte/transition';
  import type { Snippet } from 'svelte';

  interface Props {
    /**
     * The data to display in the list.
     *
     * This should be a promise that resolves to an array of items and a pagination object.
     */
    data: MaybePromise<[T[], PaginationData]>;

    /**
     * The duration of the transition in milliseconds.
     */
    transitionDuration?: number;

    /**
     * The delay before the transition appears in milliseconds.
     */
    transitionAppearDelay?: number;

    /**
     * The maximum number of pages to show in the pagination.
     */
    max?: number | `${number}`;

    /**
     * Whether to show the first and last buttons.
     */
    firstLast?: boolean | 'auto';

    /**
     * Whether to show the previous and next buttons.
     */
    prevNext?: boolean;

    /**
     * Whether to automatically update the page query parameter.
     */
    queryParam?: false | string;

    onChange?: (event: { page: number }) => unknown;

    loadingIndicator?: Snippet;
    children?: Snippet<[{ items: T[]; pagination: PaginationData }]>;
    paginator?: Snippet<
      [
        {
          items: T[];
          pagination: PaginationData;
          updatePage: (
            to?: number,
          ) => (event: CustomEvent<number | void>) => unknown;
          max: number | `${number}`;
          firstLast: boolean | 'auto';
          prevNext: boolean;
        },
      ]
    >;
  }

  const {
    data,
    transitionDuration = 100,
    transitionAppearDelay = 0,
    max = 5,
    firstLast = 'auto',
    prevNext = true,
    queryParam = 'page',

    onChange,

    loadingIndicator,
    children,
    paginator,
  }: Props = $props();

  const transition = $derived.by(() => ({ duration: transitionDuration }));

  function updatePage(to?: number) {
    return ({ detail }: CustomEvent<number | void>) => {
      const target = detail ?? to ?? 1;
      onChange?.({ page: target });

      if (!queryParam) {
        return;
      }

      const url = new URL(page.url);

      if (target === 1) {
        url.searchParams.delete(queryParam);
      } else {
        url.searchParams.set(queryParam, target.toString());
      }

      goto(url);
    };
  }
</script>

<div class="grid">
  {#await Promise.resolve(data)}
    <div
      class="col-span-full row-span-full flex justify-center py-16"
      in:fade={transition}
      out:fade={transition}
    >
      {#if loadingIndicator}
        {@render loadingIndicator()}
      {:else}
        <LoadingSpinner />
      {/if}
    </div>
  {:then [items, pagination]}
    <div
      class="col-span-full row-span-full"
      in:fade={{ delay: transitionAppearDelay, ...transition }}
      out:fade={transition}
    >
      {#if children}
        {@render children({ items, pagination })}
      {/if}

      {#if paginator}
        {@render paginator({
          items,
          pagination,
          updatePage,
          max,
          firstLast,
          prevNext,
        })}
      {:else}
        <Pagination
          class="mt-8"
          {max}
          {firstLast}
          {prevNext}
          total={Number(pagination.last_page)}
          current={Number(pagination.page)}
          on:page={updatePage()}
          on:first={updatePage(1)}
          on:last={updatePage(Number(pagination.last_page))}
          on:previous={updatePage(Number(pagination.page) - 1)}
          on:next={updatePage(Number(pagination.page) + 1)}
        />
      {/if}
    </div>
  {/await}
</div>
