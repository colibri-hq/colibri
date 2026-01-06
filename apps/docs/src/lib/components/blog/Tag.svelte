<script lang="ts">
  import type { Snippet } from 'svelte';
  import { twMerge } from 'tailwind-merge';
  import { TagIcon } from '@lucide/svelte';
  import { resolve } from '$app/paths';

  type Props = {
    label: string;
    linked?: boolean;
    count?: number;
    class?: string;
    children?: Snippet<[string]>;
    size?: 'small' | 'medium' | 'large';
    variant?: 'default' | 'primary';
    [key: string]: unknown;
  };

  const { children, label, class: className, linked, count, size, variant, ...rest }: Props = $props();

  const classList = 'group inline-flex items-center gap-2 px-2 py-0.5 rounded-md text-sm font-medium transition ' +
    'outline-hidden ring-0 focus-visible:ring-2 focus-visible:ring-blue-500 data-[size=small]:px-1.5 ' +
    'data-[size=small]:text-xs data-[size=small]:py-0 data-[size=large]:px-4 data-[size=large]:py-2 ' +
    'data-[size=large]:text-base bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 ' +
    'data-[variant=primary]:bg-blue-100  dark:data-[variant=primary]:bg-blue-900/40 ' +
    'data-[variant=primary]:text-blue-700 dark:data-[variant=primary]:text-blue-300';
</script>

{#if linked}
  <a
    {...rest}
    href={resolve('/(blog)/blog/tag/[tag]', { tag: label })}
    data-size={size}
    data-variant={variant ?? 'default'}
    class={twMerge(
     classList,
     'hover:bg-blue-100 dark:hover:bg-blue-900/50 data-[variant=primary]:hover:bg-blue-200 ' +
     'hover:text-blue-600 dark:hover:text-blue-400 ' +
     'data-[variant=primary]:hover:bg-blue-200 dark:data-[variant=primary]:hover:bg-blue-900/60',
     className
    )}
  >
    <TagIcon
      class="hidden group-data-[size=large]:inline size-4 transition
      text-gray-500 dark:text-gray-400
      group-hover:text-blue-600 dark:group-hover:text-blue-400
      group-data-[variant=primary]:text-blue-500 dark:group-data-[variant=primary]:text-blue-400
      group-data-[variant=primary]:group-hover:text-blue-600
      dark:group-data-[variant=primary]:group-hover:text-blue-300"
    />

    {#if children}
      {@render children(label)}
    {:else}
      <span>{label}</span>
    {/if}

    {#if count !== undefined}
      <span
        class="leading-4 text-sm font-normal px-1.5 rounded-full transition group-data-[size=small]:text-xs
          bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300
          group-data-[variant=primary]:bg-blue-200 dark:group-data-[variant=primary]:bg-blue-800
          group-data-[variant=primary]:text-blue-800 dark:group-data-[variant=primary]:text-blue-200
          group-hover:bg-blue-200 group-hover:text-blue-600 dark:group-hover:bg-blue-900/60
          dark:group-hover:text-blue-400 group-data-[variant=primary]:group-hover:bg-blue-300
          group-data-[variant=primary]:group-hover:text-blue-600
          dark:group-data-[variant=primary]:group-hover:bg-blue-800
          group-data-[variant=primary]:dark:group-hover:text-blue-300"
      >
        {count}
      </span>
    {/if}
  </a>
{:else}
  <span
    {...rest}
    data-size={size}
    data-variant={variant ?? 'default'}
    class={twMerge(classList, className)}
  >
    <TagIcon
      class="hidden group-data-[size=large]:inline size-4 transition text-gray-500 dark:text-gray-400
      group-data-[variant=primary]:text-blue-500 group-data-[variant=primary]:dark:text-blue-400"
    />

    {#if children}
      {@render children(label)}
    {:else}
      <span>{label}</span>
    {/if}

    {#if count !== undefined}
      <span
        class="leading-4 text-xs font-normal px-1.5 rounded-full transition group-data-[size=large]:text-sm
        group-data-[size=small]:px-0.5 group-data-[size=small]:leading-none
        bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300
        group-data-[variant=primary]:bg-blue-200 group-data-[variant=primary]:dark:bg-blue-800
        group-data-[variant=primary]:text-blue-800 group-data-[variant=primary]:dark:text-blue-200"
      >
        {count}
      </span>
    {/if}
  </span>
{/if}
