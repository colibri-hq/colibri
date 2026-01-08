<script lang="ts">
  import type { BlogPostMetadata } from '$lib/content/blog';
  import { formatBlogDate } from '$lib/content/blog';
  import type { AuthorWithGravatar } from '$lib/content/author';
  import { ShareButton } from '$lib/components/content';
  import { PageActions } from '$lib/components/page';
  import { CalendarIcon, ClockIcon, TagIcon } from '@lucide/svelte';
  import { AuthorCard, Tag } from '$lib/components/blog';
  import SeriesBanner from './SeriesBanner.svelte';

  type Props = {
    metadata: BlogPostMetadata;
    author: AuthorWithGravatar;
    class?: string;
    [key: string]: unknown;
  };

  const { metadata, author, class: className, ...rest }: Props = $props();

  const formattedDate = $derived(formatBlogDate(metadata.date));
</script>

<header {...rest} class={className}>
  <!-- region Hero Image -->
  {#if metadata.heroImage}
    <div class="aspect-21/9 overflow-hidden rounded-xl mb-8 bg-gray-100 dark:bg-gray-800">
      <img
        src={metadata.heroImage}
        alt={metadata.heroAlt ?? metadata.title}
        class="w-full h-full object-cover"
      />
    </div>
  {/if}
  <!-- endregion -->

  <!-- region Tags -->
  {#if metadata.tags?.length}
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <TagIcon class="size-4 text-gray-500 dark:text-gray-400" />

      <ul class="contents">
        {#each metadata.tags as label, index (index)}
          <li class="contents">
            <Tag {label} linked size="medium" variant="primary" />
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  <!-- endregion -->

  <!-- region Title -->
  <h1 class="text-4xl md:text-5xl font-bold font-serif text-gray-900 dark:text-white mb-4">
    {metadata.title}
  </h1>
  <!-- endregion -->

  <!-- region Description -->
  {#if metadata.description}
    <p class="text-xl text-gray-600 dark:text-gray-400 mb-6">
      {metadata.description}
    </p>
  {/if}
  <!-- endregion -->

  <!-- region Meta row -->
  <div
    class="flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400 pb-2 border-b
    border-gray-200 dark:border-gray-800"
  >
    <AuthorCard {author} size="small" />

    <div class="flex items-center gap-1.5">
      <CalendarIcon class="size-4" />
      <time datetime={metadata.date}>{formattedDate}</time>
    </div>

    {#if metadata.readingTime}
      <div class="flex items-center gap-1.5">
        <ClockIcon class="size-4" />
        <span>{metadata.readingTime} min read</span>
      </div>
    {/if}

    <div class="flex items-center gap-2 ms-auto">
      <ShareButton shareTitle={metadata.title} />
      <PageActions />
    </div>
  </div>
  <!-- endregion -->

  {#if metadata.series}
    <SeriesBanner series={metadata.series} order={metadata.seriesOrder} />
  {/if}
</header>
