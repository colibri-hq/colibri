import type { Insertable, Selectable } from "kysely";
import { arrayBufferToHex, generateRandomString, hash, timingSafeEqual } from "@colibri-hq/shared";
import type { Database, Schema } from "../../database.js";
import {
  API_KEY_SCOPES,
  satisfiesScope,
  satisfiesAllScopes as checkAllScopes,
  satisfiesAnyScope as checkAnyScopes,
  type ScopeName,
  type ApiKeyScope,
} from "../../scopes/index.js";

const table = "authentication.api_key" as const;

export const API_KEY_PREFIX = "col_";
export const API_KEY_LENGTH = 32;
export const ROTATION_GRACE_PERIOD_MS = 15 * 60 * 1_000;

// Re-export for backwards compatibility
export { API_KEY_SCOPES, type ApiKeyScope };

type Table = Schema[typeof table];
type SelectableApiKey = Selectable<Table>;
export type ApiKey = Omit<
  SelectableApiKey,
  "created_at" | "rotated_at" | "last_used_at" | "expires_at" | "revoked_at"
> & {
  created_at: string | Date;
  rotated_at: string | Date | null;
  last_used_at: string | Date | null;
  expires_at: string | Date | null;
  revoked_at: string | Date | null;
};
export type InsertableApiKey = Insertable<Table>;

// region CRUD Operations

/**
 * Create a new API key for a user.
 * Returns both the database record and the plain text key (shown once).
 */
