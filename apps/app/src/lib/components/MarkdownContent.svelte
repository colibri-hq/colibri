<script lang="ts">
  import { twMerge } from 'tailwind-merge';

  interface Props {
    class?: string;
    source?: string;
  }

  let { class: className = '', source = '' }: Props = $props();

  const renderers = {};
</script>

<div class="markdown-container {twMerge('text-lg leading-relaxed', className)}">
  <Markdown {renderers} {source} />
</div>

<style lang="postcss">
    @reference "../../style.css";

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
