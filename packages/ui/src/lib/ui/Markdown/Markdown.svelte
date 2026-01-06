<script lang="ts">
  import SvelteMarkdown, { type SvelteMarkdownOptions, type SvelteMarkdownProps } from '@humanspeak/svelte-markdown';
  import { twMerge } from 'tailwind-merge';
  import Spoiler from './Spoiler.svelte';

  type Props = {
    class?: string;
    inline?: boolean;
    renderers?: SvelteMarkdownProps['renderers'];
    source?: string;
  };

  const {
    class: className = '',
    source = '',
    renderers = {},
    inline,
  }: Props = $props();

  const options = {
    headerIds: true,
    gfm: true,
    breaks: true,
  } satisfies SvelteMarkdownOptions;

  // Merge default renderers with custom spoiler support
  const mergedRenderers = $derived({
    ...renderers,
    html: {
      ...((renderers as Record<string, unknown>)?.html ?? {}),
      spoiler: Spoiler,
    },
  });
</script>

<div class="markdown-container {twMerge('text-lg leading-relaxed', className)}">
  <SvelteMarkdown {source} renderers={mergedRenderers} isInline={inline} {options} />
</div>

<style lang="postcss">
    @reference "tailwindcss";

    :global(.markdown-container h1),
    :global(.markdown-container h2),
    :global(.markdown-container h3),
    :global(.markdown-container h4),
    :global(.markdown-container h5),
    :global(.markdown-container h6) {
        @apply mt-[1em] font-serif;
    }

    :global(.markdown-container h1) {
        @apply mb-2 text-4xl font-bold;
    }

    :global(.markdown-container h2) {
        @apply mb-1 text-3xl font-bold;
    }

    :global(.markdown-container h3) {
        @apply mb-0.5 text-2xl font-semibold;
    }

    :global(.markdown-container h3) {
        @apply mb-0.5 text-xl font-semibold;
    }

    :global(.markdown-container h4) {
        @apply text-lg font-semibold;
    }

    :global(.markdown-container h5) {
        @apply text-base font-semibold;
    }

    :global(.markdown-container h6) {
        @apply text-sm font-semibold;
    }

    :global(.markdown-container p) {
        @apply leading-[inherit];
    }

    :global(.markdown-container p + p) {
        @apply mt-[0.5em];
    }

    :global(.markdown-container blockquote) {
        @apply my-6 border-l-4 border-gray-300 pl-4 font-serif italic;
    }
</style>
