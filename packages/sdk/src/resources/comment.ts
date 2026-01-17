import { sql, type InsertObject, type Selectable } from "kysely";
import type { Database, Schema } from "../database.js";
import type { DB } from "../schema.js";
import type { User } from "./authentication/user.js";

const table = "comment" as const;

export function loadComment(
  database: Database,
  id: number | string,
): Promise<Selectable<DB["comment"]>> {
  return database
    .selectFrom(table)
    .where("id", "=", id.toString())
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function loadCommentsOn<T extends Commentable = Commentable>(
  database: Database,
  entity: T,
  id: number | string,
) {
  const k1 = `${entity}_id` as const;

  return (
    database
      .selectFrom(entity)
      .selectAll()
      // @ts-ignore
      .innerJoin(`${entity}_comment`, k1, `${entity}.id`)
      // @ts-ignore
      .innerJoin(table, `${entity}_comment.comment_id`, `comment.id`)
      .where(`${entity}.id`, "=", id.toString())
      .execute()
  );
}

export function loadCommentsOnWork(database: Database, id: number | string) {
  return database
    .selectFrom("work")
    .selectAll()
    .innerJoin("work_comment", "work_comment.work_id", "work.id")
    .innerJoin(table, "work_comment.comment_id", "id")
    .where("work.id", "=", id.toString())
    .execute();
}

/**
 * Load root-level comments for a work with user info and reactions
 */
export function loadWorkComments(
  database: Database,
  id: number | string,
): Promise<CommentWithUserAndReactions[]> {
  return database
    .selectFrom("work")
    .innerJoin("work_comment", "work_comment.work_id", "work.id")
    .innerJoin("comment", "work_comment.comment_id", "comment.id")
    .leftJoin("authentication.user as u", "u.id", "comment.created_by")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("comment_reaction")
          .select(["emoji", "user_id", "created_at"])
          .whereRef("comment_id", "=", "comment.id")
          .as("reactions"),
      (join) => join.onTrue(),
    )
    .selectAll("comment")
    .select(({ fn, val }) =>
      fn
        .coalesce(fn.jsonAgg("reactions").filterWhere("reactions.emoji", "is not", null), val("[]"))
        .as("reactions"),
    )
    .select(({ fn }) => fn.toJson("u").as("created_by"))
    .select((eb) =>
      eb
        .selectFrom("comment as replies")
        .select(({ fn }) => fn.countAll().as("count"))
        .whereRef("replies.parent_comment_id", "=", "comment.id")
        .as("reply_count"),
    )
    .where("work.id", "=", id.toString())
    .where("comment.parent_comment_id", "is", null)
    .groupBy("comment.id")
    .groupBy("u.id")
    .orderBy("comment.created_at", "asc")
    .execute() as Promise<CommentWithUserAndReactions[]>;
}

/**
 * Load root-level comments for a creator with user info and reactions
 */
export function loadCreatorComments(
  database: Database,
  id: number | string,
): Promise<CommentWithUserAndReactions[]> {
  return database
    .selectFrom("creator")
    .innerJoin("creator_comment", "creator_comment.creator_id", "creator.id")
    .innerJoin("comment", "creator_comment.comment_id", "comment.id")
    .leftJoin("authentication.user as u", "u.id", "comment.created_by")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("comment_reaction")
          .select(["emoji", "user_id", "created_at"])
          .whereRef("comment_id", "=", "comment.id")
          .as("reactions"),
      (join) => join.onTrue(),
    )
    .selectAll("comment")
    .select(({ fn, val }) =>
      fn
        .coalesce(fn.jsonAgg("reactions").filterWhere("reactions.emoji", "is not", null), val("[]"))
        .as("reactions"),
    )
    .select(({ fn }) => fn.toJson("u").as("created_by"))
    .select((eb) =>
      eb
        .selectFrom("comment as replies")
        .select(({ fn }) => fn.countAll().as("count"))
        .whereRef("replies.parent_comment_id", "=", "comment.id")
        .as("reply_count"),
    )
    .where("creator.id", "=", id.toString())
    .where("comment.parent_comment_id", "is", null)
    .groupBy("comment.id")
    .groupBy("u.id")
    .orderBy("comment.created_at", "asc")
    .execute() as Promise<CommentWithUserAndReactions[]>;
}

