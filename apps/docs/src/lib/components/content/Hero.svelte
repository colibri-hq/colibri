<script lang="ts">
  import type { Snippet } from 'svelte';
  import ContentContainer from '$lib/components/ContentContainer.svelte';

  type Props = {
    title: string | Snippet;
    subtitle?: string | Snippet;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  };

  const {
    title,
    subtitle,
    children,
    class: className = '',
    ...rest
  }: Props = $props();
</script>

<ContentContainer {...rest} tag="header" class="{className} py-12 text-center">
  <h1 class="text-4xl md:text-7xl font-bold font-serif mb-4">
    {#if typeof title === 'string'}
      {title}
    {:else}
      {@render title()}
    {/if}
  </h1>

  {#if subtitle}
    <p class="text-xl md:text-2xl text-gray-700 dark:text-gray-300">
      {#if typeof subtitle === 'string'}
        {subtitle}
      {:else}
        {@render subtitle()}
      {/if}
    </p>
  {/if}

  {@render children?.()}
</ContentContainer>
