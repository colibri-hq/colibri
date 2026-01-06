<script lang="ts">
  import type { PageProps } from './$types.js';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { resolve } from '$app/paths';
  import EmptyState from './EmptyState.svelte';
  import TagList from '$root/src/routes/(blog)/blog/tag/TagList.svelte';

  const { data }: PageProps = $props();
  const tags = $derived(data.tags);

  const breadcrumbs = [
    { title: 'Blog', href: resolve('/(blog)/blog') },
    { title: 'Tags', href: resolve('/(blog)/blog/tag') },
  ];
</script>

<svelte:head>
  <title>Tags | Colibri Blog</title>
  <meta name="description" content="Browse all tags used in Colibri blog posts" />
  <meta property="og:title" content="Tags | Colibri Blog" />
  <meta property="og:description" content="Browse all tags used in Colibri blog posts" />
</svelte:head>

<div class="flex flex-col gap-8">
  <header>
    <Breadcrumbs class="mb-4" items={breadcrumbs} />

    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Tags
    </h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Browse posts by topic
    </p>
  </header>

  {#if data.tags.length === 0}
    <EmptyState />
  {:else}
    <TagList {tags} />
  {/if}
</div>