/**
 * Load root-level comments for a publisher with user info and reactions
 */
export function loadPublisherComments(
  database: Database,
  id: number | string,
): Promise<CommentWithUserAndReactions[]> {
  return database
    .selectFrom("publisher")
    .innerJoin("publisher_comment", "publisher_comment.publisher_id", "publisher.id")
    .innerJoin("comment", "publisher_comment.comment_id", "comment.id")
    .leftJoin("authentication.user as u", "u.id", "comment.created_by")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("comment_reaction")
          .select(["emoji", "user_id", "created_at"])
          .whereRef("comment_id", "=", "comment.id")
          .as("reactions"),
      (join) => join.onTrue(),
    )
    .selectAll("comment")
    .select(({ fn, val }) =>
      fn
        .coalesce(fn.jsonAgg("reactions").filterWhere("reactions.emoji", "is not", null), val("[]"))
        .as("reactions"),
    )
    .select(({ fn }) => fn.toJson("u").as("created_by"))
    .select((eb) =>
      eb
        .selectFrom("comment as replies")
        .select(({ fn }) => fn.countAll().as("count"))
        .whereRef("replies.parent_comment_id", "=", "comment.id")
        .as("reply_count"),
    )
    .where("publisher.id", "=", id.toString())
    .where("comment.parent_comment_id", "is", null)
    .groupBy("comment.id")
    .groupBy("u.id")
    .orderBy("comment.created_at", "asc")
    .execute() as Promise<CommentWithUserAndReactions[]>;
}

/**
 * Load root-level comments for a series with user info and reactions
 */
export function loadSeriesComments(
  database: Database,
  id: number | string,
): Promise<CommentWithUserAndReactions[]> {
  return database
    .selectFrom("series")
    .innerJoin("series_comment", "series_comment.series_id", "series.id")
    .innerJoin("comment", "series_comment.comment_id", "comment.id")
    .leftJoin("authentication.user as u", "u.id", "comment.created_by")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("comment_reaction")
          .select(["emoji", "user_id", "created_at"])
          .whereRef("comment_id", "=", "comment.id")
          .as("reactions"),
      (join) => join.onTrue(),
    )
    .selectAll("comment")
    .select(({ fn, val }) =>
      fn
        .coalesce(fn.jsonAgg("reactions").filterWhere("reactions.emoji", "is not", null), val("[]"))
        .as("reactions"),
    )
    .select(({ fn }) => fn.toJson("u").as("created_by"))
    .select((eb) =>
      eb
        .selectFrom("comment as replies")
        .select(({ fn }) => fn.countAll().as("count"))
        .whereRef("replies.parent_comment_id", "=", "comment.id")
        .as("reply_count"),
    )
    .where("series.id", "=", id.toString())
    .where("comment.parent_comment_id", "is", null)
    .groupBy("comment.id")
    .groupBy("u.id")
    .orderBy("comment.created_at", "asc")
    .execute() as Promise<CommentWithUserAndReactions[]>;
}

/**
 * Load replies to a specific comment with user info and reactions
 */
export function loadCommentReplies(
  database: Database,
  parentCommentId: number | string,
): Promise<CommentWithUserAndReactions[]> {
  return database
    .selectFrom("comment")
    .leftJoin("authentication.user as u", "u.id", "comment.created_by")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("comment_reaction")
          .select(["emoji", "user_id", "created_at"])
          .whereRef("comment_id", "=", "comment.id")
          .as("reactions"),
      (join) => join.onTrue(),
    )
    .selectAll("comment")
    .select(({ fn, val }) =>
      fn
        .coalesce(fn.jsonAgg("reactions").filterWhere("reactions.emoji", "is not", null), val("[]"))
        .as("reactions"),
    )
    .select(({ fn }) => fn.toJson("u").as("created_by"))
    .select((eb) =>
      eb
        .selectFrom("comment as replies")
        .select(({ fn }) => fn.countAll().as("count"))
        .whereRef("replies.parent_comment_id", "=", "comment.id")
        .as("reply_count"),
    )
    .where("comment.parent_comment_id", "=", parentCommentId.toString())
    .groupBy("comment.id")
    .groupBy("u.id")
    .orderBy("comment.created_at", "asc")
    .execute() as Promise<CommentWithUserAndReactions[]>;
}

