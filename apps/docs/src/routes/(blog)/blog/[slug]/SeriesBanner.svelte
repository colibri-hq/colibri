<script lang="ts">
  import { resolve } from '$app/paths';
  import { LibraryIcon } from '@lucide/svelte';
  import { getSeriesSlug } from '$lib/content/blog';

  type Props = {
    series: string;
    order?: number | undefined;
  };

  const { series, order }: Props = $props();

  const href = $derived(resolve('/(blog)/blog/series/[slug]', { slug: getSeriesSlug(series) }));
</script>

<a
  {href}
  class="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg ring ring-amber-200 dark:ring-amber-800
  hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:ring-amber-300 dark:hover:ring-amber-700
  focus-visible:ring-2 focus-visible:ring-amber-400 dark:focus-visible:ring-amber-500 outline-hidden
  transition flex items-center gap-3 group"
>
  <LibraryIcon class="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
  <p class="text-sm text-amber-800 dark:text-amber-200">
    Part {order ?? ""} of the
    <strong class="group-hover:underline">{series}</strong>
    series
  </p>
</a>
