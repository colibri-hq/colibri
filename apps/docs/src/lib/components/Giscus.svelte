<script lang="ts">
  import { onMount } from 'svelte';
  import { githubConfig, giscusConfig } from '$root/site.config';

  type Props = {
    /** Override the discussion category */
    category?: string;
    /** Override the category ID */
    categoryId?: string;
    /** Override the repository ID */
    repoId?: string;
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
    category = giscusConfig.category,
    categoryId = giscusConfig.categoryId,
    repoId = giscusConfig.repoId,
    mapping = giscusConfig.mapping,
    reactions = giscusConfig.reactions,
    emitMetadata = false,
    inputPosition = 'top',
    lazy = giscusConfig.lazy,
  }: Props = $props();

  let container: HTMLDivElement;
  let loaded = $state(false);
  let theme = $state<'light' | 'dark'>('light');

  // Watch for theme changes
  function updateTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    theme = isDark ? 'dark' : 'light';

    // Update existing iframe theme if loaded
    if (loaded) {
      const iframe = container?.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
      iframe?.contentWindow?.postMessage(
        { giscus: { setConfig: { theme: theme === 'dark' ? 'dark' : 'light' } } },
        'https://giscus.app'
      );
    }
  }

  function loadGiscus() {
    if (loaded || !container) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', githubConfig.repo);
    script.setAttribute('data-repo-id', repoId);
    script.setAttribute('data-category', category);
    script.setAttribute('data-category-id', categoryId);
    script.setAttribute('data-mapping', mapping);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', reactions ? '1' : '0');
    script.setAttribute('data-emit-metadata', emitMetadata ? '1' : '0');
    script.setAttribute('data-input-position', inputPosition);
    script.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    script.setAttribute('data-lang', 'en');
    script.setAttribute('data-loading', lazy ? 'lazy' : 'eager');
    script.crossOrigin = 'anonymous';
    script.async = true;

    container.appendChild(script);
    loaded = true;
  }

  onMount(() => {
    updateTheme();

    // Watch for theme changes using MutationObserver
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          updateTheme();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Set up intersection observer for lazy loading
    if (lazy) {
      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              loadGiscus();
              intersectionObserver.disconnect();
            }
          }
        },
        { rootMargin: '100px' }
      );

      intersectionObserver.observe(container);

      return () => {
        observer.disconnect();
        intersectionObserver.disconnect();
      };
    } else {
      loadGiscus();
      return () => observer.disconnect();
    }
  });
</script>

<section class="mt-12 pt-8 border-t border-gray-200 dark:border-slate-700">
  <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
    Comments
  </h2>

  <div bind:this={container} class="giscus-container">
    {#if !loaded}
      <div class="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">Loading comments...</p>
      </div>
    {/if}
  </div>

  <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
    Comments are powered by <a href="https://giscus.app" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">Giscus</a>.
    You need a <a href="https://github.com" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">GitHub</a> account to comment.
  </p>
</section>

<style>
  .giscus-container :global(.giscus) {
    width: 100%;
  }

  .giscus-container :global(.giscus-frame) {
    width: 100%;
    border: none;
  }
</style>
