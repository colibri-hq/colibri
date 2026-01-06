import type { Database, Schema } from "../database.js";
import { lower, paginate } from "../utilities.js";
import type { ContributionRole, Creator as $Creator } from "../schema.js";
import type { Selectable } from "kysely";
import { sql } from "kysely";

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
    .selectFrom("work")
    .innerJoin("edition", "work.id", "edition.work_id")
    .leftJoin("image", "edition.cover_image_id", "image.id")
    .innerJoin("contribution", "edition.id", "contribution.edition_id")
    .selectAll("edition")
    .select("contribution.essential as essential_contribution")
    .select("contribution.role as contribution_role")
    .select("image.blurhash as cover_blurhash")
    .where("contribution.creator_id", "=", id)
    .execute();
}

type NewCreator = {
  amazonId?: string | undefined;
  description?: string | undefined;
  goodreadsId?: string | undefined;
  imageId?: number | string | undefined;
  sortingKey?: string | undefined;
  url?: string | undefined;
  userId?: string | undefined;
  wikipediaUrl?: string | undefined;
};
export function createCreator(
  database: Database,
  name: string,
  {
    amazonId: amazon_id,
    description,
    goodreadsId: goodreads_id,
    imageId: image_id,
    sortingKey: sorting_key = name,
    url,
    userId,
    wikipediaUrl: wikipedia_url,
  }: NewCreator,
) {
  return database
    .insertInto(table)
    .values({
      image_id,
      url,
      wikipedia_url,
      sorting_key,
      name,
      updated_by: userId ? userId.toString() : undefined,
      description,
      amazon_id,
      goodreads_id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

type UpdatedCreator = {
  amazonId?: string | undefined;
  description?: string | undefined;
  goodreadsId?: string | undefined;
  imageId?: number | string | undefined;
  name?: string | undefined;
  sortingKey?: string | undefined;
  url?: string | undefined;
  userId?: string | undefined;
  wikipediaUrl?: string | undefined;
};
export function updateCreator(
  database: Database,
  id: string,
  {
    amazonId: amazon_id,
    description,
    goodreadsId: goodreads_id,
    imageId: image_id,
    name,
    sortingKey: sorting_key,
    url,
    wikipediaUrl: wikipedia_url,
  }: UpdatedCreator,
) {
  return database
    .updateTable(table)
    .set({
      amazon_id,
      description,
      goodreads_id,
      image_id,
      name,
      sorting_key,
      url,
      wikipedia_url,
    })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function findCreatorByName(database: Database, name: string) {
  return database
    .selectFrom(table)
    .where((eb) => eb(lower(eb.ref("name")), "=", name.toLowerCase()))
    .selectAll()
    .executeTakeFirst();
}

/**
 * Find creators with similar names using pg_trgm fuzzy matching.
 *
 * Uses PostgreSQL's trigram similarity to find creators whose names are
 * similar to the input name. This helps detect duplicates like:
 * - "J.K. Rowling" vs "J. K. Rowling"
 * - "Tolkien, J.R.R." vs "J.R.R. Tolkien"
 *
 * @param database - Database connection
 * @param name - Creator name to match against
 * @param threshold - Minimum similarity score (0-1), default 0.7
 * @returns Array of creators with similarity scores, ordered by similarity (highest first)
 */
export async function findSimilarCreators(
  database: Database,
  name: string,
  threshold: number = 0.7,
): Promise<Array<{ creator: Creator; similarity: number }>> {
  const normalizedName = name.toLowerCase().trim();

  const rows = await database
    .selectFrom(table)
    .selectAll()
    .select(
      sql<number>`COALESCE(similarity(lower(name), ${normalizedName}), 0)`.as(
        "similarity",
      ),
    )
    .where(
      sql<boolean>`similarity(lower(name), ${normalizedName}) >= ${threshold}`,
    )
    .orderBy(sql`similarity(lower(name), ${normalizedName})`, "desc")
    .execute();

  return rows.map((row) => {
    const { similarity, ...creator } = row;
    return {
      creator: creator as Creator,
      similarity,
    };
  });
}

export function createContribution(
  database: Database,
  creatorId: string,
  editionId: string,
  role: ContributionRole,
  essential = false,
) {
  return database
    .insertInto("contribution")
    .values({
      creator_id: creatorId,
      edition_id: editionId,
      role,
      essential,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function deleteCreator(database: Database, id: string) {
  return database.deleteFrom(table).where("id", "=", id).execute();
}

type _Table = Schema[typeof table];
export type Creator = Selectable<$Creator>;