/**
 * Create a comment on a work
 */
export async function addWorkComment(
  database: Database,
  workId: number | string,
  comment: InsertObject<DB, "comment">,
): Promise<string> {
  return database.transaction().execute(async (transaction) => {
    const { id } = await transaction
      .insertInto("comment")
      .values(comment)
      .returning("id")
      .executeTakeFirstOrThrow();

    await transaction
      .insertInto("work_comment")
      .values({ work_id: workId.toString(), comment_id: id })
      .execute();

    return id;
  });
}

/**
 * Create a comment on a creator
 */
export async function addCreatorComment(
  database: Database,
  creatorId: number | string,
  comment: InsertObject<DB, "comment">,
): Promise<string> {
  return database.transaction().execute(async (transaction) => {
    const { id } = await transaction
      .insertInto("comment")
      .values(comment)
      .returning("id")
      .executeTakeFirstOrThrow();

    await transaction
      .insertInto("creator_comment")
      .values({ creator_id: creatorId.toString(), comment_id: id })
      .execute();

    return id;
  });
}

/**
 * Create a comment on a publisher
 */
export async function addPublisherComment(
  database: Database,
  publisherId: number | string,
  comment: InsertObject<DB, "comment">,
): Promise<string> {
  return database.transaction().execute(async (transaction) => {
    const { id } = await transaction
      .insertInto("comment")
      .values(comment)
      .returning("id")
      .executeTakeFirstOrThrow();

    await transaction
      .insertInto("publisher_comment")
      .values({ publisher_id: publisherId.toString(), comment_id: id })
      .execute();

    return id;
  });
}

/**
 * Create a comment on a series
 */
export async function addSeriesComment(
  database: Database,
  seriesId: number | string,
  comment: InsertObject<DB, "comment">,
): Promise<string> {
  return database.transaction().execute(async (transaction) => {
    const { id } = await transaction
      .insertInto("comment")
      .values(comment)
      .returning("id")
      .executeTakeFirstOrThrow();

    await transaction
      .insertInto("series_comment")
      .values({ series_id: seriesId.toString(), comment_id: id })
      .execute();

    return id;
  });
}

/**
 * Update a comment's content
 */
export async function updateComment(
  database: Database,
  commentId: number | string,
  content: string,
): Promise<void> {
  await database
    .updateTable("comment")
    .set({ content, updated_at: new Date() })
    .where("id", "=", commentId.toString())
    .execute();
}

/**
 * Delete a comment (and its reactions via cascade)
 */
export async function deleteComment(database: Database, commentId: number | string): Promise<void> {
  await database.deleteFrom("comment").where("id", "=", commentId.toString()).execute();
}

/**
 * Add a reaction to a comment
 */
export async function addReaction(
  database: Database,
  commentId: number | string,
  userId: string,
  emoji: string,
): Promise<void> {
  await database
    .insertInto("comment_reaction")
    .values({ comment_id: commentId.toString(), user_id: userId, emoji })
    .onConflict((eb) => eb.constraint("comment_reaction_pkey").doUpdateSet({ emoji }))
    .execute();
}

/**
 * Remove a reaction from a comment
 */
export async function removeReaction(
  database: Database,
  commentId: number | string,
  userId: string,
  emoji: string,
): Promise<void> {
  await database
    .deleteFrom("comment_reaction")
    .where("comment_id", "=", commentId.toString())
    .where("user_id", "=", userId)
    .where("emoji", "=", emoji)
    .execute();
}

export type Comment = Omit<Selectable<Schema[typeof table]>, "created_at" | "updated_at"> & {
  created_at: string | Date;
  updated_at: string | Date | null;
  parent_comment_id: string | null;
};
export type CommentWithUser = Omit<Comment, "created_by"> & { created_by: User };
type Reaction = Omit<Selectable<Schema["comment_reaction"]>, "comment_id" | "created_at"> & {
  created_at: string | Date;
};
export type CommentWithReactions = Comment & { reactions: Reaction[] };
export type CommentWithUserAndReactions = CommentWithUser &
  Omit<CommentWithReactions, "created_by"> & { reply_count: number | null };
