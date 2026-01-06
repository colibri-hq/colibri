<script lang="ts">
  import { LibraryIcon } from '@lucide/svelte';

  type Props = {
    count: number;
  };

  const { count }: Props = $props();
</script>

<div class="flex items-center gap-3">
  <LibraryIcon class="size-8 text-blue-600 dark:text-blue-400" />

  <div>
    <h1 class="text-3xl font-bold font-serif text-gray-900 dark:text-white">
      Post Series
    </h1>

    <span class="text-gray-600 dark:text-gray-400">
      {count} {count === 1 ? "series" : "series"}
    </span>
  </div>
</div>
