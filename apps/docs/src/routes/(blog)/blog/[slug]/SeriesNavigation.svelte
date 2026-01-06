<script lang="ts">
  import { resolve } from '$app/paths';
  import { type BlogPost, getSeriesSlug } from '$lib/content/blog';

  type Props = {
    post: BlogPost;
    series: string;
    posts: BlogPost[];
  };

  const { post, series, posts }: Props = $props();
  const href = $derived(resolve('/(blog)/blog/series/[slug]', { slug: getSeriesSlug(series) }));
</script>

<div class="mt-12 p-6 bg-amber-50 dark:bg-amber-900/50 rounded-lg ring ring-amber-300 dark:ring-amber-800">
  <h3 class="font-bold text-gray-900 dark:text-white mb-4">
    More in
    &ldquo;<a {href} class="text-amber-600 dark:text-amber-400 hover:underline">{series}</a>&rdquo;
  </h3>

  <ol class="flex flex-col gap-2">
    {#each posts as { urlSlug: slug, metadata }, index (index)}
      <li class="flex items-center gap-2">
        <span class="shrink-0 size-6 text-xs flex items-center justify-center rounded-full bg-amber-200 dark:bg-amber-900/30
        text-amber-800 dark:text-amber-200 font-semibold">{index + 1}</span>

        {#if slug === post.urlSlug}
          <span class="font-medium text-gray-900 dark:text-white">
            {metadata.title}
            <span class="text-gray-500 dark:text-gray-400">(current)</span>
          </span>
        {:else}
          <a
            href={resolve("/(blog)/blog/[slug]", {slug})}
            class="text-amber-600 dark:text-amber-400 hover:underline"
          >
            {metadata.title}
          </a>
        {/if}
      </li>
    {/each}
  </ol>
</div>
