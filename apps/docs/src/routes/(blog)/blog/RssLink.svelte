<script lang="ts">
  import { resolve } from '$app/paths';
  import { RssIcon } from '@lucide/svelte';

  type Props = {
    class?: string;
    [key: string]: unknown;
  };
  const { class: className, ...rest }: Props = $props();
</script>

<a
  {...rest}
  href={resolve("/(blog)/blog/feed.xml")}
  class="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-500
  dark:hover:text-orange-400 transition-colors outline-hidden focus-visible:bg-orange-500 focus-visible:text-white
  dark:focus-visible:text-white rounded-md {className}"
  title="RSS Feed"
>
  <RssIcon class="size-5" />

  <span class="hidden sm:inline">
    RSS
  </span>
</a>
