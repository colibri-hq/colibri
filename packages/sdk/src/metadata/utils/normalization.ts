/**
 * Comprehensive mapping from ISO 639-2/B (3-letter), ISO 639-3, and language names
 * to ISO 639-1 (2-letter) codes.
 *
 * Includes:
 * - ISO 639-2/B bibliographic codes (eng, ger, fre)
 * - ISO 639-2/T terminological codes (deu, fra)
 * - ISO 639-3 codes where different
 * - Common language names in English and native scripts
 */
export const ISO_639_LANGUAGE_MAP: Record<string, string> = {
  // English
  eng: "en",
  english: "en",

  // German
  ger: "de",
  deu: "de",
  german: "de",
  deutsch: "de",

  // French
  fra: "fr",
  fre: "fr",
  french: "fr",
  "fran\u00e7ais": "fr",

  // Spanish
  spa: "es",
  spanish: "es",
  "espa\u00f1ol": "es",

  // Italian
  ita: "it",
  italian: "it",
  italiano: "it",

  // Portuguese
  por: "pt",
  portuguese: "pt",
  "portugu\u00eas": "pt",

  // Russian
  rus: "ru",
  russian: "ru",

  // Japanese
  jpn: "ja",
  japanese: "ja",

  // Chinese
  zho: "zh",
  chi: "zh",
  chinese: "zh",

  // Arabic
  ara: "ar",
  arabic: "ar",

  // Korean
  kor: "ko",
  korean: "ko",

  // Dutch
  nld: "nl",
  dut: "nl",
  dutch: "nl",

  // Polish
  pol: "pl",
  polish: "pl",

  // Swedish
  swe: "sv",
  swedish: "sv",

  // Norwegian
  nor: "no",
  norwegian: "no",

  // Danish
  dan: "da",
  danish: "da",

  // Finnish
  fin: "fi",
  finnish: "fi",

  // Turkish
  tur: "tr",
  turkish: "tr",

  // Hungarian
  hun: "hu",
  hungarian: "hu",

  // Czech
  ces: "cs",
  cze: "cs",
  czech: "cs",

  // Slovak
  slk: "sk",
  slo: "sk",
  slovak: "sk",

  // Romanian
  ron: "ro",
  rum: "ro",
  romanian: "ro",

  // Bulgarian
  bul: "bg",
  bulgarian: "bg",

  // Croatian
  hrv: "hr",
  croatian: "hr",

  // Serbian
  srp: "sr",
  serbian: "sr",

  // Ukrainian
  ukr: "uk",
  ukrainian: "uk",

  // Greek
  ell: "el",
  gre: "el",
  greek: "el",

  // Hebrew
  heb: "he",
  hebrew: "he",

  // Hindi
  hin: "hi",
  hindi: "hi",

  // Thai
  tha: "th",
  thai: "th",

  // Vietnamese
  vie: "vi",
  vietnamese: "vi",

  // Indonesian
  ind: "id",
  indonesian: "id",

  // Catalan
  cat: "ca",
  catalan: "ca",

  // Basque
  eus: "eu",
  baq: "eu",
  basque: "eu",

  // Galician
  glg: "gl",
  galician: "gl",

  // Welsh
  wel: "cy",
  cym: "cy",
  welsh: "cy",

  // Irish
  gle: "ga",
  irish: "ga",

  // Scottish Gaelic
  gla: "gd",

  // Latin
  lat: "la",
  latin: "la",

  // Special codes
  und: "", // Undetermined
  mul: "", // Multiple languages
  zxx: "", // No linguistic content
};

/**
 * Normalize a language code to ISO 639-1 (2-letter) format
 *
 * @param language - ISO 639-2/3 code, language name, or 2-letter code
 * @returns ISO 639-1 two-letter code, empty string for special codes, or original if unrecognized
 */
export function normalizeLanguageCode(language: string): string {
  if (!language) return "";

  const lower = language.toLowerCase().trim();

  // Already a 2-letter code
  if (lower.length === 2) return lower;

  // Look up in map
  const mapped = ISO_639_LANGUAGE_MAP[lower];
  if (mapped !== undefined) return mapped;

  // For unrecognized 3-letter codes, return as-is
  // (might be a valid ISO 639-2 code not in our map)
  if (lower.length === 3) return lower;

  // For longer strings (likely language names), return empty
  return "";
}

/**
 * Remove hyphens, spaces, and other formatting from an ISBN
 *
 * @param isbn - ISBN string with potential formatting
 * @returns Cleaned ISBN with only digits and X
 */
export function cleanIsbn(isbn: string): string {
  if (!isbn) return "";
  return isbn.replace(/[-\s]/g, "").toUpperCase();
}

/**
 * Validate ISBN-10 checksum
 */
