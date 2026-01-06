import { sql } from "kysely";
import type { Database } from "../database.js";

// region Types

export const searchTypes = [
  "edition",
  "creator",
  "publisher",
  "collection",
] as const;
export type SearchType = (typeof searchTypes)[number];

export type SearchResult = {
  type: SearchType;
  id: string;
  name: string;
  description: string | null;
  rank: number;
};

export type SearchOptions = {
  types?: SearchType[];
  limit?: number;
};

// endregion

// region Query Conversion

/**
 * Convert a search query to a tsquery-compatible format.
 * Splits on whitespace and joins with & (AND) operator.
 * Each term is suffixed with :* for prefix matching.
 *
 * @param query - The raw search query from the user
 * @returns A PostgreSQL tsquery-compatible string, or empty string if no valid terms
 *
 * @example
 * toTsQuery("fantasy") // "fantasy:*"
 * toTsQuery("epic fantasy") // "epic:* & fantasy:*"
 * toTsQuery("don't") // "dont:*"
 * toTsQuery("") // ""
 */
export function toTsQuery(query: string): string {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 0)
    .map((term) => term.replace(/[^\w]/g, "")) // Remove special characters
    .filter((term) => term.length > 0);

  if (terms.length === 0) return "";

  // Join with & for AND semantics, use :* for prefix matching
  return terms.map((term) => `${term}:*`).join(" & ");
}

// endregion

// region Individual Search Functions

/**
 * Search editions by title and synopsis using full-text search.
 */
export async function searchEditions(
  database: Database,
  tsQuery: string,
  limit: number,
): Promise<SearchResult[]> {
  const results = await database
    .selectFrom("edition")
    .select([
      sql<string>`'edition'`.as("type"),
      sql<string>`edition.id::text`.as("id"),
      "edition.title as name",
      "edition.synopsis as description",
      sql<number>`ts_rank(edition.search_vector, to_tsquery('simple', ${tsQuery}))`.as(
        "rank",
      ),
    ])
    .where(
      sql<boolean>`edition.search_vector @@ to_tsquery('simple', ${tsQuery})`,
    )
    .orderBy("rank", "desc")
    .limit(limit)
    .execute();

  return results.map((r) => ({
    type: "edition" as const,
    id: r.id,
    name: r.name,
    description: r.description,
    rank: r.rank,
  }));
}

/**
 * Search creators by name and description using full-text search.
 */
export async function searchCreators(
  database: Database,
  tsQuery: string,
  limit: number,
): Promise<SearchResult[]> {
  const results = await database
    .selectFrom("creator")
    .select([
      sql<string>`'creator'`.as("type"),
      sql<string>`creator.id::text`.as("id"),
      "creator.name as name",
      "creator.description as description",
      sql<number>`ts_rank(creator.search_vector, to_tsquery('simple', ${tsQuery}))`.as(
        "rank",
      ),
    ])
    .where(
      sql<boolean>`creator.search_vector @@ to_tsquery('simple', ${tsQuery})`,
    )
    .orderBy("rank", "desc")
    .limit(limit)
    .execute();

  return results.map((r) => ({
    type: "creator" as const,
    id: r.id,
    name: r.name,
    description: r.description,
    rank: r.rank,
  }));
}

/**
 * Search publishers by name and description using full-text search.
 */
export async function searchPublishers(
  database: Database,
  tsQuery: string,
  limit: number,
): Promise<SearchResult[]> {
  const results = await database
    .selectFrom("publisher")
    .select([
      sql<string>`'publisher'`.as("type"),
      sql<string>`publisher.id::text`.as("id"),
      "publisher.name as name",
      "publisher.description as description",
      sql<number>`ts_rank(publisher.search_vector, to_tsquery('simple', ${tsQuery}))`.as(
        "rank",
      ),
    ])
    .where(
      sql<boolean>`publisher.search_vector @@ to_tsquery('simple', ${tsQuery})`,
    )
    .orderBy("rank", "desc")
    .limit(limit)
    .execute();

  return results.map((r) => ({
    type: "publisher" as const,
    id: r.id,
    name: r.name,
    description: r.description,
    rank: r.rank,
  }));
}

/**
 * Search collections by name and description using full-text search.
 */
export async function searchCollections(
  database: Database,
  tsQuery: string,
  limit: number,
): Promise<SearchResult[]> {
  const results = await database
    .selectFrom("collection")
    .select([
      sql<string>`'collection'`.as("type"),
      sql<string>`collection.id::text`.as("id"),
      "collection.name as name",
      "collection.description as description",
      sql<number>`ts_rank(collection.search_vector, to_tsquery('simple', ${tsQuery}))`.as(
        "rank",
      ),
    ])
    .where(
      sql<boolean>`collection.search_vector @@ to_tsquery('simple', ${tsQuery})`,
    )
    .orderBy("rank", "desc")
    .limit(limit)
    .execute();

  return results.map((r) => ({
    type: "collection" as const,
    id: r.id,
    name: r.name,
    description: r.description,
    rank: r.rank,
  }));
}

// endregion

// region Unified Search

/**
 * Search across all entity types (editions, creators, publishers, collections).
 * Results are combined and sorted by relevance rank.
 *
 * @param database - The Kysely database instance
 * @param query - The raw search query from the user
 * @param options - Search options including types to search and result limit
 * @returns Combined search results sorted by rank
 */
export async function searchAll(
  database: Database,
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const { types = searchTypes as unknown as SearchType[], limit = 20 } =
    options;

  const tsQuery = toTsQuery(query);
  if (!tsQuery) {
    return [];
  }

  const results: SearchResult[] = [];

  // Run searches in parallel for better performance
  const searches: Promise<SearchResult[]>[] = [];

  if (types.includes("edition")) {
    searches.push(searchEditions(database, tsQuery, limit));
  }
  if (types.includes("creator")) {
    searches.push(searchCreators(database, tsQuery, limit));
  }
  if (types.includes("publisher")) {
    searches.push(searchPublishers(database, tsQuery, limit));
  }
  if (types.includes("collection")) {
    searches.push(searchCollections(database, tsQuery, limit));
  }

  const searchResults = await Promise.all(searches);
  for (const resultSet of searchResults) {
    results.push(...resultSet);
  }

  // Sort all results by rank and limit
  return results.sort((a, b) => b.rank - a.rank).slice(0, limit);
}

// endregion
