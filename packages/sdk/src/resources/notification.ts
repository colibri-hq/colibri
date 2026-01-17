import type { Selectable } from "kysely";
import type { Database, Schema } from "../database.js";

// Type definitions
export type Notification = Selectable<Schema["notification"]>;
export type NotificationPreference = Selectable<Schema["notification_preference"]>;

export type NotificationType = "comment_reply" | "comment_reaction" | "comment_mention";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  sourceType?: "comment" | "reaction";
  sourceId?: string;
}

// Notification CRUD operations

/**
 * Create a new notification for a user
 */
export async function createNotification(
  database: Database,
  input: CreateNotificationInput,
): Promise<Notification> {
  return database
    .insertInto("notification")
    .values({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      link: input.link ?? null,
      source_type: input.sourceType ?? null,
      source_id: input.sourceId ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  database: Database,
  userId: string,
  options: { unreadOnly?: boolean; limit?: number; offset?: number } = {},
): Promise<Notification[]> {
  let query = database
    .selectFrom("notification")
    .where("user_id", "=", userId)
    .orderBy("created_at", "desc");

  if (options.unreadOnly) {
    query = query.where("read_at", "is", null);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.offset(options.offset);
  }

  return query.selectAll().execute();
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadCount(database: Database, userId: string): Promise<number> {
  const result = await database
    .selectFrom("notification")
    .where("user_id", "=", userId)
    .where("read_at", "is", null)
    .select(database.fn.count<number>("id").as("count"))
    .executeTakeFirst();

  return result?.count ?? 0;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(database: Database, notificationId: string): Promise<void> {
  await database
    .updateTable("notification")
    .where("id", "=", notificationId)
    .set({ read_at: new Date() })
    .execute();
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(database: Database, userId: string): Promise<void> {
  await database
    .updateTable("notification")
    .where("user_id", "=", userId)
    .where("read_at", "is", null)
    .set({ read_at: new Date() })
    .execute();
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  database: Database,
  notificationId: string,
): Promise<void> {
  await database.deleteFrom("notification").where("id", "=", notificationId).execute();
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(database: Database, userId: string): Promise<void> {
  await database.deleteFrom("notification").where("user_id", "=", userId).execute();
}

// Notification preferences

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(
  database: Database,
  userId: string,
): Promise<NotificationPreference | null> {
  const result = await database
    .selectFrom("notification_preference")
    .where("user_id", "=", userId)
    .selectAll()
    .executeTakeFirst();

  return result ?? null;
}

/**
 * Get or create notification preferences with defaults
 */
export async function getOrCreateNotificationPreferences(
  database: Database,
  userId: string,
): Promise<NotificationPreference> {
  const existing = await getNotificationPreferences(database, userId);

  if (existing) {
    return existing;
  }

  // Create default preferences
  return database
    .insertInto("notification_preference")
    .values({
      user_id: userId,
      comment_replies: true,
      comment_reactions: true,
      comment_mentions: true,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  database: Database,
  userId: string,
  preferences: {
    comment_replies?: boolean;
    comment_reactions?: boolean;
    comment_mentions?: boolean;
  },
): Promise<NotificationPreference> {
  // Ensure preferences exist first
  await getOrCreateNotificationPreferences(database, userId);

  return database
    .updateTable("notification_preference")
    .where("user_id", "=", userId)
    .set({ ...preferences, updated_at: new Date() })
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Check if a user should receive a specific notification type
 */
export async function shouldNotify(
  database: Database,
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  const prefs = await getOrCreateNotificationPreferences(database, userId);

  switch (type) {
    case "comment_reply":
      return prefs.comment_replies;
    case "comment_reaction":
      return prefs.comment_reactions;
    case "comment_mention":
      return prefs.comment_mentions;
    default:
      return true;
  }
}
