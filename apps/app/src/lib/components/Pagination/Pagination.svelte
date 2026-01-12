<script lang="ts">
  import PaginationButton from '$lib/components/Pagination/PaginationButton.svelte';
  import { Icon } from '@colibri-hq/ui';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLElement> {
    /**
     * The total number of pages.
     */
    total: number | `${number}`;

    /**
     * The current page number.
     */
    current?: number | `${number}`;

    /**
     * The maximum number of pages to show in the pagination.
     */
    max?: number | `${number}`;

    /**
     * Whether to show the first and last buttons.
     *
     * Pass `'auto'` to show them only if there are more pages than the `max` prop.
     */
    firstLast?: boolean | 'auto';

    /**
     * Whether to show the previous and next buttons.
     */
    prevNext?: boolean;

    // Event callbacks
    onfirst?: () => void;
    onlast?: () => void;
    onprevious?: () => void;
    onnext?: () => void;
    onpage?: (page: number) => void;

    // Snippets for custom labels
    firstLabel?: Snippet;
    prevLabel?: Snippet;
    nextLabel?: Snippet;
    lastLabel?: Snippet;
  }

  let {
    class: className = '',
    total,
    current = 1,
    max = 5,
    firstLast = 'auto',
    prevNext = true,
    onfirst,
    onlast,
    onprevious,
    onnext,
    onpage,
    firstLabel,
    prevLabel,
    nextLabel,
    lastLabel,
    ...rest
  }: Props = $props();

  let pages = $derived(Array.from({ length: +total }, (_, i) => i + 1));
  let showFirstLast = $derived(firstLast === 'auto' ? +total > +max : firstLast);
  let showPrevNext = $derived(prevNext && +total > 1);

  function isCurrent(page: number) {
    return page === current;
  }

  function handleFirst() {
    onfirst?.();
  }

  function handleLast() {
    onlast?.();
  }

  function handlePrevious() {
    onprevious?.();
  }

  function handleNext() {
    onnext?.();
  }

  function handlePage(page: number) {
    return () => onpage?.(page);
  }
</script>

{#if +total > 1}
  <nav aria-label="Pagination" class="flex {className}" {...rest}>
    <ul
      class="mx-auto flex rounded-full bg-gray-100 p-2 shadow-inner-sm dark:bg-gray-900 dark:shadow-inner"
    >
      {#if showFirstLast}
        <li class="group/pagination contents">
          <PaginationButton
            label="First Page"
            disabled={current === 1}
            onclick={handleFirst}
          >
            {#if firstLabel}
              {@render firstLabel()}
            {:else}
              <Icon
                name="keyboard_double_arrow_left"
                class="mr-0.5 text-lg leading-none"
              />
            {/if}
          </PaginationButton>
        </li>
      {/if}

      {#if showPrevNext}
        <li class="group/pagination contents">
          <PaginationButton
            label="Previous Page"
            disabled={current === 1}
            onclick={handlePrevious}
          >
            {#if prevLabel}
              {@render prevLabel()}
            {:else}
              <Icon
                name="keyboard_arrow_left"
                class="mr-px text-lg leading-none"
              />
            {/if}
          </PaginationButton>
        </li>
      {/if}

      {#each pages as page, index (index)}
        <li class="group/pagination contents">
          <PaginationButton
            label="Page {page}{isCurrent(page) ? ' (current)' : ''}"
            active={isCurrent(page)}
            disabled={isCurrent(page)}
            onclick={handlePage(page)}
          >
            <span>{page}</span>
          </PaginationButton>
        </li>
      {/each}

      {#if showPrevNext}
        <li class="group/pagination contents">
          <PaginationButton
            label="Next Page"
            disabled={current === total}
            onclick={handleNext}
          >
            {#if nextLabel}
              {@render nextLabel()}
            {:else}
              <Icon
                name="keyboard_arrow_right"
                class="ml-px text-lg leading-none"
              />
            {/if}
          </PaginationButton>
        </li>
      {/if}

      {#if showFirstLast}
        <li class="group/pagination contents">
          <PaginationButton
            label="Last Page"
            disabled={current === total}
            onclick={handleLast}
          >
            {#if lastLabel}
              {@render lastLabel()}
            {:else}
              <Icon
                name="keyboard_double_arrow_right"
                class="ml-0.5 text-lg leading-none"
              />
            {/if}
          </PaginationButton>
        </li>
      {/if}
    </ul>
  </nav>
{/if}