export type Commentable = "work" | "collection" | "creator" | "publisher" | "series";

// region Comment Moderation

export type CommentReport = Selectable<Schema["comment_report"]> & {
  comment?: Comment;
  reporter?: User;
  resolver?: User;
  reporter_total_reports?: number;
};

export type ReportResolution = "dismissed" | "hidden" | "deleted";

export interface GetCommentReportsOptions {
  resolved?: boolean;
  resolution?: ReportResolution;
  reporterId?: string;
  search?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  limit?: number;
  offset?: number;
}

export interface GetCommentReportsResult {
  reports: CommentReport[];
  total: number;
}

/**
 * Report a comment for moderation.
 * If the same user re-reports a dismissed report, it will be reopened.
 */
export async function reportComment(
  database: Database,
  commentId: number | string,
  userId: string,
  reason: string,
): Promise<void> {
  await database
    .insertInto("comment_report")
    .values({ comment_id: commentId.toString(), reported_by: userId, reason })
    .onConflict((eb) =>
      eb.constraint("comment_report_unique_per_user").doUpdateSet((eb) => ({
        reason,
        created_at: new Date(),
        // Reset resolution fields if the report was previously dismissed
        resolved_at: eb
          .case()
          .when("comment_report.resolution", "=", "dismissed")
          .then(null)
          .else(eb.ref("comment_report.resolved_at"))
          .end(),
        resolved_by: eb
          .case()
          .when("comment_report.resolution", "=", "dismissed")
          .then(null)
          .else(eb.ref("comment_report.resolved_by"))
          .end(),
        resolution: eb
          .case()
          .when("comment_report.resolution", "=", "dismissed")
          .then(null)
          .else(eb.ref("comment_report.resolution"))
          .end(),
      })),
    )
    .execute();
}

/**
 * Get comment reports for moderation queue
 */
export async function getCommentReports(
  database: Database,
  options: GetCommentReportsOptions = {},
): Promise<GetCommentReportsResult> {
  // Build base query with all joins
  let baseQuery = database
    .selectFrom("comment_report")
    .leftJoin("comment", "comment.id", "comment_report.comment_id")
    .leftJoin("authentication.user as reporter", "reporter.id", "comment_report.reported_by")
    .leftJoin("authentication.user as resolver", "resolver.id", "comment_report.resolved_by");

  // Apply filters
  if (options.resolved === true) {
    baseQuery = baseQuery.where("comment_report.resolved_at", "is not", null);
  } else if (options.resolved === false) {
    baseQuery = baseQuery.where("comment_report.resolved_at", "is", null);
  }

  if (options.resolution) {
    baseQuery = baseQuery.where("comment_report.resolution", "=", options.resolution);
  }

  if (options.reporterId) {
    baseQuery = baseQuery.where("comment_report.reported_by", "=", options.reporterId);
  }

  if (options.search) {
    baseQuery = baseQuery.where("comment.content", "ilike", `%${options.search}%`);
  }

  if (options.dateFrom) {
    const fromDate =
      typeof options.dateFrom === "string" ? new Date(options.dateFrom) : options.dateFrom;
    baseQuery = baseQuery.where("comment_report.created_at", ">=", fromDate);
  }

  if (options.dateTo) {
    const toDate = typeof options.dateTo === "string" ? new Date(options.dateTo) : options.dateTo;
    baseQuery = baseQuery.where("comment_report.created_at", "<=", toDate);
  }

  // Get total count
  const countResult = await baseQuery
    .select(({ fn }) => fn.countAll().as("count"))
    .executeTakeFirst();
  const total = Number(countResult?.count ?? 0);

  // Get paginated results with reporter's total report count
  let query = baseQuery
    .selectAll("comment_report")
    .select(({ fn }) => fn.toJson("comment").as("comment"))
    .select(({ fn }) => fn.toJson("reporter").as("reporter"))
    .select(({ fn }) => fn.toJson("resolver").as("resolver"))
    .select((eb) =>
      eb
        .selectFrom("comment_report as r2")
        .select(({ fn }) => fn.countAll().as("count"))
        .whereRef("r2.reported_by", "=", "comment_report.reported_by")
        .as("reporter_total_reports"),
    )
    .orderBy("comment_report.created_at", "desc");

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.offset(options.offset);
  }

  const reports = (await query.execute()) as CommentReport[];

  return { reports, total };
}

