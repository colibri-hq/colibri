<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    children: Snippet;
    [key: string]: unknown;
  };

  const { children, ...rest }: Props = $props();
</script>

<pre {...rest} class="my-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800 font-mono overflow-x-auto">
  {@render children()}
</pre>
