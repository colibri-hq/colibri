/**
 * Confidence calculation utilities for OpenLibrary metadata aggregation
 *
 * Provides sophisticated confidence scoring based on:
 * - Source consensus (multiple sources agreeing)
 * - Field-level agreement
 * - Source quality and reliability
 * - Data completeness
 */

import type { MetadataRecord } from "../provider.js";
import type {
  ConfidenceConfig,
  ConfidenceFactors,
  ConfidenceResult,
  ConfidenceTier,
} from "./types.js";
import { cleanIsbn } from "../../utils/normalization.js";

/**
 * Default configuration for confidence calculation
 */
export const DEFAULT_CONFIDENCE_CONFIG: Required<ConfidenceConfig> = {
  maxConfidence: 0.98,
  minConfidence: 0.3,
  maxConsensusBoost: 0.15,
  maxAgreementBoost: 0.1,
  maxDisagreementPenalty: 0.2,
  enableLogging: false,
};

/**
 * Calculate confidence factors for a set of metadata results
 *
 * @param results - Array of metadata records to analyze
 * @param config - Optional configuration overrides
 * @returns Detailed confidence factors
 */
export function calculateConfidenceFactors(
  results: MetadataRecord[],
  config: ConfidenceConfig = {},
): ConfidenceFactors {
  const cfg = { ...DEFAULT_CONFIDENCE_CONFIG, ...config };

  if (results.length === 0) {
    return createEmptyFactors(cfg.minConfidence);
  }

  if (results.length === 1) {
    return createSingleSourceFactors(results[0], cfg);
  }

  return calculateMultiSourceFactors(results, cfg);
}

/**
 * Calculate aggregated confidence from multiple sources
 *
 * @param results - Array of metadata records
 * @param config - Optional configuration
 * @returns Confidence result with final value and factors
 */
export function calculateAggregatedConfidence(
  results: MetadataRecord[],
  config: ConfidenceConfig = {},
): ConfidenceResult {
  const factors = calculateConfidenceFactors(results, config);

  if (config.enableLogging) {
    logConfidenceCalculation(results, factors);
  }

  return { confidence: factors.finalConfidence, factors };
}

/**
 * Create empty factors for no results
 */
function createEmptyFactors(minConfidence: number): ConfidenceFactors {
  return {
    baseConfidence: minConfidence,
    consensusBoost: 0,
    agreementBoost: 0,
    qualityBoost: 0,
    disagreementPenalty: 0,
    languagePreferenceBoost: 0,
    sourceCountBoost: 0,
    reliabilityBoost: 0,
    penalties: [],
    finalConfidence: minConfidence,
    tier: "poor",
    factors: {
      sourceCount: 0,
      agreementScore: 0,
      avgQuality: 0,
      consensusStrength: 0,
      reliabilityScore: 0,
    },
  };
}

/**
 * Create factors for single source result
 */
function createSingleSourceFactors(
  result: MetadataRecord,
  config: Required<ConfidenceConfig>,
): ConfidenceFactors {
  const singleResultConfidence = Math.min(config.maxConfidence, result.confidence);
  return {
    baseConfidence: result.confidence,
    consensusBoost: 0,
    agreementBoost: 0,
    qualityBoost: 0,
    disagreementPenalty: 0,
    languagePreferenceBoost: 0,
    sourceCountBoost: 0,
    reliabilityBoost: 0,
    penalties: ["single-source-cap"],
    finalConfidence: singleResultConfidence,
    tier: determineConfidenceTier(singleResultConfidence),
    factors: {
      sourceCount: 1,
      agreementScore: 1.0,
      avgQuality: result.confidence,
      consensusStrength: 1.0,
      reliabilityScore: result.confidence,
    },
  };
}

/**
 * Calculate factors for multiple source results
 */
