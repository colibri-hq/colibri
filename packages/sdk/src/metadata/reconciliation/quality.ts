/**
 * Quality assessment for metadata reconciliation
 *
 * This module provides functionality to assess the quality of
 * reconciled fields and library entries.
 */

import type { LibraryEntry, MetadataSource, ReconciledField } from "./types.js";

/**
 * Quality assessment for a field
 */
export interface FieldQuality {
  /** Overall quality score (0-1) */
  score: number;
  /** Quality level */
  level: "excellent" | "good" | "fair" | "poor";
  /** Factors that contributed to the quality score */
  factors: QualityFactor[];
  /** Suggestions for improvement */
  suggestions: string[];
}

/**
 * Factor that affects field quality
 */
export interface QualityFactor {
  /** Name of the factor */
  name: string;
  /** Impact on quality (-1 to 1) */
  impact: number;
  /** Description of the factor */
  description: string;
}

/**
 * Source attribution for a specific field
 */
export interface SourceAttribution {
  /** Source that provided this data */
  source: MetadataSource;
  /** The original value from this source */
  originalValue: unknown;
  /** Contribution weight to the final value */
  weight: number;
  /** Whether this source was the primary contributor */
  isPrimary: boolean;
  /** Reliability score for this specific field type */
  fieldReliability: number;
}

/**
 * Configuration for quality assessment
 */
export interface QualityAssessorConfig {
  /** Minimum confidence threshold for high confidence */
  highConfidenceThreshold: number;
  /** Minimum quality score for good quality */
  goodQualityThreshold: number;
  /** Whether to include quality suggestions */
  includeQualitySuggestions: boolean;
}

/**
 * Default configuration for quality assessment
 */
export const DEFAULT_QUALITY_ASSESSOR_CONFIG: QualityAssessorConfig = {
  highConfidenceThreshold: 0.8,
  goodQualityThreshold: 0.7,
  includeQualitySuggestions: true,
};

/**
 * Library quality assessment
 */
export interface LibraryQualityAssessment {
  /** Overall quality score */
  score: number;
  /** Quality level */
  level: "excellent" | "good" | "fair" | "poor";
  /** Completeness score */
  completeness: number;
  /** Accuracy score */
  accuracy: number;
  /** Consistency score */
  consistency: number;
  /** Areas of strength */
  strengths: string[];
  /** Areas needing improvement */
  improvements: string[];
}

/**
 * QualityAssessor evaluates the quality of reconciled metadata
 *
 * @example
 * ```ts
 * const assessor = new QualityAssessor();
 * const quality = assessor.assessFieldQuality(reconciledField, sourceAttributions);
 *
 * console.log(`Quality: ${quality.level}`);
 * console.log(`Score: ${quality.score}`);
 * ```
 */
export class QualityAssessor {
  private readonly config: QualityAssessorConfig;

  constructor(config: Partial<QualityAssessorConfig> = {}) {
    this.config = { ...DEFAULT_QUALITY_ASSESSOR_CONFIG, ...config };
  }

  /**
   * Assess the quality of a reconciled field
   */
  assessFieldQuality<T>(
    reconciledField: ReconciledField<T>,
    sourceAttributions: SourceAttribution[],
  ): FieldQuality {
    const factors: QualityFactor[] = [];
    let score = 0.5; // Base score

    // Factor 1: Confidence level
    const confidenceFactor = reconciledField.confidence;
    factors.push({
      name: "confidence",
      impact: (confidenceFactor - 0.5) * 0.4, // -0.2 to +0.2
      description: `Confidence level: ${(confidenceFactor * 100).toFixed(1)}%`,
    });
    score += (confidenceFactor - 0.5) * 0.4;

    // Factor 2: Number of sources
    const sourceCount = sourceAttributions.length;
    const sourceCountImpact = Math.min(sourceCount / 3, 1) * 0.2 - 0.1; // -0.1 to +0.1
    factors.push({
      name: "source_count",
      impact: sourceCountImpact,
      description: `Number of sources: ${sourceCount}`,
    });
    score += sourceCountImpact;

    // Factor 3: Source reliability
    const avgReliability =
      sourceAttributions.length > 0
        ? sourceAttributions.reduce((sum, s) => sum + s.fieldReliability, 0) /
          sourceAttributions.length
        : 0.5;
    const reliabilityImpact = (avgReliability - 0.5) * 0.3; // -0.15 to +0.15
    factors.push({
      name: "source_reliability",
      impact: reliabilityImpact,
      description: `Average source reliability: ${(avgReliability * 100).toFixed(1)}%`,
    });
    score += reliabilityImpact;

    // Factor 4: Conflicts
    const hasConflicts = (reconciledField.conflicts?.length || 0) > 0;
    const conflictImpact = hasConflicts ? -0.15 : 0;
    if (hasConflicts) {
      factors.push({
        name: "conflicts",
        impact: conflictImpact,
        description: `Has ${reconciledField.conflicts!.length} conflicts`,
      });
    }
    score += conflictImpact;

    // Factor 5: Data completeness (if value is null or empty)
    const isEmpty = this.isValueEmpty(reconciledField.value);

    if (isEmpty) {
      const emptinessImpact = -0.3;
      factors.push({
        name: "completeness",
        impact: emptinessImpact,
        description: "Field is empty or null",
      });
      score += emptinessImpact;
    }

    // Normalize score to 0-1 range
    score = Math.max(0, Math.min(1, score));

    // Determine quality level
    const level = this.determineQualityLevel(score);

    // Generate suggestions
    const suggestions = this.generateSuggestions(
      reconciledField,
      sourceAttributions,
      hasConflicts,
      isEmpty,
    );

    return { score, level, factors, suggestions };
  }

