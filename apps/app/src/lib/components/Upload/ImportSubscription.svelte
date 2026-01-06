<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { updateQueueFromSSE, queue } from '$lib/uploads';
  import { success, error as notifyError } from '$lib/notifications';
  import { toast } from 'svelte-sonner';
  import type { ImportEvent } from '$lib/server/import-events';
  import DuplicatePrompt from './DuplicatePrompt.svelte';
  import { markEnriching, markEnrichmentAvailable, clearEnrichmentStatus } from '$lib/enrichment';

  let eventSource: EventSource | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  function connect() {
    if (!browser) return;

    eventSource = new EventSource('/api/import-events');

    eventSource.onopen = () => {
      console.log('[ImportSubscription] Connected to SSE');
      reconnectAttempts = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ImportEvent | { type: 'connected' };

        if (data.type === 'connected') {
          console.log('[ImportSubscription] SSE connection confirmed');
          return;
        }

        handleImportEvent(data);
      } catch (e) {
        console.error('[ImportSubscription] Failed to parse SSE event:', e);
      }
    };

    eventSource.onerror = (event) => {
      console.error('[ImportSubscription] SSE error:', event);
      eventSource?.close();

      // Attempt to reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`[ImportSubscription] Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
        setTimeout(connect, reconnectDelay);
      } else {
        console.error('[ImportSubscription] Max reconnect attempts reached');
      }
    };
  }

  function handleImportEvent(event: ImportEvent) {
    console.log('[ImportSubscription] Received event:', event);

    // Update the queue store (only for import events, not enrichment events)
    if ('uploadId' in event) {
      updateQueueFromSSE(event);
    }

    // Show notifications based on event type
    switch (event.type) {
      case 'completed': {
        success('Book imported', {
          message: `"${event.title}" has been added to your library`,
        });
        break;
      }

      case 'duplicate': {
        // Find the updated item in the queue and show duplicate prompt
        setTimeout(() => {
          const item = $queue.find((q) => q.id === event.uploadId);
          if (item) {
            showDuplicatePrompt(item);
          }
        }, 0);
        break;
      }

      case 'skipped':
        // Skipped items are quietly removed
        break;

      case 'failed':
        notifyError('Import failed', {
          message: event.error,
        });
        break;

      // Enrichment events - update store only, no toasts (badge-only approach)
      case 'enrichment-started':
        markEnriching(event.workId);
        break;

      case 'enrichment-completed':
        if (event.improvementCount > 0) {
          markEnrichmentAvailable(event.workId, event.improvementCount, event.sources);
        } else {
          clearEnrichmentStatus(event.workId);
        }
        break;

      case 'enrichment-failed':
        clearEnrichmentStatus(event.workId);
        console.warn('[ImportSubscription] Enrichment failed for work', event.workId, event.error);
        break;
    }
  }

  function showDuplicatePrompt(item: (typeof $queue)[number]) {
    const toastId = toast.custom(DuplicatePrompt, {
      componentProps: {
        item,
        toastId: '',
      },
      duration: Infinity,
    });

    // Update the component props with the actual toast ID
    // This is a workaround since svelte-sonner doesn't pass the ID automatically
    toast.custom(DuplicatePrompt, {
      id: toastId,
      componentProps: {
        item,
        toastId,
      },
      duration: Infinity,
    });
  }

  onMount(() => {
    connect();
  });

  onDestroy(() => {
    eventSource?.close();
  });
</script>

<!-- This component has no visible UI - it manages SSE subscription -->
