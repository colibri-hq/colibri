/**
 * OpenLibrary utilities
 *
 * Extracted utilities for confidence calculation and name handling
 * used by the OpenLibraryMetadataProvider.
 */

// Types
export type {
  ConfidenceTier,
  ConfidenceFactors,
  ConfidenceConfig,
  ConfidenceResult,
  AggregatedResult,
  NameComponents,
} from "./types.js";

// Confidence utilities
export {
  calculateConfidenceFactors,
  calculateAggregatedConfidence,
  calculateAgreementBoost,
  calculateDisagreementPenalty,
  calculateReliabilityBoost,
  calculateSourceReliabilityScore,
  calculateDataCompleteness,
  calculateConsensusStrength,
  calculateOverallAgreementScore,
  determineConfidenceTier,
  DEFAULT_CONFIDENCE_CONFIG,
} from "./confidence.js";

// Name utilities
export {
  parseNameComponents,
  convertToFirstLastFormat,
  normalizeNameForComparison,
  matchesWithInitials,
  areNamesEquivalent,
  getPreferredNameFormat,
  isLastFirstFormat,
  normalizeAuthorName,
} from "./name-utils.js";
