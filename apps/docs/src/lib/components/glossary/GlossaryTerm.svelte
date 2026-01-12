<script lang="ts">
  import { getGlossaryEntry } from './glossary-data.js';

  interface Props {
    term: string;
    children?: import('svelte').Snippet;
  }

  const { term, children }: Props = $props();

  const entry = $derived(getGlossaryEntry(term));

  let showTooltip = $state(false);
  let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

  function handleMouseEnter() {
    tooltipTimeout = setTimeout(() => {
      showTooltip = true;
    }, 300); // Delay before showing tooltip
  }

  function handleMouseLeave() {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }
    showTooltip = false;
  }
</script>

<span
  class="glossary-term group relative inline-block cursor-help"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  role="term"
  aria-describedby="{term}-definition"
>
  <!-- The term itself with subtle underline -->
  <span class="border-b border-dotted border-blue-500 dark:border-blue-400">
    {#if children}
      {@render children()}
    {:else}
      {entry?.displayTerm || term}
    {/if}
  </span>

  <!-- Tooltip popup -->
  {#if showTooltip && entry}
    <span
      id="{term}-definition"
      class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 text-sm text-white
             bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg border border-gray-700
             pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      role="tooltip"
    >
      <!-- Tooltip content -->
      <div class="space-y-1">
        <div class="font-semibold">{entry.displayTerm}</div>
        <div class="text-gray-300 dark:text-gray-400">{entry.definition}</div>

        {#if entry.learnMoreUrl}
          <a
            href={entry.learnMoreUrl}
            class="text-xs text-blue-400 hover:text-blue-300 underline pointer-events-auto"
          >
            Learn more →
          </a>
        {/if}
      </div>

      <!-- Tooltip arrow -->
      <svg
        class="absolute top-full left-1/2 -translate-x-1/2 text-gray-900 dark:text-gray-800"
        width="16"
        height="8"
        viewBox="0 0 16 8"
      >
        <path d="M8 8L0 0h16z" fill="currentColor" />
      </svg>
    </span>
  {/if}
</span>

<style>
  /* Ensure tooltip is visible above other content */
  .glossary-term {
    position: relative;
    z-index: 1;
  }

  /* Smooth appearance */
  .glossary-term:hover [role="tooltip"] {
    opacity: 1;
  }
</style>
