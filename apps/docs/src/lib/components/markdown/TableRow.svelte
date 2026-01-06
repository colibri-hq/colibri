<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    children?: Snippet;
    [key: string]: unknown;
  };

  const { children, ...rest }: Props = $props();
</script>

<tr {...rest} class="">
  {#if children}
    {@render children()}
  {/if}
</tr>
