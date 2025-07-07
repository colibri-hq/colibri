import type { Selectable, SelectQueryBuilder } from "kysely";
import type { Database, Schema } from "../database.js";
import type { Creator, Edition } from "../schema.js";
import { Buffer } from "node:buffer";

const table = "work" as const;

export function loadWorks(database: Database, input?: string) {
  const query = database
    .selectFrom(table)
    .leftJoin("edition", "edition.id", "work.main_edition_id")
    .leftJoin("contribution", (join) =>
      join
        .onRef("contribution.edition_id", "=", "edition.id")
        .on("contribution.essential", "=", true),
    )
    .leftJoin("creator", "creator.id", "contribution.creator_id")
    .select(({ fn }) => fn.jsonAgg("creator").as("creators"))
    .selectAll("edition")
    .select(({ ref }) => ref("work.id").as("id"))
    .groupBy("work.id")
    .groupBy("edition.id");

  if (input) {
    return (
      query
        //.where('title', 'like', `%${input}%`)
        .execute()
    );
  }

  return query.execute();
}

export function loadWork(database: Database, id: string | number) {
  return database
    .selectFrom(table)
    .innerJoin("edition", "edition.id", "work.main_edition_id")
    .leftJoin("language", "language.iso_639_3", "edition.language")
    .leftJoin("image", "image.id", "edition.cover_image_id")
    .selectAll("edition")
    .select(({ ref }) => ref("edition.id").as("edition_id"))
    .select(({ ref }) => ref("work.id").as("id"))
    .select(({ ref }) => ref("language.name").as("language_name"))
    .select(({ ref }) => ref("image.blurhash").as("cover_blurhash"))
    .where("work.id", "=", id.toString())
    .groupBy("work.id")
    .groupBy("edition.id")
    .groupBy("language.iso_639_3")
    .groupBy("image.id")
    .executeTakeFirstOrThrow();
}

export function loadCreatorsForWork(
  database: Database,
  workId: string | number,
  editionId?: string | number,
) {
  return database
    .selectFrom(table)
    .innerJoin("edition", (join) =>
      editionId
        ? join.on("edition.id", "=", editionId.toString())
        : join.onRef("edition.id", "=", "work.main_edition_id"),
    )
    .innerJoin("contribution", "contribution.edition_id", "edition.id")
    .innerJoin("creator", "creator.id", "contribution.creator_id")
    .selectAll("creator")
    .select(["contribution.essential", "contribution.role"])
    .where("work.id", "=", workId.toString())
    .execute();
}

export function loadPublisherForWork(
  database: Database,
  workId: string | number,
  editionId?: string | number,
) {
  return database
    .selectFrom(table)
    .innerJoin("edition", (join) =>
      editionId
        ? join.on("edition.id", "=", editionId.toString())
        : join.onRef("edition.id", "=", "work.main_edition_id"),
    )
    .innerJoin("publisher", "publisher.id", "edition.publisher_id")
    .selectAll("publisher")
    .where("work.id", "=", workId.toString())
    .executeTakeFirstOrThrow();
}

export function loadRatings(database: Database, workId: string | number) {
  return database
    .selectFrom(table)
    .innerJoin("work_rating", "work_rating.work_id", "work.id")
    .innerJoin(
      "authentication.user",
      "authentication.user.id",
      "work_rating.user_id",
    )
    .select([
      "work_rating.user_id",
      "work_rating.rating",
      "work_rating.created_at",
      "authentication.user.name as user_name",
      "authentication.user.email as user_email",
    ])
    .where("work.id", "=", workId.toString())
    .execute();
}

export function loadReviews(
  database: Database,
  workId: string | number,
  editionId?: string | number,
) {
  return database
    .selectFrom(table)
    .innerJoin("edition", (join) =>
      editionId
        ? join.on("edition.id", "=", editionId.toString())
        : join.onRef("edition.id", "=", "work.main_edition_id"),
    )
    .innerJoin("review", "review.edition_id", "edition.id")
    .leftJoin("creator", "creator.id", "review.reviewer_id")
    .selectAll("review")
    .select(({ fn }) => fn.toJson("creator").as("reviewer"))
    .where("work.id", "=", workId.toString())
    .execute();
}

export async function updateRating(
  database: Database,
  workId: string | number,
  userId: string | number,
  rating: number,
) {
  await database
    .insertInto("work_rating")
    .values({
      work_id: workId.toString(),
      user_id: userId.toString(),
      rating,
    })
    .onConflict((oc) =>
      oc.columns(["work_id", "user_id"]).doUpdateSet({ rating }),
    )
    .execute();
}

export function withCover<
  T extends SelectQueryBuilder<Schema, "work" | "edition", unknown>,
>(builder: T) {
  return builder
    .leftJoin("image", "image.id", "edition.cover_image_id")
    .select("image.blurhash as cover_blurhash")
    .select("image.width as cover_width")
    .select("image.height as cover_height");
}

export function createWork(
  database: Database,
  mainEditionId?: string | number,
  userId?: string,
) {
  return database
    .insertInto(table)
    .values({
      created_at: new Date(),
      created_by: userId,
      main_edition_id: mainEditionId?.toString(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function updateWork(
  database: Database,
  id: string | number,
  mainEditionId?: string | number,
  userId?: string,
) {
  return database
    .updateTable(table)
    .set({
      main_edition_id: mainEditionId?.toString(),
      updated_at: new Date(),
      updated_by: userId?.toString(),
    })
    .where("id", "=", id.toString())
    .returningAll()
    .executeTakeFirstOrThrow();
}

type NewEdition = {
  isbn?: string | undefined;
  asin?: string | undefined;
  binding?: string | undefined;
  coverId?: string | number | undefined;
  excerpt?: string | undefined;
  format?: string | undefined;
  language?: string | undefined;
  legalInformation?: string | undefined;
  pages?: number | undefined;
  publishedAt?: Date | undefined;
  publisherId?: string | number | undefined;
  sortingKey?: string | undefined;
  synopsis?: string | undefined;
  title?: string | undefined;
};

export function createEdition(
  database: Database,
  workId: string | number,
  {
    isbn,
    asin,
    binding,
    pages,
    publishedAt: published_at,
    excerpt,
    legalInformation: legal_information,
    format,
    language,
    synopsis,
    sortingKey: sorting_key,
    title = "Untitled",
    coverId,
    publisherId,
  }: NewEdition,
) {
  return database
    .insertInto("edition")
    .values({
      asin,
      binding,
      work_id: workId.toString(),
      cover_image_id: coverId?.toString(),
      excerpt,
      format,
      isbn_10: isbn?.length === 10 ? isbn : undefined,
      isbn_13: isbn?.length === 13 ? isbn : undefined,
      language,
      legal_information,
      pages,
      published_at,
      publisher_id: publisherId?.toString(),
      sorting_key,
      synopsis,
      title: title,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function findAssetByChecksum(
  database: Database,
  checksum: Uint8Array<ArrayBufferLike>,
) {
  return database
    .selectFrom("asset")
    .where("checksum", "=", Buffer.from(checksum))
    .selectAll()
    .executeTakeFirst();
}

type Table = Schema[typeof table];
export type Work = Selectable<Table> & {
  language_name?: string;
  cover_blurhash?: string | null;
};
export type WorkWithMainEdition<T extends Work = Work> = T &
  Selectable<Edition>;
export type WorkWithCreators<T extends Work = Work> = T & {
  creators: Creator[];
};
