<script lang="ts">
  import { ArrowLeftIcon } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import type { Snippet } from 'svelte';

  type Props = {
    label?: string;
    children?: Snippet<[string, string]>;
    route?: string;
    [key: string]: unknown;
  };

  const {
    children,
    label = 'Back to Blog',
    route = '/blog',
    ...rest
  }: Props = $props();

  // @ts-expect-error Dynamic route resolution
  const href = $derived(resolve(route));
</script>

<a
  {...rest}
  {href}
  class="inline-flex items-center gap-1 mb-4 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600
  dark:hover:text-blue-400 outline-hidden focus-visible:text-blue-500"
>
  <ArrowLeftIcon class="size-4" />

  {#if children}
    {@render children(href, label)}
  {:else}
    <span>{label}</span>
  {/if}
</a>
