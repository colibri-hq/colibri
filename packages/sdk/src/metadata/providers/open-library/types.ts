/**
 * OpenLibrary-specific types and interfaces
 *
 * Shared types used across OpenLibrary confidence calculation and name utilities.
 */

import type { MetadataRecord } from "../provider.js";

/**
 * Confidence tier classification for result quality
 */
export type ConfidenceTier =
  | "exceptional"
  | "strong"
  | "good"
  | "moderate"
  | "weak"
  | "poor";

/**
 * Detailed confidence factor breakdown for transparency and debugging
 */
export interface ConfidenceFactors {
  /** Base confidence from source quality */
  baseConfidence: number;
  /** Boost from multiple sources agreeing */
  consensusBoost: number;
  /** Boost from field-level agreement */
  agreementBoost: number;
  /** Boost from high-quality sources */
  qualityBoost: number;
  /** Penalty for source disagreement */
  disagreementPenalty: number;
  /** Boost for preferred language matches */
  languagePreferenceBoost: number;
  /** Boost from having many sources */
  sourceCountBoost: number;
  /** Boost from source reliability */
  reliabilityBoost: number;
  /** List of penalty reasons applied */
  penalties: string[];
  /** Final calculated confidence value */
  finalConfidence: number;
  /** Confidence tier classification */
  tier: ConfidenceTier;
  /** Detailed factor values */
  factors: {
    sourceCount: number;
    agreementScore: number;
    avgQuality: number;
    consensusStrength: number;
    reliabilityScore: number;
  };
}

/**
 * Parsed name components for author name handling
 */
export interface NameComponents {
  /** First name */
  first: string;
  /** Middle names */
  middle: string[];
  /** Last name (including particles like "van", "von", etc.) */
  last: string;
  /** Title prefixes (Dr., Prof., etc.) */
  prefixes: string[];
  /** Name suffixes (Jr., III, PhD, etc.) */
  suffixes: string[];
  /** Original unparsed name */
  original: string;
}

/**
 * Configuration for confidence calculation
 */
export interface ConfidenceConfig {
  /** Maximum confidence value (default: 0.98) */
  maxConfidence?: number;
  /** Minimum confidence value (default: 0.30) */
  minConfidence?: number;
  /** Maximum consensus boost (default: 0.15) */
  maxConsensusBoost?: number;
  /** Maximum agreement boost (default: 0.10) */
  maxAgreementBoost?: number;
  /** Maximum disagreement penalty (default: 0.20) */
  maxDisagreementPenalty?: number;
  /** Enable debug logging (default: false) */
  enableLogging?: boolean;
}

/**
 * Result of aggregating multiple metadata records
 */
export interface AggregatedResult {
  /** The aggregated metadata record */
  record: MetadataRecord;
  /** Confidence factors used in calculation */
  factors: ConfidenceFactors;
  /** Source records that were aggregated */
  sources: MetadataRecord[];
}

/**
 * Confidence calculation result
 */
export interface ConfidenceResult {
  /** Final confidence value */
  confidence: number;
  /** Detailed factors breakdown */
  factors: ConfidenceFactors;
}
