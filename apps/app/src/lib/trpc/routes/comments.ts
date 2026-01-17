import { emitCommentEvent } from "$lib/server/comment-events";
import { adminProcedure } from "$lib/trpc/middleware/admin";
import { procedure, t } from "$lib/trpc/t";
import {
  addCollectionComment,
  addCreatorComment,
  addPublisherComment,
  addSeriesComment,
  addWorkComment,
  bulkResolveReports,
  createNotification,
  deleteComment,
  findUserByIdentifier,
  getCommentReports,
  getHiddenComments,
  getModerationLog,
  getModerationStats,
  getReport,
  getSettingValue,
  hideComment,
  loadCollectionComments,
  loadComment,
  loadCommentReplies,
  loadCreatorComments,
  loadPublisherComments,
  loadSeriesComments,
  loadWorkComments,
  logModerationAction,
  reopenReport,
  reportComment,
  resolveReport,
  searchUsers,
  shouldNotify,
  unhideComment,
  updateComment,
} from "@colibri-hq/sdk";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const entityTypeSchema = z.enum(["work", "creator", "publisher", "series", "collection"]);

/**
 * Extract @mentioned usernames from content
 * @param content - The comment content to parse
 * @returns Array of unique mentioned usernames (without the @ symbol)
 */
function extractMentions(content: string): string[] {
  // Match @username pattern - alphanumeric, underscores, spaces (inside quotes), hyphens
  // Matches: @john, @jane_doe, @"John Smith", @john-doe
  const mentionPattern = /@(?:"([^"]+)"|([a-zA-Z0-9_-]+))/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionPattern.exec(content)) !== null) {
    // match[1] is for quoted names, match[2] is for simple names
    const name = match[1] || match[2];
    if (name && !mentions.includes(name)) {
      mentions.push(name);
    }
  }

  return mentions;
}

