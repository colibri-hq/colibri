import type { Database } from "../database.js";
import type { ExtractedMetadata, DuplicateCheckResult } from "../ingestion/types.js";

const table = "pending_ingestion" as const;

/**
 * Data required to create a pending ingestion record
 */
export interface CreatePendingIngestionData {
  userId: string;
  uploadId: string;
  s3Key: string;
  checksum: Uint8Array;
  extractedMetadata: ExtractedMetadata;
  duplicateInfo: DuplicateCheckResult;
}

/**
 * Create a pending ingestion record for duplicate confirmation
 *
 * @param database - Database connection
 * @param data - Pending ingestion data
 * @returns The created pending ingestion record with ID
 */
export async function createPendingIngestion(database: Database, data: CreatePendingIngestionData) {
  // Convert checksum from Uint8Array to hex string
  const checksumHex = Array.from(data.checksum)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const result = await database
    .insertInto(table)
    .values({
      user_id: data.userId,
      upload_id: data.uploadId,
      s3_key: data.s3Key,
      checksum: checksumHex,
      extracted_metadata: data.extractedMetadata as any,
      duplicate_info: data.duplicateInfo as any,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return {
    id: result.id,
    userId: result.user_id.toString(),
    uploadId: result.upload_id,
    s3Key: result.s3_key,
    checksum: hexToUint8Array(result.checksum),
    extractedMetadata: result.extracted_metadata as unknown as ExtractedMetadata,
    duplicateInfo: result.duplicate_info as unknown as DuplicateCheckResult,
    createdAt: result.created_at,
    expiresAt: result.expires_at,
  };
}

/**
 * Retrieve a pending ingestion record by ID
 *
 * @param database - Database connection
 * @param id - Pending ingestion ID (UUID)
 * @returns The pending ingestion record or undefined if not found
 */
export async function getPendingIngestion(database: Database, id: string) {
  const result = await database
    .selectFrom(table)
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  if (!result) {
    return undefined;
  }

  return {
    id: result.id,
    userId: result.user_id.toString(),
    uploadId: result.upload_id,
    s3Key: result.s3_key,
    checksum: hexToUint8Array(result.checksum),
    extractedMetadata: result.extracted_metadata as unknown as ExtractedMetadata,
    duplicateInfo: result.duplicate_info as unknown as DuplicateCheckResult,
    createdAt: result.created_at,
    expiresAt: result.expires_at,
  };
}

/**
 * Delete a pending ingestion record by ID
 *
 * @param database - Database connection
 * @param id - Pending ingestion ID (UUID)
 * @returns True if deleted, false if not found
 */
export async function deletePendingIngestion(database: Database, id: string): Promise<boolean> {
  const result = await database.deleteFrom(table).where("id", "=", id).executeTakeFirst();

  return result.numDeletedRows > 0;
}

/**
 * Delete all expired pending ingestion records
 *
 * @param database - Database connection
 * @returns Number of records deleted
 */
export async function deleteExpiredIngestions(database: Database): Promise<number> {
  const result = await database
    .deleteFrom(table)
    .where("expires_at", "<", new Date())
    .executeTakeFirst();

  return Number(result.numDeletedRows ?? 0);
}

/**
 * Get all pending ingestions for a user
 *
 * @param database - Database connection
 * @param userId - User ID
 * @returns Array of pending ingestions
 */
export async function getPendingIngestionsForUser(database: Database, userId: string) {
  const results = await database
    .selectFrom(table)
    .selectAll()
    .where("user_id", "=", userId)
    .where("expires_at", ">", new Date())
    .orderBy("created_at", "desc")
    .execute();

  return results.map((result) => ({
    id: result.id,
    userId: result.user_id.toString(),
    uploadId: result.upload_id,
    s3Key: result.s3_key,
    checksum: hexToUint8Array(result.checksum),
    extractedMetadata: result.extracted_metadata as unknown as ExtractedMetadata,
    duplicateInfo: result.duplicate_info as unknown as DuplicateCheckResult,
    createdAt: result.created_at,
    expiresAt: result.expires_at,
  }));
}

/**
 * Helper function to convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Return type for pending ingestion record
 */
export interface PendingIngestion {
  id: string;
  userId: string;
  uploadId: string;
  s3Key: string;
  checksum: Uint8Array;
  extractedMetadata: ExtractedMetadata;
  duplicateInfo: DuplicateCheckResult;
  createdAt: Date;
  expiresAt: Date;
}
