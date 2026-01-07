<script lang="ts">
  import { TagIcon } from '@lucide/svelte';
  import type { PageProps } from './$types.js';

  const { data }: PageProps = $props();
  const title = $derived(`Pages tagged "${data.tag}" · Colibri Documentation`);
  const description = $derived(`All documentation pages tagged with ${data.tag}`);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta name="robots" content="noindex" />
</svelte:head>

<article class="w-full max-w-5xl mx-auto px-4 xl:px-0 py-8">
  <header class="mb-8">
    <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
      <TagIcon class="size-5" />
      <span class="text-sm uppercase tracking-wide">Tag</span>
    </div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{data.tag}</h1>
    <p class="mt-2 text-gray-600 dark:text-gray-300">
      {data.pages.length} {data.pages.length === 1 ? 'page' : 'pages'} tagged with "{data.tag}"
    </p>
  </header>

  <ul class="grid gap-4">
    {#each data.pages as page (page.href)}
      <li>
        <a
          href={page.href}
          class="group block p-4 rounded-lg ring ring-gray-200 dark:ring-gray-700 hover:ring-blue-500
          focus-visible:ring-3 focus-visible:ring-blue-500 bg-white dark:bg-gray-900 transition outline-hidden"
        >
          <h2
            class="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600
            dark:group-hover:text-blue-400 group-focus-visible:text-blue-600
            dark:group-focus-visible:text-blue-400 transition-colors"
          >
            {page.title}
          </h2>
          {#if page.description}
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {page.description}
            </p>
          {/if}
        </a>
      </li>
    {/each}
  </ul>
</article>
