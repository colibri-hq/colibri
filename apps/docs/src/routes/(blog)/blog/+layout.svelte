<script lang="ts">
  import type { LayoutProps } from './$types.js';
  import BlogSidebar from './BlogSidebar.svelte';
  import { getBlogTags, getPostsByYearMonth } from '$lib/content/blog';

  const { children, data }: LayoutProps = $props();

  // Get full data for sidebar (on client, this is available)
  const postsByYearMonth = getPostsByYearMonth();
  const tags = getBlogTags();
</script>

<div class="w-full max-w-7xl mx-auto px-4 py-8">
  <div class="xl:grid xl:grid-cols-[1fr_280px] xl:gap-12">
    <main class="pb-24">
      {@render children()}
    </main>

    <aside class="hidden xl:block">
      <div class="sticky top-20">
        <BlogSidebar {postsByYearMonth} {tags} authors={data.authors} />
      </div>
    </aside>
  </div>
</div>
