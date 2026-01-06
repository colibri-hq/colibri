<script lang="ts">
  import { Markdown } from "@colibri-hq/ui";
  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
</script>

<svelte:head>
  <title>Changelog · Colibri Documentation</title>
  <meta name="description" content="Release history and changelog for Colibri" />
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-12">
  <header class="mb-12">
    <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
      Changelog
    </h1>
    <p class="text-lg text-gray-600 dark:text-gray-400">
      Release history and updates for Colibri
    </p>
  </header>

  {#if data.releases.length === 0}
    <div
      class="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <p class="text-gray-600 dark:text-gray-400 mb-2">
        No releases available yet.
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-500">
        Check back soon for updates, or view releases on
        <a
          href="https://github.com/colibri-hq/colibri/releases"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 dark:text-blue-400 hover:underline"
        >
          GitHub
        </a>.
      </p>
    </div>
  {:else}
    <div class="space-y-12">
      {#each data.releases as release (release.id)}
        <article
          class="release-card border-l-4 border-blue-500 pl-6 pb-8 relative"
        >
          <!-- Version badge -->
          <div class="flex items-center gap-3 mb-3">
            <a
              href={release.html_url}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
            >
              {release.tag_name}
              <svg
                class="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>

            {#if release.prerelease}
              <span
                class="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded text-xs font-medium"
              >
                Pre-release
              </span>
            {/if}
          </div>

          <!-- Title -->
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {release.name || release.tag_name}
          </h2>

          <!-- Date -->
          <time
            datetime={release.published_at}
            class="text-sm text-gray-500 dark:text-gray-400 block mb-4"
          >
            {formatDate(release.published_at)}
          </time>

          <!-- Release notes -->
          {#if release.body}
            <div class="release-body prose prose-sm dark:prose-invert max-w-none">
              <Markdown source={release.body} />
            </div>
          {/if}
        </article>
      {/each}
    </div>

    <!-- View all on GitHub -->
    <div class="mt-12 text-center">
      <a
        href="https://github.com/colibri-hq/colibri/releases"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        View all releases on GitHub
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  {/if}
</div>

<style>
  .release-body :global(h1),
  .release-body :global(h2),
  .release-body :global(h3) {
    font-size: 1rem;
    line-height: 1.5rem;
    font-weight: 600;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  .release-body :global(ul) {
    list-style-type: disc;
    padding-left: 1.25rem;
  }

  .release-body :global(ul) > :global(li + li) {
    margin-top: 0.25rem;
  }

  .release-body :global(li) {
    color: rgb(75 85 99);
  }

  :global(.dark) .release-body :global(li) {
    color: rgb(156 163 175);
  }

  .release-body :global(code) {
    background-color: rgb(243 244 246);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  :global(.dark) .release-body :global(code) {
    background-color: rgb(31 41 55);
  }

  .release-body :global(a) {
    color: rgb(37 99 235);
  }

  :global(.dark) .release-body :global(a) {
    color: rgb(96 165 250);
  }

  .release-body :global(a:hover) {
    text-decoration: underline;
  }
</style>