/**
 * Resolve a comment report
 */
export async function resolveReport(
  database: Database,
  reportId: number | string,
  userId: string,
  resolution: ReportResolution,
): Promise<void> {
  await database
    .updateTable("comment_report")
    .set({ resolved_at: new Date(), resolved_by: userId, resolution })
    .where("id", "=", reportId.toString())
    .execute();
}

/**
 * Reopen a resolved report (clear resolution fields)
 */
export async function reopenReport(database: Database, reportId: number | string): Promise<void> {
  await database
    .updateTable("comment_report")
    .set({ resolved_at: null, resolved_by: null, resolution: null })
    .where("id", "=", reportId.toString())
    .execute();
}

/**
 * Result of a bulk resolve operation
 */
export interface BulkResolveResult {
  resolved: number;
  failed: number;
  commentIds: string[];
}

/**
 * Bulk resolve multiple reports at once
 */
export async function bulkResolveReports(
  database: Database,
  reportIds: string[],
  userId: string,
  resolution: ReportResolution,
): Promise<BulkResolveResult> {
  if (reportIds.length === 0) {
    return { resolved: 0, failed: 0, commentIds: [] };
  }

  // Get the comment IDs for all reports before resolving
  const reports = await database
    .selectFrom("comment_report")
    .select(["id", "comment_id"])
    .where("id", "in", reportIds)
    .execute();

  const commentIds = reports
    .map((r) => r.comment_id?.toString())
    .filter((id): id is string => id != null);

  // Resolve all reports in a single query
  const result = await database
    .updateTable("comment_report")
    .set({ resolved_at: new Date(), resolved_by: userId, resolution })
    .where("id", "in", reportIds)
    .executeTakeFirst();

  const resolved = Number(result.numUpdatedRows);

  return { resolved, failed: reportIds.length - resolved, commentIds };
}

/**
 * Get a single report by ID
 */
export async function getReport(
  database: Database,
  reportId: number | string,
): Promise<CommentReport | undefined> {
  const result = await database
    .selectFrom("comment_report")
    .leftJoin("comment", "comment.id", "comment_report.comment_id")
    .leftJoin("authentication.user as reporter", "reporter.id", "comment_report.reported_by")
    .leftJoin("authentication.user as resolver", "resolver.id", "comment_report.resolved_by")
    .selectAll("comment_report")
    .select(({ fn }) => fn.toJson("comment").as("comment"))
    .select(({ fn }) => fn.toJson("reporter").as("reporter"))
    .select(({ fn }) => fn.toJson("resolver").as("resolver"))
    .where("comment_report.id", "=", reportId.toString())
    .executeTakeFirst();

  return result as CommentReport | undefined;
}

/**
 * Hide a comment (soft delete, visible to admins)
 */
export async function hideComment(
  database: Database,
  commentId: number | string,
  userId: string,
  reason: string,
): Promise<void> {
  await database
    .updateTable("comment")
    .set({ hidden_at: new Date(), hidden_by: userId, hidden_reason: reason })
    .where("id", "=", commentId.toString())
    .execute();
}

/**
 * Unhide a comment
 */
export async function unhideComment(database: Database, commentId: number | string): Promise<void> {
  await database
    .updateTable("comment")
    .set({ hidden_at: null, hidden_by: null, hidden_reason: null })
    .where("id", "=", commentId.toString())
    .execute();
}

/**
 * Get hidden comments for admin review
 */
export async function getHiddenComments(
  database: Database,
  options: { limit?: number; offset?: number } = {},
): Promise<CommentWithUserAndReactions[]> {
  let query = database
    .selectFrom("comment")
    .leftJoin("authentication.user as u", "u.id", "comment.created_by")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("comment_reaction")
          .select(["emoji", "user_id", "created_at"])
          .whereRef("comment_id", "=", "comment.id")
          .as("reactions"),
      (join) => join.onTrue(),
    )
    .selectAll("comment")
    .select(({ fn, val }) =>
      fn
        .coalesce(fn.jsonAgg("reactions").filterWhere("reactions.emoji", "is not", null), val("[]"))
        .as("reactions"),
    )
    .select(({ fn }) => fn.toJson("u").as("created_by"))
    .select((eb) =>
      eb
        .selectFrom("comment as replies")
        .select(({ fn }) => fn.countAll().as("count"))
        .whereRef("replies.parent_comment_id", "=", "comment.id")
        .as("reply_count"),
    )
    .where("comment.hidden_at", "is not", null)
    .groupBy("comment.id")
    .groupBy("u.id")
    .orderBy("comment.hidden_at", "desc");

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.offset(options.offset);
  }

  return query.execute() as Promise<CommentWithUserAndReactions[]>;
}

