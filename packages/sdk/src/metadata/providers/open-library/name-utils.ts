/**
 * Name parsing and comparison utilities for OpenLibrary
 *
 * Provides sophisticated author name handling including:
 * - Parsing complex international name formats
 * - Converting between "First Last" and "Last, First" formats
 * - Name equivalence checking with initial matching
 * - Normalization for comparison
 */

import type { NameComponents } from "./types.js";

/**
 * Common name prefixes (titles, honorifics)
 */
const NAME_PREFIXES = [
  "dr",
  "prof",
  "mr",
  "mrs",
  "ms",
  "miss",
  "sir",
  "dame",
  "lord",
  "lady",
  "rev",
  "father",
  "sister",
];

/**
 * Common name suffixes
 */
const NAME_SUFFIXES = [
  "jr",
  "sr",
  "ii",
  "iii",
  "iv",
  "v",
  "phd",
  "md",
  "esq",
  "cpa",
];

/**
 * Dutch/German/Spanish particles that are part of the last name
 */
const LAST_NAME_PARTICLES = [
  "van",
  "von",
  "de",
  "der",
  "den",
  "del",
  "della",
  "di",
  "da",
  "du",
  "le",
  "la",
  "el",
  "al",
  "ibn",
  "bin",
  "ben",
  "mac",
  "mc",
  "o'",
  "ó",
  "ní",
  "nic",
];

/**
 * Parse a name into its components
 *
 * Handles various international name formats including:
 * - "First Middle Last"
 * - "Last, First Middle"
 * - Names with prefixes (Dr., Prof., etc.)
 * - Names with suffixes (Jr., PhD, etc.)
 * - Names with particles (van, von, de, etc.)
 *
 * @param name - The name to parse
 * @returns Parsed name components
 */
