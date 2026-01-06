<script lang="ts">
  import type { BlogPost } from '$lib/content/blog';
  import { BlogPostCard } from '$lib/components/blog';
  import type { Snippet } from 'svelte';

  type Props = {
    posts: BlogPost[];
    class?: string;
    featured?: boolean;
    children?: Snippet;
    [key: string]: unknown;
  }

  const { posts, class: className, featured, children, ...rest }: Props = $props();
</script>

<nav {...rest} class={className} aria-label="Blog post list">
  <ul class="columns-1 gap-6 space-y-6 md:columns-2">
    {#each posts as post (post.slug)}
      <li class="break-inside-avoid">
        <BlogPostCard {post} {featured} />
      </li>
    {/each}
  </ul>

  {@render children?.()}
</nav>
