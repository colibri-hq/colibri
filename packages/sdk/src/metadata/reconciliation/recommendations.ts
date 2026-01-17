/**
 * Recommendation generation for library metadata
 *
 * This module generates user recommendations based on metadata analysis,
 * duplicate detection, edition selection, and series relationships.
 */

import type { MetadataPreview } from "./preview.js";
import type {
  DuplicateMatch,
  EditionSelection,
  LibraryEntry,
  LibraryRecommendation,
  RecommendationAction,
  SeriesRelationship,
} from "./types.js";

/**
 * Configuration for recommendation generation
 */
export interface RecommendationGeneratorConfig {
  /** Include duplicate-related recommendations */
  includeDuplicateRecommendations: boolean;
  /** Include edition-related recommendations */
  includeEditionRecommendations: boolean;
  /** Include series-related recommendations */
  includeSeriesRecommendations: boolean;
  /** Include quality-related recommendations */
  includeQualityRecommendations: boolean;
}

/**
 * Default configuration for recommendation generation
 */
export const DEFAULT_RECOMMENDATION_GENERATOR_CONFIG: RecommendationGeneratorConfig = {
  includeDuplicateRecommendations: true,
  includeEditionRecommendations: true,
  includeSeriesRecommendations: true,
  includeQualityRecommendations: true,
};

/**
 * RecommendationGenerator creates user recommendations based on metadata analysis
 *
 * @example
 * ```typescript
 * const generator = new RecommendationGenerator();
 * const recommendations = generator.generateRecommendations(
 *   proposedEntry,
 *   duplicates,
 *   editionSelection,
 *   seriesRelationships,
 *   preview,
 * );
 *
 * for (const rec of recommendations) {
 *   console.log(`${rec.priority}: ${rec.message}`);
 * }
 * ```
 */
export class RecommendationGenerator {
  private readonly config: RecommendationGeneratorConfig;

