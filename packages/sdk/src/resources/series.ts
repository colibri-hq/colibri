import type { Selectable } from "kysely";
import { sql } from "kysely";
import type { Database, Schema } from "../database.js";
import type { Series as $Series } from "../schema.js";

const table = "series" as const;

/**
 * Load all series with pagination
 */
export function loadSeries(database: Database, page?: number, perPage: number = 50) {
  let query = database.selectFrom(table).selectAll().orderBy("name", "asc");

  if (page !== undefined && page > 0) {
    query = query.limit(perPage).offset((page - 1) * perPage);
  }

  return query.execute();
}

/**
 * Load a single series by ID
 */
export function loadSeriesById(database: Database, id: string) {
  return database.selectFrom(table).where("id", "=", id).selectAll().executeTakeFirstOrThrow();
}

/**
 * Load all works in a series
 */
export function loadSeriesWorks(database: Database, seriesId: string) {
  return database
    .selectFrom("series_entry")
    .innerJoin("work", "series_entry.work_id", "work.id")
    .leftJoin("edition", "work.main_edition_id", "edition.id")
    .leftJoin("image", "edition.cover_image_id", "image.id")
    .selectAll("work")
    .select("series_entry.position as series_position")
    .select("edition.title as edition_title")
    .select("image.blurhash as cover_blurhash")
    .where("series_entry.series_id", "=", seriesId)
    .orderBy("series_entry.position", "asc")
    .execute();
}

/**
 * Create a new series
 */
type NewSeries = { language?: string | undefined; userId?: string | undefined };

export function createSeries(
  database: Database,
  name: string,
  { language, userId }: NewSeries = {},
) {
  return database
    .insertInto(table)
    .values({ name, language, updated_by: userId ? userId.toString() : undefined })
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Update a series
 */
type UpdatedSeries = {
  name?: string | undefined;
  language?: string | undefined;
  userId?: string | undefined;
};

export function updateSeries(
  database: Database,
  id: string,
  { name, language, userId }: UpdatedSeries,
) {
  return database
    .updateTable(table)
    .set({
      name,
      language,
      updated_by: userId ? userId.toString() : undefined,
      updated_at: new Date(),
    })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Find series by exact name (case-insensitive)
 */
export function findSeriesByName(database: Database, name: string) {
  return database
    .selectFrom(table)
    .where(sql<boolean>`lower(name) = ${name.toLowerCase()}`)
    .selectAll()
    .executeTakeFirst();
}

/**
 * Find series by fuzzy name matching
 * Uses PostgreSQL's similarity function with a threshold
 *
 * @param threshold - Similarity threshold (0-1), default 0.7 (70% match)
 */
export async function findSeriesByFuzzyName(
  database: Database,
  name: string,
  threshold: number = 0.7,
) {
  const results = await database
    .selectFrom(table)
    .selectAll()
    .select((eb) =>
      eb.fn<number>("similarity", [eb.ref("name"), eb.val(name)]).as("similarity_score"),
    )
    .where((eb) => eb(eb.fn<number>("similarity", [eb.ref("name"), eb.val(name)]), ">", threshold))
    .orderBy("similarity_score", "desc")
    .limit(5)
    .execute();

  return results.length > 0 ? results[0] : undefined;
}

/**
 * Find or create a series by name
 * First tries exact match, then fuzzy match, then creates new
 */
export async function findOrCreateSeries(
  database: Database,
  name: string,
  options: NewSeries & { fuzzyThreshold?: number } = {},
) {
  // Try exact match first
  const exact = await findSeriesByName(database, name);
  if (exact) {
    return exact;
  }

  // Try fuzzy match
  const fuzzyThreshold = options.fuzzyThreshold ?? 0.7;
  const fuzzy = await findSeriesByFuzzyName(database, name, fuzzyThreshold);
  if (fuzzy) {
    return fuzzy;
  }

  // Create new series
  return await createSeries(database, name, options);
}

/**
 * Add a work to a series
 */
export function addWorkToSeries(
  database: Database,
  workId: string,
  seriesId: string,
  position?: number,
) {
  return database
    .insertInto("series_entry")
    .values({ work_id: workId, series_id: seriesId, position })
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Remove a work from a series
 */
export function removeWorkFromSeries(database: Database, workId: string, seriesId: string) {
  return database
    .deleteFrom("series_entry")
    .where("work_id", "=", workId)
    .where("series_id", "=", seriesId)
    .execute();
}

/**
 * Update work position in series
 */
export function updateWorkPositionInSeries(
  database: Database,
  workId: string,
  seriesId: string,
  position: number,
) {
  return database
    .updateTable("series_entry")
    .set({ position })
    .where("work_id", "=", workId)
    .where("series_id", "=", seriesId)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Delete a series
 */
export function deleteSeries(database: Database, id: string) {
  return database.deleteFrom(table).where("id", "=", id).execute();
}

/**
 * Load all series a work belongs to
 */
export function loadSeriesForWork(database: Database, workId: string) {
  return database
    .selectFrom("series_entry")
    .innerJoin("series", "series.id", "series_entry.series_id")
    .selectAll("series")
    .select("series_entry.position as series_position")
    .where("series_entry.work_id", "=", workId)
    .orderBy("series.name", "asc")
    .execute();
}

/**
 * Load series with work counts for list views
 */
export function loadSeriesWithWorkCount(database: Database, page?: number, perPage: number = 50) {
  let query = database
    .selectFrom(table)
    .leftJoin("series_entry", "series_entry.series_id", "series.id")
    .selectAll("series")
    .select((eb) => eb.fn.count("series_entry.work_id").as("work_count"))
    .groupBy("series.id")
    .orderBy("name", "asc");

  if (page !== undefined && page > 0) {
    query = query.limit(perPage).offset((page - 1) * perPage);
  }

  return query.execute();
}

/**
 * Count total series for pagination
 */
export async function countSeries(database: Database) {
  const result = await database
    .selectFrom(table)
    .select((eb) => eb.fn.countAll().as("count"))
    .executeTakeFirstOrThrow();

  return Number(result.count);
}

type _Table = Schema[typeof table];
export type Series = Selectable<$Series>;
