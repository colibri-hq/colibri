/**
 * Book chunk resource for full-text search.
 *
 * Provides operations for storing and querying searchable text chunks
 * extracted from ebook assets.
 */

import { sql, type Kysely } from "kysely";
import type { Schema } from "../database.js";
import type { SourcePointer, TextChunk } from "../ebooks/extract-text.js";

/**
 * Batch insert chunks for an asset.
 *
 * @param database - Database connection
 * @param assetId - The asset ID to associate chunks with
 * @param chunks - Array of text chunks to insert
 * @param ftsConfig - PostgreSQL FTS config name (e.g., 'english', 'german', 'simple')
 * @returns Number of chunks inserted
 */
export async function insertChunks(
  database: Kysely<Schema>,
  assetId: bigint | string,
  chunks: TextChunk[],
  ftsConfig = "simple",
): Promise<number> {
  if (chunks.length === 0) {
    return 0;
  }

  const values = chunks.map((chunk) => ({
    asset_id: BigInt(assetId),
    content: chunk.content,
    source_pointer: JSON.stringify(chunk.sourcePointer),
    chunk_index: chunk.chunkIndex,
    fts_config: ftsConfig,
  }));

  // Insert in batches to avoid query size limits
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    await database.insertInto("book_chunk").values(batch).execute();
    inserted += batch.length;
  }

  return inserted;
}

/**
 * Delete all chunks for an asset.
 *
 * @param database - Database connection
 * @param assetId - The asset ID to delete chunks for
 * @returns Number of chunks deleted
 */
export async function deleteChunksByAsset(
  database: Kysely<Schema>,
  assetId: bigint | string,
): Promise<number> {
  const result = await database
    .deleteFrom("book_chunk")
    .where("asset_id", "=", assetId.toString())
    .executeTakeFirst();

  return Number(result.numDeletedRows);
}

/**
 * Get chunk count for an asset.
 *
 * @param database - Database connection
 * @param assetId - The asset ID to count chunks for
 * @returns Number of chunks
 */
export async function countChunksByAsset(
  database: Kysely<Schema>,
  assetId: bigint | string,
): Promise<number> {
  const result = await database
    .selectFrom("book_chunk")
    .select(({ fn }) => fn.count<number>("id").as("count"))
    .where("asset_id", "=", assetId.toString())
    .executeTakeFirst();

  return result?.count ?? 0;
}

/**
 * Update asset search indexing status.
 *
 * @param database - Database connection
 * @param assetId - The asset ID to update
 * @param status - Success (timestamp) or error message
 */
export async function updateAssetIndexStatus(
  database: Kysely<Schema>,
  assetId: bigint | string,
  status: { success: true } | { success: false; error: string },
): Promise<void> {
  if (status.success) {
    await database
      .updateTable("asset")
      .set({ search_indexed_at: sql`now()`, search_index_error: null })
      .where("id", "=", assetId.toString())
      .execute();
  } else {
    await database
      .updateTable("asset")
      .set({ search_indexed_at: null, search_index_error: status.error })
      .where("id", "=", assetId.toString())
      .execute();
  }
}

/**
 * Get assets that need indexing.
 *
 * Returns assets that:
 * - Have not been indexed yet (search_indexed_at is null)
 * - Have no indexing error (search_index_error is null)
 *
 * Includes the FTS config from the edition's language for language-aware indexing.
 *
 * @param database - Database connection
 * @param limit - Maximum number of assets to return
 * @returns Array of asset info for indexing
 */
export async function getUnindexedAssets(
  database: Kysely<Schema>,
  limit = 100,
): Promise<
  { id: string; storage_reference: string; media_type: string; fts_config: string | null }[]
> {
  return database
    .selectFrom("asset")
    .innerJoin("edition", "edition.id", "asset.edition_id")
    .leftJoin("language", "language.iso_639_3", "edition.language")
    .select(["asset.id", "asset.storage_reference", "asset.media_type", "language.fts_config"])
    .where("asset.search_indexed_at", "is", null)
    .where("asset.search_index_error", "is", null)
    .limit(limit)
    .execute();
}

/**
 * Re-export source pointer type for consumers.
 */
export type { SourcePointer, TextChunk };
