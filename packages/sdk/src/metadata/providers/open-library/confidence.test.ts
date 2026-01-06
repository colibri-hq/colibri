/**
 * Tests for OpenLibrary confidence calculation utilities
 */

import { describe, expect, it } from "vitest";
import type { MetadataRecord } from "../provider.js";
import {
  calculateAggregatedConfidence,
  calculateAgreementBoost,
  calculateConfidenceFactors,
  calculateConsensusStrength,
  calculateDataCompleteness,
  calculateDisagreementPenalty,
  calculateOverallAgreementScore,
  calculateReliabilityBoost,
  calculateSourceReliabilityScore,
  DEFAULT_CONFIDENCE_CONFIG,
  determineConfidenceTier,
} from "./confidence.js";

/**
 * Helper to create a mock MetadataRecord
 */
function createMockRecord(
  overrides: Partial<MetadataRecord> = {},
): MetadataRecord {
  return {
    title: "The Hobbit",
    authors: ["J.R.R. Tolkien"],
    confidence: 0.85,
    source: "test-source",
    ...overrides,
  };
}

describe("OpenLibrary Confidence Utilities", () => {
  describe("DEFAULT_CONFIDENCE_CONFIG", () => {
    it("should have expected default values", () => {
      expect(DEFAULT_CONFIDENCE_CONFIG.maxConfidence).toBe(0.98);
      expect(DEFAULT_CONFIDENCE_CONFIG.minConfidence).toBe(0.3);
      expect(DEFAULT_CONFIDENCE_CONFIG.maxConsensusBoost).toBe(0.15);
      expect(DEFAULT_CONFIDENCE_CONFIG.maxAgreementBoost).toBe(0.1);
      expect(DEFAULT_CONFIDENCE_CONFIG.maxDisagreementPenalty).toBe(0.2);
      expect(DEFAULT_CONFIDENCE_CONFIG.enableLogging).toBe(false);
    });
  });

  describe("calculateConfidenceFactors", () => {
    it("should return empty factors for empty results", () => {
      const factors = calculateConfidenceFactors([]);
      expect(factors.finalConfidence).toBe(0.3);
      expect(factors.tier).toBe("poor");
      expect(factors.factors.sourceCount).toBe(0);
    });

    it("should handle single result", () => {
      const result = createMockRecord({ confidence: 0.8 });
      const factors = calculateConfidenceFactors([result]);

      expect(factors.baseConfidence).toBe(0.8);
      expect(factors.consensusBoost).toBe(0);
      expect(factors.agreementBoost).toBe(0);
      expect(factors.factors.sourceCount).toBe(1);
      expect(factors.penalties).toContain("single-source-cap");
    });

    it("should apply consensus boost for multiple agreeing results", () => {
      const results = [
        createMockRecord({ confidence: 0.85 }),
        createMockRecord({ confidence: 0.8 }),
        createMockRecord({ confidence: 0.75 }),
      ];
      const factors = calculateConfidenceFactors(results);

      expect(factors.consensusBoost).toBeGreaterThan(0);
      expect(factors.factors.sourceCount).toBe(3);
    });

    it("should cap final confidence at maxConfidence", () => {
      const highConfResults = [
        createMockRecord({ confidence: 0.99, isbn: ["978-0-618-00222-4"] }),
        createMockRecord({ confidence: 0.99, isbn: ["978-0-618-00222-4"] }),
        createMockRecord({ confidence: 0.99, isbn: ["978-0-618-00222-4"] }),
      ];
      const factors = calculateConfidenceFactors(highConfResults);

      expect(factors.finalConfidence).toBeLessThanOrEqual(0.98);
    });

    it("should respect minConfidence floor", () => {
      const lowConfResults = [
        createMockRecord({ confidence: 0.1, title: "A" }),
        createMockRecord({ confidence: 0.15, title: "B" }),
      ];
      const factors = calculateConfidenceFactors(lowConfResults);

      expect(factors.finalConfidence).toBeGreaterThanOrEqual(0.3);
    });

    it("should allow custom configuration", () => {
      const factors = calculateConfidenceFactors([], {
        minConfidence: 0.5,
      });

      expect(factors.finalConfidence).toBe(0.5);
    });
  });

  describe("calculateAggregatedConfidence", () => {
    it("should return confidence result with factors", () => {
      const result = createMockRecord({ confidence: 0.85 });
      const aggregated = calculateAggregatedConfidence([result]);

      expect(aggregated.confidence).toBeDefined();
      expect(aggregated.factors).toBeDefined();
      expect(aggregated.factors.tier).toBeDefined();
    });

    it("should calculate correctly for multiple sources", () => {
      const results = [
        createMockRecord({
          confidence: 0.9,
          title: "The Hobbit",
          isbn: ["978-0-618-00222-4"],
        }),
        createMockRecord({
          confidence: 0.85,
          title: "The Hobbit",
          isbn: ["978-0-618-00222-4"],
        }),
      ];
      const aggregated = calculateAggregatedConfidence(results);

      expect(aggregated.confidence).toBeGreaterThan(0.85);
      expect(aggregated.factors.factors.sourceCount).toBe(2);
    });
  });

  describe("calculateAgreementBoost", () => {
    it("should return 0 for single result", () => {
      const boost = calculateAgreementBoost([createMockRecord()]);
      expect(boost).toBe(0);
    });

    it("should return 0 for empty results", () => {
      const boost = calculateAgreementBoost([]);
      expect(boost).toBe(0);
    });

    it("should boost for matching titles", () => {
      const results = [
        createMockRecord({ title: "The Hobbit" }),
        createMockRecord({ title: "The Hobbit" }),
      ];
      const boost = calculateAgreementBoost(results);

      expect(boost).toBeGreaterThan(0);
    });

    it("should reduce boost for different titles", () => {
      const sameTitle = [
        createMockRecord({ title: "The Hobbit" }),
        createMockRecord({ title: "The Hobbit" }),
      ];
      const differentTitle = [
        createMockRecord({ title: "The Hobbit" }),
        createMockRecord({ title: "The Lord of the Rings" }),
      ];

      const sameBoost = calculateAgreementBoost(sameTitle);
      const diffBoost = calculateAgreementBoost(differentTitle);

      expect(sameBoost).toBeGreaterThan(diffBoost);
    });

    it("should boost for matching authors", () => {
      const results = [
        createMockRecord({ authors: ["J.R.R. Tolkien"] }),
        createMockRecord({ authors: ["J.R.R. Tolkien"] }),
      ];
      const boost = calculateAgreementBoost(results);

      expect(boost).toBeGreaterThan(0);
    });

    it("should boost for matching ISBNs", () => {
      const results = [
        createMockRecord({ isbn: ["978-0-618-00222-4"] }),
        createMockRecord({ isbn: ["978-0-618-00222-4"] }),
      ];
      const boost = calculateAgreementBoost(results);

      expect(boost).toBeGreaterThan(0);
    });

    it("should boost for matching publication years", () => {
      const results = [
        createMockRecord({ publicationDate: new Date("1937-09-21") }),
        createMockRecord({ publicationDate: new Date("1937-01-15") }),
      ];
      const boost = calculateAgreementBoost(results);

      expect(boost).toBeGreaterThan(0);
    });

    it("should respect maxBoost parameter", () => {
      const results = [
        createMockRecord({
          title: "The Hobbit",
          authors: ["J.R.R. Tolkien"],
          isbn: ["978-0-618-00222-4"],
          publicationDate: new Date("1937-09-21"),
        }),
        createMockRecord({
          title: "The Hobbit",
          authors: ["J.R.R. Tolkien"],
          isbn: ["978-0-618-00222-4"],
          publicationDate: new Date("1937-09-21"),
        }),
      ];

      const boost = calculateAgreementBoost(results, 0.05);
      expect(boost).toBeLessThanOrEqual(0.05);
    });
  });

  describe("calculateDisagreementPenalty", () => {
    it("should return 0 for single result", () => {
      const penalty = calculateDisagreementPenalty([createMockRecord()]);
      expect(penalty).toBe(0);
    });

    it("should return 0 for matching results", () => {
      const results = [
        createMockRecord({
          title: "The Hobbit",
          authors: ["J.R.R. Tolkien"],
          publicationDate: new Date("1937-09-21"),
        }),
        createMockRecord({
          title: "The Hobbit",
          authors: ["J.R.R. Tolkien"],
          publicationDate: new Date("1937-09-21"),
        }),
      ];
      const penalty = calculateDisagreementPenalty(results);

      expect(penalty).toBeCloseTo(0, 5);
    });

    it("should penalize different titles", () => {
      const results = [
        createMockRecord({ title: "The Hobbit" }),
        createMockRecord({ title: "The Lord of the Rings" }),
      ];
      const penalty = calculateDisagreementPenalty(results);

      expect(penalty).toBeGreaterThan(0);
    });

    it("should penalize different author counts", () => {
      const results = [
        createMockRecord({ authors: ["Author A"] }),
        createMockRecord({ authors: ["Author A", "Author B", "Author C"] }),
      ];
      const penalty = calculateDisagreementPenalty(results);

      expect(penalty).toBeGreaterThan(0);
    });

    it("should penalize different publication years", () => {
      const results = [
        createMockRecord({ publicationDate: new Date("1937-01-01") }),
        createMockRecord({ publicationDate: new Date("1967-01-01") }),
      ];
      const penalty = calculateDisagreementPenalty(results);

      expect(penalty).toBeGreaterThan(0);
    });

    it("should respect maxPenalty parameter", () => {
      const results = [
        createMockRecord({
          title: "A",
          authors: ["X"],
          publicationDate: new Date("1900-01-01"),
        }),
        createMockRecord({
          title: "B",
          authors: ["X", "Y", "Z"],
          publicationDate: new Date("2000-01-01"),
        }),
      ];

      const penalty = calculateDisagreementPenalty(results, 0.1);
      expect(penalty).toBeLessThanOrEqual(0.1);
    });
  });

  describe("calculateReliabilityBoost", () => {
    it("should return 0 for empty results", () => {
      const boost = calculateReliabilityBoost([]);
      expect(boost).toBe(0);
    });

    it("should boost for high reliability scores", () => {
      const highReliability = [
        createMockRecord({
          confidence: 0.95,
          title: "Test",
          authors: ["Author"],
          isbn: ["978-0-618-00222-4"],
          publisher: "Publisher",
          publicationDate: new Date("2020-01-01"),
          description: "A description",
          language: "en",
          pageCount: 300,
        }),
      ];
      const boost = calculateReliabilityBoost(highReliability);

      expect(boost).toBeGreaterThan(0);
    });

    it("should return low boost for low reliability scores", () => {
      const lowReliability = [
        createMockRecord({
          confidence: 0.5,
          title: "Test",
        }),
      ];
      const boost = calculateReliabilityBoost(lowReliability);

      expect(boost).toBeLessThanOrEqual(0.01);
    });
  });

  describe("calculateSourceReliabilityScore", () => {
    it("should return 0 for empty results", () => {
      const score = calculateSourceReliabilityScore([]);
      expect(score).toBe(0);
    });

    it("should weight by confidence and completeness", () => {
      const highQuality = [
        createMockRecord({
          confidence: 0.95,
          title: "Test",
          authors: ["Author"],
          isbn: ["978-0-618-00222-4"],
          publisher: "Publisher",
          publicationDate: new Date("2020-01-01"),
          description: "A description",
          language: "en",
          pageCount: 300,
          subjects: ["Fiction"],
        }),
      ];
      const lowQuality = [
        createMockRecord({
          confidence: 0.5,
          title: "Test",
        }),
      ];

      const highScore = calculateSourceReliabilityScore(highQuality);
      const lowScore = calculateSourceReliabilityScore(lowQuality);

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe("calculateDataCompleteness", () => {
    it("should return 0 for empty record", () => {
      const completeness = calculateDataCompleteness({
        confidence: 0.5,
        source: "test",
      });
      expect(completeness).toBeCloseTo(0, 5);
    });

    it("should return 1 for complete record", () => {
      const completeness = calculateDataCompleteness({
        confidence: 0.95,
        source: "test",
        title: "The Hobbit",
        authors: ["J.R.R. Tolkien"],
        isbn: ["978-0-618-00222-4"],
        publicationDate: new Date("1937-09-21"),
        publisher: "George Allen & Unwin",
        subjects: ["Fantasy", "Adventure"],
        description: "A hobbit's journey",
        language: "en",
        pageCount: 310,
      });
      expect(completeness).toBe(1);
    });

    it("should calculate partial completeness correctly", () => {
      const completeness = calculateDataCompleteness({
        confidence: 0.75,
        source: "test",
        title: "The Hobbit",
        authors: ["J.R.R. Tolkien"],
        isbn: ["978-0-618-00222-4"],
      });
      // 3 out of 9 fields present
      expect(completeness).toBeCloseTo(3 / 9, 5);
    });
  });

  describe("calculateConsensusStrength", () => {
    it("should return 1.0 for single result", () => {
      const strength = calculateConsensusStrength([createMockRecord()]);
      expect(strength).toBe(1.0);
    });

    it("should increase with more agreeing sources", () => {
      const twoSources = [
        createMockRecord({ title: "The Hobbit" }),
        createMockRecord({ title: "The Hobbit" }),
      ];
      const fourSources = [
        createMockRecord({ title: "The Hobbit" }),
        createMockRecord({ title: "The Hobbit" }),
        createMockRecord({ title: "The Hobbit" }),
        createMockRecord({ title: "The Hobbit" }),
      ];

      const twoStrength = calculateConsensusStrength(twoSources);
      const fourStrength = calculateConsensusStrength(fourSources);

      expect(fourStrength).toBeGreaterThanOrEqual(twoStrength);
    });

    it("should cap at 1.0", () => {
      const manySources = Array(10)
        .fill(null)
        .map(() =>
          createMockRecord({
            title: "The Hobbit",
            authors: ["J.R.R. Tolkien"],
            isbn: ["978-0-618-00222-4"],
          }),
        );
      const strength = calculateConsensusStrength(manySources);

      expect(strength).toBeLessThanOrEqual(1.0);
    });
  });

  describe("calculateOverallAgreementScore", () => {
    it("should return 1.0 for single result", () => {
      const score = calculateOverallAgreementScore([createMockRecord()]);
      expect(score).toBe(1.0);
    });

    it("should return high score for matching results", () => {
      const results = [
        createMockRecord({
          title: "The Hobbit",
          authors: ["J.R.R. Tolkien"],
          isbn: ["978-0-618-00222-4"],
        }),
        createMockRecord({
          title: "The Hobbit",
          authors: ["J.R.R. Tolkien"],
          isbn: ["978-0-618-00222-4"],
        }),
      ];
      const score = calculateOverallAgreementScore(results);

      expect(score).toBeGreaterThan(0.9);
    });

    it("should return lower score for mismatched results", () => {
      const results = [
        createMockRecord({
          title: "The Hobbit",
          authors: ["J.R.R. Tolkien"],
        }),
        createMockRecord({
          title: "The Lord of the Rings",
          authors: ["Different Author"],
        }),
      ];
      const score = calculateOverallAgreementScore(results);

      expect(score).toBeLessThanOrEqual(0.5);
    });

    it("should give high score for common ISBNs", () => {
      const results = [
        createMockRecord({
          isbn: ["978-0-618-00222-4", "0-618-00222-1"],
        }),
        createMockRecord({
          isbn: ["978-0-618-00222-4"],
        }),
      ];
      const score = calculateOverallAgreementScore(results);

      expect(score).toBeGreaterThan(0.9);
    });
  });

  describe("determineConfidenceTier", () => {
    it("should return exceptional for >= 0.95", () => {
      expect(determineConfidenceTier(0.95)).toBe("exceptional");
      expect(determineConfidenceTier(0.98)).toBe("exceptional");
      expect(determineConfidenceTier(1.0)).toBe("exceptional");
    });

    it("should return strong for 0.90-0.94", () => {
      expect(determineConfidenceTier(0.9)).toBe("strong");
      expect(determineConfidenceTier(0.94)).toBe("strong");
    });

    it("should return good for 0.80-0.89", () => {
      expect(determineConfidenceTier(0.8)).toBe("good");
      expect(determineConfidenceTier(0.89)).toBe("good");
    });

    it("should return moderate for 0.65-0.79", () => {
      expect(determineConfidenceTier(0.65)).toBe("moderate");
      expect(determineConfidenceTier(0.79)).toBe("moderate");
    });

    it("should return weak for 0.50-0.64", () => {
      expect(determineConfidenceTier(0.5)).toBe("weak");
      expect(determineConfidenceTier(0.64)).toBe("weak");
    });

    it("should return poor for < 0.50", () => {
      expect(determineConfidenceTier(0.49)).toBe("poor");
      expect(determineConfidenceTier(0.0)).toBe("poor");
      expect(determineConfidenceTier(0.3)).toBe("poor");
    });
  });

  describe("Integration scenarios", () => {
    it("should handle OpenLibrary typical scenario", () => {
      // Simulate OpenLibrary returning multiple edition results
      const results = [
        createMockRecord({
          title: "The Hobbit, or There and Back Again",
          authors: ["J. R. R. Tolkien"],
          isbn: ["978-0-618-00222-4"],
          publicationDate: new Date("1937-09-21"),
          publisher: "George Allen & Unwin",
          confidence: 0.88,
        }),
        createMockRecord({
          title: "The Hobbit",
          authors: ["J.R.R. Tolkien"],
          isbn: ["0-618-00222-1", "978-0-618-00222-4"],
          publicationDate: new Date("1937-01-01"),
          publisher: "Houghton Mifflin",
          confidence: 0.82,
        }),
        createMockRecord({
          title: "The Hobbit",
          authors: ["John Ronald Reuel Tolkien"],
          publicationDate: new Date("1937-09-21"),
          confidence: 0.75,
        }),
      ];

      const aggregated = calculateAggregatedConfidence(results);

      // Should have reasonable confidence due to some agreement
      expect(aggregated.confidence).toBeGreaterThan(0.8);
      expect(aggregated.factors.factors.sourceCount).toBe(3);
      // With 3 sources and common ISBNs, achieves "strong" tier
      expect(["good", "strong"]).toContain(aggregated.factors.tier);
    });

    it("should handle high consensus scenario", () => {
      // Perfect agreement across sources
      const results = [
        createMockRecord({
          title: "1984",
          authors: ["George Orwell"],
          isbn: ["978-0-452-28423-4"],
          publicationDate: new Date("1949-06-08"),
          confidence: 0.92,
        }),
        createMockRecord({
          title: "1984",
          authors: ["George Orwell"],
          isbn: ["978-0-452-28423-4"],
          publicationDate: new Date("1949-06-08"),
          confidence: 0.9,
        }),
        createMockRecord({
          title: "1984",
          authors: ["George Orwell"],
          isbn: ["978-0-452-28423-4"],
          publicationDate: new Date("1949-06-08"),
          confidence: 0.88,
        }),
      ];

      const aggregated = calculateAggregatedConfidence(results);

      // High consensus should boost confidence
      expect(aggregated.confidence).toBeGreaterThan(0.9);
      expect(["exceptional", "strong"]).toContain(aggregated.factors.tier);
    });

    it("should handle low quality sources scenario", () => {
      const results = [
        createMockRecord({
          title: "Unknown Book",
          confidence: 0.4,
        }),
        createMockRecord({
          title: "Unknown Book",
          confidence: 0.35,
        }),
      ];

      const aggregated = calculateAggregatedConfidence(results);

      // Low quality sources should result in low final confidence
      expect(aggregated.confidence).toBeLessThan(0.6);
      expect(aggregated.factors.penalties).toContain("low-source-quality");
    });

    it("should handle conflicting data scenario", () => {
      const results = [
        createMockRecord({
          title: "Book Title A",
          authors: ["Author One"],
          publicationDate: new Date("1950-01-01"),
          confidence: 0.8,
        }),
        createMockRecord({
          title: "Book Title B",
          authors: ["Author Two"],
          publicationDate: new Date("2010-01-01"),
          confidence: 0.8,
        }),
      ];

      const aggregated = calculateAggregatedConfidence(results);

      // Conflicting data should penalize confidence
      expect(aggregated.factors.disagreementPenalty).toBeGreaterThan(0);
      expect(aggregated.confidence).toBeLessThan(0.9);
    });
  });
});
