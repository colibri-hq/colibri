<script lang="ts">
  import type { PageProps } from './$types.js';
  import { Breadcrumbs } from '$lib/components/content';
  import { resolve } from '$app/paths';
  import ArchiveYear from './ArchiveYear.svelte';

  const { data }: PageProps = $props();

  const breadcrumbs = [
    { title: 'Blog', href: resolve('/(blog)/blog') },
    { title: 'Archive', href: resolve('/(blog)/blog/archive') },
  ];
</script>

<svelte:head>
  <title>Archive | Colibri Blog</title>
  <meta name="description" content="Complete archive of all {data.totalPosts} blog posts, organized by date" />
  <meta property="og:title" content="Blog Archive" />
  <meta property="og:description" content="Complete archive of all {data.totalPosts} blog posts" />
</svelte:head>

<div class="flex flex-col gap-8">
  <header>
    <Breadcrumbs class="mb-4" items={breadcrumbs} />

    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Archive
    </h1>

    <span class="mt-2 text-gray-600 dark:text-gray-400">
      {data.totalPosts} posts
    </span>
  </header>

  <ol class="relative flex flex-col gap-8">
    {#each data.years as { year, months } (year)}
      <ArchiveYear {year} {months} />
    {/each}
  </ol>
</div>
