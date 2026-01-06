/**
 * Conversion utilities between MetadataRecord (provider format) and ExtractedMetadata (ingestion format)
 *
 * This module provides bidirectional conversion and merging strategies for metadata from providers.
 */

import type { MetadataRecord } from "../metadata/providers/provider.js";
import type { ExtractedMetadata } from "./types.js";

/**
 * Convert a MetadataRecord from a provider to ExtractedMetadata format for ingestion
 *
 * Maps provider-specific metadata to the ingestion system's expected format:
 * - title: Direct mapping
 * - authors: Mapped to contributors with 'aut' role
 * - isbn: Mapped to identifiers with 'isbn' type
 * - description: Mapped to synopsis
 * - publicationDate: Mapped to datePublished
 * - pageCount: Mapped to numberOfPages
 * - subjects: Direct mapping
 * - series: Mapped to series (name + volume as position)
 * - language: Direct mapping
 * - publisher: Mapped to contributors with 'pbl' (publisher) role
 *
 * @param record - The MetadataRecord from a provider
 * @returns Partial ExtractedMetadata ready for ingestion
 */
export function convertToExtractedMetadata(
  record: MetadataRecord,
): Partial<ExtractedMetadata> {
  const metadata: Partial<ExtractedMetadata> = {};

  // Title
  if (record.title) {
    metadata.title = record.title;
  }

  // Authors → Contributors with 'aut' role
  if (record.authors && record.authors.length > 0) {
    metadata.contributors = record.authors.map((author) => ({
      name: author,
      roles: ["aut"], // MARC relator code for author
      // Generate sortingKey from name (Last, First format preferred)
      sortingKey: generateSortingKey(author),
    }));
  }

  // ISBN → Identifiers
  if (record.isbn && record.isbn.length > 0) {
    metadata.identifiers = record.isbn.map((isbn) => ({
      type: "isbn",
      value: isbn,
    }));
  }

  // Description → Synopsis
  if (record.description) {
    metadata.synopsis = record.description;
  }

  // Publication Date
  if (record.publicationDate) {
    metadata.datePublished = record.publicationDate;
  }

  // Page Count
  if (record.pageCount) {
    metadata.numberOfPages = record.pageCount;
  }

  // Subjects
  if (record.subjects && record.subjects.length > 0) {
    metadata.subjects = record.subjects;
  }

  // Series
  if (record.series) {
    metadata.series = {
      name: record.series.name,
      position: record.series.volume,
    };
  }

  // Language
  if (record.language) {
    metadata.language = record.language;
  }

  // Publisher → Contributors with 'pbl' role
  // Note: This is merged with existing contributors if authors were present
  if (record.publisher) {
    if (!metadata.contributors) {
      metadata.contributors = [];
    }
    metadata.contributors.push({
      name: record.publisher,
      roles: ["pbl"], // MARC relator code for publisher
      sortingKey: record.publisher,
    });
  }

  // Store provider-specific data in properties for reference
  if (record.providerData || record.source || record.confidence) {
    metadata.properties = {
      ...metadata.properties,
      providerData: {
        source: record.source,
        confidence: record.confidence,
        timestamp: record.timestamp,
        data: record.providerData,
      },
    };
  }

  return metadata;
}

/**
 * Generate a sorting key from a name
 * Handles various name formats and tries to produce "Last, First" format
 *
 * Examples:
 * - "John Smith" → "Smith, John"
 * - "Smith, John" → "Smith, John" (already correct)
 * - "J.K. Rowling" → "Rowling, J.K."
 * - "Ludwig van Beethoven" → "Beethoven, Ludwig van" (preserves particles)
 *
 * @param name - The name to generate a sorting key from
 * @returns A sorting key suitable for alphabetical sorting
 */
function generateSortingKey(name: string): string {
  const trimmed = name.trim();

  // Already in "Last, First" format
  if (trimmed.includes(",")) {
    return trimmed;
  }

  // Split by spaces
  const parts = trimmed.split(/\s+/);

  // Single name - return as-is
  if (parts.length === 1) {
    return trimmed;
  }

  // Dutch/German particles that should stay with the last name
  const lastNameParticles = [
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
  ];

  // Find where the last name starts (including particles)
  let lastNameStartIndex = parts.length - 1;
  for (let i = parts.length - 2; i >= 0; i--) {
    const part = parts[i].toLowerCase();
    if (lastNameParticles.includes(part)) {
      lastNameStartIndex = i;
    } else {
      break;
    }
  }

  // Extract components
  // First name is everything before the particle/last name
  const firstNameParts = parts.slice(0, lastNameStartIndex);
  // Last name is the final component (without particle for sorting)
  const lastNameOnly = parts[parts.length - 1];
  // Particles are between first name and last name proper
  const particles = parts.slice(lastNameStartIndex, parts.length - 1);

  // Build sorting key: "LastName, FirstName particles"
  // e.g., "Ludwig van Beethoven" → "Beethoven, Ludwig van"
  const firstAndParticles = [...firstNameParts, ...particles].join(" ");
  return `${lastNameOnly}, ${firstAndParticles}`;
}

