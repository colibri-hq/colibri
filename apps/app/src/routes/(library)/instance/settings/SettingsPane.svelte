<script lang="ts">
  import { twMerge } from 'tailwind-merge';
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    actions?: Snippet;
    description?: string | Snippet;
    class?: string;

    [key: string]: unknown;
  }

  const {
    children,
    actions,
    description,
    class: className,
    ...rest
  }: Props = $props();
</script>

<article {...rest} class={twMerge('flex flex-col', className)}>
  <header
    class="mb-8 flex flex-wrap items-start justify-between lg:flex-row lg:flex-nowrap lg:items-center"
  >
    <p class="mr-auto mb-4 w-full lg:mb-0 lg:w-auto text-gray-700 dark:text-gray-400">
      {#if typeof description === 'string'}
        {description}
      {:else if description}
        {@render description()}
      {/if}
    </p>

    {#if actions}
      {@render actions?.()}
    {/if}
  </header>

  {@render children?.()}
</article>