export async function createApiKey(
  database: Database,
  userId: string,
  name: string,
  options: { scopes?: ApiKeyScope[]; expiresAt?: Date | null } = {},
): Promise<{ apiKey: ApiKey; plainTextKey: string }> {
  const plainTextKey = generateApiKey();
  const keyHash = await hashApiKey(plainTextKey);
  const keyPrefix = extractKeyPrefix(plainTextKey);

  const apiKey = await database
    .insertInto(table)
    .values({
      user_id: userId,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes: options.scopes ?? [...API_KEY_SCOPES], // All scopes by default
      expires_at: options.expiresAt ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return { apiKey: apiKey as ApiKey, plainTextKey };
}

/**
 * List all active API keys for a user.
 * Excludes revoked and rotated keys.
 * Does not include the plain text key (it's never stored).
 */
export function listApiKeysForUser(database: Database, userId: string) {
  return database
    .selectFrom(table)
    .selectAll()
    .where("user_id", "=", userId)
    .where("revoked_at", "is", null)
    .where("rotated_at", "is", null)
    .orderBy("created_at", "desc")
    .execute();
}

/**
 * Find an API key by its ID.
 */
export function findApiKeyById(database: Database, id: string) {
  return database.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirstOrThrow();
}

/**
 * Find a non-revoked API key by its prefix.
 */
export function findApiKeyByPrefix(database: Database, prefix: string) {
  return database
    .selectFrom(table)
    .selectAll()
    .where("key_prefix", "=", prefix)
    .where("revoked_at", "is", null)
    .executeTakeFirst();
}

/**
 * Validate an API key and return the key record if valid.
 * Checks:
 * - Key exists and is not revoked
 * - Key is not expired
 * - Key hash matches
 * - Rotation grace period (allows old rotated keys for 15 minutes)
 */
export async function validateApiKey(database: Database, key: string): Promise<ApiKey | null> {
  // Basic format check
  if (!key.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const prefix = extractKeyPrefix(key);
  const now = new Date();
  const gracePeriodCutoff = new Date(now.getTime() - ROTATION_GRACE_PERIOD_MS);

  // Single query: find all valid candidates
  // - Not revoked
  // - Either: active (not rotated) OR rotated within grace period
  const candidates = await database
    .selectFrom(table)
    .selectAll()
    .where("key_prefix", "=", prefix)
    .where("revoked_at", "is", null)
    .where((eb) =>
      eb.or([
        // Active keys (not rotated)
        eb("rotated_at", "is", null),
        // Rotated keys still in grace period
        eb("rotated_at", ">", gracePeriodCutoff),
      ]),
    )
    .execute();

  for (const candidate of candidates) {
    // Check if key is expired
    if (candidate.expires_at && new Date(candidate.expires_at) <= now) {
      continue;
    }

    // Verify the key hash
    if (await verifyApiKey(key, candidate.key_hash)) {
      return candidate as ApiKey;
    }
  }

  return null;
}

/**
 * Update the last used timestamp and IP for an API key.
 */
export function updateApiKeyLastUsed(database: Database, id: string, ip?: string | null) {
  return database
    .updateTable(table)
    .set({ last_used_at: new Date(), last_used_ip: ip ?? null })
    .where("id", "=", id)
    .execute();
}

/**
 * Revoke an API key immediately.
 */
export function revokeApiKey(database: Database, id: string, userId: string) {
  return database
    .updateTable(table)
    .set({ revoked_at: new Date() })
    .where("id", "=", id)
    .where("user_id", "=", userId)
    .where("revoked_at", "is", null)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Rotate an API key - creates a new key, marks old key as rotated.
 * The old key will continue to work for 15 minutes (grace period).
 * Returns the new key record and plain text key.
 */
export async function rotateApiKey(
  database: Database,
  id: string,
  userId: string,
): Promise<{ apiKey: ApiKey; plainTextKey: string }> {
  return database.transaction().execute(async (trx) => {
    // Get old key info
    const oldKey = await trx
      .selectFrom(table)
      .selectAll()
      .where("id", "=", id)
      .where("user_id", "=", userId)
      .where("revoked_at", "is", null)
      .executeTakeFirstOrThrow();

    // Mark old key as rotated (it will work for 15 more minutes)
    await trx.updateTable(table).set({ rotated_at: new Date() }).where("id", "=", id).execute();

    // Create new key
    const plainTextKey = generateApiKey();
    const keyHash = await hashApiKey(plainTextKey);
    const keyPrefix = extractKeyPrefix(plainTextKey);

    const apiKey = await trx
      .insertInto(table)
      .values({
        user_id: userId,
        name: oldKey.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes: oldKey.scopes,
        expires_at: oldKey.expires_at,
        rotated_from_id: id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { apiKey: apiKey as ApiKey, plainTextKey };
  });
}

/**
 * Cleanup rotated keys that have passed the grace period.
 * Should be run periodically (e.g., via a cron job).
 */
export function cleanupRotatedKeys(database: Database) {
  const gracePeriodCutoff = new Date(Date.now() - ROTATION_GRACE_PERIOD_MS);

  return database
    .updateTable(table)
    .set({ revoked_at: new Date() })
    .where("rotated_at", "is not", null)
    .where("rotated_at", "<", gracePeriodCutoff)
    .where("revoked_at", "is", null)
    .execute();
}

// endregion

// region Scope Helpers

/**
 * Check if an API key has a required scope.
 * Uses hierarchical scope expansion (e.g., admin implies all scopes).
 */
export function hasScope(apiKey: ApiKey, requiredScope: ScopeName): boolean {
  return satisfiesScope(apiKey.scopes, requiredScope);
}

/**
 * Check if an API key has any of the required scopes.
 * Uses hierarchical scope expansion.
 */
export function hasAnyScope(apiKey: ApiKey, requiredScopes: ScopeName[]): boolean {
  return checkAnyScopes(apiKey.scopes, requiredScopes);
}

/**
 * Check if an API key has all of the required scopes.
 * Uses hierarchical scope expansion.
 */
export function hasAllScopes(apiKey: ApiKey, requiredScopes: ScopeName[]): boolean {
  return checkAllScopes(apiKey.scopes, requiredScopes);
}

// endregion

// region Key Generation

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Extract the prefix from an API key for identification.
 * Returns first 12 characters: "col_" + 8 chars
 */
export function extractKeyPrefix(key: string): string {
  return key.substring(0, API_KEY_PREFIX.length + 8);
}

/**
 * Generate a cryptographically secure API key.
 */
function generateApiKey() {
  return API_KEY_PREFIX + generateRandomString(API_KEY_LENGTH - API_KEY_PREFIX.length, alphabet);
}

/**
 * Hash an API key using SHA-256.
 * Returns hex-encoded hash string.
 */
async function hashApiKey(key: string) {
  const hashBuffer = await hash(key, "SHA-256");

  return arrayBufferToHex(hashBuffer);
}

/**
 * Verify an API key against a stored hash using timing-safe comparison.
 */
export async function verifyApiKey(key: string, keyHash: string): Promise<boolean> {
  const computedHash = await hashApiKey(key);

  return timingSafeEqual(computedHash, keyHash);
}

// endregion
