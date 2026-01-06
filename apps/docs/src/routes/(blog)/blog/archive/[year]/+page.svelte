<script lang="ts">
  import type { PageProps } from './$types.js';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { resolve } from '$app/paths';
  import YearHeader from './YearHeader.svelte';
  import EmptyState from './EmptyState.svelte';
  import BlogPostList from '$lib/components/blog/BlogPostList.svelte';

  const { data }: PageProps = $props();
  const posts = $derived(data.posts);
  const year = $derived(data.year);
  const breadcrumbs = $derived([
    { title: 'Blog', href: resolve('/(blog)/blog') },
    { title: 'Archive', href: resolve('/(blog)/blog/archive') },
    { title: String(year), href: resolve('/(blog)/blog/archive/[year]', { year: String(year) }) },
  ]);
</script>

<svelte:head>
  <title>Posts from {year} | Colibri Blog</title>
  <meta name="description" content="Blog posts published in {year}" />
  <meta property="og:title" content="Posts from {year}" />
  <meta property="og:description" content="Blog posts published in {year}" />
</svelte:head>

<div class="flex flex-col gap-8">
  <header>
    <Breadcrumbs class="mb-4" items={breadcrumbs} />
    <YearHeader {year} count={posts.length} />
  </header>

  {#if posts.length === 0}
    <EmptyState {year} />
  {:else}
    <BlogPostList {posts} />
  {/if}
</div>
