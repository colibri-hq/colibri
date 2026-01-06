<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { info } from '$lib/notifications';
  import type { CommentEvent } from '$lib/server/comment-events';

  let eventSource: EventSource | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  function connect() {
    if (!browser) return;

    eventSource = new EventSource('/api/comment-events');

    eventSource.onopen = () => {
      console.log('[CommentSubscription] Connected to SSE');
      reconnectAttempts = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as CommentEvent | { type: 'connected' };

        if (data.type === 'connected') {
          console.log('[CommentSubscription] SSE connection confirmed');
          return;
        }

        handleCommentEvent(data);
      } catch (e) {
        console.error('[CommentSubscription] Failed to parse SSE event:', e);
      }
    };

    eventSource.onerror = (event) => {
      console.error('[CommentSubscription] SSE error:', event);
      eventSource?.close();

      // Attempt to reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`[CommentSubscription] Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
        setTimeout(connect, reconnectDelay);
      } else {
        console.error('[CommentSubscription] Max reconnect attempts reached');
      }
    };
  }

  function handleCommentEvent(event: CommentEvent) {
    console.log('[CommentSubscription] Received event:', event);

    switch (event.type) {
      case 'reply': {
        info(`${event.authorName} replied to your comment`, {
          message: event.preview,
        });
        break;
      }

      case 'reaction': {
        info(`${event.authorName} reacted ${event.emoji} to your comment`);
        break;
      }

      case 'mention': {
        info(`${event.authorName} mentioned you in a comment`, {
          message: event.preview,
        });
        break;
      }
    }
  }

  onMount(() => {
    connect();
  });

  onDestroy(() => {
    eventSource?.close();
  });
</script>

<!-- This component has no visible UI - it manages SSE subscription for comment notifications -->