export function parseNameComponents(name: string): NameComponents {
  const trimmed = name.trim();

  // Handle empty or invalid names
  if (!trimmed) {
    return {
      first: "",
      middle: [],
      last: "",
      prefixes: [],
      suffixes: [],
      original: name,
    };
  }

  const parts = trimmed.split(/\s+/);
  const foundPrefixes: string[] = [];
  const foundSuffixes: string[] = [];

  // Extract prefixes from the beginning
  while (
    parts.length > 0 &&
    NAME_PREFIXES.includes(parts[0].toLowerCase().replace(/[.,]/g, ""))
  ) {
    foundPrefixes.push(parts.shift()!);
  }

  // Extract suffixes from the end
  while (parts.length > 0) {
    const lastPart = parts[parts.length - 1].toLowerCase().replace(/[.,]/g, "");
    if (NAME_SUFFIXES.includes(lastPart) || /^[ivx]+$/.test(lastPart)) {
      foundSuffixes.unshift(parts.pop()!);
    } else {
      break;
    }
  }

  if (parts.length === 0) {
    // Only prefixes/suffixes, treat as single name
    return {
      first: foundPrefixes.concat(foundSuffixes).join(" "),
      middle: [],
      last: "",
      prefixes: foundPrefixes,
      suffixes: foundSuffixes,
      original: name,
    };
  }

  // Handle "Last, First [Middle]" format
  if (trimmed.includes(",")) {
    const commaParts = trimmed.split(",").map((p) => p.trim());
    if (commaParts.length >= 2) {
      const lastPart = commaParts[0];
      const firstAndMiddle = commaParts[1].split(/\s+/);
      const remainingParts = commaParts.slice(2);

      // Extract first name
      const first = firstAndMiddle.shift() || "";

      // Remaining parts from first section are middle names
      const middle = firstAndMiddle.concat(
        remainingParts
          .join(" ")
          .split(/\s+/)
          .filter((p) => p),
      );

      return {
        first,
        middle,
        last: lastPart,
        prefixes: foundPrefixes,
        suffixes: foundSuffixes,
        original: name,
      };
    }
  }

  // Handle "First [Middle] Last" format
  if (parts.length === 1) {
    // Single name - could be first or last
    return {
      first: parts[0],
      middle: [],
      last: "",
      prefixes: foundPrefixes,
      suffixes: foundSuffixes,
      original: name,
    };
  }

  // Multiple parts - need to determine which are last name particles
  let lastNameStartIndex = parts.length - 1;

  // Look backwards to find where the last name starts (including particles)
  for (let i = parts.length - 2; i >= 0; i--) {
    const part = parts[i].toLowerCase();
    if (
      LAST_NAME_PARTICLES.includes(part) ||
      LAST_NAME_PARTICLES.includes(part.replace(/'/g, "'"))
    ) {
      lastNameStartIndex = i;
    } else {
      break;
    }
  }

  // Extract components
  const first = parts[0];
  const lastNameParts = parts.slice(lastNameStartIndex);
  const middleNameParts = parts.slice(1, lastNameStartIndex);

  return {
    first,
    middle: middleNameParts,
    last: lastNameParts.join(" "),
    prefixes: foundPrefixes,
    suffixes: foundSuffixes,
    original: name,
  };
}

/**
 * Convert any name format to "First Middle Last" format
 *
 * @param name - The name to convert
 * @returns Name in "First Middle Last" format
 */
export function convertToFirstLastFormat(name: string): string {
  const components = parseNameComponents(name);

  if (!components.first && !components.last) {
    return name.trim(); // Return original if parsing failed
  }

  const parts: string[] = [];

  // Add prefixes if present
  if (components.prefixes.length > 0) {
    parts.push(...components.prefixes);
  }

  // Add first name
  if (components.first) {
    parts.push(components.first);
  }

  // Add middle names
  if (components.middle.length > 0) {
    parts.push(...components.middle);
  }

  // Add last name
  if (components.last) {
    parts.push(components.last);
  }

  // Add suffixes if present
  if (components.suffixes.length > 0) {
    parts.push(...components.suffixes);
  }

  return parts.join(" ");
}

/**
 * Normalize a name for comparison
 *
 * - Removes diacritics
 * - Removes punctuation
 * - Normalizes whitespace
 * - Converts to lowercase
 *
 * @param name - The name to normalize
 * @returns Normalized name suitable for comparison
 */
export function normalizeNameForComparison(name: string): string {
  const components = parseNameComponents(name);

  // Create a normalized comparison key using core name components
  const coreParts: string[] = [];

  if (components.first) {
    coreParts.push(components.first.toLowerCase());
  }

  if (components.middle.length > 0) {
    coreParts.push(...components.middle.map((m) => m.toLowerCase()));
  }

  if (components.last) {
    coreParts.push(components.last.toLowerCase());
  }

  // Remove punctuation and extra whitespace, normalize unicode
  return coreParts
    .join(" ")
    .normalize("NFD") // Decompose unicode characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Check if two names match with initials
 *
 * Matches cases like "J. Smith" vs "John Smith" or "J.R.R. Tolkien" vs "John Tolkien"
 *
 * @param components1 - First name components
 * @param components2 - Second name components
 * @returns True if names match considering initials
 */
export function matchesWithInitials(
  components1: NameComponents,
  components2: NameComponents,
): boolean {
  // Check if first names match (one might be an initial)
  const first1 = components1.first.toLowerCase();
  const first2 = components2.first.toLowerCase();

  const firstMatches =
    first1 === first2 ||
    (first1.length === 1 && first2.startsWith(first1)) ||
    (first2.length === 1 && first1.startsWith(first2)) ||
    (first1.length <= 2 &&
      first1.replace(/\./g, "") === first2.charAt(0).toLowerCase()) ||
    (first2.length <= 2 &&
      first2.replace(/\./g, "") === first1.charAt(0).toLowerCase());

  if (!firstMatches) return false;

  // Check if last names match
  const last1 = components1.last.toLowerCase();
  const last2 = components2.last.toLowerCase();

  return last1 === last2 || !last1 || !last2;
}

/**
 * Check if two names refer to the same person
 *
 * Uses multiple matching strategies:
 * - Exact match
 * - Normalized comparison
 * - Core components match (first + last)
 * - Initial matching
 * - Reversed format matching
 *
 * @param name1 - First name to compare
 * @param name2 - Second name to compare
 * @returns True if names are equivalent
 */
export function areNamesEquivalent(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;

  // Quick exact match check
  if (name1.trim() === name2.trim()) return true;

  // Normalize both names for comparison
  const normalized1 = normalizeNameForComparison(name1);
  const normalized2 = normalizeNameForComparison(name2);

  if (normalized1 === normalized2) return true;

  // Parse components for more sophisticated matching
  const components1 = parseNameComponents(name1);
  const components2 = parseNameComponents(name2);

  // Check if core components match (first + last)
  const core1 = `${components1.first} ${components1.last}`.toLowerCase().trim();
  const core2 = `${components2.first} ${components2.last}`.toLowerCase().trim();

  if (core1 === core2 && core1 !== " ") return true;

  // Check for initials matching
  if (matchesWithInitials(components1, components2)) return true;

  // Check for reversed format matching
  const reversed1 = `${components1.last} ${components1.first}`
    .toLowerCase()
    .trim();
  const reversed2 = `${components2.last} ${components2.first}`
    .toLowerCase()
    .trim();

  return reversed1 === core2 || reversed2 === core1;
}

/**
 * Get the preferred format from a list of name variants
 *
 * Prefers "First Last" format over "Last, First"
 * Prefers full names over initials
 *
 * @param nameVariants - Array of name variants
 * @returns The preferred name format
 */
export function getPreferredNameFormat(nameVariants: string[]): string {
  if (nameVariants.length === 0) return "";
  if (nameVariants.length === 1) return nameVariants[0];

  // Score each variant
  const scored = nameVariants.map((name) => {
    let score = 0;

    // Prefer names without commas (First Last format)
    if (!name.includes(",")) score += 10;

    // Prefer longer names (more complete)
    score += name.length * 0.1;

    // Penalize names with many periods (likely initials)
    score -= (name.match(/\./g) || []).length * 2;

    // Prefer names with spaces (multiple parts)
    score += (name.match(/\s/g) || []).length * 2;

    return { name, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored[0].name;
}

/**
 * Check if a name is in "Last, First" format
 *
 * @param name - Name to check
 * @returns True if in "Last, First" format
 */
export function isLastFirstFormat(name: string): boolean {
  if (!name.includes(",")) return false;

  const parts = name.split(",").map((p) => p.trim());
  if (parts.length !== 2) return false;

  // Both parts should be non-empty and look like names
  return parts[0].length > 0 && parts[1].length > 0;
}

/**
 * Normalize author name for display
 *
 * @param name - Name to normalize
 * @returns Normalized display name
 */
export function normalizeAuthorName(name: string): string {
  if (!name) return "";

  // Trim and normalize whitespace
  let normalized = name.replace(/\s+/g, " ").trim();

  // Handle "Last, First" format
  if (isLastFirstFormat(normalized)) {
    normalized = convertToFirstLastFormat(normalized);
  }

  return normalized;
}
