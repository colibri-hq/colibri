<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    children?: Snippet;
    [key: string]: unknown;
  };

  const { children, ...rest }: Props = $props();
</script>

<table {...rest} class="my-6 w-full table-auto border-collapse">
  {#if children}
    {@render children()}
  {/if}
</table>
