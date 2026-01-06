import type { Database } from "../database.js";

// Re-export offline language resolution from @colibri-hq/languages
export {
  resolveLanguage,
  resolveLanguages,
  isValidLanguageCode,
  getLanguageByIso3,
  getLanguageByIso1,
  getLanguageByName,
  getAllLanguages,
  getLanguageCount,
} from "@colibri-hq/languages";

export type {
  Language as LanguageData,
  LanguageType,
  MatchType,
  ResolvedLanguage,
} from "@colibri-hq/languages";

/**
 * Load all languages from the database.
 */
export function loadLanguages(database: Database) {
  return database.selectFrom("language").execute();
}

/**
 * Load a language by its ISO 639-1 or ISO 639-3 code from the database.
 *
 * @param database - Database connection
 * @param code - ISO 639-1 (2-letter) or ISO 639-3 (3-letter) code
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

/**
 * Search languages by name or code in the database.
 * Use this for autocomplete functionality in the UI.
 *
 * @param database - Database connection
 * @param query - Search query (prefix match on name, iso_639_3, or iso_639_1)
 * @returns Up to 10 matching languages
 */
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
