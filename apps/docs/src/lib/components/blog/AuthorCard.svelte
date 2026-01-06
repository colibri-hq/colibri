<script lang="ts">
  import type { AuthorWithGravatar } from '$lib/content/author';
  import { resolve } from '$app/paths';
  import { twMerge } from 'tailwind-merge';
  import Avatar from './Avatar.svelte';

  type Props = {
    author: AuthorWithGravatar;
    count?: number;
    size?: 'small' | 'medium' | 'large';
    linked?: boolean;
    class?: string;
    [key: string]: unknown;
  };

  const { author, count, class: className, size = 'medium', linked = false, ...rest }: Props = $props();
</script>


<svelte:element
  this={linked ? 'a' : 'span'}
  {...rest}
  href={linked ? resolve('/(blog)/blog/author/[author]', {author: author.name}) : undefined}
  data-size={size}
  class={twMerge(
    "group inline-grid grid-cols-[auto_1fr] data-[size=small]:grid-cols-[max-content_min-content_min-content] " +
    "auto-rows-min items-center gap-x-3 data-[size=small]:gap-x-2 gap-y-0.5 p-1 pe-3 rounded-md outline-hidden " +
    "transition ring-0",
    linked ? 'focus-visible:ring-2 focus-visible:ring-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50' : '',
    className,
  )}
>
  <Avatar
    src={author.gravatarUrl}
    alt={author.name}
    {size}
    class={size === 'small' ? 'row-span-1' : 'row-span-2'}
  />

  <span
    class="group-data-[size=small]:text-sm group-data-[size=medium]:text-base group-data-[size=large]:text-lg truncate
    font-medium text-gray-900 dark:text-gray-200 group-focus-visible:text-blue-600
    dark:group-focus-visible:text-blue-300 transition-colors"
  >
    {author.name}
  </span>

  {#if count !== undefined}
    <span
      class="font-normal rounded-full transition text-sm group-data-[size=small]:text-xs
        group-data-[size=small]:px-1.5 group-data-[size=small]:leading-4 group-data-[size=small]:bg-gray-200
        dark:group-data-[size=small]:bg-gray-800 text-gray-500 dark:text-gray-400
        group-data-[size=small]:text-gray-600 dark:group-data-[size=small]:text-gray-300
        group-data-[size=small]:group-focus-visible:text-blue-600
        dark:group-data-[size=small]:group-focus-visible:text-blue-300
        group-data-[size=small]:group-hover:bg-blue-200 dark:group-data-[size=small]:group-hover:bg-blue-900/50
        group-data-[size=small]:group-hover:text-blue-600 dark:group-data-[size=small]:group-hover:text-blue-400"
    >
      <span>{count}</span>
      <span class="inline group-data-[size=small]:hidden">
        {count === 1 ? "post" : "posts"}
      </span>
    </span>
  {/if}
</svelte:element>