export interface ModerationStats {
  totalReports: number;
  unresolvedReports: number;
  resolvedThisWeek: number;
  resolvedThisMonth: number;
  byResolution: { dismissed: number; hidden: number; deleted: number };
  hiddenComments: number;
  topReporters: Array<{ userId: string; name: string; email: string | null; count: number }>;
  averageResolutionTimeHours: number | null;
}

/**
 * Get moderation statistics for the dashboard
 */
export async function getModerationStats(database: Database): Promise<ModerationStats> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get total and unresolved counts
  const totalResult = await database
    .selectFrom("comment_report")
    .select(({ fn }) => fn.countAll().as("total"))
    .executeTakeFirst();

  const unresolvedResult = await database
    .selectFrom("comment_report")
    .where("resolved_at", "is", null)
    .select(({ fn }) => fn.countAll().as("count"))
    .executeTakeFirst();

  // Get resolved this week/month
  const resolvedThisWeekResult = await database
    .selectFrom("comment_report")
    .where("resolved_at", ">=", oneWeekAgo)
    .select(({ fn }) => fn.countAll().as("count"))
    .executeTakeFirst();

  const resolvedThisMonthResult = await database
    .selectFrom("comment_report")
    .where("resolved_at", ">=", oneMonthAgo)
    .select(({ fn }) => fn.countAll().as("count"))
    .executeTakeFirst();

  // Get counts by resolution type
  const byResolutionResult = await database
    .selectFrom("comment_report")
    .where("resolution", "is not", null)
    .select("resolution")
    .select(({ fn }) => fn.countAll().as("count"))
    .groupBy("resolution")
    .execute();

  const byResolution = { dismissed: 0, hidden: 0, deleted: 0 };
  for (const row of byResolutionResult) {
    if (row.resolution === "dismissed") byResolution.dismissed = Number(row.count);
    if (row.resolution === "hidden") byResolution.hidden = Number(row.count);
    if (row.resolution === "deleted") byResolution.deleted = Number(row.count);
  }

  // Get hidden comments count
  const hiddenResult = await database
    .selectFrom("comment")
    .where("hidden_at", "is not", null)
    .select(({ fn }) => fn.countAll().as("count"))
    .executeTakeFirst();

  // Get top 5 reporters
  const topReportersResult = await database
    .selectFrom("comment_report")
    .innerJoin("authentication.user as u", "u.id", "comment_report.reported_by")
    .select("comment_report.reported_by")
    .select("u.name")
    .select("u.email")
    .select(({ fn }) => fn.countAll().as("count"))
    .groupBy("comment_report.reported_by")
    .groupBy("u.name")
    .groupBy("u.email")
    .orderBy("count", "desc")
    .limit(5)
    .execute();

  // Calculate average resolution time using raw SQL for the date difference
  const avgResolutionResult = await database
    .selectFrom("comment_report")
    .where("resolved_at", "is not", null)
    .select(sql<number>`avg(extract(epoch from (resolved_at - created_at)))`.as("avg_seconds"))
    .executeTakeFirst();

  const avgSeconds = avgResolutionResult?.avg_seconds;
  const averageResolutionTimeHours = avgSeconds ? Number(avgSeconds) / 3600 : null;

  return {
    totalReports: Number(totalResult?.total ?? 0),
    unresolvedReports: Number(unresolvedResult?.count ?? 0),
    resolvedThisWeek: Number(resolvedThisWeekResult?.count ?? 0),
    resolvedThisMonth: Number(resolvedThisMonthResult?.count ?? 0),
    byResolution,
    hiddenComments: Number(hiddenResult?.count ?? 0),
    topReporters: topReportersResult.map((r) => ({
      userId: r.reported_by?.toString() ?? "",
      name: r.name ?? "Unknown",
      email: r.email ?? null,
      count: Number(r.count),
    })),
    averageResolutionTimeHours,
  };
}

