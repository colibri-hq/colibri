import type { Database, Schema } from "../database.js";
import type { Selectable, Updateable } from "kysely";

const table = "settings" as const;

export function loadSettings(database: Database) {
  return database
    .selectFrom(table)
    .leftJoin("authentication.user as user", "updated_by", "id")
    .selectAll(table)
    .select(({ fn }) => fn.toJson("user").as("updated_by"))
    .executeTakeFirstOrThrow();
}

export function updateSettings(
  database: Database,
  settings: Updateable<Selectable<Schema["settings_revision"]>>,
) {
  return database
    .updateTable("settings_revision")
    .set(settings)
    .returningAll()
    .executeTakeFirstOrThrow();
}

type Table = Schema[typeof table];
export type Settings = Selectable<Table>;
