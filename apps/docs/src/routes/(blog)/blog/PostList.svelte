<script lang="ts">
  import { ArrowDownToLineIcon } from '@lucide/svelte';
  import type { BlogPost } from '$lib/content/blog';
  import { onMount } from 'svelte';
  import EndingLine from '$lib/components/EndingLine.svelte';
  import BlogPostList from '$lib/components/blog/BlogPostList.svelte';

  type Props = {
    posts: BlogPost[];
    heading?: boolean;
    perPage?: number;
    class?: string;
    [key: string]: unknown;
  };

  const { posts, heading = false, perPage = 10, class: className, ...rest }: Props = $props();

  // Load more state
  let visibleCount = $state(0);
  const visiblePosts = $derived(posts.slice(0, visibleCount));
  const hasMore = $derived(visibleCount < posts.length);

  function loadMore() {
    visibleCount += perPage;
  }

  onMount(loadMore);
</script>

<section {...rest} class={className}>
  {#if heading}
    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
      All Posts
    </h2>
  {/if}

  {#if posts.length === 0}
    <p class="text-gray-600 dark:text-gray-400 py-8 text-center">
      No blog posts yet. Check back soon!
    </p>
  {:else}
    <BlogPostList posts={visiblePosts}>
      {#if hasMore}
        <div class="mt-8 text-center">
          <button
            onclick={loadMore}
            class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg  transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Load more posts
          </button>
        </div>
      {:else}
        <div
          class="mt-12 flex flex-col gap-4 items-center  text-center  starting:opacity-0 delay-300 duration-300
          animate-fade-in select-none"
        >
          <span class="text-gray-400 dark:text-gray-600 bg-gray-200 dark:bg-gray-900 rounded-full p-4">
            <ArrowDownToLineIcon />
          </span>

          <EndingLine />
        </div>
      {/if}
    </BlogPostList>
  {/if}
</section>
