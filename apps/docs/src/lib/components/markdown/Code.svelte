<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    children: Snippet;
    [key: string]: unknown;
  };

  const { children, ...rest }: Props = $props();
</script>

<code
  {...rest}
  class="bg-blue-100 text-blue-800 dark:bg-gray-800 dark:text-blue-300
  px-1.5 py-0.5 rounded font-mono text-sm transition-colors duration-200">
  {@render children()}
</code>
