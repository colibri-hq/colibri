<script lang="ts">
  import { ArrowUpRightIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  type Props = {
    href: string;
    tag?: string;
    label?: string;
    children?: Snippet<[string]>;
    class?: string;
    [key: string]: unknown;
  };

  const { href, children, tag = 'strong', label, class: className, ...rest }: Props = $props();
</script>

<a
  {...rest}
  {href}
  class="group flex items-center font-semibold mb-2 hover:text-blue-600 dark:hover:text-blue-400
  focus-visible:text-blue-600 dark:focus-visible:text-blue-400 outline-hidden transition-colors {className}"
>
  {#if children}
    {@render children(label ?? '')}
  {:else}
    <svelte:element this={tag}>{label}</svelte:element>
  {/if}

  <ArrowUpRightIcon
    strokeWidth="2.5"
    class="translate-x-0 group-hover:translate-x-1 group-focus:translate-x-1 opacity-0 group-hover:opacity-100
    group-focus:opacity-100 transition duration-200 inline size-3"
  />
</a>
