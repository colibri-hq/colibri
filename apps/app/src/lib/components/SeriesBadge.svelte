<script lang="ts">
  interface Props {
    series: {
      id: string;
      name: string | null;
      series_position?: number | null;
    };
  }

  let { series }: Props = $props();
</script>

<a
  href="/series/{series.id}"
  class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50"
>
  {series.name ?? 'Series'}
  {#if series.series_position}
    <span class="text-blue-500 dark:text-blue-400">#{series.series_position}</span>
  {/if}
</a>
