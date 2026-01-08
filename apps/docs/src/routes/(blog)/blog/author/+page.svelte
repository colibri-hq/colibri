<script lang="ts">
  import type { PageProps } from './$types.js';
  import { Breadcrumbs } from '$lib/components/content';
  import { resolve } from '$app/paths';
  import EmptyState from './EmptyState.svelte';
  import AuthorList from './AuthorList.svelte';

  const { data }: PageProps = $props();
  const authors = $derived(data.authors);

  const breadcrumbs = [
    { title: 'Blog', href: resolve('/(blog)/blog') },
    { title: 'Authors', href: resolve('/(blog)/blog/author') },
  ];
</script>

<svelte:head>
  <title>Authors | Colibri Blog</title>
  <meta name="description" content="Browse all authors who have contributed to the Colibri blog" />
  <meta property="og:title" content="Authors | Colibri Blog" />
  <meta property="og:description" content="Browse all authors who have contributed to the Colibri blog" />
</svelte:head>

<div class="flex flex-col gap-8">
  <header>
    <div class="mb-4">
      <Breadcrumbs items={breadcrumbs} />
    </div>

    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Authors
    </h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Meet the people behind the blog
    </p>
  </header>


  {#if authors.length === 0}
    <EmptyState />
  {:else}
    <AuthorList {authors} />
  {/if}
</div>