export function isValidIsbn10(isbn: string): boolean {
  const cleaned = cleanIsbn(isbn);
  if (cleaned.length !== 10) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(cleaned[i], 10);
    if (isNaN(digit)) return false;
    sum += digit * (10 - i);
  }

  // Last digit can be X (representing 10)
  const lastChar = cleaned[9];
  const lastDigit = lastChar === "X" ? 10 : parseInt(lastChar, 10);
  if (isNaN(lastDigit) && lastChar !== "X") return false;
  sum += lastDigit;

  return sum % 11 === 0;
}

/**
 * Validate ISBN-13 checksum
 */
export function isValidIsbn13(isbn: string): boolean {
  const cleaned = cleanIsbn(isbn);
  if (cleaned.length !== 13) return false;

  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(cleaned[i], 10);
    if (isNaN(digit)) return false;
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  return sum % 10 === 0;
}

/**
 * Check if a string is a valid ISBN (10 or 13)
 *
 * @param isbn - ISBN string to validate
 * @returns true if valid ISBN-10 or ISBN-13
 */
export function isValidIsbn(isbn: string): boolean {
  const cleaned = cleanIsbn(isbn);
  if (cleaned.length === 10) return isValidIsbn10(cleaned);
  if (cleaned.length === 13) return isValidIsbn13(cleaned);
  return false;
}

/**
 * Convert ISBN-10 to ISBN-13
 *
 * @param isbn10 - Valid ISBN-10
 * @returns ISBN-13 equivalent
 */
export function isbn10To13(isbn10: string): string {
  const cleaned = cleanIsbn(isbn10);

  if (cleaned.length !== 10) {
    throw new Error(`Invalid ISBN-10 length: ${cleaned.length}`);
  }

  // ISBN-13 prefix for books is 978
  const isbn13Base = "978" + cleaned.slice(0, 9);

  // Calculate check digit
  let sum = 0;

  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn13Base[i], 10);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;

  return isbn13Base + checkDigit.toString();
}

/**
 * Normalize ISBN to ISBN-13 format with validation
 *
 * @param isbn - ISBN string (10 or 13)
 * @param convertTo13 - Whether to convert ISBN-10 to ISBN-13 (default: true)
 * @returns Normalized ISBN-13 or null if invalid
 */
export function normalizeIsbn(isbn: string, convertTo13: boolean = true): string | null {
  if (!isbn) return null;

  const cleaned = cleanIsbn(isbn);

  if (cleaned.length === 10) {
    if (!isValidIsbn10(cleaned)) {
      return null;
    }
    return convertTo13 ? isbn10To13(cleaned) : cleaned;
  }

  if (cleaned.length === 13) {
    if (!isValidIsbn13(cleaned)) {
      return null;
    }
    return cleaned;
  }

  return null;
}

/**
 * Parsed author name structure
 */
export interface ParsedAuthorName {
  /** First name(s) or given name(s) */
  firstName?: string | undefined;
  /** Last name or family name */
  lastName: string | undefined;
  /** Suffix (Jr., Sr., III, etc.) */
  suffix?: string | undefined;
}

/**
 * Common title prefixes to remove from author names
 */
const TITLE_PREFIXES =
  /^\s*(dr|prof|professor|mr|mrs|ms|miss|sir|dame|lord|lady|rev|reverend|hon|honorable)\b\.?\s*/i;

/**
 * Common suffixes to extract from author names
 */
const NAME_SUFFIXES = /,?\s*\b(jr|sr|ii|iii|iv|v|phd|md|esq|d\.?d\.?s?)\b\.?\s*$/i;

/**
 * Life dates pattern to remove
 */
const LIFE_DATES = /,?\s*\(?\d{4}\s*-\s*\d{0,4}\)?\.?\s*$/;

/**
 * Normalize an author name for comparison and cache key generation
 *
 * - Converts to lowercase
 * - Removes titles (Dr., Prof., etc.)
 * - Removes suffixes (Jr., Sr., III, etc.)
 * - Removes life dates
 * - Normalizes "Last, First" to "first last" format
 * - Removes diacritics
 *
 * @param name - Author name in any format
 * @returns Normalized lowercase name
 */
