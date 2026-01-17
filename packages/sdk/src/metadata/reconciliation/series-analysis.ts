/**
 * Series relationship analysis for metadata reconciliation
 *
 * This module provides functionality to detect series relationships
 * between a book and existing library entries.
 */

import type { MetadataPreview } from "./preview.js";
import type { LibraryEntry, RelatedWork, Series, SeriesRelationship } from "./types.js";
import { calculateStringSimilarity } from "./similarity.js";

/**
 * Configuration for series analysis
 */
export interface SeriesAnalyzerConfig {
  /** Minimum similarity threshold for series name matching */
  minSeriesNameSimilarity: number;
  /** Default confidence for series relationships */
  defaultConfidence: number;
}

/**
 * Default configuration for series analysis
 */
export const DEFAULT_SERIES_ANALYZER_CONFIG: SeriesAnalyzerConfig = {
  minSeriesNameSimilarity: 0.8,
  defaultConfidence: 0.8,
};

/**
 * SeriesAnalyzer detects series relationships between books
 *
 * @example
 * ```typescript
 * const analyzer = new SeriesAnalyzer();
 * const relationships = analyzer.detectSeriesRelationships(preview, existingLibrary);
 *
 * for (const rel of relationships) {
 *   console.log(`Part of series: ${rel.series.name}`);
 *   if (rel.previousWork) {
 *     console.log(`Previous: ${rel.previousWork.title}`);
 *   }
 * }
 * ```
 */
export class SeriesAnalyzer {
  private readonly config: SeriesAnalyzerConfig;

  constructor(config: Partial<SeriesAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_SERIES_ANALYZER_CONFIG, ...config };
  }

  /**
   * Detect series relationships for a preview
   *
   * @param preview - The reconciled metadata preview
   * @param existingLibrary - Array of existing library entries
   * @returns Array of series relationships
   */
  detectSeriesRelationships(
    preview: MetadataPreview,
    existingLibrary: LibraryEntry[],
  ): SeriesRelationship[] {
    const relationships: SeriesRelationship[] = [];

    if (
      !preview.series.value ||
      !Array.isArray(preview.series.value) ||
      preview.series.value.length === 0
    ) {
      return relationships;
    }

    for (const series of preview.series.value) {
      const relationship = this.analyzeSeriesRelationship(series, preview, existingLibrary);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Analyze a specific series relationship
   *
   * @param series - The series to analyze
   * @param preview - The reconciled metadata preview
   * @param existingLibrary - Array of existing library entries
   * @returns Series relationship or null if not found
   */
  analyzeSeriesRelationship(
    series: Series,
    preview: MetadataPreview,
    existingLibrary: LibraryEntry[],
  ): SeriesRelationship | null {
    // Find other books in the same series in the existing library
    const seriesBooks = existingLibrary.filter((entry) =>
      entry.series?.some(
        (s) =>
          calculateStringSimilarity(s.name, series.name) >= this.config.minSeriesNameSimilarity,
      ),
    );

    // Find related works
    const relatedWorks: RelatedWork[] = [];
    let previousWork: RelatedWork | undefined;
    let nextWork: RelatedWork | undefined;

    if (series.volume && typeof series.volume === "number") {
      // Look for previous and next volumes
      const prevVolume = seriesBooks.find((book) =>
        book.series?.some(({ volume }) => series.volume && volume === Number(series.volume) - 1),
      );
      if (prevVolume) {
        previousWork = { title: prevVolume.title, relationshipType: "prequel", confidence: 0.9 };
      }

      const nextVolume = seriesBooks.find((book) =>
        book.series?.some(({ volume }) => series.volume && volume === Number(series.volume) + 1),
      );
      if (nextVolume) {
        nextWork = { title: nextVolume.title, relationshipType: "sequel", confidence: 0.9 };
      }
    }

    // Add all series books as related works
    for (const book of seriesBooks) {
      if (book.title !== preview.title.value) {
        relatedWorks.push({
          title: book.title,
          relationshipType: "part_of",
          confidence: this.config.defaultConfidence,
          description: `Part of the ${series.name} series`,
        });
      }
    }

    // Check if series is complete
    const isSeriesComplete = series.totalVolumes
      ? seriesBooks.length >= series.totalVolumes
      : false;

    // Find missing works
    const missingWorks: RelatedWork[] = this.findMissingWorks(series, seriesBooks);

    return {
      series,
      position: series.volume || series.position || 0,
      previousWork,
      nextWork,
      relatedWorks,
      confidence: this.config.defaultConfidence,
      isSeriesComplete,
      missingWorks,
    };
  }

  /**
   * Find missing works in a series
   */
  private findMissingWorks(series: Series, seriesBooks: LibraryEntry[]): RelatedWork[] {
    const missingWorks: RelatedWork[] = [];

    if (series.totalVolumes && typeof series.volume === "number") {
      for (let i = 1; i <= series.totalVolumes; i++) {
        if (
          i !== series.volume &&
          !seriesBooks.some((book) => book.series?.some((s) => s.volume === i))
        ) {
          missingWorks.push({
            title: `${series.name} Volume ${i}`,
            relationshipType: "part_of",
            confidence: 0.7,
            description: `Missing volume ${i} of ${series.name}`,
          });
        }
      }
    }

    return missingWorks;
  }
}
