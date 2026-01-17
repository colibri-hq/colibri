import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MetadataRecord } from "./providers/provider.js";
import { OpenLibraryMetadataProvider } from "./providers/open-library.js";

// Mock the OpenLibrary client
vi.mock("@colibri-hq/open-library-client", () => ({
  Client: class MockClient {
    searchBook = vi.fn();
  },
}));

describe("OpenLibraryMetadataProvider - Confidence Factor Tracking", () => {
  let provider: OpenLibraryMetadataProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenLibraryMetadataProvider();
  });

  // Helper function to create mock metadata records
  const createMockRecord = (overrides: Partial<MetadataRecord> = {}): MetadataRecord => ({
    id: `test-${Date.now()}-${Math.random()}`,
    source: "OpenLibrary",
    confidence: 0.8,
    timestamp: new Date(),
    title: "Test Book",
    authors: ["Test Author"],
    language: "eng",
    ...overrides,
  });

  describe("Detailed Confidence Factor Calculation", () => {
    it("should calculate detailed confidence factors for single result", () => {
      const results = [createMockRecord({ confidence: 0.85 })];

      const analysis = provider.getConfidenceAnalysis(results);

      expect(analysis).toMatchObject({
        baseConfidence: 0.85,
        consensusBoost: 0,
        agreementBoost: 0,
        qualityBoost: 0,
        sourceCountBoost: 0,
        reliabilityBoost: 0,
        disagreementPenalty: 0,
        languagePreferenceBoost: 0,
        penalties: ["single-source-cap"],
        tier: "good",
        factors: { sourceCount: 1, agreementScore: 1.0, avgQuality: 0.85, consensusStrength: 1.0 },
      });

      expect(analysis.finalConfidence).toBe(0.85);
    });

    it("should calculate detailed confidence factors for multiple agreeing results", () => {
      const results = [
        createMockRecord({
          confidence: 0.8,
          title: "Consensus Book",
          authors: ["Same Author"],
          publicationDate: new Date("2020-01-01"),
        }),
        createMockRecord({
          confidence: 0.85,
          title: "Consensus Book",
          authors: ["Same Author"],
          publicationDate: new Date("2020-01-01"),
        }),
        createMockRecord({
          confidence: 0.9,
          title: "Consensus Book",
          authors: ["Same Author"],
          publicationDate: new Date("2020-01-01"),
        }),
      ];

      const analysis = provider.getConfidenceAnalysis(results);

      expect(analysis.factors.sourceCount).toBe(3);
      expect(analysis.factors.agreementScore).toBeGreaterThan(0.8);
      expect(analysis.consensusBoost).toBeGreaterThan(0);
      expect(analysis.agreementBoost).toBeGreaterThan(0);
      expect(analysis.tier).toBe("exceptional");
      expect(analysis.finalConfidence).toBeGreaterThan(0.9);
    });

    it("should calculate penalties for disagreeing results", () => {
      const results = [
        createMockRecord({
          confidence: 0.7,
          title: "Book A",
          authors: ["Author A"],
          publicationDate: new Date("2020-01-01"),
        }),
        createMockRecord({
          confidence: 0.75,
          title: "Book B",
          authors: ["Author B"],
          publicationDate: new Date("2021-01-01"),
        }),
      ];

      const analysis = provider.getConfidenceAnalysis(results);

      expect(analysis.disagreementPenalty).toBeGreaterThan(0);
      expect(analysis.factors.agreementScore).toBeLessThan(0.8);
      expect(analysis.penalties).toContain("few-sources");
      expect(analysis.tier).toBe("moderate"); // Should be lower due to disagreement
    });
  });

  describe("Confidence Caps and Scoring Tiers", () => {
    it("should apply exceptional tier requirements", () => {
      const results = Array.from({ length: 5 }, () =>
        createMockRecord({
          confidence: 0.95,
          title: "Perfect Book",
          authors: ["Perfect Author"],
          publicationDate: new Date("2020-01-01"),
          language: "eng",
          publisher: "Perfect Publisher",
        }),
      );

      const analysis = provider.getConfidenceAnalysis(results);

      expect(analysis.tier).toBe("exceptional");
      expect(analysis.finalConfidence).toBeGreaterThan(0.95);
      expect(analysis.finalConfidence).toBeLessThan(1.0);
    });

    it("should cap confidence at 0.98 maximum", () => {
      const results = Array.from({ length: 10 }, () =>
        createMockRecord({
          confidence: 0.99,
          title: "Perfect Book",
          authors: ["Perfect Author"],
          publicationDate: new Date("2020-01-01"),
          language: "eng",
          publisher: "Perfect Publisher",
          isbn: ["9781234567890"],
          subjects: ["Fiction"],
          description: "Perfect description",
          pageCount: 300,
        }),
      );

      const analysis = provider.getConfidenceAnalysis(results);

      expect(analysis.finalConfidence).toBeLessThanOrEqual(0.98);
      // The perfect score cap might not be triggered if other caps apply first
      expect(analysis.finalConfidence).toBeLessThan(1.0);
    });

    it("should enforce minimum confidence floor", () => {
      const results = [
        createMockRecord({ confidence: 0.1, title: "Poor Book A" }),
        createMockRecord({ confidence: 0.15, title: "Poor Book B" }),
      ];

      const analysis = provider.getConfidenceAnalysis(results);

      expect(analysis.finalConfidence).toBeGreaterThanOrEqual(0.3);
      expect(analysis.penalties).toContain("minimum-confidence-floor");
      // With extracted module, 0.3 confidence is "poor" tier (< 0.50)
      expect(analysis.tier).toBe("poor");
    });

    it("should apply weak consensus cap for poor agreement", () => {
      const results = [
        createMockRecord({ confidence: 0.9, title: "Book A", authors: ["Author A"] }),
        createMockRecord({ confidence: 0.85, title: "Book B", authors: ["Author B"] }),
        createMockRecord({ confidence: 0.88, title: "Book C", authors: ["Author C"] }),
      ];

      const analysis = provider.getConfidenceAnalysis(results);

      expect(analysis.finalConfidence).toBeLessThan(0.9);
      expect(analysis.penalties).toContain("weak-consensus-cap");
    });
  });

  describe("Debugging Utilities", () => {
    it("should provide comprehensive confidence analysis", () => {
      const results = [
        createMockRecord({ confidence: 0.8, title: "Test Book" }),
        createMockRecord({ confidence: 0.85, title: "Test Book" }),
        createMockRecord({ confidence: 0.75, title: "Different Book" }),
      ];

      const analysis = provider.analyzeConfidenceFactors(results);

      expect(analysis).toHaveProperty("summary");
      expect(analysis).toHaveProperty("detailed");
      expect(analysis).toHaveProperty("recommendations");

      expect(analysis.summary).toMatchObject({
        finalConfidence: expect.any(Number),
        tier: expect.any(String),
        sourceCount: 3,
        primaryFactors: expect.any(Array),
        majorPenalties: expect.any(Array),
      });

      expect(analysis.recommendations).toBeInstanceOf(Array);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it("should compare confidence calculations between result sets", () => {
      const resultSets = [
        {
          name: "High Quality",
          results: [
            createMockRecord({ confidence: 0.9, title: "Book", authors: ["Author"] }),
            createMockRecord({ confidence: 0.95, title: "Book", authors: ["Author"] }),
            createMockRecord({ confidence: 0.88, title: "Book", authors: ["Author"] }),
          ],
        },
        {
          name: "Low Quality",
          results: [
            createMockRecord({ confidence: 0.6, title: "Book A" }),
            createMockRecord({ confidence: 0.65, title: "Book B" }),
          ],
        },
      ];

      const comparison = provider.compareConfidenceCalculations(resultSets);

      expect(comparison).toHaveProperty("comparison");
      expect(comparison).toHaveProperty("winner");
      expect(comparison).toHaveProperty("analysis");

      expect(comparison.winner).toBe("High Quality");
      expect(comparison.comparison).toHaveLength(2);
      expect(comparison.analysis).toContain("High Quality");
    });

    it("should export confidence calculation settings", () => {
      const settings = provider.getConfidenceCalculationSettings();

      expect(settings).toHaveProperty("caps");
      expect(settings).toHaveProperty("boosts");
      expect(settings).toHaveProperty("penalties");
      expect(settings).toHaveProperty("tiers");

      expect(settings.caps.maximum).toBe(0.98);
      expect(settings.caps.minimum).toBe(0.3);
      expect(settings.tiers.exceptional.min).toBe(0.95);
      expect(settings.tiers.poor.max).toBe(0.3);
    });
  });

  // TODO: Skipped - debug logging was removed from implementation
  describe.skip("Confidence Factor Logging", () => {
    it("should log confidence details in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      try {
        process.env.NODE_ENV = "development";

        const results = [
          createMockRecord({ confidence: 0.8 }),
          createMockRecord({ confidence: 0.85 }),
        ];

        provider.getConfidenceAnalysis(results);

        expect(consoleSpy).toHaveBeenCalledWith(
          "🔍 Confidence Calculation Details:",
          expect.objectContaining({
            sourceCount: 2,
            tier: expect.any(String),
            finalConfidence: expect.any(Number),
            breakdown: expect.any(Object),
            factors: expect.any(Object),
            penalties: expect.any(Array),
            sources: expect.any(Array),
          }),
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
        consoleSpy.mockRestore();
      }
    });

    it("should log confidence details when DEBUG_CONFIDENCE is enabled", () => {
      const originalDebug = process.env.DEBUG_CONFIDENCE;
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      try {
        process.env.DEBUG_CONFIDENCE = "true";

        const results = [createMockRecord({ confidence: 0.8 })];

        provider.getConfidenceAnalysis(results);

        expect(consoleSpy).toHaveBeenCalledWith(
          "🔍 Confidence Calculation Details:",
          expect.any(Object),
        );
      } finally {
        process.env.DEBUG_CONFIDENCE = originalDebug;
        consoleSpy.mockRestore();
      }
    });
  });

  describe("Additional Edge Cases", () => {
    it("should handle empty result arrays gracefully", () => {
      const analysis = provider.getConfidenceAnalysis([]);

      expect(analysis.finalConfidence).toBe(0.3); // Minimum confidence floor
      expect(analysis.tier).toBe("poor");
      expect(analysis.factors.sourceCount).toBe(0);
      expect(analysis.factors.agreementScore).toBe(0);
    });

    it("should handle results with extreme confidence values", () => {
      const results = [
        createMockRecord({ confidence: 0.01 }), // Very low confidence
        createMockRecord({ confidence: 0.99 }), // Very high confidence
        createMockRecord({ confidence: 0.5 }), // Medium confidence
      ];

      const analysis = provider.getConfidenceAnalysis(results);

      expect(analysis.finalConfidence).toBeGreaterThanOrEqual(0.3);
      expect(analysis.finalConfidence).toBeLessThan(1.0);
      expect(analysis.factors.sourceCount).toBe(3);
    });

    it("should handle results with identical metadata", () => {
      const identicalResults = Array.from({ length: 5 }, () =>
        createMockRecord({
          confidence: 0.8,
          title: "Identical Book",
          authors: ["Same Author"],
          publicationDate: new Date("2020-01-01"),
          language: "eng",
          publisher: "Same Publisher",
        }),
      );

      const analysis = provider.getConfidenceAnalysis(identicalResults);

      expect(analysis.factors.agreementScore).toBeGreaterThan(0.9);
      expect(analysis.tier).toBe("exceptional");
      expect(analysis.finalConfidence).toBeGreaterThan(0.9);
    });

    it("should handle mixed quality sources with partial agreement", () => {
      const mixedResults = [
        createMockRecord({
          confidence: 0.9,
          title: "Mixed Quality Book",
          authors: ["Primary Author"],
          publicationDate: new Date("2020-01-01"),
          language: "eng",
          publisher: "Good Publisher",
          isbn: ["9781234567890"],
          subjects: ["Fiction", "Literature"],
        }),
        createMockRecord({
          confidence: 0.7,
          title: "Mixed Quality Book",
          authors: ["Primary Author"],
          publicationDate: new Date("2020-01-01"),
          language: "eng",
          // Missing other fields - lower completeness
        }),
        createMockRecord({
          confidence: 0.4,
          title: "Mixed Quality Book",
          authors: ["Different Author"], // Disagreement
          publicationDate: new Date("2021-01-01"), // Disagreement
          // Very incomplete
        }),
      ];

      const analysis = provider.getConfidenceAnalysis(mixedResults);

      expect(analysis.disagreementPenalty).toBeGreaterThan(0);
      expect(analysis.factors.agreementScore).toBeLessThan(0.9);
      // The tier might be 'good' or 'strong' due to high-quality sources despite some disagreement
      expect(["moderate", "good", "strong"]).toContain(analysis.tier);
    });

    it("should handle confidence calculation with language preferences", () => {
      const multiLanguageResults = [
        createMockRecord({
          confidence: 0.8,
          title: "Multilingual Book",
          authors: ["Author Name"],
          language: "eng", // Preferred language
          publisher: "English Publisher",
        }),
        createMockRecord({
          confidence: 0.8,
          title: "Multilingual Book",
          authors: ["Author Name"],
          language: "eng", // Preferred language
          publisher: "English Publisher",
        }),
        createMockRecord({
          confidence: 0.85,
          title: "Multilingual Book",
          authors: ["Author Name"],
          language: "ger", // Non-preferred language
          publisher: "German Publisher",
        }),
      ];

      const analysis = provider.getConfidenceAnalysis(multiLanguageResults);

      // Should have good agreement despite language differences
      expect(analysis.factors.agreementScore).toBeGreaterThan(0.7);
      expect(analysis.finalConfidence).toBeGreaterThan(0.8);
    });

    it("should track confidence factors for debugging edge cases", () => {
      const edgeCaseResults = [
        createMockRecord({
          confidence: 0.95,
          title: "Edge Case Book",
          authors: ["Test Author"],
          publicationDate: new Date("2020-01-01"),
          language: "eng",
          publisher: "Test Publisher",
          isbn: ["9781234567890"],
          subjects: ["Test Subject"],
          description: "Test description",
          pageCount: 200,
        }),
      ];

      const analysis = provider.getConfidenceAnalysis(edgeCaseResults);

      expect(analysis.penalties).toContain("single-source-cap");
      expect(analysis.factors.sourceCount).toBe(1);
      expect(analysis.factors.agreementScore).toBe(1.0);
      expect(analysis.factors.avgQuality).toBe(0.95);
    });
  });
});
