<script lang="ts">
  import { StarIcon } from '@lucide/svelte';

  type Props = {
    repository: string;
    class?: string;
  };

  const cacheKey = 'github-stars';
  const cacheTtl = 60 * 60 * 1000;

  const { repository, class: className = '' }: Props = $props();
  const repositoryName = $derived(repository.split('github.com/').at(1)?.replace(/\.git$/, ''));
  let starCount = $state<number | null>(null);
  const formattedCount = $derived.by(() => {
    if (!starCount) {
      return '';
    }

    if (starCount >= 1_000_000) {
      return `${(starCount / 1_000_000).toFixed(1)}m`;
    }

    if (starCount >= 1000) {
      return `${(starCount / 1_000).toFixed(1)}k`;
    }

    return starCount.toString();
  });

  // Fetch and cache star count
  async function fetchStars() {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const { count, timestamp } = JSON.parse(cached);

          if (Date.now() - timestamp < cacheTtl) {
            starCount = count;

            return;
          }
        } catch {
          // Invalid cache, continue to fetch
        }
      }
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${repositoryName}`);

      if (response.ok) {
        const data = await response.json();
        starCount = data.stargazers_count;

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ count: starCount, timestamp: Date.now() }),
          );
        }
      }
    } catch {
      // Silently fail - badge just won't show count
    }
  }

  $effect(() => {
    void fetchStars();
  });
</script>

<a
  href={repository}
  target="_blank"
  rel="noopener noreferrer"
  class="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg bg-slate-800/50
  hover:bg-slate-700/70 text-slate-300 hover:text-white border border-slate-700/50 hover:border-slate-600
  transition-all duration-200 select-none {className}"
  aria-label="Star on GitHub"
>
  <StarIcon class="size-4" />

  {#if starCount !== null}
    <span>{formattedCount}</span>
  {:else}
    <span>Star</span>
  {/if}
</a>
