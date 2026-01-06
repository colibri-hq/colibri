import {
  subscribeToCommentEvents,
  type CommentEvent,
} from "$lib/server/comment-events";
import { resolveUserId } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

/**
 * SSE endpoint for comment notification events.
 * Clients connect to this endpoint to receive real-time updates about
 * replies, reactions, and mentions on their comments.
 *
 * Usage:
 * ```typescript
 * const eventSource = new EventSource('/api/comment-events');
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   // Handle comment event
 * };
 * ```
 */
export const GET: RequestHandler = async ({ request, cookies }) => {
  const userId = resolveUserId(cookies);

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      const connectEvent = `data: ${JSON.stringify({ type: "connected" })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Subscribe to comment events for this user
      const unsubscribe = subscribeToCommentEvents(
        userId,
        (event: CommentEvent) => {
          try {
            const sseEvent = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseEvent));
          } catch {
            // Client disconnected, clean up
            unsubscribe();
            controller.close();
          }
        },
      );

      // Handle client disconnect via abort signal
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });

      // Send keepalive every 30 seconds to prevent connection timeout
      const keepaliveInterval = setInterval(() => {
        try {
          const keepalive = `: keepalive\n\n`;
          controller.enqueue(encoder.encode(keepalive));
        } catch {
          clearInterval(keepaliveInterval);
          unsubscribe();
        }
      }, 30000);

      // Clean up interval on abort
      request.signal.addEventListener("abort", () => {
        clearInterval(keepaliveInterval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
