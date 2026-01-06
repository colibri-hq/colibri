<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    name?: string;
    value?: string | number;
    secondary?: Snippet;
    children?: Snippet;
  }

  let { name, value, secondary, children }: Props = $props();
</script>

<li
  class="flex grow flex-col items-center border-r border-gray-200 px-4
  last:border-r-0 dark:border-r-gray-700"
>
  <span class="mb-1 text-sm font-bold uppercase dark:text-gray-500">
    {name}
  </span>
  <div
    class="flex grow flex-col items-center justify-center dark:text-gray-300"
  >
    <span class="text-2xl leading-none font-bold">
      {#if children}
        {@render children()}
      {:else}
        {value}
      {/if}
    </span>

    {#if secondary}
      {@render secondary()}
    {/if}
  </div>
</li>
