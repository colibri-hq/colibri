<script lang="ts">
  import type { BlogPost } from '$lib/content/blog';
  import { BlogPostCard } from '$lib/components/blog';

  type Props = {
    posts: BlogPost[];
  }

  const { posts }: Props = $props();
</script>

<ol class="flex flex-col gap-6">
  {#each posts as post, index (index)}
    <li class="flex gap-4">
      <span
        class="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30
        text-blue-600 dark:text-blue-400 font-semibold text-sm"
      >
        {index + 1}
      </span>

      <div class="flex-1">
        <BlogPostCard {post} />
      </div>
    </li>
  {/each}
</ol>
