import type { Insertable, Updateable } from "kysely";
import type { Database, Schema } from "../database.js";
import { paginate } from "../utilities.js";

const table = "catalog" as const;

export async function loadCatalogs(
  database: Database,
  _query?: string,
  page = 1,
  perPage = 10,
) {
  return paginate(database, table, page, perPage)
    .orderBy("updated_at desc")
    .selectAll(table)
    .select(({ fn, val }) =>
      fn("slugify", [
        fn.coalesce(
          "title",
          fn("regexp_replace", [
            "feed_url",
            val("^(https?://)?(www\\.)?"),
            val(""),
          ]),
        ),
      ]).as("slug"),
    )
    .execute();
}

export async function loadCatalog(database: Database, id: string) {
  return database
    .selectFrom(table)
    .where("id", "=", id)
    .selectAll()
    .select(({ fn, val }) =>
      fn("slugify", [
        fn.coalesce(
          "title",
          fn("regexp_replace", [
            "feed_url",
            val("^(https?://)?(www\\.)?"),
            val(""),
          ]),
        ),
      ]).as("slug"),
    )
    .executeTakeFirstOrThrow();
}

export async function updateCatalog(
  database: Database,
  id: string,
  data: Updateable<Table>,
) {
  await database.updateTable(table).set(data).where("id", "=", id).execute();
}

export async function createCatalog(
  database: Database,
  data: Insertable<Table>,
) {
  await database.insertInto(table).values(data).execute();
}

type Table = Schema[typeof table];
