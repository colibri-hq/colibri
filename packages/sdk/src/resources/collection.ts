import { type InsertObject, type Selectable, type SelectQueryBuilder, sql } from "kysely";
import type { Database, Schema } from "../database.js";
import type { DB } from "../schema.js";
import type { User } from "./authentication/index.js";
import type { CommentWithUserAndReactions } from "./comment.js";

const table = "collection" as const;

export function loadAllCollections(database: Database) {
  return database.selectFrom(table).selectAll().execute();
}

export function loadCollection(database: Database, collection: string | number) {
  return database.selectFrom(table).selectAll().where("id", "=", collection.toString()).execute();
}

export function loadCollectionsForUser(database: Database, user: User | string | number) {
  const userId = typeof user === "number" || typeof user === "string" ? user.toString() : user.id;

  return applyAccessControls(database.selectFrom(table), userId)
    .leftJoin("collection_entry", "collection_entry.collection_id", "collection.id")
    .select((eb) =>
      eb
        .selectFrom("collection_entry")
        .select(({ fn }) => fn.count("collection_entry.work_id").as("entry_count"))
        .whereRef("collection_entry.collection_id", "=", "collection.id")
        .as("entry_count"),
    )
    .selectAll("collection")
    .execute();
}

export function loadCollectionForUser(
  database: Database,
  collection: string | number,
  user: User | string | number,
) {
  const userId = typeof user === "number" || typeof user === "string" ? user.toString() : user.id;

  return applyAccessControls(database.selectFrom(table), userId)
    .selectAll("collection")
    .where("collection.id", "=", collection.toString())
    .executeTakeFirstOrThrow();
}

export function loadCollectionCommentsLegacy(database: Database, id: number | string) {
  return database
    .selectFrom(table)
    .innerJoin("collection_comment", "collection_comment.collection_id", "collection.id")
    .innerJoin("comment", "collection_comment.comment_id", "comment.id")
    .leftJoin("authentication.user as u", "u.id", "comment.created_by")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom((eb) =>
            eb
              .selectFrom("comment_reaction")
              .select("emoji")
              .select(({ fn }) => fn.count("emoji").as("count"))
              .whereRef("comment_id", "=", "comment.id")
              .groupBy("emoji")
              .as("reaction"),
          )
          .select(({ fn, ref }) =>
            fn("jsonb_object_agg", [ref("reaction.emoji"), ref("reaction.count")]).as("reactions"),
          )
          .as("result"),
      (join) => join.onTrue(),
    )
    .selectAll("comment")
    .select(({ fn }) => fn.toJson("u").as("created_by"))
    .select(({ fn, ref, val }) => fn.coalesce(ref("result.reactions"), val("{}")).as("reactions"))
    .where("collection.id", "=", id.toString())
    .groupBy("comment.id")
    .groupBy("result.reactions")
    .groupBy("u.id")
    .execute();
}

export function loadCollectionComments(
  database: Database,
  id: number | string,
): Promise<CommentWithUserAndReactions[]> {
  return database
    .selectFrom(table)
    .innerJoin("collection_comment", "collection_comment.collection_id", "collection.id")
    .innerJoin("comment", "collection_comment.comment_id", "comment.id")
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
    .where("collection.id", "=", id.toString())
    .where("comment.parent_comment_id", "is", null)
    .groupBy("comment.id")
    .groupBy("u.id")
    .orderBy("comment.created_at", "asc")
    .execute() as Promise<CommentWithUserAndReactions[]>;
}

export function loadCollectionWorks(database: Database, id: number | string) {
  return database
    .selectFrom(table)
    .innerJoin("collection_entry", "collection_entry.collection_id", "collection.id")
    .innerJoin("work", "collection_entry.work_id", "work.id")
    .leftJoin("edition", "work.main_edition_id", "edition.id")
    .leftJoin("image", "edition.cover_image_id", "image.id")
    .selectAll("edition")
    .select(({ ref }) => ref("work.id").as("id"))
    .select(({ ref }) => ref("work.id").as("work_id"))
    .select(({ ref }) => ref("work.main_edition_id").as("main_edition_id"))
    .select(({ ref }) => ref("image.blurhash").as("cover_blurhash"))
    .select(({ ref }) => ref("collection_entry.position").as("position"))
    .where("collection.id", "=", id.toString())
    .orderBy("collection_entry.position", "asc")
    .execute();
}

