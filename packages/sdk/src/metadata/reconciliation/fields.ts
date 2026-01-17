/**
 * Shared field constants for metadata reconciliation
 *
 * This module provides a single source of truth for metadata field names,
 * eliminating duplication across the reconciliation system.
 */

/**
 * All metadata field names in canonical order
 */
export const METADATA_FIELDS = [
  "title",
  "authors",
  "isbn",
  "publicationDate",
  "subjects",
  "description",
  "language",
  "publisher",
  "series",
  "identifiers",
  "physicalDescription",
  "coverImage",
  "work",
  "edition",
  "relatedWorks",
] as const;

/**
 * Type representing valid metadata field names
 */
export type MetadataFieldName = (typeof METADATA_FIELDS)[number];

/**
 * Core fields that receive higher weighting in confidence calculations
 */
export const CORE_FIELDS: readonly MetadataFieldName[] = [
  "title",
  "authors",
  "isbn",
  "publicationDate",
] as const;

/**
 * Field weights for duplicate detection scoring
 */
export const DUPLICATE_FIELD_WEIGHTS: Readonly<Record<string, number>> = {
  title: 0.3,
  authors: 0.25,
  isbn: 0.2,
  publicationDate: 0.1,
  publisher: 0.05,
  series: 0.1,
} as const;

/**
 * Check if a field name is a core field
 */
export function isCoreField(fieldName: string): boolean {
  return (CORE_FIELDS as readonly string[]).includes(fieldName);
}

/**
 * Get the weight for a field in confidence calculations
 * Core fields get weight of 2, others get 1
 */
export function getFieldWeight(fieldName: string): number {
  return isCoreField(fieldName) ? 2 : 1;
}

/**
 * Get the weight for a field in duplicate detection
 */
export function getDuplicateFieldWeight(fieldName: string): number {
  return DUPLICATE_FIELD_WEIGHTS[fieldName] ?? 0;
}

/**
 * Get field name by index in the METADATA_FIELDS array
 */
export function getFieldNameByIndex(index: number): MetadataFieldName | "unknown" {
  return METADATA_FIELDS[index] ?? "unknown";
}
