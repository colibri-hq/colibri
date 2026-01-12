/**
 * Background job for indexing book content for full-text search.
 *
 * Extracts text chunks from ebook assets and stores them in the book_chunk table.
 * This enables searching within book content, not just metadata.
 */

import type { Kysely } from "kysely";
import type { Schema } from "../database.js";
import {
  insertChunks,
  deleteChunksByAsset,
  updateAssetIndexStatus,
  getUnindexedAssets,
} from "../resources/chunk.js";
import { extractChunks } from "../ebooks/extract-text.js";

/**
 * Result of indexing a single asset.
 */
export interface IndexAssetResult {
  assetId: string;
  success: boolean;
  chunksIndexed?: number;
  error?: string;
}

/**
 * Options for the indexing job.
 */
export interface IndexingOptions {
  /** Maximum number of assets to process in one batch */
  batchSize?: number;
  /** Callback for progress updates */
  onProgress?: (result: IndexAssetResult) => void;
}

/**
 * Index a single asset for full-text search.
 *
 * Extracts text content from the ebook file and stores searchable chunks
 * in the database. Updates the asset's indexing status on completion.
 *
 * @param database - Database connection
 * @param assetId - The asset ID to index
 * @param file - The ebook file to extract text from
 * @param mediaType - MIME type of the file
 * @param ftsConfig - PostgreSQL FTS config name (e.g., 'english', 'german', 'simple')
 * @returns Result of the indexing operation
 */
export async function indexAsset(
  database: Kysely<Schema>,
  assetId: string,
  file: File,
  mediaType: string,
  ftsConfig = "simple",
): Promise<IndexAssetResult> {
  try {
    // Delete any existing chunks for this asset (re-indexing)
    await deleteChunksByAsset(database, assetId);

    // Extract text chunks from the ebook
    const chunks = await extractChunks(file, mediaType);

    if (chunks.length === 0) {
      // No text content extracted - might be image-only PDF, etc.
      await updateAssetIndexStatus(database, assetId, { success: true });
      return {
        assetId,
        success: true,
        chunksIndexed: 0,
      };
    }

    // Insert chunks into the database with language-aware FTS config
    const inserted = await insertChunks(database, assetId, chunks, ftsConfig);

    // Mark asset as successfully indexed
    await updateAssetIndexStatus(database, assetId, { success: true });

    return {
      assetId,
      success: true,
      chunksIndexed: inserted,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error during indexing";

    // Record the error in the asset
    await updateAssetIndexStatus(database, assetId, {
      success: false,
      error: errorMessage,
    });

    return {
      assetId,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Process unindexed assets in batches.
 *
 * Fetches assets that haven't been indexed yet and processes them.
 * This is intended to be called periodically by a background worker
 * or triggered after imports.
 *
 * @param database - Database connection
 * @param fetchFile - Function to fetch the ebook file content by storage reference
 * @param options - Indexing options
 * @returns Array of results for each processed asset
 */
export async function processUnindexedAssets(
  database: Kysely<Schema>,
  fetchFile: (storageReference: string) => Promise<ArrayBuffer>,
  options: IndexingOptions = {},
): Promise<IndexAssetResult[]> {
  const { batchSize = 10, onProgress } = options;

  // Get assets that need indexing
  const assets = await getUnindexedAssets(database, batchSize);

  if (assets.length === 0) {
    return [];
  }

  const results: IndexAssetResult[] = [];

  for (const asset of assets) {
    try {
      // Fetch the file content from storage
      const buffer = await fetchFile(asset.storage_reference);
      const file = new File([buffer], "ebook", { type: asset.media_type });

      // Index the asset with language-aware FTS config
      const result = await indexAsset(
        database,
        asset.id,
        file,
        asset.media_type,
        asset.fts_config ?? "simple",
      );

      results.push(result);

      if (onProgress) {
        onProgress(result);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch file";

      const result: IndexAssetResult = {
        assetId: asset.id,
        success: false,
        error: errorMessage,
      };

      // Record the error
      await updateAssetIndexStatus(database, asset.id, {
        success: false,
        error: errorMessage,
      });

      results.push(result);

      if (onProgress) {
        onProgress(result);
      }
    }
  }

  return results;
}

/**
 * Re-index a specific asset.
 *
 * Useful when the asset content has changed or to fix indexing errors.
 *
 * @param database - Database connection
 * @param assetId - The asset ID to re-index
 * @param fetchFile - Function to fetch the ebook file content
 * @returns Result of the indexing operation
 */
export async function reindexAsset(
  database: Kysely<Schema>,
  assetId: string,
  fetchFile: (storageReference: string) => Promise<ArrayBuffer>,
): Promise<IndexAssetResult> {
  // Get asset info with language FTS config
  const asset = await database
    .selectFrom("asset")
    .innerJoin("edition", "edition.id", "asset.edition_id")
    .leftJoin("language", "language.iso_639_3", "edition.language")
    .select([
      "asset.id",
      "asset.storage_reference",
      "asset.media_type",
      "language.fts_config",
    ])
    .where("asset.id", "=", assetId)
    .executeTakeFirst();

  if (!asset) {
    return {
      assetId,
      success: false,
      error: "Asset not found",
    };
  }

  try {
    const buffer = await fetchFile(asset.storage_reference);
    const file = new File([buffer], "ebook", { type: asset.media_type });

    return indexAsset(
      database,
      assetId,
      file,
      asset.media_type,
      asset.fts_config ?? "simple",
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch file";

    return {
      assetId,
      success: false,
      error: errorMessage,
    };
  }
}
