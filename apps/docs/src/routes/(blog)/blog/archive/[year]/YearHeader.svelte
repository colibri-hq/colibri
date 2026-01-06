<script lang="ts">
  import { CalendarIcon } from '@lucide/svelte';

  type Props = {
    year: number;
    count: number;
  }

  const { year, count }: Props = $props();
</script>

<div class="flex items-center gap-3">
  <CalendarIcon class="size-8 text-blue-600 dark:text-blue-400" />
  <div>
    <h1 class="text-3xl font-bold font-serif text-gray-900 dark:text-white">
      {year}
    </h1>

    {#if count > 0}
      <span class="text-gray-600 dark:text-gray-400">
        {count} {count === 1 ? "post" : "posts"}
      </span>
    {/if}
  </div>
</div>