export const comments = t.router({
  /**
   * Load root-level comments for an entity
   */
  load: procedure()
    .input(z.object({ entityType: entityTypeSchema, entityId: z.string() }))
    .query(async ({ input: { entityType, entityId }, ctx: { database } }) => {
      switch (entityType) {
        case "work":
          return loadWorkComments(database, entityId);
        case "creator":
          return loadCreatorComments(database, entityId);
        case "publisher":
          return loadPublisherComments(database, entityId);
        case "series":
          return loadSeriesComments(database, entityId);
        case "collection":
          return loadCollectionComments(database, entityId);
      }
    }),

  /**
   * Get replies to a comment
   */
  getReplies: procedure()
    .input(z.object({ parentId: z.string() }))
    .query(async ({ input: { parentId }, ctx: { database } }) => {
      return loadCommentReplies(database, parentId);
    }),

  /**
   * Add a comment to an entity (with optional parent for replies)
   */
  add: procedure()
    .input(
      z.object({
        entityType: entityTypeSchema,
        entityId: z.string(),
        content: z.string().min(1).max(10000),
        parentId: z.string().optional(),
      }),
    )
    .mutation(
      async ({ input: { entityType, entityId, content, parentId }, ctx: { database, userId } }) => {
        const comment = { content, created_by: userId, parent_comment_id: parentId ?? null };

        let newComment;
        switch (entityType) {
          case "work":
            newComment = await addWorkComment(database, entityId, comment);
            break;
          case "creator":
            newComment = await addCreatorComment(database, entityId, comment);
            break;
          case "publisher":
            newComment = await addPublisherComment(database, entityId, comment);
            break;
          case "series":
            newComment = await addSeriesComment(database, entityId, comment);
            break;
          case "collection":
            newComment = await addCollectionComment(database, entityId, comment);
            break;
        }

        // newComment is the ID of the newly created comment (string)
        const newCommentId = newComment as string;

        // Send notification for replies
        if (parentId) {
          try {
            const parentComment = await loadComment(database, parentId);
            const parentAuthorId = parentComment.created_by?.toString();

            // Only notify if the parent author is different from the replier
            if (parentAuthorId && parentAuthorId !== userId) {
              // Check user preferences
              if (await shouldNotify(database, parentAuthorId, "comment_reply")) {
                // Get the current user's name for the notification
                const currentUser = await findUserByIdentifier(database, userId);
                const authorName = currentUser.name ?? "Someone";
                const preview = content.slice(0, 100);

                // Emit SSE event for real-time delivery
                emitCommentEvent(parentAuthorId, {
                  type: "reply",
                  commentId: parentId,
                  replyId: newCommentId,
                  authorName,
                  preview,
                  entityType,
                  entityId,
                });

                // Persist notification to database
                await createNotification(database, {
                  userId: parentAuthorId,
                  type: "comment_reply",
                  title: `${authorName} replied to your comment`,
                  message: preview,
                  link: `/${entityType}s/${entityId}#comment-${parentId}`,
                  sourceType: "comment",
                  sourceId: newCommentId,
                });
              }
            }
          } catch {
            // Don't fail the comment creation if notification fails
            console.error("Failed to send reply notification");
          }
        }

        // Send notifications for @mentions
        try {
          const mentionedNames = extractMentions(content);
          if (mentionedNames.length > 0) {
            // Get the current user's info for the notification
            const currentUser = await findUserByIdentifier(database, userId);
            const authorName = currentUser.name ?? "Someone";
            const preview = content.slice(0, 100);

            // Find users matching the mentioned names
            for (const name of mentionedNames) {
              const matchingUsers = await searchUsers(database, name, 5);

              // Find exact name match (case-insensitive)
              const mentionedUser = matchingUsers.find(
                (u) => u.name?.toLowerCase() === name.toLowerCase(),
              );

              if (mentionedUser && mentionedUser.id !== userId) {
                // Check user preferences
                if (await shouldNotify(database, mentionedUser.id, "comment_mention")) {
                  // Emit SSE event for real-time delivery
                  emitCommentEvent(mentionedUser.id, {
                    type: "mention",
                    commentId: newCommentId,
                    authorName,
                    preview,
                    entityType,
                    entityId,
                  });

                  // Persist notification to database
                  await createNotification(database, {
                    userId: mentionedUser.id,
                    type: "comment_mention",
                    title: `${authorName} mentioned you in a comment`,
                    message: preview,
                    link: `/${entityType}s/${entityId}#comment-${newCommentId}`,
                    sourceType: "comment",
                    sourceId: newCommentId,
                  });
                }
              }
            }
          }
        } catch {
          // Don't fail the comment creation if mention notification fails
          console.error("Failed to send mention notifications");
        }

        return newCommentId;
      },
    ),

  /**
   * Update a comment's content (only by author)
   */
  update: procedure()
    .input(z.object({ commentId: z.string(), content: z.string().min(1).max(10000) }))
    .mutation(async ({ input: { commentId, content }, ctx: { database, userId } }) => {
      // Verify ownership
      const comment = await database
        .selectFrom("comment")
        .where("id", "=", commentId)
        .select("created_by")
        .executeTakeFirst();

      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }

      if (comment.created_by?.toString() !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own comments" });
      }

      await updateComment(database, commentId, content);
    }),

  /**
   * Delete a comment (and cascade to replies, only by author)
   */
  delete: procedure()
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ input: { commentId }, ctx: { database, userId } }) => {
      // Verify ownership
      const comment = await database
        .selectFrom("comment")
        .where("id", "=", commentId)
        .select("created_by")
        .executeTakeFirst();

      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }

      if (comment.created_by?.toString() !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments",
        });
      }

      await deleteComment(database, commentId);
    }),

  /**
   * Add a reaction to a comment
   */
  addReaction: procedure()
    .input(
      z.object({
        commentId: z.string(),
        emoji: z.string(),
        entityType: entityTypeSchema.optional(),
        entityId: z.string().optional(),
      }),
    )
    .mutation(
      async ({ input: { commentId, emoji, entityType, entityId }, ctx: { database, userId } }) => {
        // Insert or update the reaction
        await database
          .insertInto("comment_reaction")
          .values({ comment_id: commentId, user_id: userId, emoji })
          .onConflict((eb) => eb.constraint("comment_reaction_pkey").doUpdateSet({ emoji }))
          .execute();

        // Send notification
        try {
          const comment = await loadComment(database, commentId);
          const commentAuthorId = comment.created_by?.toString();

          // Only notify if the comment author is different from the reactor
          if (commentAuthorId && commentAuthorId !== userId) {
            // Check user preferences
            if (await shouldNotify(database, commentAuthorId, "comment_reaction")) {
              // Get the current user's name for the notification
              const currentUser = await findUserByIdentifier(database, userId);
              const authorName = currentUser.name ?? "Someone";

              // Emit SSE event for real-time delivery
              emitCommentEvent(commentAuthorId, {
                type: "reaction",
                commentId,
                emoji,
                authorName,
                entityType: entityType ?? "work",
                entityId: entityId ?? "",
              });

              // Persist notification to database
              await createNotification(database, {
                userId: commentAuthorId,
                type: "comment_reaction",
                title: `${authorName} reacted ${emoji} to your comment`,
                link:
                  entityType && entityId
                    ? `/${entityType}s/${entityId}#comment-${commentId}`
                    : undefined,
                sourceType: "reaction",
                sourceId: commentId,
              });
            }
          }
        } catch {
          // Don't fail the reaction if notification fails
          console.error("Failed to send reaction notification");
        }
      },
    ),

  /**
   * Remove a reaction from a comment
   */
  removeReaction: procedure()
    .input(z.object({ commentId: z.string(), emoji: z.string() }))
    .mutation(async ({ input: { commentId, emoji }, ctx: { database, userId } }) => {
      await database
        .deleteFrom("comment_reaction")
        .where("comment_id", "=", commentId)
        .where("user_id", "=", userId)
        .where("emoji", "=", emoji)
        .execute();
    }),

  // region Moderation

  /**
   * Report a comment for moderation (any authenticated user)
   */
  report: procedure()
    .input(z.object({ commentId: z.string(), reason: z.string().min(10).max(1000) }))
    .mutation(async ({ input: { commentId, reason }, ctx: { database, userId } }) => {
      // Check if moderation is enabled
      const moderationEnabled = await getSettingValue(
        database,
        "urn:colibri:settings:content:moderation-enabled",
      );
      if (!moderationEnabled) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Comment moderation is disabled" });
      }

      // Can't report your own comment
      const comment = await database
        .selectFrom("comment")
        .where("id", "=", commentId)
        .select("created_by")
        .executeTakeFirst();

      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }

      if (comment.created_by?.toString() === userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot report your own comment" });
      }

      await reportComment(database, commentId, userId, reason);
    }),

  /**
   * Get comment reports (admin only)
   */
  getReports: adminProcedure()
    .input(
      z
        .object({
          resolved: z.boolean().optional(),
          resolution: z.enum(["dismissed", "hidden", "deleted"]).optional(),
          reporterId: z.string().optional(),
          search: z.string().max(100).optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input, ctx: { database } }) => {
      return getCommentReports(database, input ?? {});
    }),

  /**
   * Get moderation statistics (admin only)
   */
  getModerationStats: adminProcedure().query(async ({ ctx: { database } }) => {
    return getModerationStats(database);
  }),

  /**
   * Resolve a comment report (admin only)
   */
  resolveReport: adminProcedure()
    .input(
      z.object({ reportId: z.string(), resolution: z.enum(["dismissed", "hidden", "deleted"]) }),
    )
    .mutation(async ({ input: { reportId, resolution }, ctx: { database, userId } }) => {
      // Get report info for logging
      const report = await database
        .selectFrom("comment_report")
        .leftJoin("comment", "comment.id", "comment_report.comment_id")
        .where("comment_report.id", "=", reportId)
        .select(["comment_report.comment_id", "comment.content"])
        .executeTakeFirst();

      // If resolution is "hidden", also hide the comment
      if (resolution === "hidden" && report) {
        await hideComment(database, report.comment_id, userId, "Hidden due to report");
      }

      // If resolution is "deleted", also delete the comment
      if (resolution === "deleted" && report) {
        await deleteComment(database, report.comment_id);
      }

      await resolveReport(database, reportId, userId, resolution);

      // Log the action
      await logModerationAction(database, {
        actionType: "resolve_report",
        targetType: "report",
        targetId: reportId,
        performedBy: userId,
        details: {
          resolution,
          commentId: report?.comment_id?.toString(),
          commentPreview: report?.content?.slice(0, 100),
        },
      });
    }),

  /**
   * Bulk resolve multiple reports at once (admin only)
   */
  bulkResolveReports: adminProcedure()
    .input(
      z.object({
        reportIds: z.array(z.string()).min(1).max(50),
        resolution: z.enum(["dismissed", "hidden", "deleted"]),
      }),
    )
    .mutation(async ({ input: { reportIds, resolution }, ctx: { database, userId } }) => {
      // For hidden/deleted resolutions, we need to handle the comments first
      if (resolution === "hidden" || resolution === "deleted") {
        // Get all report info to process comments
        const reports = await database
          .selectFrom("comment_report")
          .leftJoin("comment", "comment.id", "comment_report.comment_id")
          .where("comment_report.id", "in", reportIds)
          .select(["comment_report.id", "comment_report.comment_id", "comment.content"])
          .execute();

        // Process each comment
        for (const report of reports) {
          if (report.comment_id) {
            if (resolution === "hidden") {
              await hideComment(
                database,
                report.comment_id,
                userId,
                "Hidden due to report (bulk action)",
              );
            } else if (resolution === "deleted") {
              await deleteComment(database, report.comment_id);
            }
          }
        }
      }

      // Bulk resolve all reports
      const result = await bulkResolveReports(database, reportIds, userId, resolution);

      // Log the bulk action
      await logModerationAction(database, {
        actionType: "resolve_report",
        targetType: "report",
        targetId: reportIds[0]!, // Log first report ID as target
        performedBy: userId,
        details: {
          bulkAction: true,
          totalReports: reportIds.length,
          resolution,
          resolvedCount: result.resolved,
          failedCount: result.failed,
          reportIds,
        },
      });

      return result;
    }),

  /**
   * Reopen a resolved report (admin only)
   */
  reopenReport: adminProcedure()
    .input(
      z.object({
        reportId: z.string(),
        unhideComment: z.boolean().optional(), // Optionally unhide the comment if it was hidden
      }),
    )
    .mutation(
      async ({ input: { reportId, unhideComment: shouldUnhide }, ctx: { database, userId } }) => {
        // Get the report to check if the comment was hidden
        const report = await getReport(database, reportId);
        if (!report) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
        }

        const previousResolution = report.resolution;

        // If the comment was hidden by this report and user wants to unhide, do so
        if (shouldUnhide && report.resolution === "hidden" && report.comment_id) {
          await unhideComment(database, report.comment_id);
        }

        // Reopen the report
        await reopenReport(database, reportId);

        // Log the action
        await logModerationAction(database, {
          actionType: "reopen_report",
          targetType: "report",
          targetId: reportId,
          performedBy: userId,
          details: {
            previousResolution,
            commentUnhidden: shouldUnhide && previousResolution === "hidden",
            commentId: report.comment_id?.toString(),
          },
        });
      },
    ),

  /**
   * Change the resolution of a report (admin only)
   */
  changeResolution: adminProcedure()
    .input(
      z.object({ reportId: z.string(), newResolution: z.enum(["dismissed", "hidden", "deleted"]) }),
    )
    .mutation(async ({ input: { reportId, newResolution }, ctx: { database, userId } }) => {
      // Get the current report
      const report = await getReport(database, reportId);
      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      const oldResolution = report.resolution;
      const commentId = report.comment_id;

      // Handle reverting old resolution effects
      if (oldResolution === "hidden" && commentId) {
        // If old resolution was hidden, unhide the comment first
        await unhideComment(database, commentId);
      }
      // Note: If old resolution was "deleted", the comment is gone and can't be restored

      // Apply new resolution effects
      if (newResolution === "hidden" && commentId) {
        await hideComment(database, commentId, userId, "Hidden due to report");
      } else if (newResolution === "deleted" && commentId) {
        // Check if comment still exists before trying to delete
        const comment = await database
          .selectFrom("comment")
          .where("id", "=", commentId.toString())
          .select("id")
          .executeTakeFirst();
        if (comment) {
          await deleteComment(database, commentId);
        }
      }

      // Update the resolution
      await resolveReport(database, reportId, userId, newResolution);

      // Log the action
      await logModerationAction(database, {
        actionType: "change_resolution",
        targetType: "report",
        targetId: reportId,
        performedBy: userId,
        details: {
          previousResolution: oldResolution,
          newResolution,
          commentId: commentId?.toString(),
        },
      });
    }),

  /**
   * Hide a comment (admin only)
   */
  hide: adminProcedure()
    .input(z.object({ commentId: z.string(), reason: z.string().min(1).max(500) }))
    .mutation(async ({ input: { commentId, reason }, ctx: { database, userId } }) => {
      // Get comment content for logging
      const comment = await database
        .selectFrom("comment")
        .where("id", "=", commentId)
        .select("content")
        .executeTakeFirst();

      await hideComment(database, commentId, userId, reason);

      // Log the action
      await logModerationAction(database, {
        actionType: "hide_comment",
        targetType: "comment",
        targetId: commentId,
        performedBy: userId,
        details: { reason, commentPreview: comment?.content?.slice(0, 100) },
      });
    }),

  /**
   * Unhide a comment (admin only)
   */
  unhide: adminProcedure()
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ input: { commentId }, ctx: { database, userId } }) => {
      await unhideComment(database, commentId);

      // Log the action
      await logModerationAction(database, {
        actionType: "unhide_comment",
        targetType: "comment",
        targetId: commentId,
        performedBy: userId,
      });
    }),

  /**
   * Get hidden comments (admin only)
   */
  getHidden: adminProcedure()
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx: { database } }) => {
      return getHiddenComments(database, input ?? {});
    }),

  /**
   * Get moderation activity log (admin only)
   */
  getActivityLog: adminProcedure()
    .input(
      z
        .object({
          actionType: z
            .enum([
              "resolve_report",
              "reopen_report",
              "change_resolution",
              "hide_comment",
              "unhide_comment",
              "delete_comment",
            ])
            .optional(),
          targetType: z.enum(["report", "comment"]).optional(),
          performedBy: z.string().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ input, ctx: { database } }) => {
      return getModerationLog(database, input ?? {});
    }),

  // endregion
});
