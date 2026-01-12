import {
  type ImportEvent,
  subscribeToImportEvents,
} from "$lib/server/import-events";
import type { RequestHandler } from "./$types";

/**
 * SSE endpoint for import progress events.
 * Clients connect to this endpoint to receive real-time updates about book imports.
 *
 * Supports authentication via:
 * - Session cookie (browser)
 * - Basic Auth: email:api_key
 * - Bearer token: OAuth access token
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
export const GET: RequestHandler = async ({ request, locals }) => {
  const auth = locals.apiAuth;

  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = auth.userId;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;

      function cleanup() {
        if (isClosed) return;
        isClosed = true;
        clearInterval(keepaliveInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Controller already closed, ignore
        }
      }

      // Send initial connection event
      const connectEvent = `data: ${JSON.stringify({ type: "connected" })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Subscribe to import events for this user
      const unsubscribe = subscribeToImportEvents(
        userId,
        (event: ImportEvent) => {
          if (isClosed) return;
          try {
            const sseEvent = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseEvent));
          } catch {
            // Client disconnected, clean up
            cleanup();
          }
        },
      );

      // Send keepalive every 30 seconds to prevent connection timeout
      const keepaliveInterval = setInterval(() => {
        if (isClosed) return;
        try {
          const keepalive = `: keepalive\n\n`;
          controller.enqueue(encoder.encode(keepalive));
        } catch {
          cleanup();
        }
      }, 30000);

      // Handle client disconnect via abort signal
      request.signal.addEventListener("abort", () => {
        cleanup();
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
