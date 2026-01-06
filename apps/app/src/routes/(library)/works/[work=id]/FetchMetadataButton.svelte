<script lang="ts">
  import { Button, Icon } from '@colibri-hq/ui';
  import { page } from '$app/state';
  import { trpc } from '$lib/trpc/client';
  import { getEnrichmentStatus, markEnriching, markEnrichmentAvailable, clearEnrichmentStatus } from '$lib/enrichment';

  interface Props {
    workId: string;
    class?: string;
  }

  let { workId, class: className }: Props = $props();

  // Get reactive enrichment status from store
  const enrichmentStore = getEnrichmentStatus(workId);
  let status = $derived($enrichmentStore.status);
  let loading = $state(false);

  async function handleClick() {
    if (status === 'enriching' || loading) return;

    loading = true;
    markEnriching(workId);

    try {
      await trpc(page).books.triggerEnrichment.mutate({ workId });

      // Check if enrichment produced results
      const result = await trpc(page).books.hasEnrichment.query({ workId });
      if (result.hasEnrichment) {
        const { improvementCount, sources } = result as {
          hasEnrichment: true;
          improvementCount: number;
          sources: string[];
        };
        if (improvementCount > 0) {
          markEnrichmentAvailable(workId, improvementCount, sources ?? []);
        } else {
          clearEnrichmentStatus(workId);
        }
      } else {
        clearEnrichmentStatus(workId);
      }
    } catch (err) {
      console.error('Failed to trigger enrichment:', err);
      clearEnrichmentStatus(workId);
    } finally {
      loading = false;
    }
  }
</script>

<Button
  variant="subtle"
  onclick={handleClick}
  disabled={status === 'enriching' || loading}
  class={className}
>
  {#if status === 'enriching' || loading}
    <Icon name="sync" class="mr-1.5 animate-spin" />
    Fetching metadata...
  {:else if status === 'available'}
    <Icon name="auto_fix_high" class="mr-1.5 text-amber-500" />
    Review improvements
  {:else}
    <Icon name="auto_fix_high" class="mr-1.5" />
    Fetch metadata
  {/if}
</Button>
