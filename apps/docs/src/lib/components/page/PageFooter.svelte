<script lang="ts">
  import type { PageMetadata, SiblingPages } from '$lib/content/content';
  import { getContentFilePath } from '$lib/content/content';
  import gitDates from '$lib/data/git-dates.json';
  import { CalendarClockIcon, CalendarIcon, TagIcon } from '@lucide/svelte';
  import { LateralNavigation } from '$lib/components/content';
  import { resolve } from '$app/paths';
  import GithubEditLink from '$lib/components/content/GithubEditLink.svelte';
  import { PUBLIC_REPOSITORY_BRANCH } from '$env/static/public';

  type Props = {
    metadata: PageMetadata;
    siblings?: SiblingPages;
  };

  const { metadata, siblings }: Props = $props();

  const formattedDate = $derived(
    metadata.date
      ? new Date(metadata.date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      : null,
  );

  // Get last updated date from git history
  const lastUpdated = $derived.by(() => {
    const gitDate = (gitDates as Record<string, string>)[metadata.slug];
    if (!gitDate) {
      return null;
    }

    const date = new Date(gitDate);
    // Only show if different from publication date (more than 1 day difference)
    if (metadata.date) {
      const pubDate = new Date(metadata.date);
      const diffDays = Math.abs(date.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays < 1) {
        return null;
      }
    }

    return {
      iso: gitDate,
      formatted: date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
  });

  const filePath = $derived(getContentFilePath(metadata.slug));
</script>

<footer class="w-full max-w-5xl mx-auto px-4 xl:px-0 mt-12 pb-8">
  <!-- region Metadata -->
  {#if formattedDate || lastUpdated || filePath || (metadata.tags && metadata.tags.length > 0)}
    <div class="flex flex-wrap justify-between items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-8">
      <div class="flex items-center gap-4">
        {#if formattedDate}
          <div class="flex items-center gap-1.5">
            <CalendarIcon class="size-4" />
            <time datetime={metadata.date}>{formattedDate}</time>
          </div>
        {/if}

        {#if lastUpdated}
          <div class="flex items-center gap-1.5">
            <CalendarClockIcon class="size-4" />
            <span>Updated
              <time datetime={lastUpdated.iso}>{lastUpdated.formatted}</time>
            </span>
          </div>
        {/if}

        {#if filePath}
          <GithubEditLink
            slug={filePath}
            repository={PACKAGE_REPOSITORY_URL}
            branch={PUBLIC_REPOSITORY_BRANCH}
          />
        {/if}
      </div>

      {#if metadata.tags && metadata.tags.length > 0}
        <div class="flex items-center gap-1.5 flex-wrap">
          <TagIcon class="size-4" />

          <ul class="flex items-center gap-2 flex-wrap">
            {#each metadata.tags as tag, index (index)}
              <li class="contents">
                <a
                  href={resolve('/(blog)/blog/tag/[tag]', { tag })}
                  class="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-xs hover:bg-blue-100 outline-hidden
                  dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 transition-colors
                  focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:bg-blue-100 dark:focus-visible:bg-blue-950"
                >
                  {tag}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}
  <!-- endregion -->

  <LateralNavigation previous={siblings?.previous} next={siblings?.next} />
</footer>
