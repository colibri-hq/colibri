<script lang="ts">
  import type { PageProps } from './$types.js';
  import { BackLink } from '$lib/components/blog';
  import PostList from './PostList.svelte';
  import SeriesHeader from './SeriesHeader.svelte';

  const { data }: PageProps = $props();
  const series = $derived(data.series);
  const posts = $derived(series.posts);
</script>

<svelte:head>
  <title>{data.series.name} | Colibri Blog</title>
  <meta name="description" content="Read the {data.series.name} series on the Colibri development blog" />
  <meta property="og:title" content="{data.series.name} | Colibri Blog" />
  <meta property="og:description" content="Read the {data.series.name} series on the Colibri development blog" />
</svelte:head>

<div class="flex flex-col gap-8">
  <header>
    <BackLink route="/blog/series" label="All series" />
    <SeriesHeader {series} />
  </header>

  {#if series.description}
    <p class="text-lg text-gray-600 dark:text-gray-300">
      {series.description}
    </p>
  {/if}

  <PostList {posts} />
</div>
