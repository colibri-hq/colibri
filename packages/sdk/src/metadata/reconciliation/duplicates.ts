/**
 * Duplicate detection for library entries
 *
 * This module provides functionality to detect potential duplicate entries
 * in a library by comparing metadata fields with configurable thresholds.
 */

import type {
  DuplicateMatch,
  DuplicateMatchField,
  LibraryEntry,
} from "./types.js";
import { DUPLICATE_FIELD_WEIGHTS } from "./fields.js";
import {
  calculateArraySimilarity,
  calculateDateSimilarity,
  calculateIsbnSimilarity,
  calculatePublisherSimilarity,
  calculateSeriesSimilarity,
  calculateStringSimilarity,
} from "./similarity.js";

/**
 * Configuration for duplicate detection
 */
export interface DuplicateDetectorConfig {
  /** Minimum similarity threshold for considering a match (0-1) */
  minSimilarityThreshold: number;
  /** Field weights for similarity calculation */
  fieldWeights: Readonly<Record<string, number>>;
}

/**
 * Default configuration for duplicate detection
 */
export const DEFAULT_DUPLICATE_CONFIG: DuplicateDetectorConfig = {
  minSimilarityThreshold: 0.3,
  fieldWeights: DUPLICATE_FIELD_WEIGHTS,
};

/**
 * DuplicateDetector finds potential duplicate entries in a library
 *
 * @example
 * ```typescript
 * const detector = new DuplicateDetector();
 * const duplicates = detector.detectDuplicates(newEntry, existingLibrary);
 *
 * if (duplicates.length > 0) {
 *   console.log(`Found ${duplicates.length} potential duplicates`);
 *   for (const match of duplicates) {
 *     console.log(`- ${match.existingEntry.title}: ${match.similarity}`);
 *   }
 * }
 * ```
 */
export class DuplicateDetector {
  private readonly config: DuplicateDetectorConfig;

  constructor(config: Partial<DuplicateDetectorConfig> = {}) {
    this.config = { ...DEFAULT_DUPLICATE_CONFIG, ...config };
  }

