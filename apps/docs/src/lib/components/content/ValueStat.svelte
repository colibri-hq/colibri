<script lang="ts">
  import type { Snippet } from 'svelte';
  import { twMerge } from 'tailwind-merge';

  type Props = {
    label: string | Snippet;
    value: string | Snippet;
    class?: string;
    [key: string]: unknown;
  };

  const { label, value, class: className = '', ...rest }: Props = $props();
</script>


<div
  {...rest}
  class={twMerge("flex flex-col md:flex-row md:items-center gap-2 ring ring-gray-200 rounded-lg", className)}
>
  {#if label}
    <span class="text-gray-600 dark:text-gray-400 font-medium mr-2">
      {#if typeof label === 'string'}
        {label}
      {:else}
        {@render label()}
      {/if}
    </span>
  {/if}

  <span class="text-5xl font-semibold">
    {#if typeof value === 'string'}
      {value}
    {:else}
      {@render value()}
    {/if}
  </span>
</div>
