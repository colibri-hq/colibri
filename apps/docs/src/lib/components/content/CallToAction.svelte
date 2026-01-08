<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ContentContainer } from '$lib/components/content';
  import { Button } from '@colibri-hq/ui';

  type Props = {
    title: string | Snippet;
    subtitle?: string | Snippet;
    actionTitle: string | Snippet;
    extraActions?: Snippet;
    onclick?: () => unknown;
    children?: Snippet;
    [key: string]: unknown;
  }

  const {
    title,
    subtitle,
    actionTitle,
    extraActions,
    children,
    onclick = () => void 0,
    ...rest
  }: Props = $props();
</script>

<ContentContainer {...rest} tag="section">
  <div class="p-6 md:p-8 my-12 text-center">
    <header>
      <h2 class="text-3xl md:text-5xl font-semibold mb-4">
        {#if typeof title === 'string'}
          {title}
        {:else}
          {@render title()}
        {/if}
      </h2>

      {#if subtitle}
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-6">
          {#if typeof subtitle === 'string'}
            {subtitle}
          {:else}
            {@render subtitle()}
          {/if}
        </p>
      {/if}
    </header>

    <div class="flex flex-col md:flex-row justify-center items-center gap-4">
      <Button {onclick} size="large" variant="primary">
        {#if typeof actionTitle === 'string'}
          {actionTitle}
        {:else}
          {@render actionTitle()}
        {/if}
      </Button>

      {@render extraActions?.()}
    </div>

    {#if children}
      <div class="mt-4 text-gray-600 dark:text-gray-400">
        {@render children()}
      </div>
    {/if}
  </div>
</ContentContainer>
