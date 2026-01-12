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
 * Table configuration for FTS searches.
 * Maps search type to table name and column names.
 */
const searchTableConfig = {
  edition: { table: "edition", nameCol: "title", descCol: "synopsis" },
  creator: { table: "creator", nameCol: "name", descCol: "description" },
  publisher: { table: "publisher", nameCol: "name", descCol: "description" },
  collection: { table: "collection", nameCol: "name", descCol: "description" },
} as const;

/**
 * Generic FTS search for any entity type with search_vector column.
 */
async function searchTable(
  database: Database,
  type: SearchType,
  tsQuery: string,
  limit: number,
): Promise<SearchResult[]> {
  const config = searchTableConfig[type];
  const { table, nameCol, descCol } = config;

  const results = await database
    .selectFrom(table)
    .select([
      sql<string>`${sql.lit(type)}`.as("type"),
      sql<string>`${sql.ref(table)}.id::text`.as("id"),
      sql<string>`${sql.ref(`${table}.${nameCol}`)}`.as("name"),
      sql<string | null>`${sql.ref(`${table}.${descCol}`)}`.as("description"),
      sql<number>`ts_rank(${sql.ref(table)}.search_vector, to_tsquery('simple', ${tsQuery}))`.as(
        "rank",
      ),
    ])
    .where(
      sql<boolean>`${sql.ref(table)}.search_vector @@ to_tsquery('simple', ${tsQuery})`,
    )
    .orderBy("rank", "desc")
    .limit(limit)
    .execute();

  return results.map((r) => ({
    type,
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
  const { types = [...searchTypes], limit = 20 } = options;

  const tsQuery = toTsQuery(query);
  if (!tsQuery) {
    return [];
  }

  // Run searches in parallel for better performance
  const searches = types.map((type) =>
    searchTable(database, type, tsQuery, limit),
  );
  const searchResults = await Promise.all(searches);

  // Flatten, sort by rank, and limit
  return searchResults
    .flat()
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);
}

// endregion

// region Content Search Types

/**
 * A matched chunk from content search.
 */
export type ContentChunkMatch = {
  /** ID of the chunk */
  chunkId: string;
  /** Plain text content of the chunk */
  content: string;
  /** Highlighted snippet with search terms marked */
  headline: string;
  /** Source pointer for deep linking to the ebook position (optional as JSONB can be null) */
  sourcePointer?: unknown;
  /** Relevance rank from ts_rank */
  rank: number;
};

/**
 * A work result from content search, grouping all matched chunks.
 */
export type ContentSearchResult = {
  /** Work ID */
  workId: string;
  /** Edition ID (main edition) */
  editionId: string;
  /** Asset ID containing the matched content */
  assetId: string;
  /** Book title */
  title: string;
  /** Number of matching chunks in this work */
  matchCount: number;
  /** The matched chunks, sorted by relevance */
  chunks: ContentChunkMatch[];
};

export type ContentSearchOptions = {
  /** Maximum number of works to return */
  limit?: number;
  /** Maximum chunks per work */
  chunksPerWork?: number;
};

// endregion

// region Content Search

/**
 * Search within book content using full-text search.
 *
 * Searches the book_chunk table for matching text and groups results by work.
 * Returns highlighted snippets with the search terms marked.
 *
 * @param database - The Kysely database instance
 * @param query - The raw search query from the user
 * @param options - Search options
 * @returns Array of works with matched content chunks
 */
export async function searchContent(
  database: Database,
  query: string,
  options: ContentSearchOptions = {},
): Promise<ContentSearchResult[]> {
  const { limit = 20, chunksPerWork = 5 } = options;

  const tsQuery = toTsQuery(query);
  if (!tsQuery) {
    return [];
  }

  // Search chunks with FTS, joining to get work info
  // Uses language-aware FTS config from book_chunk.fts_config
  const results = await database
    .selectFrom("book_chunk")
    .innerJoin("asset", "asset.id", "book_chunk.asset_id")
    .innerJoin("edition", "edition.id", "asset.edition_id")
    .innerJoin("work", "work.id", "edition.work_id")
    .select([
      sql<string>`book_chunk.id::text`.as("chunkId"),
      "book_chunk.content",
      "book_chunk.source_pointer as sourcePointer",
      sql<string>`asset.id::text`.as("assetId"),
      sql<string>`edition.id::text`.as("editionId"),
      "edition.title",
      sql<string>`work.id::text`.as("workId"),
      sql<number>`ts_rank(book_chunk.search_vector, to_tsquery(text_to_regconfig(book_chunk.fts_config), ${tsQuery}))`.as(
        "rank",
      ),
      sql<string>`ts_headline(text_to_regconfig(book_chunk.fts_config), book_chunk.content, to_tsquery(text_to_regconfig(book_chunk.fts_config), ${tsQuery}), 'MaxWords=35, MinWords=15, StartSel=<mark>, StopSel=</mark>')`.as(
        "headline",
      ),
    ])
    .where(
      sql<boolean>`book_chunk.search_vector @@ to_tsquery(text_to_regconfig(book_chunk.fts_config), ${tsQuery})`,
    )
    .orderBy("rank", "desc")
    .limit(limit * chunksPerWork * 2) // Get more to allow grouping
    .execute();

  // Group results by work
  const workMap = new Map<string, ContentSearchResult>();

  for (const row of results) {
    let work = workMap.get(row.workId);

    if (!work) {
      work = {
        workId: row.workId,
        editionId: row.editionId,
        assetId: row.assetId,
        title: row.title,
        matchCount: 0,
        chunks: [],
      };
      workMap.set(row.workId, work);
    }

    work.matchCount++;

    // Only keep top N chunks per work
    if (work.chunks.length < chunksPerWork) {
      work.chunks.push({
        chunkId: row.chunkId,
        content: row.content,
        headline: row.headline,
        sourcePointer: row.sourcePointer,
        rank: row.rank,
      });
    }
  }

  // Convert map to array, sort by best chunk rank, and limit
  return Array.from(workMap.values())
    .sort((a, b) => (b.chunks[0]?.rank ?? 0) - (a.chunks[0]?.rank ?? 0))
    .slice(0, limit);
}

// endregion
