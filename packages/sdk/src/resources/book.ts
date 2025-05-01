import type { Insertable, Selectable, SelectQueryBuilder } from "kysely";
import type { Database, Schema } from "../database";
import type { Creator } from "../schema";

const table = "book" as const;

export function loadBooks(database: Database, input?: string) {
  const query = database
    .selectFrom(table)
    .leftJoin("edition", "edition.id", "book.main_edition_id")
    .leftJoin("contribution", (join) =>
      join
        .onRef("contribution.edition_id", "=", "edition.id")
        .on("contribution.essential", "=", true),
    )
    .leftJoin("creator", "creator.id", "contribution.creator_id")
    .select(({ fn }) => fn.jsonAgg("creator").as("creators"))
    .selectAll("edition")
    .select(({ ref }) => ref("book.id").as("id"))
    .groupBy("book.id")
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

export function loadBook(database: Database, id: string | number) {
  return database
    .selectFrom(table)
    .innerJoin("edition", "edition.id", "book.main_edition_id")
    .leftJoin("language", "language.iso_639_3", "edition.language")
    .leftJoin("cover", "cover.id", "edition.cover_id")
    .selectAll("edition")
    .select(({ ref }) => ref("edition.id").as("edition_id"))
    .select(({ ref }) => ref("book.id").as("id"))
    .select(({ ref }) => ref("language.name").as("language_name"))
    .select(({ ref }) => ref("cover.blurhash").as("cover_blurhash"))
    .where("book.id", "=", id.toString())
    .groupBy("book.id")
    .groupBy("edition.id")
    .groupBy("language.iso_639_3")
    .groupBy("cover.id")
    .executeTakeFirstOrThrow();
}

export function loadCreatorsForBook(
  database: Database,
  bookId: string | number,
  editionId?: string | number,
) {
  return database
    .selectFrom(table)
    .innerJoin("edition", (join) =>
      editionId
        ? join.on("edition.id", "=", editionId.toString())
        : join.onRef("edition.id", "=", "book.main_edition_id"),
    )
    .innerJoin("contribution", "contribution.edition_id", "edition.id")
    .innerJoin("creator", "creator.id", "contribution.creator_id")
    .selectAll("creator")
    .select(["contribution.essential", "contribution.type"])
    .where("book.id", "=", bookId.toString())
    .execute();
}

export function loadPublisherForBook(
  database: Database,
  bookId: string | number,
  editionId?: string | number,
) {
  return database
    .selectFrom(table)
    .innerJoin("edition", (join) =>
      editionId
        ? join.on("edition.id", "=", editionId.toString())
        : join.onRef("edition.id", "=", "book.main_edition_id"),
    )
    .innerJoin("publisher", "publisher.id", "edition.publisher_id")
    .selectAll("publisher")
    .where("book.id", "=", bookId.toString())
    .executeTakeFirstOrThrow();
}

export function loadRatings(database: Database, bookId: string | number) {
  return database
    .selectFrom(table)
    .innerJoin("book_rating", "book_rating.book_id", "book.id")
    .innerJoin(
      "authentication.user",
      "authentication.user.id",
      "book_rating.user_id",
    )
    .select([
      "book_rating.user_id",
      "book_rating.rating",
      "book_rating.created_at",
      "authentication.user.name as user_name",
      "authentication.user.email as user_email",
    ])
    .where("book.id", "=", bookId.toString())
    .execute();
}

export function loadReviews(
  database: Database,
  bookId: string | number,
  editionId?: string | number,
) {
  return database
    .selectFrom(table)
    .innerJoin("edition", (join) =>
      editionId
        ? join.on("edition.id", "=", editionId.toString())
        : join.onRef("edition.id", "=", "book.main_edition_id"),
    )
    .innerJoin("review", "review.edition_id", "edition.id")
    .leftJoin("creator", "creator.id", "review.reviewer_id")
    .selectAll("review")
    .select(({ fn }) => fn.toJson("creator").as("reviewer"))
    .where("book.id", "=", bookId.toString())
    .execute();
}

export async function updateRating(
  database: Database,
  bookId: string | number,
  userId: string | number,
  rating: number,
) {
  await database
    .insertInto("book_rating")
    .values({
      book_id: bookId.toString(),
      user_id: userId.toString(),
      rating,
    })
    .onConflict((oc) =>
      oc.columns(["book_id", "user_id"]).doUpdateSet({ rating }),
    )
    .execute();
}

export function withCover<
  T extends SelectQueryBuilder<Schema, "book" | "edition", unknown>,
>(builder: T) {
  return builder
    .leftJoin("cover", "cover.id", "edition.cover_id")
    .select("cover.blurhash as cover_blurhash")
    .select("cover.width as cover_width")
    .select("cover.height as cover_height");
}

export function createBook(database: Database, userId: string) {
  return database
    .insertInto(table)
    .values({ created_by: userId })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function createEdition(
  database: Database,
  data: Insertable<Schema["edition"]>,
) {
  return database
    .insertInto("edition")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function findAssetByChecksum(database: Database, checksum: ArrayBuffer) {
  return database
    .selectFrom("asset")
    .where("checksum", "=", Buffer.from(checksum))
    .selectAll()
    .executeTakeFirst();
}

type Table = Schema[typeof table];
type Edition = Selectable<Schema["edition"]>;
export type Book = Selectable<Table> & {
  language_name?: string;
  cover_blurhash?: string | null;
};
export type BookWithMainEdition<T extends Book = Book> = T & Edition;
export type BookWithCreators<T extends Book = Book> = T & {
  creators: Creator[];
};
