import type { ResolvedLanguage } from "./types.js";
import { ISO1_INDEX, ISO3_INDEX, LANGUAGES, NAME_INDEX } from "./generated/languages.js";

/**
 * Resolve a language code or name to a Language object.
 *
 * Handles:
 * - ISO 639-1 codes: "en", "de"
 * - ISO 639-3 codes: "eng", "deu"
 * - Regional variants (strips region): "en-US" → "eng"
 * - Language names (exact, case-insensitive): "English", "german"
 *
 * @param input - Language code or name to resolve
 * @returns ResolvedLanguage or null if not found
 *
 * @example
 * resolveLanguage("en")      // { iso3: "eng", iso1: "en", name: "English", ... }
 * resolveLanguage("eng")     // { iso3: "eng", iso1: "en", name: "English", ... }
 * resolveLanguage("en-US")   // { iso3: "eng", matchType: "regional", ... }
 * resolveLanguage("English") // { iso3: "eng", matchType: "name", ... }
 */
export function resolveLanguage(input: string): ResolvedLanguage | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  // Strip regional variant (en-US → en, en_US → en)
  const parts = trimmed.split(/[-_]/);
  const baseCode = parts[0].toLowerCase();
  const hasRegion = parts.length > 1;

  // Try ISO 639-3 (3-letter code)
  if (baseCode.length === 3) {
    const index = ISO3_INDEX.get(baseCode);
    if (index !== undefined) {
      return { ...LANGUAGES[index], input: trimmed, matchType: "iso3" };
    }
  }

  // Try ISO 639-1 (2-letter code)
  if (baseCode.length === 2) {
    const index = ISO1_INDEX.get(baseCode);
    if (index !== undefined) {
      const matchType = hasRegion ? "regional" : "iso1";
      return { ...LANGUAGES[index], input: trimmed, matchType };
    }
  }

  // Try name lookup (case-insensitive, exact match)
  const normalizedName = trimmed.toLowerCase();
  const nameIndex = NAME_INDEX.get(normalizedName);
  if (nameIndex !== undefined) {
    return { ...LANGUAGES[nameIndex], input: trimmed, matchType: "name" };
  }

  return null;
}

/**
 * Resolve multiple language inputs in bulk.
 *
 * Performance: O(n) for n inputs due to pre-built indexes.
 *
 * @param inputs - Array of language codes or names to resolve
 * @returns Map from input to resolved language (or null if not found)
 *
 * @example
 * const results = resolveLanguages(["en", "de", "invalid"]);
 * results.get("en")      // { iso3: "eng", ... }
 * results.get("invalid") // null
 */
export function resolveLanguages(inputs: readonly string[]): Map<string, ResolvedLanguage | null> {
  const results = new Map<string, ResolvedLanguage | null>();

  for (const input of inputs) {
    results.set(input, resolveLanguage(input));
  }

  return results;
}

/**
 * Check if a string is a valid ISO 639-1 or ISO 639-3 code.
 *
 * @param code - Code to validate (regional variants are stripped)
 * @returns true if the code is valid
 *
 * @example
 * isValidLanguageCode("en")    // true
 * isValidLanguageCode("eng")   // true
 * isValidLanguageCode("en-US") // true
 * isValidLanguageCode("xyz")   // false
 */
export function isValidLanguageCode(code: string): boolean {
  if (!code || typeof code !== "string") {
    return false;
  }

  const normalized = code.toLowerCase().split(/[-_]/)[0];
  return ISO3_INDEX.has(normalized) || ISO1_INDEX.has(normalized);
}
