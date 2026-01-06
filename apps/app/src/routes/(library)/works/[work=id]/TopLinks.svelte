<script lang="ts">
  import type { Creator, Work, Publisher } from '@colibri-hq/sdk/types';

  interface Props {
    class?: string;
    work: Work & { creator?: Creator; publisher?: Publisher };
  }

  let { class: className = '', work }: Props = $props();
</script>

<nav class={className}>
  <a href="/works/similar?id={work.id}">Similar works</a>
  {#if work.creator}
    <a href="/creators/{work.creator?.id}">Other works by {work.creator?.name}</a>
  {/if}

  {#if work.publisher}
    <a href="/publishers/{work.publisher?.id}"
      >Other works by {work.publisher?.name}</a
    >
  {/if}
</nav>

<style lang="postcss">
  nav {
    @apply opacity-60 transition hover:opacity-100;
  }

  a {
    @apply text-gray-600 underline underline-offset-8 transition hover:text-black dark:text-gray-400 dark:hover:text-gray-100;
  }
</style>
