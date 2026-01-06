<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    children: Snippet;
    [key: string]: unknown;
  };

  const { children, ...rest }: Props = $props();
</script>

<li {...rest} class="mb-2 ml-6 leading-relaxed">
  {@render children()}
</li>
