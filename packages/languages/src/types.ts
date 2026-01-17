/**
 * Language type classification per ISO 639-3.
 */
export type LanguageType = "living" | "historical" | "extinct" | "constructed" | "special";

/**
 * A language record from the ISO 639-3 standard.
 */
export interface Language {
  /** ISO 639-3 code (3 characters, primary identifier) */
  readonly iso3: string;
  /** ISO 639-1 code (2 characters), null if not assigned */
  readonly iso1: string | null;
  /** Language type classification */
  readonly type: LanguageType;
  /** Reference name from ISO 639-3 */
  readonly name: string;
  /** PostgreSQL full-text search configuration name (e.g., 'english', 'german', 'simple') */
  readonly ftsConfig: string;
}

/**
 * The method used to resolve a language input.
 */
export type MatchType = "iso3" | "iso1" | "name" | "regional";

/**
 * A resolved language with information about how it was matched.
 */
export interface ResolvedLanguage extends Language {
  /** The original input that was resolved */
  readonly input: string;
  /** How the resolution was made */
  readonly matchType: MatchType;
}
