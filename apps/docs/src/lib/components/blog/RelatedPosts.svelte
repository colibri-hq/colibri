<script lang="ts">
  import type { BlogPost } from '$lib/content/blog';
  import BlogPostCard from './BlogPostCard.svelte';

  type Props = {
    posts: BlogPost[];
    title?: string;
    class?: string;
    [key: string]: unknown;
  };

  const { posts, title = 'Related Posts', class: className, ...rest }: Props = $props();
</script>

{#if posts.length > 0}
  <section {...rest} class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 {className}">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
      {title}
    </h2>

    <ol class="gap-6 md:columns-2 lg:columns-3">
      {#each posts as post, index (index)}
        <li class="contents">
          <BlogPostCard {post} />
        </li>
      {/each}
    </ol>
  </section>
{/if}
