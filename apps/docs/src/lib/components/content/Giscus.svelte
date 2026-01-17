<script lang="ts">
  import { onMount } from 'svelte';

  type Props = {
    /** Override the discussion category */
    category: string;
    /** Override the category ID */
    categoryId: string;
    /** Override the repository name (e.g. user/repo) */
    repository: string;
    /** Override the repository ID */
    repoId: string;
    /** Mapping between page and discussion */
    mapping?: 'pathname' | 'url' | 'title' | 'og:title';
    /** Enable reactions on the main post */
    reactions?: boolean;
    /** Emit discussion metadata */
    emitMetadata?: boolean;
    /** Place input position */
    inputPosition?: 'top' | 'bottom';
    /** Lazy load until user scrolls to comments */
    lazy?: boolean;
  };

  const {
    category,
    categoryId,
    repository,
    repoId,
    mapping = 'og:title',
    reactions = true,
    emitMetadata = false,
    inputPosition = 'top',
    lazy = true,
  }: Props = $props();

  let container: HTMLDivElement;
  let loaded = $state(false);
  const repositoryName = $derived(repository.split('github.com/').at(1)?.replace(/\.git$/, '') ?? 'colibri-hq/colibri');

  function loadGiscus() {
    if (loaded || !container) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', repositoryName);
    script.setAttribute('data-repo-id', repoId);
    script.setAttribute('data-category', category);
    script.setAttribute('data-category-id', categoryId);
    script.setAttribute('data-mapping', mapping);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', reactions ? '1' : '0');
    script.setAttribute('data-emit-metadata', emitMetadata ? '1' : '0');
    script.setAttribute('data-input-position', inputPosition);
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'en');
    script.setAttribute('data-loading', lazy ? 'lazy' : 'eager');
    script.crossOrigin = 'anonymous';
    script.async = true;

    // eslint-disable-next-line svelte/no-dom-manipulating
    container.appendChild(script);
    loaded = true;
  }

  onMount(() => {
    if (!lazy) {
      loadGiscus();

      return;
    }

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            loadGiscus();
            intersectionObserver.disconnect();
          }
        }
      },
      { rootMargin: '100px' },
    );

    intersectionObserver.observe(container);

    return () => {
      intersectionObserver.disconnect();
    };
  });
</script>

<section class="mt-12 pt-8 border-t border-gray-200 dark:border-slate-700">
  <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
    Comments
  </h2>

  <div bind:this={container} class="giscus-container">
    {#if !loaded}
      <div class="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">Loading comments…</p>
      </div>
    {/if}
  </div>

  <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
    Comments are powered by <a href="https://giscus.app" target="_blank" rel="noopener noreferrer"
                               class="text-blue-600 dark:text-blue-400 hover:underline">Giscus</a>.
    You need a <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                  class="text-blue-600 dark:text-blue-400 hover:underline">GitHub</a> account to comment.
  </p>
</section>

<style>
    /*noinspection CssUnusedSymbol*/
    .giscus-container :global(.giscus) {
        width: 100%;
    }

    /*noinspection CssUnusedSymbol*/
    .giscus-container :global(.giscus-frame) {
        width: 100%;
        border: none;
    }
</style>
