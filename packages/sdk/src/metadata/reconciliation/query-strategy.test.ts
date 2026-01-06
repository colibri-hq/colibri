import { beforeEach, describe, expect, it } from "vitest";
import type { RelaxationRule } from "./query-strategy.js";
import { QueryStrategyBuilder } from "./query-strategy.js";
import type { MultiCriteriaQuery } from "../providers/provider.js";

describe("QueryStrategyBuilder", () => {
  let builder: QueryStrategyBuilder;

  beforeEach(() => {
    builder = new QueryStrategyBuilder();
  });

  describe("constructor", () => {
    it("should use default configuration", () => {
      const config = builder.getConfig();
      expect(config.maxFallbacks).toBe(5);
      expect(config.enableFuzzyMatching).toBe(true);
      expect(config.relaxLanguage).toBe(true);
      expect(config.relaxAuthors).toBe(true);
      expect(config.relaxSubjects).toBe(true);
      expect(config.relaxPublisher).toBe(true);
      expect(config.relaxYearRange).toBe(true);
    });

    it("should accept custom configuration", () => {
      const customBuilder = new QueryStrategyBuilder({
        maxFallbacks: 3,
        enableFuzzyMatching: false,
        relaxLanguage: false,
      });

      const config = customBuilder.getConfig();
      expect(config.maxFallbacks).toBe(3);
      expect(config.enableFuzzyMatching).toBe(false);
      expect(config.relaxLanguage).toBe(false);
      expect(config.relaxAuthors).toBe(true); // Default value
    });
  });

  describe("buildStrategy", () => {
    it("should create strategy with primary query and fallbacks", () => {
      const query: MultiCriteriaQuery = {
        title: "The Great Gatsby",
        authors: ["F. Scott Fitzgerald"],
        language: "en",
        publisher: "Scribner",
        yearRange: [1920, 1930],
      };

      const strategy = builder.buildStrategy(query);

      expect(strategy.primary).toEqual(query);
      expect(strategy.fallbacks.length).toBeGreaterThan(0);
      expect(strategy.relaxationRules.length).toBeGreaterThan(0);
    });

    it("should apply fuzzy matching as first fallback", () => {
      const query: MultiCriteriaQuery = {
        title: "The Great Gatsby",
        authors: ["F. Scott Fitzgerald"],
      };

      const strategy = builder.buildStrategy(query);

      expect(strategy.fallbacks[0]).toEqual({
        title: "The Great Gatsby",
        authors: ["F. Scott Fitzgerald"],
        fuzzy: true,
      });
    });

    it("should remove language constraint", () => {
      const query: MultiCriteriaQuery = {
        title: "The Great Gatsby",
        language: "en",
      };

      const strategy = builder.buildStrategy(query);

      // Should have fuzzy enabled first, then language removed
      const languageRemovedQuery = strategy.fallbacks.find(
        (q) => q.title === "The Great Gatsby" && !q.language && q.fuzzy,
      );
      expect(languageRemovedQuery).toBeDefined();
    });

    it("should broaden author search when multiple authors", () => {
      const query: MultiCriteriaQuery = {
        title: "Some Book",
        authors: ["Author One", "Author Two", "Author Three"],
      };

      const strategy = builder.buildStrategy(query);

      // Should find a fallback with only the first author
      const broadenedQuery = strategy.fallbacks.find(
        (q) =>
          q.authors && q.authors.length === 1 && q.authors[0] === "Author One",
      );
      expect(broadenedQuery).toBeDefined();
    });

    it("should remove subjects constraint", () => {
      const query: MultiCriteriaQuery = {
        title: "Science Book",
        subjects: ["Physics", "Mathematics"],
      };

      const strategy = builder.buildStrategy(query);

      const subjectsRemovedQuery = strategy.fallbacks.find(
        (q) => q.title === "Science Book" && !q.subjects,
      );
      expect(subjectsRemovedQuery).toBeDefined();
    });

    it("should remove publisher constraint", () => {
      const query: MultiCriteriaQuery = {
        title: "Published Book",
        publisher: "Some Publisher",
      };

      const strategy = builder.buildStrategy(query);

      const publisherRemovedQuery = strategy.fallbacks.find(
        (q) => q.title === "Published Book" && !q.publisher,
      );
      expect(publisherRemovedQuery).toBeDefined();
    });

    it("should broaden year range", () => {
      const query: MultiCriteriaQuery = {
        title: "Historical Book",
        yearRange: [1990, 2000],
      };

      const strategy = builder.buildStrategy(query);

      const broadenedQuery = strategy.fallbacks.find((q) => {
        if (!q.yearRange) return false;
        const [start, end] = q.yearRange;
        return start < 1990 && end > 2000;
      });
      expect(broadenedQuery).toBeDefined();
    });

    it("should create title-only fallback as most relaxed", () => {
      // Use a builder with higher maxFallbacks to ensure title-only rule is reached
      const builderWithMoreFallbacks = new QueryStrategyBuilder({
        maxFallbacks: 10,
      });

      const query: MultiCriteriaQuery = {
        title: "Complex Query",
        authors: ["Author"],
        publisher: "Publisher",
        language: "en",
        subjects: ["Subject"],
        yearRange: [2000, 2010],
      };

      const strategy = builderWithMoreFallbacks.buildStrategy(query);

      // The title-only query should be the last fallback (most relaxed)
      const titleOnlyQuery = strategy.fallbacks.find(
        (q) =>
          q.title === "Complex Query" &&
          q.fuzzy === true &&
          Object.keys(q).length === 2, // Only title and fuzzy
      );
      expect(titleOnlyQuery).toBeDefined();
    });

    it("should respect maxFallbacks configuration", () => {
      const limitedBuilder = new QueryStrategyBuilder({ maxFallbacks: 2 });

      const query: MultiCriteriaQuery = {
        title: "Complex Query",
        authors: ["Author"],
        publisher: "Publisher",
        language: "en",
        subjects: ["Subject"],
        yearRange: [2000, 2010],
      };

      const strategy = limitedBuilder.buildStrategy(query);
      expect(strategy.fallbacks.length).toBeLessThanOrEqual(2);
    });

    it("should not create duplicate fallback queries", () => {
      const query: MultiCriteriaQuery = {
        title: "Simple Query",
      };

      const strategy = builder.buildStrategy(query);

      // With a simple query, many relaxation rules won't apply
      // Should not have duplicate queries
      const queryStrings = strategy.fallbacks.map((q) => JSON.stringify(q));
      const uniqueQueries = new Set(queryStrings);
      expect(uniqueQueries.size).toBe(strategy.fallbacks.length);
    });
  });

  describe("assessResultQuality", () => {
    it("should assess no results as poor quality", () => {
      const assessment = builder.assessResultQuality([]);

      expect(assessment.resultCount).toBe(0);
      expect(assessment.averageConfidence).toBe(0);
      expect(assessment.meetsThreshold).toBe(false);
      expect(assessment.reason).toBe("No results found");
    });

    it("should assess high-confidence results as good quality", () => {
      const results = [
        { confidence: 0.9 },
        { confidence: 0.8 },
        { confidence: 0.85 },
      ];

      const assessment = builder.assessResultQuality(results);

      expect(assessment.resultCount).toBe(3);
      expect(assessment.averageConfidence).toBeCloseTo(0.85);
      expect(assessment.meetsThreshold).toBe(true);
      expect(assessment.reason).toBe("Results meet quality threshold");
    });

    it("should assess low-confidence results as poor quality", () => {
      const results = [
        { confidence: 0.3 },
        { confidence: 0.4 },
        { confidence: 0.2 },
      ];

      const assessment = builder.assessResultQuality(results);

      expect(assessment.resultCount).toBe(3);
      expect(assessment.averageConfidence).toBeCloseTo(0.3);
      expect(assessment.meetsThreshold).toBe(false);
      expect(assessment.reason).toContain("Results below threshold");
    });

    it("should use custom thresholds", () => {
      const results = [{ confidence: 0.5 }];

      const assessment = builder.assessResultQuality(results, 2, 0.8);

      expect(assessment.meetsThreshold).toBe(false);
      expect(assessment.reason).toContain("Results below threshold");
    });
  });

  describe("relaxation rule management", () => {
    it("should add custom relaxation rules", () => {
      const customRule: RelaxationRule = {
        name: "custom-rule",
        description: "Custom test rule",
        priority: 10,
        apply: (query) => ({ ...query, custom: true }) as any,
      };

      builder.addRelaxationRule(customRule);
      const rules = builder.getRelaxationRules();

      expect(rules.find((r) => r.name === "custom-rule")).toBeDefined();
    });

    it("should remove relaxation rules", () => {
      const removed = builder.removeRelaxationRule("enable-fuzzy");
      expect(removed).toBe(true);

      const rules = builder.getRelaxationRules();
      expect(rules.find((r) => r.name === "enable-fuzzy")).toBeUndefined();
    });

    it("should return false when removing non-existent rule", () => {
      const removed = builder.removeRelaxationRule("non-existent");
      expect(removed).toBe(false);
    });

    it("should maintain rule priority order", () => {
      const rule1: RelaxationRule = {
        name: "rule-1",
        description: "Rule 1",
        priority: 5,
        apply: (q) => q,
      };

      const rule2: RelaxationRule = {
        name: "rule-2",
        description: "Rule 2",
        priority: 1,
        apply: (q) => q,
      };

      builder.addRelaxationRule(rule1);
      builder.addRelaxationRule(rule2);

      const rules = builder.getRelaxationRules();
      const rule2Index = rules.findIndex((r) => r.name === "rule-2");
      const rule1Index = rules.findIndex((r) => r.name === "rule-1");

      expect(rule2Index).toBeLessThan(rule1Index); // Lower priority comes first
    });
  });

  describe("configuration management", () => {
    it("should update configuration", () => {
      builder.updateConfig({
        maxFallbacks: 10,
        enableFuzzyMatching: false,
      });

      const config = builder.getConfig();
      expect(config.maxFallbacks).toBe(10);
      expect(config.enableFuzzyMatching).toBe(false);
      expect(config.relaxLanguage).toBe(true); // Unchanged
    });

    it("should recreate rules when configuration changes", () => {
      const originalRules = builder.getRelaxationRules();
      const fuzzyRule = originalRules.find((r) => r.name === "enable-fuzzy");
      expect(fuzzyRule).toBeDefined();

      builder.updateConfig({ enableFuzzyMatching: false });

      const newRules = builder.getRelaxationRules();
      const newFuzzyRule = newRules.find((r) => r.name === "enable-fuzzy");
      expect(newFuzzyRule).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty query", () => {
      const strategy = builder.buildStrategy({});

      expect(strategy.primary).toEqual({});
      expect(strategy.fallbacks.length).toBe(0); // No applicable rules
    });

    it("should handle query with only title", () => {
      const query: MultiCriteriaQuery = { title: "Only Title" };
      const strategy = builder.buildStrategy(query);

      expect(strategy.primary).toEqual(query);
      // Should only have fuzzy matching as applicable rule
      expect(strategy.fallbacks.length).toBe(1);
      expect(strategy.fallbacks[0]).toEqual({
        title: "Only Title",
        fuzzy: true,
      });
    });

    it("should handle disabled relaxation features", () => {
      const restrictedBuilder = new QueryStrategyBuilder({
        enableFuzzyMatching: false,
        relaxLanguage: false,
        relaxAuthors: false,
        relaxSubjects: false,
        relaxPublisher: false,
        relaxYearRange: false,
      });

      const query: MultiCriteriaQuery = {
        title: "Complex Query",
        authors: ["Author"],
        language: "en",
        publisher: "Publisher",
      };

      const strategy = restrictedBuilder.buildStrategy(query);

      // Should only have title-only fallback
      expect(strategy.fallbacks.length).toBe(1);
      expect(strategy.fallbacks[0]).toEqual({
        title: "Complex Query",
        fuzzy: true,
      });
    });
  });
});
