<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    children: Snippet;
    [key: string]: unknown;
  };

  const { children, ...rest }: Props = $props();
</script>

<blockquote
  {...rest}
  class="my-4 border-s-2 ps-4 border-blue-200 dark:border-blue-700 transition-colors text-gray-600 dark:text-gray-400 italic"
>
  {@render children()}
</blockquote>

<style>
    blockquote :global {
        p {
            margin: 0;
        }
    }
</style>
