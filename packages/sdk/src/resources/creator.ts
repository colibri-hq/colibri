import type { Selectable } from "kysely";
import type { Database, Schema } from "../database.js";
import { paginate } from "../utilities.js";

const table = "creator" as const;

export function loadCreators(
  database: Database,
  page?: number,
  perPage?: number,
) {
  return paginate(database, table, page, perPage).selectAll().execute();
}

export function loadCreator(database: Database, id: string) {
  return database
    .selectFrom(table)
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow();
}

export function loadContributionsForCreator(database: Database, id: string) {
  return database
    .selectFrom("book")
    .innerJoin("edition", "book.id", "edition.book_id")
    .leftJoin("cover", "edition.cover_id", "cover.id")
    .innerJoin("contribution", "edition.id", "contribution.edition_id")
    .selectAll("edition")
    .select("contribution.essential as essential_contribution")
    .select("contribution.type as contribution_type")
    .select("cover.blurhash as cover_blurhash")
    .where("contribution.creator_id", "=", id)
    .execute();
}

type Table = Schema[typeof table];
export type Creator = Selectable<Table>;
