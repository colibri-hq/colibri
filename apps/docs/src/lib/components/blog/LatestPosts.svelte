<script lang="ts">
  import type { BlogPost } from '$lib/content/blog';
  import BlogPostCard from './BlogPostCard.svelte';
  import { ArrowRightIcon } from '@lucide/svelte';
  import { resolve } from '$app/paths';

  type Props = {
    posts: BlogPost[];
    title?: string;
    showViewAll?: boolean;
    columns?: 2 | 3;
  };

  const {
    posts,
    title = 'Latest Posts',
    showViewAll = true,
    columns = 3,
  }: Props = $props();

  const gridClass = $derived(columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3');
</script>

<section class="py-8">
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
    {#if showViewAll}
      <a
        href={resolve("/(blog)/blog")}
        class="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
      >
        View all posts
        <ArrowRightIcon class="size-4" />
      </a>
    {/if}
  </div>

  <ul class="grid gap-6 {gridClass}">
    {#each posts as post (post.slug)}
      <li class="contents">
        <BlogPostCard {post} />
      </li>
    {/each}
  </ul>
</section>
