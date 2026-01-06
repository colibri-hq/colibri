<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    children: Snippet;
    [key: string]: unknown;
  };

  const { children, ...rest }: Props = $props();
</script>

<p {...rest} class="my-4 leading-relaxed transition-colors duration-200">
  {@render children()}
</p>
