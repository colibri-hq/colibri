/**
 * Name normalization utilities for fuzzy matching of creators and publishers.
 *
 * These functions strip punctuation, titles, suffixes, and extra whitespace
 * to enable better duplicate detection during ingestion.
 */

/**
 * Normalize creator name for fuzzy matching
 *
 * Transformations:
 * - "Rowling, J.K." → "jk rowling"
 * - "J. K. Rowling" → "jk rowling"
 * - "Dr. John Smith Jr." → "john smith"
 * - "O'Brien, Sean" → "obrien sean"
 *
 * @param name - Creator name to normalize
 * @returns Normalized name for matching
 */
export function normalizeCreatorName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Normalize accented characters to ASCII
  normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Remove common titles (Dr., Prof., Sir, Dame, etc.)
  normalized = normalized.replace(
    /\b(dr|prof|professor|sir|dame|lord|lady|rev|reverend|father|mother|brother|sister|saint|st|pope)\b\.?\s*/g,
    "",
  );

  // Remove common suffixes (Jr., Sr., III, etc.) - more comprehensive Roman numerals
  normalized = normalized.replace(
    /\s*\b(jr|sr|junior|senior|i{1,3}|iv|v|vi{1,3}|ix|x{1,3}|xi{1,3}|xiv|xv|phd|md|esq|esquire)\b\.?\s*$/gi,
    "",
  );

  // Handle "Last, First" format - swap to "First Last"
  const commaMatch = normalized.match(/^([^,]+),\s*(.+)$/);
  if (commaMatch) {
    normalized = `${commaMatch[2]} ${commaMatch[1]}`;
  }

  // Remove all punctuation except hyphens in hyphenated names
  // First preserve hyphenated words by temporarily replacing hyphens
  normalized = normalized.replace(/([a-z])-([a-z])/g, "$1_HYPHEN_$2");

  // Remove all punctuation and special characters
  normalized = normalized.replace(/[^\w\s]/g, "");

  // Restore hyphens
  normalized = normalized.replace(/_HYPHEN_/g, "-");

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Collapse single-letter initials (e.g., "j k" → "jk")
  normalized = normalized.replace(/\b([a-z])\s+(?=[a-z]\s|\b[a-z]\b)/g, "$1");

  return normalized;
}

/**
 * Normalize publisher name for fuzzy matching
 *
 * Transformations:
 * - "Penguin Books Ltd." → "penguin"
 * - "Harper Collins Publishers" → "harper collins"
 * - "O'Reilly Media, Inc." → "oreilly media"
 *
 * @param name - Publisher name to normalize
 * @returns Normalized name for matching
 */
export function normalizePublisherName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Remove "The" at the beginning (do this first)
  normalized = normalized.replace(/^the\s+/i, "");

  // Remove parenthetical content (e.g., "(US)", "(UK)")
  normalized = normalized.replace(/\s*\([^)]*\)\s*/g, " ");

  // Preserve hyphenated words by temporarily replacing hyphens
  normalized = normalized.replace(/([a-z])-([a-z])/g, "$1_HYPHEN_$2");

  // Remove all punctuation (including &, commas, periods, apostrophes)
  // But keep word boundaries intact by not replacing with space
  normalized = normalized.replace(/[^\w\s]/g, "");

  // Restore hyphens
  normalized = normalized.replace(/_HYPHEN_/g, "-");

  // Remove the word "and" when used as a connector (e.g., "Simon and Schuster")
  normalized = normalized.replace(/\s+and\s+/g, " ");

  // Collapse multiple spaces first
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Remove common business suffixes repeatedly until no more matches
  // This handles cases like "Publishing Group Inc." where multiple suffixes exist
  let prev = "";
  while (prev !== normalized) {
    prev = normalized;
    // Match suffixes at word boundaries (with space before OR at start of string)
    normalized = normalized.replace(
      /(?:^|\s+)(ltd|llc|inc|incorporated|corp|corporation|co|company|publishing|publishers|books?|book|press|group|international|worldwide)(?:\s+|$)/gi,
      " ",
    );
    normalized = normalized.replace(/\s+/g, " ").trim();
  }

  // Final cleanup
  normalized = normalized.replace(/-+/g, "-").trim();

  return normalized;
}
