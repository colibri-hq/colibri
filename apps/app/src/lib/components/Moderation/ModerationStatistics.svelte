<script lang="ts">
  import { Icon } from '@colibri-hq/ui';
  import type { ModerationStats } from '@colibri-hq/sdk';
  import Gravatar from 'svelte-gravatar';
  import { onMount } from 'svelte';
  import { trpc } from '$lib/trpc/client';
  import { page } from '$app/state';

  type Props = {
    expanded?: boolean;
    class?: string;
  }

  let {
    class: className,
    expanded = $bindable(true),
    ...rest
  }: Props = $props();
  let loading = $state(false);
  let stats = $state<ModerationStats | null>(null);

  async function loadStats() {
    loading = true;

    try {
      stats = await trpc(page).comments.getModerationStats.query();
    } catch (error) {
      console.error('Failed to load moderation stats', error);
    } finally {
      loading = false;
    }
  }

  onMount(loadStats);
</script>

<section class={className} {...rest}>
  <header>
    <h3>
      <button
        type="button"
        class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-3"
        onclick={() => expanded = !expanded}
      >
        <Icon name={expanded ? 'expand_less' : 'expand_more'} />
        <span class="font-bold">
          Statistics
        </span>
      </button>
    </h3>
  </header>

  {#if expanded}
    {#if loading}
      <div class="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <!-- Stats skeleton -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {#each Array(4) as _, index (index)}
            <div class="text-center">
              <div class="h-9 w-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div class="mt-1 h-4 w-20 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          {/each}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div class="space-y-2">
            <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            {#each Array(3) as _, index (index)}
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div class="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            {/each}
          </div>
          <div class="space-y-2">
            <div class="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            {#each Array(3) as _, index (index)}
              <div class="flex items-center gap-2">
                <div class="size-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                <div class="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div class="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else if stats}
      <div class="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <!-- Summary counters -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div class="text-center">
            <div class="text-3xl font-bold text-gray-900 dark:text-white">{stats.unresolvedReports}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Pending Reports</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalReports}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Total Reports</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-gray-900 dark:text-white">{stats.hiddenComments}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Hidden Comments</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-gray-900 dark:text-white">{stats.resolvedThisWeek}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Resolved This Week</div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <!-- Resolution breakdown -->
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Resolution Breakdown</h4>
            {#if stats.byResolution.dismissed + stats.byResolution.hidden + stats.byResolution.deleted === 0}
              <p class="text-sm text-gray-500 dark:text-gray-400">No resolved reports yet</p>
            {:else}
              {@const total = stats.byResolution.dismissed + stats.byResolution.hidden + stats.byResolution.deleted}
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      class="bg-gray-400 h-full"
                      style:width="{(stats.byResolution.dismissed / total) * 100}%"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-500 w-20">Dismissed ({stats.byResolution.dismissed})</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      class="bg-yellow-400 h-full"
                      style:width="{(stats.byResolution.hidden / total) * 100}%"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-500 w-20">Hidden ({stats.byResolution.hidden})</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      class="bg-red-400 h-full"
                      style:width="{(stats.byResolution.deleted / total) * 100}%"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-500 w-20">Deleted ({stats.byResolution.deleted})</span>
                </div>
              </div>
            {/if}

            {#if stats.averageResolutionTimeHours !== null}
              <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500 dark:text-gray-400">Avg. Resolution Time</span>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {#if stats.averageResolutionTimeHours < 1}
                      {Math.round(stats.averageResolutionTimeHours * 60)} minutes
                    {:else if stats.averageResolutionTimeHours < 24}
                      {stats.averageResolutionTimeHours.toFixed(1)} hours
                    {:else}
                      {(stats.averageResolutionTimeHours / 24).toFixed(1)} days
                    {/if}
                  </span>
                </div>
              </div>
            {/if}
          </div>

          <!-- Top reporters -->
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Top Reporters</h4>
            {#if stats.topReporters.length === 0}
              <p class="text-sm text-gray-500 dark:text-gray-400">No reports filed yet</p>
            {:else}
              <div class="space-y-2">
                {#each stats.topReporters as reporter, index (index)}
                  <div class="flex items-center gap-2">
                    <Gravatar
                      class="h-6 w-6 rounded-full bg-gray-200"
                      email={reporter.email ?? ''}
                    />
                    <span class="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                      {reporter.name}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {reporter.count} report{reporter.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</section>
