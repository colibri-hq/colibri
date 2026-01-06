<script lang="ts">
  import type { BlogPost } from "$lib/content/blog";
  import { formatBlogDate } from "$lib/content/blog";
  import { parseAuthor, getGravatarUrl } from "$lib/content/author";
  import { CalendarIcon, ClockIcon } from "@lucide/svelte";
  import { Avatar } from '$lib/components/blog/index';
  import { resolve } from "$app/paths";
  import { Tag } from '$lib/components/blog/index';

  type Props = {
    post: BlogPost;
    featured?: boolean;
    class?: string;
    [key: string]: unknown;
  };

  const { post, class: className, featured = false, ...rest }: Props = $props();

  const author = $derived(parseAuthor(post.metadata.author));
  const gravatarPromise = $derived(author.email ? getGravatarUrl(author.email, 32) : null);
  const formattedDate = $derived(formatBlogDate(post.metadata.date));
  const displayTags = $derived((post.metadata.tags ?? []).slice(0, 3));
</script>

<article {...rest} class="group {className} {featured ? 'column-span-all' : ''}">
  <a
    href={resolve('/(blog)/blog/[slug]', { slug: post.urlSlug })}
    class="block h-full rounded-lg overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-blue-500
    dark:hover:ring-blue-400 transition-all bg-white dark:bg-gray-900 outline-hidden focus-visible:ring-3
    focus-visible:ring-blue-500"
  >
    <!-- region Hero Image -->
    {#if post.metadata.heroImage}
      <div class="aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
        <img
          src={post.metadata.heroImage}
          alt={post.metadata.heroAlt ?? post.metadata.title}
          class="w-auto h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
    {/if}
    <!-- endregion -->

    <div class="p-4 {featured ? 'md:p-6' : ''}">
      <!-- region Tags -->
      {#if displayTags.length > 0}
        <ul class="flex flex-wrap gap-1.5 mb-2">
          {#each displayTags as label, index (index)}
            <Tag {label} size="small" variant="primary" />
          {/each}
        </ul>
      {/if}
      <!-- endregion -->

      <!-- region Title -->
      <h2
        class="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400
        group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors
        {featured ? 'text-2xl' : 'text-lg'}"
      >
        {post.metadata.title}
      </h2>
      <!-- endregion -->

      <!-- region Excerpt -->
      {#if post.metadata.excerpt || post.metadata.description}
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {post.metadata.excerpt ?? post.metadata.description}
        </p>
      {/if}
      <!-- endregion -->

      <!-- region Meta -->
      <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
        <!-- region Author -->
        <div class="flex items-center gap-2">
          {#if gravatarPromise}
            {#await gravatarPromise}
              <Avatar size="xs" alt={author.name} />
            {:then gravatarUrl}
              <Avatar src={gravatarUrl} alt={author.name} size="xs" />
            {:catch _error}
              <Avatar size="xs" alt={author.name} />
            {/await}
          {:else}
            <Avatar size="xs" alt={author.name} />
          {/if}
          <span>{author.name}</span>
        </div>
        <!-- endregion -->

        <!-- region Date -->
        <div class="flex items-center gap-1.5">
          <CalendarIcon class="size-4" />
          <time datetime={post.metadata.date}>{formattedDate}</time>
        </div>
        <!-- endregion -->

        <!-- region Reading time -->
        {#if post.metadata.readingTime}
          <div class="flex items-center gap-1.5">
            <ClockIcon class="size-4" />
            <span>{post.metadata.readingTime} min</span>
          </div>
        {/if}
        <!-- endregion -->
      </div>
      <!-- endregion -->
    </div>
  </a>
</article>
