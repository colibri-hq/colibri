<script lang="ts">
  import type { BlogPost } from '$lib/content/blog';
  import BlogPostList from '$lib/components/blog/BlogPostList.svelte';

  type Props = {
    posts: BlogPost[];
  }

  const { posts }: Props = $props();
</script>

<section class="flex flex-col gap-4">
  <h2 class="text-xl font-bold text-gray-900 dark:text-white">
    Featured
  </h2>

  <BlogPostList {posts} featured />
</section>
