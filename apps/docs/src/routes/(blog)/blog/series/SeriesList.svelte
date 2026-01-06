<script lang="ts">
  import { LibraryIcon } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import type { SeriesInfo } from '$lib/content/blog';

  type Props = {
    series: SeriesInfo[];
  };

  const { series }: Props = $props();
</script>

<ul class="grid gap-6 md:grid-cols-2">
  {#each series as { slug, name, count, description } (slug)}
    <li class="contents">
      <a
        href={resolve('/(blog)/blog/series/[slug]', { slug })}
        class="block group p-6 h-full rounded-lg overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700
        hover:ring-blue-500 dark:hover:ring-blue-400 transition-all bg-white dark:bg-gray-900 outline-hidden
        focus-visible:ring-3 focus-visible:ring-blue-500"
      >
        <section class="flex items-start gap-4">
          <div
            class="shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30
            text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          >
            <LibraryIcon class="size-6" />
          </div>

          <div class="flex-1 min-w-0">
            <h2
              class="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600
              dark:group-hover:text-blue-400 transition-colors group-focus-visible:text-blue-600
              dark:group-focus-visible:text-blue-400"
            >
              {name}
            </h2>
            <span class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {count} {count === 1 ? "part" : "parts"}
            </span>

            {#if description}
              <p class="text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                {description}
              </p>
            {/if}
          </div>
        </section>
      </a>
    </li>
  {/each}
</ul>
