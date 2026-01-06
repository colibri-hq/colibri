import { procedure, t } from "$lib/trpc/t";
import {
  createNotification,
  deleteNotification,
  getNotifications,
  getOrCreateNotificationPreferences,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  updateNotificationPreferences,
} from "@colibri-hq/sdk";
import { z } from "zod";

export const notifications = t.router({
  /**
   * List notifications for the current user
   */
  list: procedure()
    .input(
      z
        .object({
          unreadOnly: z.boolean().optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx: { database, userId } }) => {
      return getNotifications(database, userId, input ?? {});
    }),

  /**
   * Get count of unread notifications
   */
  unreadCount: procedure().query(async ({ ctx: { database, userId } }) => {
    return getUnreadCount(database, userId);
  }),

  /**
   * Mark a notification as read
   */
  markRead: procedure()
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input: { id }, ctx: { database } }) => {
      await markAsRead(database, id);
    }),

  /**
   * Mark all notifications as read
   */
  markAllRead: procedure().mutation(async ({ ctx: { database, userId } }) => {
    await markAllAsRead(database, userId);
  }),

  /**
   * Delete a notification
   */
  delete: procedure()
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input: { id }, ctx: { database } }) => {
      await deleteNotification(database, id);
    }),

  // region Preferences

  /**
   * Get notification preferences
   */
  getPreferences: procedure().query(async ({ ctx: { database, userId } }) => {
    return getOrCreateNotificationPreferences(database, userId);
  }),

  /**
   * Update notification preferences
   */
  updatePreferences: procedure()
    .input(
      z.object({
        comment_replies: z.boolean().optional(),
        comment_reactions: z.boolean().optional(),
        comment_mentions: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx: { database, userId } }) => {
      return updateNotificationPreferences(database, userId, input);
    }),

  // endregion
});
