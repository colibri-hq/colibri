<script lang="ts">
  import { StarIcon } from '@lucide/svelte';
  import { githubConfig } from '$root/site.config';

  type Props = {
    class?: string;
  };

  const { class: className = '' }: Props = $props();

  const CACHE_KEY = 'github-stars';
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  let starCount = $state<number | null>(null);

  // Format large numbers (e.g., 1234 -> 1.2k)
  function formatCount(count: number): string {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  }

  // Fetch and cache star count
  async function fetchStars() {
    // Check cache first
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { count, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            starCount = count;
            return;
          }
        } catch {
          // Invalid cache, continue to fetch
        }
      }
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${githubConfig.repo}`);
      if (response.ok) {
        const data = await response.json();
        starCount = data.stargazers_count;

        // Cache the result
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ count: starCount, timestamp: Date.now() })
          );
        }
      }
    } catch {
      // Silently fail - badge just won't show count
    }
  }

  $effect(() => {
    fetchStars();
  });
</script>

<a
  href="https://github.com/{githubConfig.repo}"
  target="_blank"
  rel="noopener noreferrer"
  class="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg
    bg-slate-800/50 hover:bg-slate-700/70 text-slate-300 hover:text-white
    border border-slate-700/50 hover:border-slate-600
    transition-all duration-200 {className}"
  aria-label="Star on GitHub"
>
  <StarIcon class="size-4" />
  {#if starCount !== null}
    <span>{formatCount(starCount)}</span>
  {:else}
    <span>Star</span>
  {/if}
</a>
