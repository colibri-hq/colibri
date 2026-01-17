import type { Language } from "./types.js";
import { ISO1_INDEX, ISO3_INDEX, LANGUAGES, NAME_INDEX } from "./generated/languages.js";

/**
 * Get a language by its ISO 639-3 code.
 *
 * @param code - 3-letter ISO 639-3 code (case-insensitive)
 * @returns The language record or null if not found
 */
export function getLanguageByIso3(code: string): Language | null {
  const index = ISO3_INDEX.get(code.toLowerCase());
  return index !== undefined ? LANGUAGES[index] : null;
}

/**
 * Get a language by its ISO 639-1 code.
 *
 * @param code - 2-letter ISO 639-1 code (case-insensitive)
 * @returns The language record or null if not found
 */
export function getLanguageByIso1(code: string): Language | null {
  const index = ISO1_INDEX.get(code.toLowerCase());
  return index !== undefined ? LANGUAGES[index] : null;
}

/**
 * Get a language by its name.
 *
 * @param name - Language name (case-insensitive, exact match)
 * @returns The language record or null if not found
 */
export function getLanguageByName(name: string): Language | null {
  const index = NAME_INDEX.get(name.toLowerCase());
  return index !== undefined ? LANGUAGES[index] : null;
}

/**
 * Get all languages from the ISO 639-3 standard.
 *
 * @returns Readonly array of all language records (~7,900 entries)
 */
export function getAllLanguages(): readonly Language[] {
  return LANGUAGES;
}

/**
 * Get the total number of languages in the dataset.
 *
 * @returns Number of languages
 */
export function getLanguageCount(): number {
  return LANGUAGES.length;
}
