<script lang="ts">
  import { ArrowLeftIcon, ArrowRightIcon } from '@lucide/svelte';

  type Props = {
    previous?: { title: string; href: string };
    next?: { title: string; href: string };
    [key: string]: unknown;
  };

  const {
    previous,
    next,
    ...rest
  }: Props = $props();
</script>

{#if previous || next}
  <nav
    {...rest}
    class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-8 mt-12"
    aria-label="Adjacent content navigation"
  >
    {#if previous}
      <a
        href={previous.href}
        class="group flex flex-wrap gap-x-2 gap-y-1 items-center p-4 rounded-lg ring ring-gray-200
        dark:ring-gray-700 focus-visible:ring-3 focus-visible:ring-blue-500 hover:ring-blue-500 bg-white
        dark:bg-gray-900 transition outline-hidden"
      >
        <ArrowLeftIcon
          class="size-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-700
          dark:group-hover:text-gray-300 group-hover:-translate-x-1 transition"
          strokeWidth={2}
        />
        <span class="text-sm text-gray-500 dark:text-gray-400">Previous</span>
        <span
          class="w-full font-semibold text-gray-900 dark:text-white group-hover:text-blue-600
          dark:group-hover:text-blue-400 group-focus-visible:text-blue-600
          dark:group-focus-visible:text-blue-400 transition-colors"
        >
          {previous.title}
        </span>
      </a>
    {/if}

    {#if next}
      <a
        href={next.href}
        class="group flex flex-wrap gap-x-2 gap-y-1 items-center justify-end p-4 rounded-lg ring ring-gray-200 dark:ring-gray-700
        focus-visible:ring-3 focus-visible:ring-blue-500 hover:ring-blue-500 bg-white dark:bg-gray-900
        transition outline-hidden md:col-start-2"
      >
        <span class="text-sm text-gray-500 dark:text-gray-400">Next</span>
        <ArrowRightIcon
          class="size-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-700
          dark:group-hover:text-gray-300 group-hover:translate-x-1 transition"
          strokeWidth={2}
        />
        <span
          class="w-full text-end font-semibold text-gray-900 dark:text-white group-hover:text-blue-600
          dark:group-hover:text-blue-400 group-focus-visible:text-blue-600
          dark:group-focus-visible:text-blue-400 transition-colors"
        >
          {next.title}
        </span>
      </a>
    {/if}
  </nav>
{/if}