  constructor(config: Partial<RecommendationGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_RECOMMENDATION_GENERATOR_CONFIG, ...config };
  }

  /**
   * Generate all recommendations for a library entry
   */
  generateRecommendations(
    _proposedEntry: LibraryEntry,
    duplicates: DuplicateMatch[],
    editionSelection: EditionSelection,
    seriesRelationships: SeriesRelationship[],
    preview: MetadataPreview,
  ): LibraryRecommendation[] {
    const recommendations: LibraryRecommendation[] = [];

    // Duplicate handling recommendations
    if (this.config.includeDuplicateRecommendations) {
      recommendations.push(...this.generateDuplicateRecommendations(duplicates));
    }

    // Edition recommendations
    if (this.config.includeEditionRecommendations) {
      recommendations.push(...this.generateEditionRecommendations(editionSelection));
    }

    // Series completion recommendations
    if (this.config.includeSeriesRecommendations) {
      recommendations.push(...this.generateSeriesRecommendations(seriesRelationships));
    }

    // Metadata quality recommendations
    if (this.config.includeQualityRecommendations) {
      recommendations.push(...this.generateQualityRecommendations(preview));
    }

    return this.sortByPriority(recommendations);
  }

  /**
   * Generate recommendations for duplicate entries
   */
  generateDuplicateRecommendations(duplicates: DuplicateMatch[]): LibraryRecommendation[] {
    const recommendations: LibraryRecommendation[] = [];

    const exactDuplicates = duplicates.filter((d) => d.matchType === "exact");
    if (exactDuplicates.length > 0) {
      recommendations.push({
        type: "merge_duplicates",
        priority: "high",
        message: `Found ${exactDuplicates.length} exact duplicate(s) in your library`,
        explanation: "This book appears to already exist in your library with identical metadata.",
        actions: this.createDuplicateActions(true),
      });
    }

    const likelyDuplicates = duplicates.filter((d) => d.matchType === "likely");
    if (likelyDuplicates.length > 0) {
      recommendations.push({
        type: "review_conflicts",
        priority: "medium",
        message: `Found ${likelyDuplicates.length} likely duplicate(s) that need review`,
        explanation:
          "These entries are very similar but may have some differences worth examining.",
        actions: this.createDuplicateActions(false),
      });
    }

    return recommendations;
  }

  /**
   * Generate recommendations for edition selection
   */
  generateEditionRecommendations(editionSelection: EditionSelection): LibraryRecommendation[] {
    const recommendations: LibraryRecommendation[] = [];

    if (editionSelection.alternatives.length > 0) {
      recommendations.push({
        type: "improve_metadata",
        priority: "low",
        message: `${editionSelection.alternatives.length} alternative edition(s) available`,
        explanation: "Other editions of this work might better suit your preferences.",
        actions: [
          {
            type: "review",
            label: "Review editions",
            description: "Compare available editions and select your preferred one",
            isRecommended: false,
          },
          {
            type: "add",
            label: "Use selected edition",
            description: "Proceed with the automatically selected edition",
            isRecommended: true,
          },
        ],
      });
    }

    return recommendations;
  }

  /**
   * Generate recommendations for series completion
   */
  generateSeriesRecommendations(
    seriesRelationships: SeriesRelationship[],
  ): LibraryRecommendation[] {
    const recommendations: LibraryRecommendation[] = [];

    const incompleteSeriesRelationships = seriesRelationships.filter((sr) => !sr.isSeriesComplete);

    for (const relationship of incompleteSeriesRelationships) {
      if (relationship.missingWorks.length > 0) {
        recommendations.push({
          type: "complete_series",
          priority: "low",
          message: `${relationship.missingWorks.length} missing work(s) in ${relationship.series.name} series`,
          explanation: `You have some but not all books in the ${relationship.series.name} series.`,
          actions: [
            {
              type: "add",
              label: "Add to wishlist",
              description: "Add missing series books to your wishlist",
              isRecommended: true,
            },
            {
              type: "ignore",
              label: "Ignore",
              description: "Continue without completing the series",
              isRecommended: false,
            },
          ],
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate recommendations for metadata quality
   */
  generateQualityRecommendations(preview: MetadataPreview): LibraryRecommendation[] {
    const recommendations: LibraryRecommendation[] = [];

    if (preview.summary.overallQuality.level === "poor") {
      recommendations.push({
        type: "improve_metadata",
        priority: "medium",
        message: "Metadata quality could be improved",
        explanation: "This entry has limited or low-quality metadata that could be enhanced.",
        actions: [
          {
            type: "update",
            label: "Search for better metadata",
            description: "Try additional metadata sources to improve data quality",
            isRecommended: true,
          },
          {
            type: "add",
            label: "Add as-is",
            description: "Add the entry with current metadata",
            isRecommended: false,
          },
        ],
      });
    }

    return recommendations;
  }

  /**
   * Get current configuration
   */
  getConfig(): RecommendationGeneratorConfig {
    return { ...this.config };
  }

  /**
   * Create actions for duplicate handling
   */
  private createDuplicateActions(isExact: boolean): RecommendationAction[] {
    if (isExact) {
      return [
        {
          type: "ignore",
          label: "Skip adding",
          description: "Do not add this book as it already exists",
          isRecommended: true,
        },
        {
          type: "review",
          label: "Review differences",
          description: "Compare the entries to see if there are meaningful differences",
          isRecommended: false,
        },
      ];
    }

    return [
      {
        type: "review",
        label: "Review manually",
        description: "Compare entries and decide whether to merge or keep separate",
        isRecommended: true,
      },
      {
        type: "add",
        label: "Add as new",
        description: "Add as a separate entry",
        isRecommended: false,
      },
    ];
  }

  /**
   * Sort recommendations by priority
   */
  private sortByPriority(recommendations: LibraryRecommendation[]): LibraryRecommendation[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }
}