  /**
   * Detect duplicate entries in the existing library
   *
   * @param proposedEntry - The new entry to check for duplicates
   * @param existingLibrary - Array of existing library entries
   * @returns Array of potential matches sorted by similarity (highest first)
   */
  detectDuplicates(
    proposedEntry: LibraryEntry,
    existingLibrary: LibraryEntry[],
  ): DuplicateMatch[] {
    const matches: DuplicateMatch[] = [];

    for (const existingEntry of existingLibrary) {
      const match = this.calculateDuplicateMatch(proposedEntry, existingEntry);
      if (match.similarity > this.config.minSimilarityThreshold) {
        matches.push(match);
      }
    }

    // Sort by similarity (highest first)
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate duplicate match between two library entries
   */
  calculateDuplicateMatch(
    proposed: LibraryEntry,
    existing: LibraryEntry,
  ): DuplicateMatch {
    const matchingFields: DuplicateMatchField[] = [];
    let totalSimilarity = 0;
    let totalWeight = 0;

    const fieldWeights = this.config.fieldWeights;

    // Compare title
    const titleSimilarity = calculateStringSimilarity(
      proposed.title,
      existing.title,
    );
    matchingFields.push({
      field: "title",
      similarity: titleSimilarity,
      newValue: proposed.title,
      existingValue: existing.title,
      weight: fieldWeights.title,
    });
    totalSimilarity += titleSimilarity * fieldWeights.title;
    totalWeight += fieldWeights.title;

    // Compare authors
    const authorsSimilarity = calculateArraySimilarity(
      proposed.authors,
      existing.authors,
    );
    matchingFields.push({
      field: "authors",
      similarity: authorsSimilarity,
      newValue: proposed.authors,
      existingValue: existing.authors,
      weight: fieldWeights.authors,
    });
    totalSimilarity += authorsSimilarity * fieldWeights.authors;
    totalWeight += fieldWeights.authors;

    // Compare ISBN (exact match)
    const isbnSimilarity = calculateIsbnSimilarity(
      proposed.isbn,
      existing.isbn,
    );
    if (isbnSimilarity > 0) {
      matchingFields.push({
        field: "isbn",
        similarity: isbnSimilarity,
        newValue: proposed.isbn,
        existingValue: existing.isbn,
        weight: fieldWeights.isbn,
      });
      totalSimilarity += isbnSimilarity * fieldWeights.isbn;
      totalWeight += fieldWeights.isbn;
    }

    // Compare publication date
    const dateSimilarity = calculateDateSimilarity(
      proposed.publicationDate,
      existing.publicationDate,
    );
    if (dateSimilarity > 0) {
      matchingFields.push({
        field: "publicationDate",
        similarity: dateSimilarity,
        newValue: proposed.publicationDate,
        existingValue: existing.publicationDate,
        weight: fieldWeights.publicationDate,
      });
      totalSimilarity += dateSimilarity * fieldWeights.publicationDate;
      totalWeight += fieldWeights.publicationDate;
    }

    // Compare publisher
    const publisherSimilarity = calculatePublisherSimilarity(
      proposed.publisher,
      existing.publisher,
    );
    if (publisherSimilarity > 0) {
      matchingFields.push({
        field: "publisher",
        similarity: publisherSimilarity,
        newValue: proposed.publisher,
        existingValue: existing.publisher,
        weight: fieldWeights.publisher,
      });
      totalSimilarity += publisherSimilarity * fieldWeights.publisher;
      totalWeight += fieldWeights.publisher;
    }

    // Compare series
    const seriesSimilarity = calculateSeriesSimilarity(
      proposed.series,
      existing.series,
    );
    if (seriesSimilarity > 0) {
      matchingFields.push({
        field: "series",
        similarity: seriesSimilarity,
        newValue: proposed.series,
        existingValue: existing.series,
        weight: fieldWeights.series,
      });
      totalSimilarity += seriesSimilarity * fieldWeights.series;
      totalWeight += fieldWeights.series;
    }

    const overallSimilarity =
      totalWeight > 0 ? totalSimilarity / totalWeight : 0;

    // Determine match type and recommendation
    const { matchType, recommendation, explanation } = this.determineMatchType(
      overallSimilarity,
      isbnSimilarity,
      titleSimilarity,
      authorsSimilarity,
    );

    return {
      existingEntry: existing,
      similarity: overallSimilarity,
      matchType,
      matchingFields,
      confidence: Math.min(overallSimilarity + 0.1, 1.0),
      recommendation,
      explanation,
    };
  }

  /**
   * Determine match type and recommendation based on similarity scores
   */
  private determineMatchType(
    overallSimilarity: number,
    isbnSimilarity: number,
    titleSimilarity: number,
    authorsSimilarity: number,
  ): {
    matchType: DuplicateMatch["matchType"];
    recommendation: DuplicateMatch["recommendation"];
    explanation: string;
  } {
    if (overallSimilarity >= 0.9) {
      return {
        matchType: "exact",
        recommendation: "skip",
        explanation:
          "This appears to be an exact duplicate of an existing entry.",
      };
    }

    if (overallSimilarity >= 0.7) {
      return {
        matchType: "likely",
        recommendation: "review_manually",
        explanation:
          "This is likely a duplicate but may have some differences worth reviewing.",
      };
    }

    if (overallSimilarity >= 0.5) {
      return {
        matchType: "possible",
        recommendation: "review_manually",
        explanation:
          "This might be a duplicate or a different edition of the same work.",
      };
    }

    if (
      isbnSimilarity > 0.8 ||
      (titleSimilarity > 0.8 && authorsSimilarity > 0.8)
    ) {
      return {
        matchType: "different_edition",
        recommendation: "add_as_new",
        explanation:
          "This appears to be a different edition of an existing work.",
      };
    }

    return {
      matchType: "related_work",
      recommendation: "add_as_new",
      explanation:
        "This appears to be related but distinct from existing entries.",
    };
  }
}

/**
 * Convenience function for detecting duplicates with default configuration
 */
export function detectDuplicates(
  proposedEntry: LibraryEntry,
  existingLibrary: LibraryEntry[],
  config?: Partial<DuplicateDetectorConfig>,
): DuplicateMatch[] {
  const detector = new DuplicateDetector(config);
  return detector.detectDuplicates(proposedEntry, existingLibrary);
}
