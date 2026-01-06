import { EventEmitter } from "events";

/**
 * Comment event types for SSE notifications
 */
export type CommentEvent =
  | {
      type: "reply";
      commentId: string;
      replyId: string;
      authorName: string;
      preview: string;
      entityType: string;
      entityId: string;
    }
  | {
      type: "reaction";
      commentId: string;
      emoji: string;
      authorName: string;
      entityType: string;
      entityId: string;
    }
  | {
      type: "mention";
      commentId: string;
      authorName: string;
      preview: string;
      entityType: string;
      entityId: string;
    };

/**
 * Per-user event emitters for SSE comment notifications.
 * Events are scoped by userId to ensure users only receive their own notifications.
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
 * Emit a comment event to a specific user.
 * The event will be delivered to all connected SSE clients for that user.
 */
export function emitCommentEvent(userId: string, event: CommentEvent): void {
  const emitter = userEmitters.get(userId);
  if (emitter) {
    emitterActivity.set(userId, Date.now());
    emitter.emit("comment", event);
  }
}

/**
 * Subscribe to comment events for a user.
 * Returns an unsubscribe function.
 */
export function subscribeToCommentEvents(
  userId: string,
  callback: (event: CommentEvent) => void,
): () => void {
  const emitter = getEmitter(userId);
  emitter.on("comment", callback);

  return () => {
    emitter.off("comment", callback);
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
      if (emitter && emitter.listenerCount("comment") === 0) {
        emitter.removeAllListeners();
        userEmitters.delete(userId);
        emitterActivity.delete(userId);
      }
    }
  }
}

// Start cleanup interval
setInterval(cleanupInactiveEmitters, CLEANUP_INTERVAL);
