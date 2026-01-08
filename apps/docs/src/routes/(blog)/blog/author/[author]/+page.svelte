<script lang="ts">
  import type { PageProps } from './$types.js';
  import { AuthorCard, BlogPostList } from '$lib/components/blog';
  import { Breadcrumbs } from '$lib/components/content';
  import { resolve } from '$app/paths';

  const { data }: PageProps = $props();
  const posts = $derived(data.posts);
  const author = $derived(data.author);

  const breadcrumbs = $derived([
    { title: 'Blog', href: resolve('/(blog)/(blog)/blog') },
    { title: 'Authors', href: resolve('/(blog)/blog/author') },
    { title: data.author.name, href: resolve('/(blog)/blog/author/[author]', { author: data.author.name }) },
  ]);
</script>

<svelte:head>
  <title>Posts by {author.name} | Colibri Blog</title>
  <meta name="description" content="Blog posts written by {author.name}" />
  <meta property="og:title" content="Posts by {author.name}" />
  <meta property="og:description" content="Blog posts written by {author.name}" />
</svelte:head>

<div class="flex flex-col gap-8">
  <header>
    <Breadcrumbs class="mb-4" items={breadcrumbs} />

    <div class="flex items-center">
      <AuthorCard author={author} count={posts.length} size="large" />
    </div>
  </header>

  <BlogPostList {posts} />
</div>
