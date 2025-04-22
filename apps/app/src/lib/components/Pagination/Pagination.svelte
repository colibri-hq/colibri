<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot making the component unusable -->
<script lang="ts">
  import PaginationButton from '$lib/components/Pagination/PaginationButton.svelte';
    import { Icon } from '@colibri-hq/ui';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    page: number;
    first;
    previous;
    next;
    last;
  }>();

  let className = '';
  export { className as class };

  /**
   * The total number of pages.
   */
  export let total: number | `${number}`;

  /**
   * The current page number.
   */
  export let current: number | `${number}` = 1;
  $: pages = Array.from({ length: +total }, (_, i) => i + 1);

  /**
   * The maximum number of pages to show in the pagination.
   */
  export let max: number | `${number}` = 5;

  /**
   * Whether to show the first and last buttons.
   *
   * Pass `'auto'` to show them only if there are more pages than the `max` prop.
   */
  export let firstLast: boolean | 'auto' = 'auto';
  $: showFirstLast = firstLast === 'auto' ? +total > +max : firstLast;

  /**
   * Whether to show the previous and next buttons.
   */
  export let prevNext: boolean = true;
  $: showPrevNext = prevNext && +total > 1;

  function isCurrent(page: number) {
    return page === current;
  }

  function first() {
    return () => dispatch('first');
  }

  function last() {
    return () => dispatch('last');
  }

  function previous() {
    return () => dispatch('previous');
  }

  function next() {
    return () => dispatch('next');
  }

  function toPage(page: number) {
    return () => dispatch('page', page);
  }
</script>

{#if +total > 1}
  <nav aria-label="Pagination" class="flex {className}" {...$$restProps}>
    <ul
      class="mx-auto flex rounded-full bg-gray-100 p-2 shadow-inner-sm dark:bg-gray-900 dark:shadow-inner"
    >
      {#if showFirstLast}
        <li class="group/pagination contents">
          <PaginationButton
            label="First Page"
            disabled={current === 1}
            onClick={first}
          >
            <slot name="first:label">
              <Icon
                name="keyboard_double_arrow_left"
                class="mr-0.5 text-lg leading-none"
              />
            </slot>
          </PaginationButton>
        </li>
      {/if}

      {#if showPrevNext}
        <li class="group/pagination contents">
          <PaginationButton
            label="Previous Page"
            disabled={current === 1}
            onClick={previous}
          >
            <slot name="prev:label">
              <Icon
                name="keyboard_arrow_left"
                class="mr-px text-lg leading-none"
              />
            </slot>
          </PaginationButton>
        </li>
      {/if}

      {#each pages as page}
        <li class="group/pagination contents">
          <PaginationButton
            label="Page {page}{isCurrent(page) ? ' (current)' : ''}"
            active={isCurrent(page)}
            disabled={isCurrent(page)}
            onClick={toPage(page)}
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
            onClick={next}
          >
            <slot name="next:label">
              <Icon
                name="keyboard_arrow_right"
                class="ml-px text-lg leading-none"
              />
            </slot>
          </PaginationButton>
        </li>
      {/if}

      {#if showFirstLast}
        <li class="group/pagination contents">
          <PaginationButton
            label="Last Page"
            disabled={current === total}
            onClick={last}
          >
            <slot name="last:label">
              <Icon
                name="keyboard_double_arrow_right"
                class="ml-0.5 text-lg leading-none"
              />
            </slot>
          </PaginationButton>
        </li>
      {/if}
    </ul>
  </nav>
{/if}