export async function addCollectionComment(
  database: Database,
  collection: number | string,
  comment: InsertObject<DB, "comment">,
) {
  const collectionId = collection.toString();

  await database.transaction().execute(async (transaction) => {
    const { id } = await transaction
      .insertInto("comment")
      .values(comment)
      .returning("id")
      .executeTakeFirstOrThrow();

    await transaction
      .insertInto("collection_comment")
      .values({ collection_id: collectionId, comment_id: id })
      .execute();

    return id;
  });
}

/**
 * Apply access controls for authenticated users based on collection visibility:
 * - shared = true (public): Accessible by everyone
 * - shared = null (shared): Accessible by all authenticated instance users
 * - shared = false (private): Only accessible by the owner
 */
function applyAccessControls(query: SelectQueryBuilder<DB, typeof table, unknown>, userId: string) {
  return query
    .leftJoin("authentication.user", (join) => join.on("authentication.user.id", "=", userId))
    .where((builder) =>
      builder.and([
        // region Visibility controls
        builder.or([
          // Public collections (shared = true) are accessible by everyone
          builder.eb("collection.shared", "=", true),

          // Shared collections (shared = null) are accessible by authenticated users
          builder.eb("collection.shared", "is", null),

          // Private collections (shared = false) are only accessible by owner
          builder.and([
            builder.eb("collection.shared", "=", false),
            builder.eb("collection.created_by", "=", builder.ref("authentication.user.id")),
          ]),
        ]),
        // end region

        // region Age requirements
        builder.or([
          // User is not a child
          builder.eb("authentication.user.role", "<>", "child"),

          // User is a child but has no birthdate configured, and the collection has an age
          // requirement of less than 18 years (anything 18 and above is considered adult-only, and
          // a user with the child role but no birthdate has probably just not been configured yet)
          builder.and([
            builder.eb("authentication.user.birthdate", "is", null),
            builder.eb("collection.age_requirement", "<", 18),
          ]),

          // User is a child but is older than the collection's age limit
          builder.eb(
            "collection.age_requirement",
            "<=",
            sql<number>`extract
              (year from age(now(), ${sql.ref("authentication.user.birthdate")}))`,
          ),
        ]),
        // endregion
      ]),
    );
}

/**
 * Apply access controls for public (unauthenticated) access.
 * Only public collections with no age requirement are accessible.
 */
function _applyPublicAccessControls(query: SelectQueryBuilder<DB, typeof table, unknown>) {
  return query.where((builder) =>
    builder.and([
      // Only public collections
      builder.eb("collection.shared", "=", true),
      // No age requirement for unauthenticated users
      builder.eb("collection.age_requirement", "=", 0),
    ]),
  );
}

type NewCollection = {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: Buffer | null;
  /** Visibility: null = shared (all users), false = private (owner only), true = public (unauthenticated) */
  shared?: boolean | null;
  ageRequirement?: number;
};

