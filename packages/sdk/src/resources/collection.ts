import {
  type InsertObject,
  type Selectable,
  type SelectQueryBuilder,
  sql,
} from "kysely";
import type { User } from "./authentication/index.js";
import type { Database, Schema } from "../database.js";
import type { DB } from "../schema.js";
import type { Comment } from "./comment.js";

const table = "collection" as const;

export function loadAllCollections(database: Database) {
  return database.selectFrom(table).selectAll().execute();
}

export function loadCollection(
  database: Database,
  collection: string | number,
) {
  return database
    .selectFrom(table)
    .selectAll()
    .where("id", "=", collection.toString())
    .execute();
}

export function loadCollectionsForUser(
  database: Database,
  user: User | string | number,
) {
  const userId =
    typeof user === "number" || typeof user === "string"
      ? user.toString()
      : user.id;

  return applyAccessControls(database.selectFrom(table), userId)
    .leftJoin(
      "collection_entry",
      "collection_entry.collection_id",
      "collection.id",
    )
    .select((eb) =>
      eb
        .selectFrom("collection_entry")
        .select(({ fn }) =>
          fn.count("collection_entry.work_id").as("entry_count"),
        )
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
  const userId =
    typeof user === "number" || typeof user === "string"
      ? user.toString()
      : user.id;

  return applyAccessControls(database.selectFrom(table), userId)
    .selectAll("collection")
    .where("collection.id", "=", collection.toString())
    .executeTakeFirstOrThrow();
}

export function loadCollectionCommentsLegacy(
  database: Database,
  id: number | string,
) {
  return database
    .selectFrom(table)
    .innerJoin(
      "collection_comment",
      "collection_comment.collection_id",
      "collection.id",
    )
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
            fn("jsonb_object_agg", [
              ref("reaction.emoji"),
              ref("reaction.count"),
            ]).as("reactions"),
          )
          .as("result"),
      (join) => join.onTrue(),
    )
    .selectAll("comment")
    .select(({ fn }) => fn.toJson("u").as("created_by"))
    .select(({ fn, ref, val }) =>
      fn.coalesce(ref("result.reactions"), val("{}")).as("reactions"),
    )
    .where("collection.id", "=", id.toString())
    .groupBy("comment.id")
    .groupBy("result.reactions")
    .groupBy("u.id")
    .execute();
}

export function loadCollectionComments(
  database: Database,
  id: number | string,
): Promise<Comment[]> {
  return database
    .selectFrom(table)
    .innerJoin(
      "collection_comment",
      "collection_comment.collection_id",
      "collection.id",
    )
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
        .coalesce(
          fn
            .jsonAgg("reactions")
            .filterWhere("reactions.emoji", "is not", null),
          val("[]"),
        )
        .as("reactions"),
    )
    .select(({ fn }) => fn.toJson("u").as("created_by"))
    .where("collection.id", "=", id.toString())
    .groupBy("comment.id")
    .groupBy("u.id")
    .execute();
}

export function loadCollectionWorks(database: Database, id: number | string) {
  return database
    .selectFrom(table)
    .innerJoin(
      "collection_entry",
      "collection_entry.collection_id",
      "collection.id",
    )
    .innerJoin("work", "collection_entry.work_id", "work.id")
    .leftJoin("edition", "work.main_edition_id", "edition.id")
    .leftJoin("image", "edition.cover_image_id", "image.id")
    .selectAll("work")
    .select("edition.id as edition_id")
    .select("image.blurhash as cover_blurhash")
    .where("collection.id", "=", id.toString())
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
      .values({
        collection_id: collectionId,
        comment_id: id,
      })
      .execute();

    return id;
  });
}

function applyAccessControls(
  query: SelectQueryBuilder<DB, typeof table, unknown>,
  userId: string,
) {
  return query
    .leftJoin("authentication.user", (join) =>
      join.on("authentication.user.id", "=", userId),
    )
    .where((builder) =>
      builder.and([
        // region Shared/private collections
        builder.or([
          // Collection is shared with all users
          builder.eb("collection.shared", "=", true),

          // Collection is private but belongs to the user
          builder.and([
            builder.eb("collection.shared", "=", false),
            builder.eb(
              "collection.created_by",
              "=",
              builder.ref("authentication.user.id"),
            ),
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

export type Collection = Selectable<Schema[typeof table]>;
