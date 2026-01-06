import {
  subscribeToImportEvents,
  type ImportEvent,
} from "$lib/server/import-events";
import { resolveUserId } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

/**
 * SSE endpoint for import progress events.
 * Clients connect to this endpoint to receive real-time updates about book imports.
 *
 * Usage:
 * ```typescript
 * const eventSource = new EventSource('/api/import-events');
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   // Handle import event
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

      // Subscribe to import events for this user
      const unsubscribe = subscribeToImportEvents(
        userId,
        (event: ImportEvent) => {
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