// endregion

// region Moderation Activity Log

export type ModerationActionType =
  | "resolve_report"
  | "reopen_report"
  | "change_resolution"
  | "hide_comment"
  | "unhide_comment"
  | "delete_comment";

export type ModerationTargetType = "report" | "comment";

export interface ModerationLogEntry {
  id: string;
  action_type: ModerationActionType;
  target_type: ModerationTargetType;
  target_id: string;
  performed_by: string;
  performer_name?: string;
  performer_email?: string;
  details: Record<string, unknown> | null;
  created_at: Date | string;
}

export interface LogModerationActionParams {
  actionType: ModerationActionType;
  targetType: ModerationTargetType;
  targetId: number | string;
  performedBy: string;
  details?: Record<string, unknown>;
}

/**
 * Log a moderation action for accountability
 */
export async function logModerationAction(
  database: Database,
  params: LogModerationActionParams,
): Promise<void> {
  await database
    .insertInto("moderation_log")
    .values({
      action_type: params.actionType,
      target_type: params.targetType,
      target_id: params.targetId.toString(),
      performed_by: params.performedBy,
      details: params.details ? JSON.stringify(params.details) : null,
    })
    .execute();
}

export interface GetModerationLogOptions {
  actionType?: ModerationActionType;
  targetType?: ModerationTargetType;
  performedBy?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  limit?: number;
  offset?: number;
}

export interface GetModerationLogResult {
  entries: ModerationLogEntry[];
  total: number;
}

/**
 * Get moderation log entries with optional filters
 */
export async function getModerationLog(
  database: Database,
  options: GetModerationLogOptions = {},
): Promise<GetModerationLogResult> {
  // Build base query
  let baseQuery = database
    .selectFrom("moderation_log")
    .leftJoin("authentication.user as performer", "performer.id", "moderation_log.performed_by");

  // Apply filters
  if (options.actionType) {
    baseQuery = baseQuery.where("moderation_log.action_type", "=", options.actionType);
  }

  if (options.targetType) {
    baseQuery = baseQuery.where("moderation_log.target_type", "=", options.targetType);
  }

  if (options.performedBy) {
    baseQuery = baseQuery.where("moderation_log.performed_by", "=", options.performedBy);
  }

  if (options.dateFrom) {
    const fromDate =
      typeof options.dateFrom === "string" ? new Date(options.dateFrom) : options.dateFrom;
    baseQuery = baseQuery.where("moderation_log.created_at", ">=", fromDate);
  }

  if (options.dateTo) {
    const toDate = typeof options.dateTo === "string" ? new Date(options.dateTo) : options.dateTo;
    baseQuery = baseQuery.where("moderation_log.created_at", "<=", toDate);
  }

  // Get total count
  const countResult = await baseQuery
    .select(({ fn }) => fn.countAll().as("count"))
    .executeTakeFirst();
  const total = Number(countResult?.count ?? 0);

  // Get paginated results
  let query = baseQuery
    .select([
      "moderation_log.id",
      "moderation_log.action_type",
      "moderation_log.target_type",
      "moderation_log.target_id",
      "moderation_log.performed_by",
      "moderation_log.details",
      "moderation_log.created_at",
    ])
    .select("performer.name as performer_name")
    .select("performer.email as performer_email")
    .orderBy("moderation_log.created_at", "desc");

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.offset(options.offset);
  }

  const results = await query.execute();

  const entries: ModerationLogEntry[] = results.map((row) => {
    const entry: ModerationLogEntry = {
      id: row.id?.toString() ?? "",
      action_type: row.action_type as ModerationActionType,
      target_type: row.target_type as ModerationTargetType,
      target_id: row.target_id?.toString() ?? "",
      performed_by: row.performed_by?.toString() ?? "",
      details: row.details as Record<string, unknown> | null,
      created_at: row.created_at,
    };
    if (row.performer_name) {
      entry.performer_name = row.performer_name;
    }
    if (row.performer_email) {
      entry.performer_email = row.performer_email;
    }
    return entry;
  });

  return { entries, total };
}

// endregion
