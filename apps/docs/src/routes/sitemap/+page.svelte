<script lang="ts">
  import type { PageProps } from './$types.js';
  import { Tag } from '$lib/components/blog';
  import SitemapSection from './SitemapSection.svelte';

  const { data }: PageProps = $props();

  const title = 'Sitemap';
  const description = 'Complete map of all pages on the Colibri documentation site.';
  const fullTitle = `${title} · Colibri Documentation`;
</script>

<svelte:head>
  <title>{fullTitle}</title>
  <meta name="title" content={fullTitle} />
  <meta name="description" content={description} />
</svelte:head>

<article class="mx-auto max-w-6xl px-4 py-8">
  <header class="mb-12">
    <h1 class="text-4xl font-bold text-gray-900 dark:text-white">Sitemap</h1>
    <p class="mt-4 text-lg text-gray-600 dark:text-gray-400">
      Complete map of all pages on this site.
    </p>
  </header>

  <div class="grid gap-12 lg:grid-cols-2">
    <!-- Left column: Documentation -->
    <div class="flex flex-col gap-10">
      <!-- Top-level pages -->
      {#if data.topLevelPages.length > 0}
        <section>
          <h2 class="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Pages</h2>
          <ul class="space-y-2">
            {#each data.topLevelPages as { href, title }, index (index)}
              <li>
                <a
                  {href}
                  class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                >
                  {title}
                </a>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      <!-- Documentation sections -->
      <section>
        <header class="mb-4">
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Documentation</h2>
        </header>

        <ul class="flex flex-col gap-6">
          {#each data.docSections as section, index (index)}
            <li class="contents">
              <SitemapSection {section} depth={0} />
            </li>
          {/each}
        </ul>
      </section>

      <!-- Other links -->
      <section>
        <header class="mb-4">
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Other</h2>
        </header>

        <ul class="flex flex-col gap-2">
          <li>
            <a
              href="/sitemap.xml"
              class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
            >
              XML Sitemap
            </a>
            <span class="ml-2 text-sm text-gray-500">— For search engines</span>
          </li>
          <li>
            <a
              href="/feed.xml"
              class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
            >
              RSS Feed
            </a>
            <span class="ml-2 text-sm text-gray-500">— Subscribe to updates</span>
          </li>
        </ul>
      </section>
    </div>

    <!-- Right column: Blog -->
    <div>
      <section>
        <h2 class="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          Blog
          <span class="ml-2 text-base font-normal text-gray-500">({data.totalBlogPosts} posts)</span>
        </h2>

        <!-- Blog listing pages -->
        <div class="mb-8">
          <h3 class="mb-3 text-lg font-medium text-gray-800 dark:text-gray-200">Browse</h3>
          <ul class="space-y-2">
            <li>
              <a
                href="/blog"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
              >
                All Posts
              </a>
            </li>
            <li>
              <a
                href="/blog/series"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
              >
                Series
              </a>
              <span class="ml-1 text-sm text-gray-500">({data.series.length})</span>
            </li>
            <li>
              <a
                href="/blog/tag"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
              >
                Tags
              </a>
              <span class="ml-1 text-sm text-gray-500">({data.tags.length})</span>
            </li>
            <li>
              <a
                href="/blog/author"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
              >
                Authors
              </a>
              <span class="ml-1 text-sm text-gray-500">({data.authors.length})</span>
            </li>
            <li>
              <a
                href="/blog/archive"
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
              >
                Archive
              </a>
              <span class="ml-1 text-sm text-gray-500">({data.archiveYears.length} years)</span>
            </li>
          </ul>
        </div>

        <!-- Authors -->
        {#if data.authors.length > 0}
          <div class="mb-8">
            <h3 class="mb-3 text-lg font-medium text-gray-800 dark:text-gray-200">Authors</h3>
            <ul class="space-y-2">
              {#each data.authors as author, index (index)}
                <li>
                  <a
                    href={author.href}
                    class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                  >
                    {author.name}
                  </a>
                  <span class="ml-1 text-sm text-gray-500">({author.count} posts)</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Series -->
        {#if data.series.length > 0}
          <div class="mb-8">
            <h3 class="mb-3 text-lg font-medium text-gray-800 dark:text-gray-200">Series</h3>
            <ul class="space-y-2">
              {#each data.series as series, index (index)}
                <li>
                  <a
                    href={series.href}
                    class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                  >
                    {series.title}
                  </a>
                  <span class="ml-1 text-sm text-gray-500">({series.count} posts)</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Tags -->
        {#if data.tags.length > 0}
          <div class="mb-8">
            <h3 class="mb-3 text-lg font-medium text-gray-800 dark:text-gray-200">Tags</h3>
            <div class="flex flex-wrap gap-2">
              {#each data.tags as tag, index (index)}
                <Tag label={tag.name} count={tag.count} linked />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Archive -->
        {#if data.archiveYears.length > 0}
          <div class="mb-8">
            <h3 class="mb-3 text-lg font-medium text-gray-800 dark:text-gray-200">Archive</h3>
            <ul class="flex flex-wrap gap-x-4 gap-y-2">
              {#each data.archiveYears as archive, index (index)}
                <li>
                  <a
                    href={archive.href}
                    class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                  >
                    {archive.year}
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Posts by year -->
        <ul class="flex flex-col gap-6">
          {#each data.blogByYear as yearGroup (yearGroup.year)}
            <li>
              <h3 class="mb-3 text-lg font-medium text-gray-800 dark:text-gray-200">
                <span>
                  {yearGroup.year}
                </span>
                <span class="ml-1 text-sm font-normal text-gray-500">
                  ({yearGroup.pages.length} posts)
                </span>
              </h3>

              <ul class="space-y-1.5 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                {#each yearGroup.pages as post, index (index)}
                  <li>
                    <a
                      href={post.href}
                      class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                    >
                      {post.title}
                    </a>
                  </li>
                {/each}
              </ul>
            </li>
          {/each}
        </ul>
      </section>
    </div>
  </div>
</article>
