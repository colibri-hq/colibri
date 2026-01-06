<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    children?: Snippet;
    [key: string]: unknown;
  };

  const { children, ...rest }: Props = $props();
</script>

<td
  {...rest}
  class="pe-4 py-2 align-top border-t border-gray-300 dark:border-gray-700 transition-colors duration-200"
>
  {#if children}
    {@render children()}
  {/if}
</td>
