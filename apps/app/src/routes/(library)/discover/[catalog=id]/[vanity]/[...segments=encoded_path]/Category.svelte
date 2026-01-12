<script lang="ts" module>
  export type NavigateEventDetail = { link: string; title: string };
</script>

<script lang="ts">
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime.js';
  import type { Category } from './+page.svelte';

  dayjs.extend(relativeTime);

  interface Props {
    entry: Category;
    onnavigate?: (detail: NavigateEventDetail) => void;
  }

  let { entry, onnavigate }: Props = $props();
  let timestamp = $derived(new Date(entry.lastUpdatedAt).toISOString());
  let timeAgo = $derived(dayjs(entry.lastUpdatedAt).fromNow());

  function navigate() {
    onnavigate?.({
      link: entry.link,
      title: entry.title,
    });
  }
</script>

<button
  class="flex w-full flex-col rounded-xl bg-gray-50 p-4 shadow transition hover:bg-gray-100
  dark:bg-gray-900 dark:hover:bg-gray-800"
  onclick={navigate}
  type="button"
>
  <strong
    class="max-w-full overflow-hidden font-serif font-semibold text-ellipsis whitespace-nowrap"
  >
    {entry.title}
  </strong>
  {#if entry.lastUpdatedAt}
    <time datetime={timestamp} class="text-xs text-gray-500"
      >Updated {timeAgo}</time
    >
  {/if}
</button>
