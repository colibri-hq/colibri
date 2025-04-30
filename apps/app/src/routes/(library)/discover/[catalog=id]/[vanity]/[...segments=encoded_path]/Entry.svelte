<script lang="ts">
  import type { Entry } from './+page.svelte';
  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';
  import { Button } from '@colibri-hq/ui';

  dayjs.extend(relativeTime);

  interface Props {
    entry: Entry;
  }

  let { entry }: Props = $props();
  let timestamp = $derived(new Date(entry.lastUpdatedAt).toISOString());
  let timeAgo = $derived(dayjs(entry.lastUpdatedAt).fromNow());
  let authors = $derived(entry.authors.map(({ name }) => name).join(' & '));
</script>

<article
  class="overflow-hidden rounded-xl bg-gray-50 p-4 shadow"
  id="entry-{entry.id}"
>
  <header class="flex flex-col">
    <div>
      <h3 class="w-full font-serif font-medium">{entry.title}</h3>
      <span class="text-sm text-gray-700">{authors}</span>
    </div>
  </header>

  {#if entry.description}
    <p class="mt-4 text-sm text-gray-700">{entry.description}</p>
  {/if}

  <footer class="mt-4 flex items-center justify-between">
    <Button size="small">Add to library</Button>

    {#if entry.lastUpdatedAt}
      <time datetime={timestamp} class="mr-2 ml-auto text-xs text-gray-500">
        Updated {timeAgo}
      </time>
    {/if}
  </footer>
</article>