function calculateMultiSourceFactors(
  results: MetadataRecord[],
  config: Required<ConfidenceConfig>,
): ConfidenceFactors {
  // Base confidence is the weighted average (higher confidence results have more weight)
  const totalWeight = results.reduce((sum, r) => sum + r.confidence, 0);
  const baseConfidence =
    results.reduce((sum, r) => sum + r.confidence * r.confidence, 0) / totalWeight;

  // Consensus boost: more results agreeing increases confidence
  const consensusBoost = Math.min(config.maxConsensusBoost, (results.length - 1) * 0.03);

  // Agreement boost: check how much the results agree on key fields
  const agreementBoost = calculateAgreementBoost(results, config.maxAgreementBoost);

  // Quality boost: higher average confidence of sources
  const avgQuality = totalWeight / results.length;
  const qualityBoost = Math.max(0, (avgQuality - 0.7) * 0.1);

  // Source count boost: additional boost for having many agreeing sources
  const sourceCountBoost = Math.min(0.05, Math.max(0, (results.length - 3) * 0.01));

  // Reliability boost: boost based on source reliability scores
  const reliabilityBoost = calculateReliabilityBoost(results);

  // Calculate penalties for source disagreement
  const disagreementPenalty = calculateDisagreementPenalty(results, config.maxDisagreementPenalty);

  // Collect penalty reasons
  const penalties: string[] = [];
  if (disagreementPenalty > 0.1) penalties.push("high-disagreement");
  if (avgQuality < 0.6) penalties.push("low-source-quality");
  if (results.length < 3) penalties.push("few-sources");

  // Calculate preliminary confidence
  let preliminaryConfidence =
    baseConfidence +
    consensusBoost +
    agreementBoost +
    qualityBoost +
    sourceCountBoost +
    reliabilityBoost -
    disagreementPenalty;

  // Apply confidence differentiation based on consensus strength
  const agreementScore = calculateOverallAgreementScore(results);
  const consensusStrength = calculateConsensusStrength(results);
  preliminaryConfidence = applyConsensusThresholds(preliminaryConfidence, results);

  // Apply confidence caps and tiers
  const { finalConfidence, additionalPenalties } = applyConfidenceCaps(
    preliminaryConfidence,
    results,
    config,
  );
  penalties.push(...additionalPenalties);

  const tier = determineConfidenceTier(finalConfidence);

  return {
    baseConfidence,
    consensusBoost,
    agreementBoost,
    qualityBoost,
    disagreementPenalty,
    languagePreferenceBoost: 0,
    sourceCountBoost,
    reliabilityBoost,
    penalties,
    finalConfidence,
    tier,
    factors: {
      sourceCount: results.length,
      agreementScore,
      avgQuality,
      consensusStrength,
      reliabilityScore: calculateSourceReliabilityScore(results),
    },
  };
}

/**
 * Calculate agreement boost based on field-level consensus
 */
export function calculateAgreementBoost(results: MetadataRecord[], maxBoost: number = 0.1): number {
  if (results.length < 2) return 0;

  let agreementScore = 0;
  let fieldsChecked = 0;

  // Check title agreement
  const titles = results.filter((r) => r.title).map((r) => normalizeForComparison(r.title!));
  if (titles.length >= 2) {
    const uniqueTitles = new Set(titles);
    agreementScore += uniqueTitles.size === 1 ? 1 : 0.5 / uniqueTitles.size;
    fieldsChecked++;
  }

  // Check author agreement
  const authorSets = results
    .filter((r) => r.authors && r.authors.length > 0)
    .map((r) =>
      r
        .authors!.map((a) => normalizeForComparison(a))
        .sort()
        .join("|"),
    );
  if (authorSets.length >= 2) {
    const uniqueAuthorSets = new Set(authorSets);
    agreementScore += uniqueAuthorSets.size === 1 ? 1 : 0.5 / uniqueAuthorSets.size;
    fieldsChecked++;
  }

  // Check ISBN agreement
  const isbnSets = results
    .filter((r) => r.isbn && r.isbn.length > 0)
    .map((r) =>
      r
        .isbn!.map((i) => cleanIsbn(i))
        .sort()
        .join("|"),
    );
  if (isbnSets.length >= 2) {
    const uniqueIsbnSets = new Set(isbnSets);
    agreementScore += uniqueIsbnSets.size === 1 ? 1 : 0.5 / uniqueIsbnSets.size;
    fieldsChecked++;
  }

  // Check publication date agreement (year only)
  const years = results
    .filter((r) => r.publicationDate)
    .map((r) => r.publicationDate!.getFullYear());
  if (years.length >= 2) {
    const uniqueYears = new Set(years);
    agreementScore += uniqueYears.size === 1 ? 1 : 0.5 / uniqueYears.size;
    fieldsChecked++;
  }

  if (fieldsChecked === 0) return 0;

  const normalizedScore = agreementScore / fieldsChecked;
  return normalizedScore * maxBoost;
}

