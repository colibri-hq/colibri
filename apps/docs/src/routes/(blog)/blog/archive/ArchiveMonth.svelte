<script lang="ts">
  import ArchivePost from './ArchivePost.svelte';

  type Props = {
    monthName: string;
    posts: {
      urlSlug: string;
      title: string;
      day: number;
    }[];
  }

  const { monthName, posts }: Props = $props();
</script>

<li class="relative">
  <div
    aria-hidden="true"
    class="absolute -left-px -translate-x-1/2 top-2.25 -translate-y-1/2 size-4 rounded-full bg-gray-300
      dark:bg-slate-600 ring-3 ring-gray-100 dark:ring-gray-950"
  ></div>

  <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 ps-6 leading-none">
    {monthName}
  </h3>

  <ol class="flex flex-col gap-4">
    {#each posts as { title, urlSlug, day } (urlSlug)}
      <ArchivePost {title} {urlSlug} {day} />
    {/each}
  </ol>
</li>
