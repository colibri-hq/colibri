<script lang="ts">
  import type { BreadcrumbItem } from '$lib/content/content';
  import { ChevronRightIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  type Props = {
    items: BreadcrumbItem[];
    class?: string;
    separator?: Snippet<[number, number]>;
    label?: Snippet<[string, number, number]>;
    [key: string]: unknown;
  };

  const { items, class: className, separator, label, ...rest }: Props = $props();
</script>

<nav {...rest} class={className} aria-label="Breadcrumb">
  <ol class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
    {#each items as { href, title }, index (index)}
      <li class="flex items-center gap-1">
        {#if index > 0}
          {#if separator}
            {@render separator(index, items.length)}
          {:else}
            <ChevronRightIcon strokeWidth={3} class="size-4 text-gray-400 dark:text-gray-500" />
          {/if}
        {/if}

        {#if label}
          {@render label(title, index, items.length)}
        {:else}
          {#if index === items.length - 1}
            <span aria-current="page" class="text-gray-700 dark:text-gray-300">
              {title}
            </span>
          {:else}
            <a
              {href}
              class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus-visible:text-blue-600 dark:focus-visible:text-blue-400 outline-hidden"
            >
              {title}
            </a>
          {/if}
        {/if}
      </li>
    {/each}
  </ol>
</nav>
