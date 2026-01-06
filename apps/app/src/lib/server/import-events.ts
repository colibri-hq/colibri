import { EventEmitter } from "events";
import type { DuplicateCheckResult } from "@colibri-hq/sdk/ingestion";

/**
 * Import event types for SSE notifications
 */
export type ImportEvent =
  | { type: "started"; uploadId: string; filename: string }
  | {
      type: "progress";
      uploadId: string;
      stage: "uploading" | "processing" | "ingesting";
    }
  | {
      type: "completed";
      uploadId: string;
      workId: string;
      editionId: string;
      title: string;
    }
  | {
      type: "duplicate";
      uploadId: string;
      pendingId: string;
      duplicateInfo: DuplicateCheckResult;
    }
  | { type: "skipped"; uploadId: string; reason: string }
  | { type: "failed"; uploadId: string; error: string }
  // Enrichment events
  | {
      type: "enrichment-started";
      workId: string;
      title: string;
    }
  | {
      type: "enrichment-completed";
      workId: string;
      title: string;
      improvementCount: number;
      hasConflicts: boolean;
      sources: string[];
    }
  | {
      type: "enrichment-failed";
      workId: string;
      error: string;
    };

/**
 * Per-user event emitters for SSE import notifications.
 * Events are scoped by userId to ensure users only receive their own import events.
 */
const userEmitters = new Map<string, EventEmitter>();

/**
 * Cleanup interval for inactive emitters (every 5 minutes)
 */
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * Max age for inactive emitters (30 minutes)
 */
const MAX_EMITTER_AGE = 30 * 60 * 1000;

/**
 * Track last activity time for each emitter
 */
const emitterActivity = new Map<string, number>();

/**
 * Get or create an event emitter for a user.
 * Emitters are cleaned up after 30 minutes of inactivity.
 */
export function getEmitter(userId: string): EventEmitter {
  emitterActivity.set(userId, Date.now());

  if (!userEmitters.has(userId)) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(10); // Allow multiple tabs
    userEmitters.set(userId, emitter);
  }

  return userEmitters.get(userId)!;
}

/**
 * Emit an import event to a specific user.
 * The event will be delivered to all connected SSE clients for that user.
 */
export function emitImportEvent(userId: string, event: ImportEvent): void {
  const emitter = userEmitters.get(userId);
  if (emitter) {
    emitterActivity.set(userId, Date.now());
    emitter.emit("import", event);
  }
}

/**
 * Subscribe to import events for a user.
 * Returns an unsubscribe function.
 */
export function subscribeToImportEvents(
  userId: string,
  callback: (event: ImportEvent) => void,
): () => void {
  const emitter = getEmitter(userId);
  emitter.on("import", callback);

  return () => {
    emitter.off("import", callback);
  };
}

/**
 * Clean up inactive emitters to prevent memory leaks.
 */
function cleanupInactiveEmitters(): void {
  const now = Date.now();
  for (const [userId, lastActivity] of emitterActivity.entries()) {
    if (now - lastActivity > MAX_EMITTER_AGE) {
      const emitter = userEmitters.get(userId);
      if (emitter && emitter.listenerCount("import") === 0) {
        emitter.removeAllListeners();
        userEmitters.delete(userId);
        emitterActivity.delete(userId);
      }
    }
  }
}

// Start cleanup interval
setInterval(cleanupInactiveEmitters, CLEANUP_INTERVAL);