export function normalizeAuthorName(name: string): string {
  if (!name) return "";

  let normalized = name
    .toLowerCase()
    // Normalize unicode
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    // Remove titles
    .replace(TITLE_PREFIXES, "")
    // Remove suffixes
    .replace(NAME_SUFFIXES, "")
    // Remove life dates
    .replace(LIFE_DATES, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Handle "Last, First" format - convert to "First Last"
  const commaCount = (normalized.match(/,/g) || []).length;
  if (commaCount === 1) {
    const parts = normalized.split(",").map((p) => p.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      normalized = `${parts[1]} ${parts[0]}`;
    }
  }

  // Remove any remaining punctuation
  normalized = normalized.replace(/[.,;:'"()[\]{}]/g, "").trim();

  return normalized;
}

/**
 * Parse an author name into structured parts
 *
 * @param name - Author name string
 * @returns Parsed name with firstName, lastName, and optional suffix
 */
export function parseAuthorName(name: string): ParsedAuthorName {
  if (!name) return { lastName: "" };

  let working = name.trim();
  let suffix: string | undefined;

  // Extract suffix
  const suffixMatch = working.match(NAME_SUFFIXES);
  if (suffixMatch) {
    suffix = suffixMatch[1].toUpperCase();
    working = working.replace(NAME_SUFFIXES, "").trim();
  }

  // Remove titles
  working = working.replace(TITLE_PREFIXES, "").trim();

  // Remove life dates
  working = working.replace(LIFE_DATES, "").trim();

  // Check for "Last, First" format
  if (working.includes(",")) {
    const parts = working.split(",").map((p) => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { firstName: parts[1], lastName: parts[0], suffix };
    }
  }

  // "First Last" or "First Middle Last" format
  const words = working.split(/\s+/);

  if (words.length === 1) {
    return { lastName: words[0], suffix };
  }

  // Last word is last name, everything else is first name
  const lastName = words[words.length - 1];
  const firstName = words.slice(0, -1).join(" ");

  return { firstName, lastName, suffix };
}

/**
 * Format a parsed author name back to a string
 *
 * @param parsed - Parsed author name
 * @param format - Output format: 'first-last' or 'last-first'
 * @returns Formatted name string
 */
export function formatAuthorName(
  parsed: ParsedAuthorName,
  format: "first-last" | "last-first" = "first-last",
): string | undefined {
  const { firstName, lastName, suffix } = parsed;

  let name =
    format === "first-last"
      ? firstName
        ? `${firstName} ${lastName}`
        : lastName
      : firstName
        ? `${lastName}, ${firstName}`
        : lastName;

  if (suffix) {
    name += `, ${suffix}`;
  }

  return name;
}

/**
 * Common leading articles to remove for sorting/comparison
 */
const LEADING_ARTICLES =
  /^(the|a|an|der|die|das|le|la|les|el|los|las|il|lo|gli|un|una|une|een|de|het)\s+/i;

/**
 * Normalize a title for comparison and cache key generation
 *
 * - Converts to lowercase
 * - Removes diacritics
 * - Normalizes whitespace
 * - Removes common punctuation
 * - Optionally removes leading articles
 *
 * @param title - Book title
 * @param removeArticles - Whether to remove leading articles (default: true)
 * @returns Normalized title
 */
export function normalizeTitle(title: string, removeArticles: boolean = true): string {
  if (!title) return "";

  let normalized = title
    .trim()
    .toLowerCase()
    // Normalize unicode (decompose)
    .normalize("NFD")
    // Remove diacritics (combining marks)
    .replace(/[\u0300-\u036f]/g, "")
    // Normalize to NFC
    .normalize("NFC")
    // Replace multiple whitespace with single space
    .replace(/\s+/g, " ")
    // Remove common punctuation that doesn't affect meaning
    .replace(/[.,;:!?'"()[\]{}\u00ab\u00bb\u201c\u201d\u2018\u2019]/g, "")
    .trim();

  if (removeArticles) {
    normalized = normalized.replace(LEADING_ARTICLES, "").trim();
  }

  return normalized;
}

/**
 * Corporate suffixes to remove from publisher names
 */
const CORPORATE_SUFFIXES =
  /,?\s*\b(inc|ltd|llc|llp|co|corp|corporation|company|publishing|publishers|books|press|verlag|editions|editore|editorial|gmbh|ag|sa|nv|bv|plc|pty)\b\.?\s*$/gi;

/**
 * Normalize a publisher name for comparison
 *
 * - Removes corporate suffixes (Inc., Ltd., Publishing, etc.)
 * - Normalizes "and" / "&"
 * - Removes diacritics
 *
 * @param publisher - Publisher name
 * @returns Normalized publisher name
 */
export function normalizePublisher(publisher: string): string {
  if (!publisher) return "";

  return (
    publisher
      .toLowerCase()
      // Normalize unicode
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .normalize("NFC")
      // Remove corporate suffixes (may need multiple passes)
      .replace(CORPORATE_SUFFIXES, "")
      .replace(CORPORATE_SUFFIXES, "")
      // Normalize "and" variations
      .replace(/\s+&\s+/g, " and ")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      // Remove punctuation
      .replace(/[.,;:'"()[\]{}]/g, "")
      .trim()
  );
}

/**
 * Normalize a DOI by removing the doi.org URL prefix if present
 *
 * @param doi - DOI string, potentially as URL
 * @returns Clean DOI identifier
 */
export function normalizeDoi(doi: string): string {
  if (!doi) return "";
  return doi.replace(/^https?:\/\/doi\.org\//i, "").trim();
}