/**
 * Merge multiple MetadataRecords into a single ExtractedMetadata
 *
 * Strategy:
 * 1. Start with the highest confidence record as base
 * 2. Fill in missing fields from other records
 * 3. Merge arrays (contributors, identifiers, subjects) without duplicates
 * 4. Track all provider sources in properties
 *
 * @param records - Array of MetadataRecords to merge
 * @returns Merged ExtractedMetadata
 */
export function mergeMetadataRecords(
  records: MetadataRecord[],
): Partial<ExtractedMetadata> {
  if (records.length === 0) {
    return {};
  }

  // Start with the highest confidence record
  const sorted = [...records].sort((a, b) => b.confidence - a.confidence);
  const base = convertToExtractedMetadata(sorted[0]);

  // Merge additional data from other records
  for (let i = 1; i < sorted.length; i++) {
    const additional = convertToExtractedMetadata(sorted[i]);

    // Only fill in missing fields, don't override
    for (const key of Object.keys(additional) as Array<
      keyof ExtractedMetadata
    >) {
      if (!base[key] && additional[key]) {
        // @ts-expect-error - Complex type merging
        base[key] = additional[key];
      } else if (
        key === "contributors" &&
        base.contributors &&
        additional.contributors
      ) {
        // Merge contributors, avoiding duplicates
        const existing = new Set(
          base.contributors.map((c) => normalizeNameForComparison(c.name)),
        );
        for (const contrib of additional.contributors) {
          const normalizedName = normalizeNameForComparison(contrib.name);
          if (!existing.has(normalizedName)) {
            base.contributors.push(contrib);
            existing.add(normalizedName);
          }
        }
      } else if (
        key === "identifiers" &&
        base.identifiers &&
        additional.identifiers
      ) {
        // Merge identifiers, avoiding duplicates
        const existing = new Set(
          base.identifiers.map((i) => `${i.type}:${normalizeISBN(i.value)}`),
        );
        for (const id of additional.identifiers) {
          const key = `${id.type}:${normalizeISBN(id.value)}`;
          if (!existing.has(key)) {
            base.identifiers.push(id);
            existing.add(key);
          }
        }
      } else if (key === "subjects" && base.subjects && additional.subjects) {
        // Merge subjects, avoiding duplicates
        const existing = new Set(
          base.subjects.map((s) => s.toLowerCase().trim()),
        );
        for (const subject of additional.subjects) {
          const normalized = subject.toLowerCase().trim();
          if (!existing.has(normalized)) {
            base.subjects.push(subject);
            existing.add(normalized);
          }
        }
      }
    }
  }

  // Add tracking for all sources
  if (!base.properties) {
    base.properties = {};
  }
  base.properties.mergedSources = sorted.map((r) => ({
    source: r.source,
    confidence: r.confidence,
    timestamp: r.timestamp,
  }));

  return base;
}

/**
 * Normalize a name for comparison (case-insensitive, remove punctuation)
 */
function normalizeNameForComparison(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\-'"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize ISBN for comparison (remove hyphens and spaces)
 */
function normalizeISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, "");
}

/**
 * Select the best value for a field from multiple MetadataRecords
 *
 * Selection strategy:
 * 1. Filter by minimum confidence threshold
 * 2. Choose value from highest confidence record
 * 3. If tied, prefer value from higher-priority provider
 *
 * @param records - Records containing the field
 * @param field - Field name in MetadataRecord
 * @param minConfidence - Minimum confidence threshold (default: 0.6)
 * @returns The best value, or undefined if none meet criteria
 */
export function selectBestValue<T>(
  records: MetadataRecord[],
  field: keyof MetadataRecord,
  minConfidence: number = 0.6,
): T | undefined {
  const candidates = records
    .filter(
      (r) =>
        r[field] !== undefined &&
        r[field] !== null &&
        r.confidence >= minConfidence,
    )
    .sort((a, b) => b.confidence - a.confidence);

  if (candidates.length === 0) {
    return undefined;
  }

  return candidates[0][field] as T;
}

