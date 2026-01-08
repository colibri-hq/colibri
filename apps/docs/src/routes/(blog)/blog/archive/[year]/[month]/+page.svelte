<script lang="ts">
  import type { PageProps } from './$types.js';
  import { Breadcrumbs } from '$lib/components/content';
  import { resolve } from '$app/paths';
  import { BlogPostList } from '$lib/components/blog';
  import MonthHeader from './MonthHeader.svelte';
  import EmptyState from './EmptyState.svelte';

  const { data }: PageProps = $props();
  const posts = $derived(data.posts);
  const year = $derived(data.year);
  const month = $derived(data.month);
  const monthName = $derived(data.monthName);

  const breadcrumbs = $derived([
    { title: 'Blog', href: resolve('/(blog)/blog') },
    { title: 'Archive', href: resolve('/(blog)/blog/archive') },
    { title: String(year), href: resolve('/(blog)/blog/archive/[year]', { year: String(year) }) },
    {
      title: monthName,
      href: resolve(
        '/(blog)/blog/archive/[year]/[month]',
        { year: String(year), month: String(month).padStart(2, '0') },
      ),
    },
  ]);
</script>

<svelte:head>
  <title>Posts from {monthName} {year} | Colibri Blog</title>
  <meta name="description" content="Blog posts published in {monthName} {year}" />
  <meta property="og:title" content="Posts from {monthName} {year}" />
  <meta property="og:description" content="Blog posts published in {monthName} {year}" />
</svelte:head>

<div class="flex flex-col gap-8">
  <header>
    <Breadcrumbs class="mb-4" items={breadcrumbs} />
    <MonthHeader {year} {monthName} count={posts.length} />
  </header>

  {#if posts.length === 0}
    <EmptyState {year} {monthName} />
  {:else}
    <BlogPostList {posts} />
  {/if}
</div>
