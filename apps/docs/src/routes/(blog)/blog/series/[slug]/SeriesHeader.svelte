<script lang="ts">
  import { LibraryIcon } from '@lucide/svelte';
  import type { SeriesInfo } from '$lib/content/blog';

  type Props = {
    series: SeriesInfo;
  };

  const { series }: Props = $props();
</script>

<div class="flex items-center gap-3">
  <LibraryIcon class="size-8 text-blue-600 dark:text-blue-400" />

  <div>
    <h1 class="text-3xl font-bold font-serif text-gray-900 dark:text-white">
      {series.name}
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      {series.count} {series.count === 1 ? "part" : "parts"} in this series
    </p>
  </div>
</div>
