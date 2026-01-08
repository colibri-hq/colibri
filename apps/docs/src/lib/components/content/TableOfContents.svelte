<script lang="ts">
  import { page } from '$app/state';
  import { tick } from 'svelte';
  import type { TocHeading } from '$lib/content/content';
  import { TableOfContentsIcon } from '@lucide/svelte';
  import { SvelteSet } from 'svelte/reactivity';

  type Props = {
    /** Headings extracted from the document (server-provided) */
    headings: TocHeading[];
    class?: string;
  };

  const { headings, class: className = '' }: Props = $props();

  let activeId = $state<string | null>(null);
  let observer: IntersectionObserver | null = null;

  // Set up intersection observer for active heading tracking
  $effect(() => {
    // Track pathname to re-run on navigation
    void page.url.pathname;

    // Clean up previous observer
    observer?.disconnect();
    observer = null;
    activeId = null;

    if (headings.length === 0) {
      return;
    }

    // Wait for DOM to update after navigation
    tick().then(() => {
      const headingIds = headings.map((item) => item.id);
      const elements = headingIds
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => element !== null);

      if (elements.length === 0) {
        // Set first heading as active if no elements found yet
        activeId = headings[0]?.id ?? null;
        return;
      }

      // Track headings that have passed the top threshold
      const passedHeadings = new SvelteSet<string>();

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting && entry.boundingClientRect.top < 100) {
              passedHeadings.add(entry.target.id);
            } else if (entry.isIntersecting) {
              passedHeadings.delete(entry.target.id);
            }
          });

          // Find the last heading that was passed (or first if none passed)
          let lastPassedIndex = -1;

          for (let index = 0; index < headings.length; index++) {
            if (passedHeadings.has(headings[index]!.id)) {
              lastPassedIndex = index;
            }
          }

          // Active heading is the one after the last passed, or the first one
          const activeIndex = lastPassedIndex >= 0 ? lastPassedIndex : 0;
          activeId = headings[activeIndex]?.id ?? null;
        },
        {
          rootMargin: '-40px 0px 0px 0px',
          threshold: 0,
        },
      );

      elements.forEach((element) => observer?.observe(element));
    });

    return () => observer?.disconnect();
  });
</script>

{#if headings.length > 0}
  <nav class="relative pb-1 {className}" aria-label="Table of Contents">
    <a
      href="#top"
      class="no-underline text-gray-900 dark:text-gray-100 outline-hidden focus-visible:text-blue-600
      dark:focus-visible:text-blue-400 transition-colors duration-150"
    >
      <h2 class="flex items-center gap-2 text-sm font-semibold select-none">
        <TableOfContentsIcon class="size-4" />
        On this page
      </h2>
    </a>

    <ul class="flex flex-col gap-2 text-sm border-l border-gray-200 dark:border-gray-700 mt-4">
      {#each headings as { id, level, text } (id)}
        <li
          data-level={level - 1}
          class="-ms-px border-s-2 ps-12 data-[level=0]:ps-2 data-[level=1]:ps-4 data-[level=2]:ps-6 data-[level=3]:ps-9
          group {activeId === id ? 'border-blue-500' : 'border-transparent'}"
        >
          <a
            href="#{id}"
            onclick={() => (activeId = id)}
            class="text-left w-full transition duration-150 focus-visible:text-blue-600
            dark:focus-visible:text-blue-400 outline-hidden group-data-[level=2]:text-gray-500
            group-data-[level=3]:text-gray-500
              {activeId === id
                ? 'text-blue-600 dark:text-blue-400 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}"
          >
            {text}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
{/if}
