<script lang="ts">
  import { Directory, Page } from '$lib/content/content';
  import { resolve } from '$app/paths';

  type Props = {
    children: (Page | Directory)[];
    [key: string]: unknown;
  };

  const { children, ...rest }: Props = $props();

  function getSlug(child: Page | Directory) {
    // @ts-expect-error -- Dynamic route resolution
    return resolve(child.slug);
  }

  function getTitle(child: Page | Directory) {
    return child instanceof Page ? child.metadata.title : child.title;
  }
</script>

<div class="w-full max-w-5xl mx-auto px-4 xl:px-0" {...rest}>
  {#if children.length > 0}
    <nav class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {#each children as child, index (index)}
        <a
          href={getSlug(child)}
          class="group block p-6 bg-white dark:bg-gray-800 rounded-xl ring ring-gray-200 outline-hidden
            dark:ring-gray-700 hover:ring-blue-400 dark:hover:ring-blue-500 hover:shadow-md transition-all
            duration-200 focus-visible:ring-3 focus-visible:ring-blue-500"
        >
          <h3
            class="mb-2 text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600
            dark:group-hover:text-blue-400 group-focus-visible:text-blue-600 dark:group-focus-visible:text-blue-400"
          >
            {getTitle(child)}
          </h3>

          {#if child.metadata?.description}
            <p class="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
              {child.metadata.description}
            </p>
          {/if}

          <span
            class="inline-flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium
              group-hover:translate-x-1 transition-transform duration-200"
          >
            Read more
            <svg class="size-4 ms-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </a>
      {/each}
    </nav>
  {:else}
    <p class="text-gray-500 dark:text-gray-400 text-center py-12">
      No pages found in this section.
    </p>
  {/if}
</div>
