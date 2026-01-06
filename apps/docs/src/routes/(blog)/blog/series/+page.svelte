<script lang="ts">
  import type { PageProps } from './$types.js';
  import { BackLink } from '$lib/components/blog';
  import SeriesList from './SeriesList.svelte';
  import EmptyState from './EmptyState.svelte';
  import SeriesPageHeader from './SeriesPageHeader.svelte';

  const { data }: PageProps = $props();
  const series = $derived(data.series);
</script>

<svelte:head>
  <title>Post Series | Colibri Blog</title>
  <meta name="description" content="Browse all blog post series on the Colibri development blog" />
  <meta property="og:title" content="Post Series | Colibri Blog" />
  <meta property="og:description" content="Browse all blog post series on the Colibri development blog" />
</svelte:head>

<article class="flex flex-col gap-8">
  <header>
    <BackLink />
    <SeriesPageHeader count={series.length} />
  </header>

  {#if series.length === 0}
    <EmptyState />
  {:else}
    <SeriesList {series} />
  {/if}
</article>
