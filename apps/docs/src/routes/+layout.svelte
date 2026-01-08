<script lang="ts">
  import '@fontsource/titillium-web';
  import '@fontsource/neuton/400.css';
  import '@fontsource/neuton/400-italic.css';
  import '@fontsource/neuton/700.css';
  import '@fontsource-variable/material-symbols-outlined/full.css';
  import '$lib/style.css';

  import { afterNavigate, onNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { LayoutProps } from './$types';
  import NavigationBar from '$lib/components/NavigationBar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import SearchOverlay from '$lib/components/search/SearchOverlay.svelte';
  import { LinkPreviewProvider } from '$lib/components/links';
  import { setSearchContext } from '$lib/components/search';

  const { data, children }: LayoutProps = $props();

  let searchOpen = $state(false);
  setSearchContext({ open: () => searchOpen = true });

  function handleKeydown(event: KeyboardEvent) {
    // Open search with Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      searchOpen = true;
    }
  }

  // Initialize Mermaid diagrams
  async function initMermaid() {
    const mermaidBlocks = document.querySelectorAll('code.language-mermaid');
    if (mermaidBlocks.length === 0) {
      return;
    }

    const mermaid = await import('mermaid');
    mermaid.default.initialize({
      startOnLoad: false,
      theme: 'default',
      themeVariables: {
        darkMode: document.documentElement.classList.contains('dark'),
      },
    });

    for (const block of mermaidBlocks) {
      const pre = block.parentElement;
      if (!pre || pre.dataset.mermaidRendered === 'true') {
        continue;
      }

      try {
        // Decode HTML entities in the code content
        const code = block.textContent || '';
        const { svg } = await mermaid.default.render(
          `mermaid-${Math.random().toString(36).slice(2)}`,
          code,
        );

        // Replace the pre element with the rendered SVG
        const container = document.createElement('div');
        container.className = 'mermaid-diagram';
        container.innerHTML = svg;
        pre.replaceWith(container);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        pre.dataset.mermaidRendered = 'error';
      }
    }
  }

  onMount(() => {
    initMermaid();
  });

  afterNavigate(() => {
    // Re-initialize mermaid after navigation
    setTimeout(initMermaid, 50);
  });

  onNavigate((navigation) => {
    // Check if View Transitions API is supported
    if (!document.startViewTransition) {
      return;
    }

    return new Promise((resolve) => document.startViewTransition(async () => {
      resolve();
      await navigation.complete;
    }));
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<LinkPreviewProvider>
  <NavigationBar items={data.contentTree} />

  <main class="grow">
    {@render children?.()}
  </main>

  <Footer contentTree={data.contentTree} />
</LinkPreviewProvider>

<SearchOverlay bind:open={searchOpen} />

<style>
    /* View Transitions - Blog pages only */
    :global(::view-transition-old(root)),
    :global(::view-transition-new(root)) {
        animation: 200ms ease-out both vt-fade;
    }

    :global(::view-transition-old(root)) {
        animation-direction: reverse;
    }

    @keyframes vt-fade {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    /* Navbar stays static during transition */
    :global(::view-transition-old(navbar)),
    :global(::view-transition-new(navbar)) {
        animation: none;
    }

    /* Hero thumbnail transition - smooth morph */
    :global(::view-transition-group(*)) {
        animation-duration: 250ms;
        animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    }
</style>
