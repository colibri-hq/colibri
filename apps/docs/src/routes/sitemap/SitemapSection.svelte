<script lang="ts">
  import SitemapSection from './SitemapSection.svelte';
  import type { SitemapSection as Section } from './+page.server';

  type Props = {
    section: Section;
    depth?: number;
  }

  const { section, depth = 0 }: Props = $props();
</script>

<section class={depth > 0 ? 'pl-4 border-l-2 border-gray-200 dark:border-gray-700' : ''}>
  <header class="mb-2">
    <h3 class="font-medium text-gray-800 dark:text-gray-200" class:text-lg={depth === 0}>
      {#if section.href}
        <a
          href={section.href}
          class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
        >
          {section.title}
        </a>
      {:else}
        <span>
          {section.title}
        </span>
      {/if}
    </h3>
  </header>

  {#if section.pages.length > 0}
    <ul class="mb-4 flex flex-col gap-1 ps-4">
      {#each section.pages as page, index (index)}
        <li>
          <a
            href={page.href}
            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            {page.title}
          </a>
        </li>
      {/each}
    </ul>
  {/if}

  {#if section.subsections}
    <div class="mt-4 flex flex-col gap-4">
      {#each section.subsections as subsection, index (index)}
        <SitemapSection section={subsection} depth={depth + 1} />
      {/each}
    </div>
  {/if}
</section>
