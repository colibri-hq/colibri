<script lang="ts">
  import { browser } from '$app/environment';
  import { untrack } from 'svelte';
  import { EclipseIcon, MoonIcon, SunIcon } from '@lucide/svelte';

  type Theme = 'light' | 'dark' | 'auto';

  const themes = ['light', 'dark', 'auto'] as const;
  const labels: Record<Theme, string> = {
    light: 'Light theme',
    dark: 'Dark theme',
    auto: 'System theme',
  };

  function getInitialTheme(): Theme {
    if (!browser) {
      return 'auto';
    }

    const stored = localStorage.getItem('theme') as Theme | null;

    return stored && themes.includes(stored) ? stored : 'auto';
  }

  let currentTheme = $state<Theme>(getInitialTheme());

  // Track position can go to themes.length (duplicate) for wrap-around
  let trackOffset = $state(themes.indexOf(getInitialTheme()));
  let enableTransition = $state(true);

  // Apply theme to DOM when it changes
  $effect(() => {
    const theme = currentTheme;
    untrack(() => applyTheme(theme));
  });

  function applyTheme(theme: Theme) {
    if (!browser) {
      return;
    }

    const html = document.documentElement;

    if (theme === 'auto') {
      // Remove attribute and reset color-scheme to let system preference take over
      html.removeAttribute('data-color-scheme');
      html.style.colorScheme = 'light dark';
    } else {
      // Set explicit light or dark preference
      html.setAttribute('data-color-scheme', theme);
      html.style.colorScheme = theme;
    }

    localStorage.setItem('theme', theme);
  }

  function cycleTheme() {
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    currentTheme = themes[nextIndex]!;

    // Always slide forward
    trackOffset = currentIndex + 1;

    // If we reached the duplicate (position 3), snap back to 0 after animation
    if (trackOffset >= themes.length) {
      setTimeout(() => {
        enableTransition = false;
        trackOffset = 0;
        // Re-enable transition after the instant snap
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            enableTransition = true;
          });
        });
      }, 300); // Match CSS transition duration
    }
  }
</script>

<button
  onclick={cycleTheme}
  aria-label={labels[currentTheme]}
  aria-roledescription="theme toggle"
  title={labels[currentTheme]}
  class="lever-button cursor-pointer overflow-hidden outline-hidden rounded-full size-8 relative
  bg-transparent hover:bg-black/25 dark:hover:bg-white/10 ring-0 focus-visible:ring-2 ring-blue-500 transition duration-200"
>
  <!-- eslint-disable svelte/no-inline-styles -->
  <span
    class="absolute top-0 left-0 h-full flex items-center ease-in-out duration-300 transition-transform
    data-[transition=false]:transition-none translate-x-[calc(var(--offset)*--spacing(8)*-1)]"
    data-transition={enableTransition ? 'true' : 'false'}
    style:--offset={trackOffset}
  >
    <!-- eslint-enable svelte/no-inline-styles -->
    {#each themes as theme (theme)}
      <span class="shrink-0 size-8 flex items-center justify-center">
        {#if theme === 'light'}
          <SunIcon class="size-5" />
        {:else if theme === 'dark'}
          <MoonIcon class="size-5" />
        {:else}
          <EclipseIcon class="size-5" />
        {/if}
      </span>
    {/each}

    <!-- Duplicate first icon for seamless wrap-around -->
    <span class="shrink-0 size-8 flex items-center justify-center">
      <SunIcon class="size-5" />
    </span>
  </span>
</button>
