<script lang="ts">
  import { browser } from '$app/environment';
  import { SearchIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    placeholder?: string | Snippet;
    size?: 'medium' | 'large';
    variant?: 'light' | 'dark';
    onclick?: () => void;
    class?: string;
  }

  let {
    onclick,
    placeholder = 'Search…',
    size = 'medium',
    variant = 'dark',
    class: className = '',
  }: Props = $props();

  // Detect macOS for showing correct modifier key
  const isMac = browser
    ? navigator.platform.startsWith('Mac') || navigator.platform === 'iPhone'
    : true;
  const modifierKey = isMac ? '⌘' : 'Ctrl';
</script>

<button
  type="button"
  {onclick}
  data-size={size}
  data-variant={variant}
  class="group flex items-center gap-3 data-[size=large]:gap-4 rounded-lg shadow-sm ring ring-slate-300
  dark:ring-slate-600 data-[variant=dark]:ring-slate-600 bg-gray-50 dark:bg-slate-800
  data-[variant=dark]:bg-slate-800 ps-3 pe-2 py-1.5 data-[size=large]:ps-4 data-[size=large]:pe-3.5
  data-[size=large]:py-3 min-w-48 text-slate-600 dark:text-slate-400 data-[variant=dark]:text-slate-400 transition
  hover:ring-slate-400 dark:hover:ring-slate-500 hover:data-[variant=dark]:ring-slate-500 hover:bg-white
  dark:hover:bg-slate-700 hover:data-[variant=dark]:bg-slate-700 hover:text-slate-700
  dark:hover:text-slate-300 hover:data-[variant=dark]:text-slate-300 outline-hidden focus-visible:ring-2
  focus-visible:ring-blue-500 select-none {className}"
  aria-label="Show Search Dialog"
>
  <SearchIcon class="size-5" />

  <span class="hidden sm:inline text-sm group-data-[size=large]:text-base">
    {#if typeof placeholder === 'string'}
      {placeholder}
    {:else}
      {@render placeholder()}
    {/if}
  </span>
  <kbd
    class="hidden rounded border border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-600
    dark:bg-slate-900 dark:text-slate-500 group-data-[variant=dark]:border-slate-600
    group-data-[variant=dark]:bg-slate-900 group-data-[variant=dark]:text-slate-500 px-1.5 py-0.5 font-mono text-xs
    group-data-[size=large]:text-sm sm:inline ms-auto group-hover:opacity-75 transition"
  >
    {modifierKey}&thinsp;K
  </kbd>
</button>