/**
 * Calculate disagreement penalty based on conflicting field values
 */
export function calculateDisagreementPenalty(
  results: MetadataRecord[],
  maxPenalty: number = 0.2,
): number {
  if (results.length < 2) return 0;

  let disagreementScore = 0;
  let fieldsChecked = 0;

  // Check title disagreement
  const titles = results.filter((r) => r.title).map((r) => normalizeForComparison(r.title!));
  if (titles.length >= 2) {
    const uniqueTitles = new Set(titles);
    if (uniqueTitles.size > 1) {
      disagreementScore += (uniqueTitles.size - 1) / titles.length;
    }
    fieldsChecked++;
  }

  // Check author disagreement
  const authorCounts = results.filter((r) => r.authors).map((r) => r.authors!.length);
  if (authorCounts.length >= 2) {
    const maxAuthors = Math.max(...authorCounts);
    const minAuthors = Math.min(...authorCounts);
    if (maxAuthors !== minAuthors) {
      disagreementScore += 0.3 * ((maxAuthors - minAuthors) / maxAuthors);
    }
    fieldsChecked++;
  }

  // Check publication year disagreement
  const years = results
    .filter((r) => r.publicationDate)
    .map((r) => r.publicationDate!.getFullYear());
  if (years.length >= 2) {
    const maxYear = Math.max(...years);
    const minYear = Math.min(...years);
    const yearSpread = maxYear - minYear;
    if (yearSpread > 0) {
      // Penalize more for larger year discrepancies
      disagreementScore += Math.min(0.5, yearSpread * 0.1);
    }
    fieldsChecked++;
  }

  if (fieldsChecked === 0) return 0;

  const normalizedScore = disagreementScore / fieldsChecked;
  return Math.min(maxPenalty, normalizedScore * maxPenalty);
}

/**
 * Calculate reliability boost based on source reliability scores
 */
export function calculateReliabilityBoost(results: MetadataRecord[]): number {
  if (results.length === 0) return 0;

  const reliabilityScore = calculateSourceReliabilityScore(results);

  // Up to 8% boost for high reliability
  return Math.max(0, ((reliabilityScore - 0.7) * 0.08) / 0.3);
}

/**
 * Calculate average source reliability score
 */
