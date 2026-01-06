<script lang="ts">
  import type { PageProps } from './$types.js';
  import RssLink from '$root/src/routes/(blog)/blog/RssLink.svelte';
  import FeaturedPosts from '$root/src/routes/(blog)/blog/FeaturedPosts.svelte';
  import PostList from '$root/src/routes/(blog)/blog/PostList.svelte';

  const { data }: PageProps = $props();

</script>

<svelte:head>
  <title>Blog | Colibri</title>
  <meta name="description" content="Development updates, tutorials, and insights from the Colibri team" />
  <meta property="og:title" content="Colibri Blog" />
  <meta property="og:description" content="Development updates, tutorials, and insights from the Colibri team" />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="flex flex-col gap-8">
  <header class="grid grid-cols-[1fr_auto] auto-rows-min gap-2">
    <h1 class="text-4xl font-bold font-serif text-gray-900 dark:text-white">
      Blog
    </h1>
    <p class="row-start-2 text-lg text-gray-600 dark:text-gray-400">
      Development updates, tutorials, and insights
    </p>

    <RssLink class="self-end" />
  </header>

  {#if data.featured.length > 0}
    <FeaturedPosts posts={data.featured} />
  {/if}

  <PostList posts={data.posts} heading={data.featured.length > 0} />
</div>
