import type { Database } from "../database.js";

export function loadLanguages(database: Database) {
  return database.selectFrom("language").execute();
}

/**
 * Load a language by its ISO 639-1 or ISO 639-3 code.
 *
 * @param database
 * @param code
 */
export function loadLanguage(database: Database, code: string) {
  const query = database.selectFrom("language").selectAll();
  code = code.toLowerCase().split(/[-_]/, 1)?.shift() ?? code;

  return (
    code.length === 2
      ? query.where("iso_639_1", "=", code)
      : query.where("iso_639_3", "=", code)
  ).executeTakeFirst();
}

export function searchLanguages(database: Database, query: string) {
  return database
    .selectFrom("language")
    .select(["iso_639_3", "name", "type"])
    .where((eb) =>
      eb.or([
        eb("name", "ilike", `${query}%`),
        eb("iso_639_3", "ilike", `${query}%`),
        eb("iso_639_1", "ilike", `${query}%`),
      ]),
    )
    .limit(10)
    .execute();
}
