<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    children: Snippet;
    [key: string]: unknown;
  };

  const { children, ...rest }: Props = $props();
</script>

<ol {...rest} class="list-decimal my-4 space-y-2 ps-5">
  {@render children()}
</ol>
