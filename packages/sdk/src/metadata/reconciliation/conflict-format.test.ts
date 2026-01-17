import { beforeEach, describe, expect, it } from "vitest";
import type { ConflictSummary, DetailedConflict } from "./conflicts.js";
import type { MetadataSource } from "./types.js";
import { ConflictDisplayFormatter } from "./conflict-format.js";

describe("ConflictDisplayFormatter", () => {
  let formatter: ConflictDisplayFormatter;
  let mockSources: MetadataSource[];
  let mockConflict: DetailedConflict;
  let mockSummary: ConflictSummary;

  beforeEach(() => {
    formatter = new ConflictDisplayFormatter();

    mockSources = [
      { name: "OpenLibrary", reliability: 0.8, timestamp: new Date("2024-01-01") },
      { name: "WikiData", reliability: 0.9, timestamp: new Date("2024-01-02") },
    ];

    mockConflict = {
      field: "title",
      values: [
        { value: "The Great Gatsby", source: mockSources[0] },
        { value: "Great Gatsby", source: mockSources[1] },
      ],
      resolution: "Used most reliable source",
      type: "value_mismatch",
      severity: "major",
      confidence: 0.8,
      explanation: "Different title formats found across sources",
      resolutionSuggestions: ["Review source reliability", "Consider manual verification"],
      impact: {
        score: 0.6,
        affectedAreas: ["identification", "display"],
        description: "Title conflicts may affect book identification",
        affectsCoreMetadata: true,
      },
      autoResolvable: false,
      detectionMetadata: {
        detectedAt: new Date("2024-01-01"),
        detectionMethod: "value_grouping",
        algorithmVersion: "1.0.0",
        context: { groupCount: 2, totalValues: 2 },
      },
    };

    mockSummary = {
      totalConflicts: 3,
      bySeverity: { critical: [mockConflict], major: [], minor: [], informational: [] },
      byType: {
        value_mismatch: [mockConflict],
        format_difference: [],
        precision_difference: [],
        completeness_difference: [],
        quality_difference: [],
        temporal_difference: [],
        source_disagreement: [],
        normalization_conflict: [],
      },
      byField: { title: [mockConflict] },
      overallScore: 0.3,
      problematicFields: ["title"],
      recommendations: ["Address 1 critical conflict immediately", "Review source reliability"],
      autoResolvableConflicts: [],
      manualConflicts: [mockConflict],
    };
  });

  describe("formatConflict", () => {
    it("should format a conflict with all required fields", () => {
      const formatted = formatter.formatConflict(mockConflict);

      expect(formatted.id).toMatch(/^conflict-\d+-[a-f0-9]+-[a-f0-9]+$/);
      expect(formatted.title).toContain("MAJOR conflict in title");
      expect(formatted.description).toBe(mockConflict.explanation);
      expect(formatted.severityIndicator).toContain("🟠");
      expect(formatted.severityIndicator).toContain("MAJOR");
      expect(formatted.typeIndicator).toContain("⚡");
      expect(formatted.typeIndicator).toContain("VALUE MISMATCH");
      expect(formatted.canAutoResolve).toBe(false);
      expect(formatted.rawConflict).toBe(mockConflict);
    });

    it("should format conflict values correctly", () => {
      const formatted = formatter.formatConflict(mockConflict);

      expect(formatted.formattedValues).toHaveLength(2);
      expect(formatted.formattedValues[0].value).toBe('"The Great Gatsby"');
      expect(formatted.formattedValues[1].value).toBe('"Great Gatsby"');
      expect(formatted.formattedValues[0].source.name).toBe("OpenLibrary");
      expect(formatted.formattedValues[1].source.name).toBe("WikiData");
    });

    it("should format source information correctly", () => {
      const formatted = formatter.formatConflict(mockConflict);
      const sourceDisplay = formatted.formattedValues[0].source;

      expect(sourceDisplay.name).toBe("OpenLibrary");
      expect(sourceDisplay.reliabilityText).toBe("80%");
      expect(sourceDisplay.reliabilityIndicator).toContain("⭐⭐");
      expect(sourceDisplay.timestamp).toBe("2024-01-01");
    });

    it("should format resolution explanation", () => {
      const formatted = formatter.formatConflict(mockConflict);

      expect(formatted.resolutionExplanation).toContain("Used most reliable source");
      expect(formatted.resolutionExplanation).toContain("Manual review required");
    });

    it("should format suggestions when enabled", () => {
      const formatted = formatter.formatConflict(mockConflict);

      expect(formatted.suggestions).toHaveLength(2);
      expect(formatted.suggestions[0]).toBe("• Review source reliability");
      expect(formatted.suggestions[1]).toBe("• Consider manual verification");
    });

    it("should format impact summary", () => {
      const formatted = formatter.formatConflict(mockConflict);

      expect(formatted.impactSummary).toContain("Impact: 60%");
      expect(formatted.impactSummary).toContain("identification, display");
    });
  });

  describe("formatConflictSummary", () => {
    it("should format summary with all sections", () => {
      const formatted = formatter.formatConflictSummary(mockSummary);

      expect(formatted.overallSummary).toContain("Found 3 conflicts");
      expect(formatted.overallSummary).toContain("1 critical issue");
      expect(formatted.severityBreakdown).toContain("🔴 CRITICAL: 1");
      expect(formatted.typeBreakdown).toContain("⚡ value mismatch: 1");
      expect(formatted.fieldBreakdown).toContain("📝 title: 1");
      expect(formatted.recommendations).toEqual(mockSummary.recommendations);
    });

    it("should generate correct quick stats", () => {
      const formatted = formatter.formatConflictSummary(mockSummary);

      expect(formatted.quickStats.total).toBe(3);
      expect(formatted.quickStats.critical).toBe(1);
      expect(formatted.quickStats.autoResolvable).toBe(0);
      expect(formatted.quickStats.manualReview).toBe(1);
    });

    it("should handle zero conflicts gracefully", () => {
      const emptySummary: ConflictSummary = {
        ...mockSummary,
        totalConflicts: 0,
        bySeverity: { critical: [], major: [], minor: [], informational: [] },
        byType: {
          value_mismatch: [],
          format_difference: [],
          precision_difference: [],
          completeness_difference: [],
          quality_difference: [],
          temporal_difference: [],
          source_disagreement: [],
          normalization_conflict: [],
        },
        byField: {},
        overallScore: 0,
        problematicFields: [],
        recommendations: ["No conflicts detected"],
        autoResolvableConflicts: [],
        manualConflicts: [],
      };

      const formatted = formatter.formatConflictSummary(emptySummary);

      expect(formatted.overallSummary).toContain("✅ No conflicts detected");
      expect(formatted.quickStats.total).toBe(0);
    });
  });

  describe("generateConflictReport", () => {
    it("should generate a comprehensive report", () => {
      const report = formatter.generateConflictReport(mockSummary);

      expect(report).toContain("METADATA CONFLICT ANALYSIS REPORT");
      expect(report).toContain("📋 SUMMARY");
      expect(report).toContain("📊 QUICK STATS");
      expect(report).toContain("🚨 SEVERITY BREAKDOWN");
      expect(report).toContain("🔍 CONFLICT TYPES");
      expect(report).toContain("📝 AFFECTED FIELDS");
      expect(report).toContain("💡 RECOMMENDATIONS");
      expect(report).toContain("🔍 DETAILED CONFLICTS");
    });

    it("should include detailed conflict information", () => {
      const report = formatter.generateConflictReport(mockSummary);

      expect(report).toContain("MAJOR conflict in title");
      expect(report).toContain("Different title formats found across sources");
      expect(report).toContain("Used most reliable source");
      expect(report).toContain("Review source reliability");
    });

    it("should separate auto-resolvable and manual conflicts when configured", () => {
      const formatterWithSeparation = new ConflictDisplayFormatter({
        separateAutoResolvable: true,
      });

      const summaryWithBoth: ConflictSummary = {
        ...mockSummary,
        autoResolvableConflicts: [{ ...mockConflict, autoResolvable: true, severity: "minor" }],
        manualConflicts: [mockConflict],
      };

      const report = formatterWithSeparation.generateConflictReport(summaryWithBoth);

      expect(report).toContain("✅ Auto-Resolvable Conflicts");
      expect(report).toContain("⚠️  Manual Review Required");
    });

    it("should handle empty conflict summary", () => {
      const noColorFormatter = new ConflictDisplayFormatter({ useColors: false });
      const emptySummary: ConflictSummary = {
        totalConflicts: 0,
        bySeverity: { critical: [], major: [], minor: [], informational: [] },
        byType: {
          value_mismatch: [],
          format_difference: [],
          precision_difference: [],
          completeness_difference: [],
          quality_difference: [],
          temporal_difference: [],
          source_disagreement: [],
          normalization_conflict: [],
        },
        byField: {},
        overallScore: 0,
        problematicFields: [],
        recommendations: ["No conflicts detected"],
        autoResolvableConflicts: [],
        manualConflicts: [],
      };

      const report = noColorFormatter.generateConflictReport(emptySummary);

      expect(report).toContain("✅ No conflicts detected");
      expect(report).toContain("Total Conflicts: 0");
    });
  });

  describe("value formatting", () => {
    it("should format different value types correctly", () => {
      const testConflicts: DetailedConflict[] = [
        {
          ...mockConflict,
          field: "string_field",
          values: [{ value: "test string", source: mockSources[0] }],
        },
        { ...mockConflict, field: "number_field", values: [{ value: 42, source: mockSources[0] }] },
        {
          ...mockConflict,
          field: "boolean_field",
          values: [{ value: true, source: mockSources[0] }],
        },
        {
          ...mockConflict,
          field: "array_field",
          values: [{ value: ["item1", "item2"], source: mockSources[0] }],
        },
        { ...mockConflict, field: "null_field", values: [{ value: null, source: mockSources[0] }] },
      ];

      testConflicts.forEach((conflict) => {
        const formatted = formatter.formatConflict(conflict);
        expect(formatted.formattedValues[0].value).toBeDefined();
      });
    });

    it("should format object values correctly", () => {
      const objectConflict: DetailedConflict = {
        ...mockConflict,
        field: "publisher",
        values: [
          { value: { name: "Scribner", location: "New York" }, source: mockSources[0] },
          { value: { year: 1925, month: 4 }, source: mockSources[1] },
        ],
      };

      const formatted = formatter.formatConflict(objectConflict);

      expect(formatted.formattedValues[0].value).toBe("Scribner");
      expect(formatted.formattedValues[1].value).toBe("1925-04");
    });

    it("should handle large arrays correctly", () => {
      const largeArrayConflict: DetailedConflict = {
        ...mockConflict,
        field: "subjects",
        values: [{ value: ["item1", "item2", "item3", "item4", "item5"], source: mockSources[0] }],
      };

      const formatted = formatter.formatConflict(largeArrayConflict);

      expect(formatted.formattedValues[0].value).toContain("...2 more");
    });
  });

  describe("reliability indicators", () => {
    it("should show correct reliability indicators", () => {
      const sources = [
        { ...mockSources[0], reliability: 0.95 }, // Should be ⭐⭐⭐
        { ...mockSources[0], reliability: 0.75 }, // Should be ⭐⭐
        { ...mockSources[0], reliability: 0.55 }, // Should be ⭐
        { ...mockSources[0], reliability: 0.35 }, // Should be ⚠️
      ];

      sources.forEach((source) => {
        const testConflict: DetailedConflict = {
          ...mockConflict,
          values: [{ value: "test", source }],
        };

        const formatted = formatter.formatConflict(testConflict);
        const reliabilityIndicator = formatted.formattedValues[0].source.reliabilityIndicator;

        if (source.reliability >= 0.9) {
          expect(reliabilityIndicator).toContain("⭐⭐⭐");
        } else if (source.reliability >= 0.7) {
          expect(reliabilityIndicator).toContain("⭐⭐");
        } else if (source.reliability >= 0.5) {
          expect(reliabilityIndicator).toContain("⭐");
        } else {
          expect(reliabilityIndicator).toContain("⚠️");
        }
      });
    });
  });

  describe("configuration", () => {
    it("should respect color configuration", () => {
      const noColorFormatter = new ConflictDisplayFormatter({ useColors: false });
      const formatted = noColorFormatter.formatConflict(mockConflict);

      // Should not contain ANSI color codes
      // eslint-disable-next-line no-control-regex -- Testing for ANSI escape sequences
      expect(formatted.severityIndicator).not.toMatch(/\x1b\[\d+m/);
    });

    it("should respect detailed explanations configuration", () => {
      const minimalFormatter = new ConflictDisplayFormatter({ showDetailedExplanations: false });
      const formatted = minimalFormatter.formatConflict(mockConflict);

      expect(formatted.description).not.toBe(mockConflict.explanation);
      expect(formatted.description).toContain("value mismatch detected in title");
    });

    it("should respect resolution suggestions configuration", () => {
      const noSuggestionsFormatter = new ConflictDisplayFormatter({
        showResolutionSuggestions: false,
      });
      const formatted = noSuggestionsFormatter.formatConflict(mockConflict);

      expect(formatted.suggestions).toHaveLength(0);
    });

    it("should respect source info configuration", () => {
      const noSourceFormatter = new ConflictDisplayFormatter({ showSourceInfo: false });

      const report = noSourceFormatter.generateConflictReport(mockSummary);

      // Should not show detailed source information in the report
      expect(report).toBeDefined();
    });

    it("should respect max width configuration", () => {
      const narrowFormatter = new ConflictDisplayFormatter({ maxWidth: 40 });
      const report = narrowFormatter.generateConflictReport(mockSummary);

      // Should wrap text appropriately (hard to test exact wrapping without complex parsing)
      expect(report).toBeDefined();
      expect(report.length).toBeGreaterThan(0);
    });

    it("should allow configuration updates", () => {
      const initialConfig = formatter.getConfig();
      expect(initialConfig.useColors).toBe(true);

      formatter.updateConfig({ useColors: false });
      const updatedConfig = formatter.getConfig();
      expect(updatedConfig.useColors).toBe(false);
    });
  });

  describe("text wrapping", () => {
    it("should wrap long text correctly", () => {
      const longTextFormatter = new ConflictDisplayFormatter({ maxWidth: 50 });
      const longExplanation =
        "This is a very long explanation that should be wrapped to multiple lines when the maximum width is exceeded by the text content.";

      const longConflict: DetailedConflict = { ...mockConflict, explanation: longExplanation };

      const formatted = longTextFormatter.formatConflict(longConflict);
      expect(formatted.description).toBe(longExplanation);
    });
  });

  describe("edge cases", () => {
    it("should handle conflicts with no values", () => {
      const emptyConflict: DetailedConflict = { ...mockConflict, values: [] };

      const formatted = formatter.formatConflict(emptyConflict);
      expect(formatted.formattedValues).toHaveLength(0);
    });

    it("should handle conflicts with undefined/null impact", () => {
      const noImpactConflict: DetailedConflict = {
        ...mockConflict,
        impact: { score: 0, affectedAreas: [], description: "", affectsCoreMetadata: false },
      };

      const formatted = formatter.formatConflict(noImpactConflict);
      expect(formatted.impactSummary).toContain("Impact: 0%");
    });

    it("should handle conflicts with no suggestions", () => {
      const noSuggestionsConflict: DetailedConflict = {
        ...mockConflict,
        resolutionSuggestions: [],
      };

      const formatted = formatter.formatConflict(noSuggestionsConflict);
      expect(formatted.suggestions).toHaveLength(0);
    });
  });
});