/**
 * Merge arrays from multiple MetadataRecords, removing duplicates
 *
 * @param records - Records containing the array field
 * @param field - Field name in MetadataRecord (must be an array)
 * @param minConfidence - Minimum confidence threshold
 * @param normalizer - Function to normalize values for deduplication
 * @returns Merged array with no duplicates
 */
export function mergeArrayField<T>(
  records: MetadataRecord[],
  field: keyof MetadataRecord,
  minConfidence: number = 0.6,
  normalizer?: (value: T) => string,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const record of records) {
    if (record.confidence < minConfidence) continue;

    const value = record[field];
    if (!Array.isArray(value)) continue;

    for (const item of value as T[]) {
      const key = normalizer ? normalizer(item) : String(item).toLowerCase();
      if (!seen.has(key)) {
        result.push(item);
        seen.add(key);
      }
    }
  }

  return result;
}

/**
 * Calculate aggregated confidence score for a field across multiple records
 *
 * The score is calculated as:
 * - Base: Highest confidence among records
 * - Boost: +0.05 for each additional agreeing source (up to +0.15)
 * - Cap: Maximum 0.98 (never perfect confidence)
 *
 * @param records - Records containing the field
 * @param field - Field name
 * @returns Aggregated confidence score (0-0.98)
 */
export function calculateAggregatedConfidence(
  records: MetadataRecord[],
  field: keyof MetadataRecord,
): number {
  const validRecords = records.filter(
    (r) => r[field] !== undefined && r[field] !== null,
  );

  if (validRecords.length === 0) {
    return 0;
  }

  // Base confidence: highest among records
  const baseConfidence = Math.max(...validRecords.map((r) => r.confidence));

  // Consensus boost: more sources = higher confidence (up to +0.15)
  const consensusBoost = Math.min(0.15, (validRecords.length - 1) * 0.05);

  // Calculate final confidence, capped at 0.98
  return Math.min(0.98, baseConfidence + consensusBoost);
}

/**
 * Detect and resolve conflicts between metadata values from different sources
 *
 * Conflict resolution strategy:
 * 1. If all values are identical → no conflict
 * 2. If values differ:
 *    a. Choose value from highest confidence source
 *    b. If tied, choose value from provider with higher reliability for that field type
 *    c. Track the conflict for user review
 *
 * @param records - Records with potentially conflicting values
 * @param field - Field to check for conflicts
 * @param normalizer - Optional function to normalize values for comparison
 * @returns Conflict resolution result
 */
export function resolveConflict<T>(
  records: MetadataRecord[],
  field: keyof MetadataRecord,
  normalizer?: (value: T) => string,
): {
  value: T | undefined;
  hasConflict: boolean;
  alternatives: Array<{ value: T; source: string; confidence: number }>;
} {
  const validRecords = records.filter(
    (r) => r[field] !== undefined && r[field] !== null,
  );

  if (validRecords.length === 0) {
    return { value: undefined, hasConflict: false, alternatives: [] };
  }

  if (validRecords.length === 1) {
    return {
      value: validRecords[0][field] as T,
      hasConflict: false,
      alternatives: [],
    };
  }

  // Group by normalized value to detect conflicts
  const valueGroups = new Map<
    string,
    Array<{ record: MetadataRecord; value: T }>
  >();

  for (const record of validRecords) {
    const value = record[field] as T;
    const key = normalizer ? normalizer(value) : String(value).toLowerCase();

    if (!valueGroups.has(key)) {
      valueGroups.set(key, []);
    }
    valueGroups.get(key)!.push({ record, value });
  }

  const hasConflict = valueGroups.size > 1;

  // Select best value: highest confidence
  let bestGroup: Array<{ record: MetadataRecord; value: T }> | undefined;
  let bestConfidence = 0;

  for (const group of valueGroups.values()) {
    const maxConfidence = Math.max(...group.map((g) => g.record.confidence));
    if (maxConfidence > bestConfidence) {
      bestConfidence = maxConfidence;
      bestGroup = group;
    }
  }

  const selectedValue = bestGroup?.[0]?.value;

  // Build alternatives list
  const alternatives = Array.from(valueGroups.values())
    .flat()
    .map((g) => ({
      value: g.value,
      source: g.record.source,
      confidence: g.record.confidence,
    }))
    .sort((a, b) => b.confidence - a.confidence);

  return {
    value: selectedValue,
    hasConflict,
    alternatives,
  };
}