export function createCollection(
  database: Database,
  userId: string,
  {
    name,
    description,
    icon,
    color,
    shared = null, // Default to shared (null = visible to all instance users)
    ageRequirement: age_requirement = 0,
  }: NewCollection,
) {
  return database
    .insertInto(table)
    .values({
      name,
      description,
      icon,
      color,
      shared,
      age_requirement,
      created_by: userId,
      updated_by: userId,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

type UpdatedCollection = Partial<NewCollection>;

export function updateCollection(
  database: Database,
  id: string,
  userId: string,
  { name, description, icon, color, shared, ageRequirement: age_requirement }: UpdatedCollection,
) {
  return database
    .updateTable(table)
    .set({ name, description, icon, color, shared, age_requirement, updated_by: userId })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function deleteCollection(database: Database, id: string) {
  return database.deleteFrom(table).where("id", "=", id).execute();
}

export async function toggleWorkInCollection(
  database: Database,
  collectionId: string,
  workId: string,
  userId?: string,
): Promise<{ added: boolean }> {
  // Check if the work is already in the collection
  const existing = await database
    .selectFrom("collection_entry")
    .where("collection_id", "=", collectionId)
    .where("work_id", "=", workId)
    .selectAll()
    .executeTakeFirst();

  if (existing) {
    // Remove from collection
    await database
      .deleteFrom("collection_entry")
      .where("collection_id", "=", collectionId)
      .where("work_id", "=", workId)
      .execute();
    return { added: false };
  } else {
    // Get the main edition of the work
    const work = await database
      .selectFrom("work")
      .select("main_edition_id")
      .where("id", "=", workId)
      .executeTakeFirstOrThrow();

    // Get the next position in the collection
    const { max_position } = await database
      .selectFrom("collection_entry")
      .select(({ fn }) => fn.max("position").as("max_position"))
      .where("collection_id", "=", collectionId)
      .executeTakeFirstOrThrow();

    const nextPosition = (max_position ?? 0) + 1;

    // Add to collection
    await database
      .insertInto("collection_entry")
      .values({
        collection_id: collectionId,
        work_id: workId,
        edition_id: work.main_edition_id!,
        position: nextPosition,
        created_by: userId,
      })
      .execute();
    return { added: true };
  }
}

export type Collection = Selectable<Schema[typeof table]>;

/**
 * Toggle a like on a collection. Returns the new like state and count.
 */
export async function toggleCollectionLike(
  database: Database,
  collectionId: string,
  userId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  // Check if already liked
  const existing = await database
    .selectFrom("user_collection_favorite")
    .where("collection_id", "=", collectionId)
    .where("user_id", "=", userId)
    .selectAll()
    .executeTakeFirst();

  if (existing) {
    // Unlike: remove favorite and decrement count
    await database.transaction().execute(async (trx) => {
      await trx
        .deleteFrom("user_collection_favorite")
        .where("collection_id", "=", collectionId)
        .where("user_id", "=", userId)
        .execute();

      await trx
        .updateTable("collection")
        .set((eb) => ({ like_count: eb("like_count", "-", 1) }))
        .where("id", "=", collectionId)
        .execute();
    });

    const collection = await database
      .selectFrom("collection")
      .select("like_count")
      .where("id", "=", collectionId)
      .executeTakeFirstOrThrow();

    return { liked: false, likeCount: collection.like_count };
  } else {
    // Like: add favorite and increment count
    await database.transaction().execute(async (trx) => {
      await trx
        .insertInto("user_collection_favorite")
        .values({ collection_id: collectionId, user_id: userId })
        .execute();

      await trx
        .updateTable("collection")
        .set((eb) => ({ like_count: eb("like_count", "+", 1) }))
        .where("id", "=", collectionId)
        .execute();
    });

    const collection = await database
      .selectFrom("collection")
      .select("like_count")
      .where("id", "=", collectionId)
      .executeTakeFirstOrThrow();

    return { liked: true, likeCount: collection.like_count };
  }
}

/**
 * Check if a user has liked a collection
 */
export async function isCollectionLikedByUser(
  database: Database,
  collectionId: string,
  userId: string,
): Promise<boolean> {
  const existing = await database
    .selectFrom("user_collection_favorite")
    .where("collection_id", "=", collectionId)
    .where("user_id", "=", userId)
    .selectAll()
    .executeTakeFirst();

  return !!existing;
}

/**
 * Reorder entries in a collection. Updates positions in a transaction.
 */
export async function reorderCollectionEntries(
  database: Database,
  collectionId: string,
  entries: Array<{ workId: string; position: number }>,
  userId: string,
): Promise<void> {
  await database.transaction().execute(async (trx) => {
    for (const { workId, position } of entries) {
      await trx
        .updateTable("collection_entry")
        .set({ position, updated_by: userId, updated_at: new Date() })
        .where("collection_id", "=", collectionId)
        .where("work_id", "=", workId)
        .execute();
    }
  });
}
