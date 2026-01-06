<script lang="ts">
  import ArchiveMonth from './ArchiveMonth.svelte';

  type Props = {
    year: number;
    months: {
      month: number;
      monthName: string;
      posts: {
        urlSlug: string;
        title: string;
        day: number;
      }[];
    }[];
  }

  const { year, months }: Props = $props();
</script>

<li>
  <!-- Year header -->
  <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-200 mb-4">
    {year}
  </h2>

  <!-- Months within year -->
  <ol class="relative flex flex-col gap-8 border-s-2 border-gray-200 dark:border-gray-800 ms-4">
    {#each months as { monthName, month, posts } (month)}
      <ArchiveMonth {monthName} {posts} />
    {/each}
  </ol>
</li>