  /**
   * Assess the quality of a library entry
   */
  assessLibraryQuality(
    entry: LibraryEntry,
    fieldQualityScores: number[],
    overallConfidence: number,
  ): LibraryQualityAssessment {
    // Calculate completeness based on filled fields
    const completeness = this.calculateCompleteness(entry);

    // Accuracy is based on overall confidence
    const accuracy = overallConfidence;

    // Consistency is based on field quality scores
    const validScores = fieldQualityScores.filter((score) => !isNaN(score) && isFinite(score));
    const consistency =
      validScores.length > 0
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
        : 0.5;

    // Overall score
    const score = completeness * 0.4 + accuracy * 0.4 + consistency * 0.2;

    // Determine level
    const level = this.determineQualityLevel(score);

    // Identify strengths and improvements
    const { strengths, improvements } = this.identifyStrengthsAndImprovements(
      completeness,
      accuracy,
      consistency,
    );

    return { score, level, completeness, accuracy, consistency, strengths, improvements };
  }

  /**
   * Calculate completeness of a library entry
   */
  private calculateCompleteness(entry: LibraryEntry): number {
    const totalFields = 15; // Total number of possible fields
    let filledFields = 0;

    if (entry.title) filledFields++;
    if (entry.authors && entry.authors.length > 0) filledFields++;
    if (entry.isbn && entry.isbn.length > 0) filledFields++;
    if (entry.publicationDate) filledFields++;
    if (entry.publisher) filledFields++;
    if (entry.series && entry.series.length > 0) filledFields++;
    if (entry.subjects && entry.subjects.length > 0) filledFields++;
    if (entry.description) filledFields++;
    if (entry.language) filledFields++;
    if (entry.physicalDescription) filledFields++;
    if (entry.coverImage) filledFields++;
    if (entry.work) filledFields++;
    if (entry.edition) filledFields++;
    if (entry.identifiers && entry.identifiers.length > 0) filledFields++;

    return filledFields / totalFields;
  }

  /**
   * Check if a value is empty
   */
  private isValueEmpty<T>(value: T): boolean {
    return (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  /**
   * Determine quality level from score
   */
  private determineQualityLevel(score: number): FieldQuality["level"] {
    if (score >= 0.9) return "excellent";
    if (score >= this.config.goodQualityThreshold) return "good";
    if (score >= 0.5) return "fair";
    return "poor";
  }

  /**
   * Generate suggestions for improving field quality
   */
  private generateSuggestions<T>(
    reconciledField: ReconciledField<T>,
    sourceAttributions: SourceAttribution[],
    hasConflicts: boolean,
    isEmpty: boolean,
  ): string[] {
    const suggestions: string[] = [];

    if (!this.config.includeQualitySuggestions) {
      return suggestions;
    }

    if (reconciledField.confidence < 0.7) {
      suggestions.push("Consider adding more reliable sources for this field");
    }
    if (sourceAttributions.length < 2) {
      suggestions.push("Additional sources would improve confidence");
    }
    if (hasConflicts) {
      suggestions.push("Review and resolve conflicts between sources");
    }
    if (isEmpty) {
      suggestions.push("This field is missing data - consider additional metadata sources");
    }

    return suggestions;
  }

  /**
   * Identify strengths and improvements for library quality
   */
  private identifyStrengthsAndImprovements(
    completeness: number,
    accuracy: number,
    consistency: number,
  ): { strengths: string[]; improvements: string[] } {
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (completeness > 0.8) strengths.push("High data completeness");
    if (accuracy > 0.8) strengths.push("High confidence in metadata");
    if (consistency > 0.8) strengths.push("Consistent data quality across fields");

    if (completeness < 0.6) improvements.push("Add more metadata fields");
    if (accuracy < 0.7) improvements.push("Improve metadata confidence with additional sources");
    if (consistency < 0.6) improvements.push("Resolve quality inconsistencies between fields");

    return { strengths, improvements };
  }
}
