/**
 * Cache key normalization utilities
 *
 * This module provides consistent cache key generation across all providers,
 * ensuring that equivalent queries produce the same cache key regardless of
 * formatting differences (case, whitespace, diacritics, etc.).
 */

// Re-export normalization functions from shared utilities
export {
  normalizeTitle,
  normalizeAuthorName as normalizeAuthor,
  normalizePublisher,
  normalizeLanguageCode as normalizeLanguage,
  normalizeIsbn as normalizeISBN,
} from "./utils/normalization.js";

/**
 * Cache key generation options
 */
export interface CacheKeyOptions {
  /** Prefix for the cache key (e.g., provider name) */
  prefix?: string;
  /** Whether to normalize ISBNs to ISBN-13 */
  normalizeIsbn13?: boolean;
}

// Import the functions for internal use in generateCacheKey
import {
  normalizeAuthorName,
  normalizeIsbn,
  normalizeLanguageCode,
  normalizePublisher,
  normalizeTitle,
} from "./utils/normalization.js";

/**
 * Generate a cache key from search parameters
 *
 * Creates a consistent, normalized cache key for any combination
 * of search parameters, ensuring equivalent queries produce the
 * same key.
 *
 * @param operation - The operation type (e.g., "searchByTitle", "searchByISBN")
 * @param params - Search parameters to include in the key
 * @param options - Cache key generation options
 * @returns Normalized cache key string
 */
export function generateCacheKey(
  operation: string,
  params: Record<string, unknown>,
  options: CacheKeyOptions = {},
): string {
  const { prefix = "", normalizeIsbn13 = true } = options;

  const normalizedParams: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    let normalizedValue: string;

    switch (key) {
      case "title":
        normalizedValue = normalizeTitle(String(value));
        break;
      case "isbn":
        normalizedValue = normalizeIsbn(String(value), normalizeIsbn13) ?? "";
        break;
      case "author":
      case "creator":
      case "name":
        normalizedValue = normalizeAuthorName(String(value));
        break;
      case "authors":
      case "creators":
        if (Array.isArray(value)) {
          normalizedValue = value.map((v) => normalizeAuthorName(String(v))).join(",");
        } else {
          normalizedValue = normalizeAuthorName(String(value));
        }
        break;
      case "publisher":
        normalizedValue = normalizePublisher(String(value));
        break;
      case "language":
        normalizedValue = normalizeLanguageCode(String(value));
        break;
      default:
        // For other parameters, just stringify and lowercase
        normalizedValue = String(value).toLowerCase().trim();
    }

    if (normalizedValue) {
      normalizedParams[key] = normalizedValue;
    }
  }

  // Sort keys for consistent ordering
  const sortedKeys = Object.keys(normalizedParams).sort();
  const paramString = sortedKeys.map((key) => `${key}:${normalizedParams[key]}`).join("|");

  const baseKey = `${operation}|${paramString}`;

  return prefix ? `${prefix}:${baseKey}` : baseKey;
}

/**
 * Create a cache key generator for a specific provider
 *
 * @param providerName - The provider name to use as prefix
 * @returns A function that generates cache keys with the provider prefix
 */
export function createProviderCacheKeyGenerator(providerName: string) {
  return (
    operation: string,
    params: Record<string, unknown>,
    options: Omit<CacheKeyOptions, "prefix"> = {},
  ): string => {
    return generateCacheKey(operation, params, { ...options, prefix: providerName.toLowerCase() });
  };
}
