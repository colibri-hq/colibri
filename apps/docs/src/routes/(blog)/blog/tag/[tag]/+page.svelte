<script lang="ts">
  import type { PageProps } from './$types.js';
  import { Breadcrumbs } from '$lib/components/content';
  import { resolve } from '$app/paths';
  import TagHeader from './TagHeader.svelte';
  import { BlogPostList } from '$lib/components/blog';

  const { data }: PageProps = $props();
  const tag = $derived(data.tag);
  const posts = $derived(data.posts);

  const breadcrumbs = $derived([
    { title: 'Blog', href: resolve('/(blog)/blog') },
    { title: 'Tags', href: resolve('/(blog)/blog/tag') },
    { title: `Tag: ${data.tag}`, href: resolve('/(blog)/blog/tag/[tag]', { tag }) },
  ]);
</script>

<svelte:head>
  <title>Posts tagged "{tag}" | Colibri Blog</title>
  <meta name="description" content="Blog posts tagged with {tag}" />
  <meta property="og:title" content='Posts tagged "{tag}"' />
  <meta property="og:description" content="Blog posts tagged with {tag}" />
</svelte:head>

<div class="flex flex-col gap-8">
  <header>
    <Breadcrumbs class="mb-4" items={breadcrumbs} />
    <TagHeader {tag} count={posts.length} />
  </header>

  <BlogPostList {posts} />
</div>