export function calculateSourceReliabilityScore(results: MetadataRecord[]): number {
  if (results.length === 0) return 0;

  // Calculate weighted reliability based on confidence and data completeness
  let totalWeight = 0;
  let weightedSum = 0;

  for (const result of results) {
    const completeness = calculateDataCompleteness(result);
    const weight = result.confidence * completeness;
    totalWeight += weight;
    weightedSum += result.confidence * weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Calculate data completeness for a record
 */
export function calculateDataCompleteness(record: MetadataRecord): number {
  const fields = [
    record.title,
    record.authors && record.authors.length > 0,
    record.isbn && record.isbn.length > 0,
    record.publicationDate,
    record.publisher,
    record.subjects && record.subjects.length > 0,
    record.description,
    record.language,
    record.pageCount,
  ];

  const presentFields = fields.filter(Boolean).length;
  return presentFields / fields.length;
}

/**
 * Calculate consensus strength
 */
export function calculateConsensusStrength(results: MetadataRecord[]): number {
  if (results.length < 2) return 1.0;

  const agreementScore = calculateOverallAgreementScore(results);
  const sourceCount = results.length;

  // Consensus strength increases with more agreeing sources
  const sourceBonus = Math.min(0.2, (sourceCount - 2) * 0.05);

  return Math.min(1.0, agreementScore + sourceBonus);
}

/**
 * Calculate overall agreement score across all comparable fields
 */
export function calculateOverallAgreementScore(results: MetadataRecord[]): number {
  if (results.length < 2) return 1.0;

  let totalScore = 0;
  let comparisons = 0;

  // Title comparison
  const titles = results.filter((r) => r.title).map((r) => normalizeForComparison(r.title!));
  if (titles.length >= 2) {
    const uniqueTitles = new Set(titles);
    totalScore += 1 - (uniqueTitles.size - 1) / titles.length;
    comparisons++;
  }

  // Author comparison
  const authorLists = results.filter((r) => r.authors && r.authors.length > 0);
  if (authorLists.length >= 2) {
    // Compare first author as primary indicator
    const firstAuthors = authorLists.map((r) => normalizeForComparison(r.authors![0]));
    const uniqueFirstAuthors = new Set(firstAuthors);
    totalScore += 1 - (uniqueFirstAuthors.size - 1) / firstAuthors.length;
    comparisons++;
  }

  // ISBN comparison (if at least one common ISBN, high agreement)
  const isbnSets = results
    .filter((r) => r.isbn && r.isbn.length > 0)
    .map((r) => new Set(r.isbn!.map((i) => cleanIsbn(i))));
  if (isbnSets.length >= 2) {
    let hasCommonIsbn = false;
    outer: for (const isbn of isbnSets[0]) {
      for (let i = 1; i < isbnSets.length; i++) {
        if (isbnSets[i].has(isbn)) {
          hasCommonIsbn = true;
          break outer;
        }
      }
    }
    totalScore += hasCommonIsbn ? 1 : 0.3;
    comparisons++;
  }

  return comparisons > 0 ? totalScore / comparisons : 1.0;
}

/**
 * Apply consensus thresholds to adjust confidence
 */
function applyConsensusThresholds(confidence: number, results: MetadataRecord[]): number {
  const agreementScore = calculateOverallAgreementScore(results);
  const sourceCount = results.length;

  // Strong consensus with many sources allows higher confidence
  if (agreementScore >= 0.9 && sourceCount >= 3) {
    return Math.min(0.98, confidence * 1.05);
  }

  // Moderate consensus
  if (agreementScore >= 0.7 && sourceCount >= 2) {
    return confidence;
  }

  // Weak consensus - cap confidence
  if (agreementScore < 0.6) {
    return Math.min(0.85, confidence);
  }

  return confidence;
}

/**
 * Apply confidence caps and tiers
 */
function applyConfidenceCaps(
  confidence: number,
  results: MetadataRecord[],
  config: Required<ConfidenceConfig>,
): { finalConfidence: number; additionalPenalties: string[] } {
  const penalties: string[] = [];
  let finalConfidence = confidence;

  // Never assign perfect confidence
  if (finalConfidence >= 1.0) {
    finalConfidence = config.maxConfidence;
    penalties.push("perfect-score-cap");
  }

  // Apply tier-based caps for quality control
  const agreementScore = calculateOverallAgreementScore(results);
  const sourceCount = results.length;

  // Exceptional tier (0.95-0.98): Only for very strong consensus with many sources
  if (finalConfidence > 0.95) {
    if (agreementScore < 0.85 || sourceCount < 3) {
      finalConfidence = Math.min(0.95, finalConfidence);
      penalties.push("exceptional-tier-requirements-not-met");
    }
  }

  // Strong tier (0.90-0.95): Requires good consensus
  if (finalConfidence > 0.9 && finalConfidence <= 0.95) {
    if (agreementScore < 0.7 || sourceCount < 2) {
      finalConfidence = Math.min(0.9, finalConfidence);
      penalties.push("strong-tier-requirements-not-met");
    }
  }

  // Weak consensus cap
  if (agreementScore < 0.6) {
    finalConfidence = Math.min(0.89, finalConfidence);
    penalties.push("weak-consensus-cap");
  }

  // Ensure minimum confidence
  if (finalConfidence < config.minConfidence) {
    finalConfidence = config.minConfidence;
    penalties.push("minimum-confidence-floor");
  }

  // Final cap
  finalConfidence = Math.min(config.maxConfidence, finalConfidence);

  return { finalConfidence, additionalPenalties: penalties };
}

/**
 * Determine confidence tier from value
 */
export function determineConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.95) return "exceptional";
  if (confidence >= 0.9) return "strong";
  if (confidence >= 0.8) return "good";
  if (confidence >= 0.65) return "moderate";
  if (confidence >= 0.5) return "weak";
  return "poor";
}

/**
 * Normalize a value for comparison
 */
function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Log confidence calculation for debugging
 * @deprecated Logging removed - use factors directly for debugging
 */
function logConfidenceCalculation(_results: MetadataRecord[], _factors: ConfidenceFactors): void {
  // Logging removed - confidence factors are available in the returned ConfidenceFactors
}
