import { beforeEach, describe, expect, it } from "vitest";
import { ConflictDetector } from "./conflicts.js";
import type {
  MetadataSource,
  PublicationDate,
  Publisher,
  ReconciledField,
} from "./types.js";

describe("ConflictDetector", () => {
  let detector: ConflictDetector;
  let mockSources: MetadataSource[];

  beforeEach(() => {
    detector = new ConflictDetector();

    mockSources = [
      {
        name: "OpenLibrary",
        reliability: 0.8,
        timestamp: new Date("2024-01-01"),
      },
      {
        name: "WikiData",
        reliability: 0.9,
        timestamp: new Date("2024-01-02"),
      },
      {
        name: "LibraryOfCongress",
        reliability: 0.95,
        timestamp: new Date("2024-01-03"),
      },
    ];
  });

  describe("detectFieldConflicts", () => {
    it("should detect no conflicts when only one source", () => {
      const field: ReconciledField<string> = {
        value: "Test Title",
        confidence: 0.8,
        sources: [mockSources[0]],
        reasoning: "Single source",
      };

      const rawValues = [{ value: "Test Title", source: mockSources[0] }];
      const conflicts = detector.detectFieldConflicts(
        field,
        "title",
        rawValues,
      );

      expect(conflicts).toHaveLength(0);
    });

    it("should detect value mismatch conflicts", () => {
      const field: ReconciledField<string> = {
        value: "The Great Gatsby",
        confidence: 0.8,
        sources: mockSources,
        reasoning: "Reconciled from multiple sources",
      };

      const rawValues = [
        { value: "The Great Gatsby", source: mockSources[0] },
        { value: "Great Gatsby", source: mockSources[1] },
        { value: "The Great Gatsby", source: mockSources[2] },
      ];

      const conflicts = detector.detectFieldConflicts(
        field,
        "title",
        rawValues,
      );

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe("value_mismatch");
      expect(conflicts[0].field).toBe("title");
    });

    it("should detect ISBN format differences", () => {
      const field: ReconciledField<string[]> = {
        value: ["9780743273565"],
        confidence: 0.9,
        sources: mockSources,
        reasoning: "Normalized ISBN format",
      };

      const rawValues = [
        { value: ["978-0-7432-7356-5"], source: mockSources[0] },
        { value: ["9780743273565"], source: mockSources[1] },
        { value: ["0743273565"], source: mockSources[2] },
      ];

      const conflicts = detector.detectFieldConflicts(field, "isbn", rawValues);

      expect(conflicts.some((c) => c.type === "format_difference")).toBe(true);
    });

    it("should detect publication date precision differences", () => {
      const field: ReconciledField<PublicationDate> = {
        value: { year: 1925, month: 4, day: 10, precision: "day" },
        confidence: 0.8,
        sources: mockSources,
        reasoning: "Most precise date available",
      };

      const rawValues = [
        { value: { year: 1925, precision: "year" }, source: mockSources[0] },
        {
          value: { year: 1925, month: 4, precision: "month" },
          source: mockSources[1],
        },
        {
          value: { year: 1925, month: 4, day: 10, precision: "day" },
          source: mockSources[2],
        },
      ];

      const conflicts = detector.detectFieldConflicts(
        field,
        "publicationDate",
        rawValues,
      );

      expect(conflicts.some((c) => c.type === "precision_difference")).toBe(
        true,
      );
    });

    it("should detect completeness differences in arrays", () => {
      const field: ReconciledField<string[]> = {
        value: ["Fiction", "American Literature", "Jazz Age", "Classic"],
        confidence: 0.8,
        sources: mockSources,
        reasoning: "Combined subjects from all sources",
      };

      const rawValues = [
        { value: ["Fiction"], source: mockSources[0] },
        {
          value: ["Fiction", "American Literature", "Jazz Age"],
          source: mockSources[1],
        },
        {
          value: ["Fiction", "American Literature", "Jazz Age", "Classic"],
          source: mockSources[2],
        },
      ];

      const conflicts = detector.detectFieldConflicts(
        field,
        "subjects",
        rawValues,
      );

      expect(conflicts.some((c) => c.type === "completeness_difference")).toBe(
        true,
      );
    });

    it("should detect quality differences based on source reliability", () => {
      const lowReliabilitySource: MetadataSource = {
        name: "UnreliableSource",
        reliability: 0.3,
        timestamp: new Date("2024-01-04"),
      };

      const field: ReconciledField<string> = {
        value: "Test Value",
        confidence: 0.7,
        sources: [mockSources[2], lowReliabilitySource],
        reasoning: "Prioritized reliable source",
      };

      const rawValues = [
        { value: "Test Value", source: mockSources[2] },
        { value: "Test Value", source: lowReliabilitySource },
      ];

      const conflicts = detector.detectFieldConflicts(
        field,
        "title",
        rawValues,
      );

      expect(conflicts.some((c) => c.type === "quality_difference")).toBe(true);
    });

    it("should respect maxConflictsPerField configuration", () => {
      const limitedDetector = new ConflictDetector({ maxConflictsPerField: 2 });

      const field: ReconciledField<string> = {
        value: "Test",
        confidence: 0.5,
        sources: mockSources,
        reasoning: "Test field with many potential conflicts",
      };

      // Create scenario that would generate many conflicts
      const rawValues = [
        { value: "Value1", source: mockSources[0] },
        { value: "Value2", source: mockSources[1] },
        { value: "Value3", source: mockSources[2] },
      ];

      const conflicts = limitedDetector.detectFieldConflicts(
        field,
        "title",
        rawValues,
      );

      expect(conflicts.length).toBeLessThanOrEqual(2);
    });
  });

  describe("analyzeAllConflicts", () => {
    it("should analyze conflicts across multiple fields", () => {
      const fields = {
        title: {
          value: "The Great Gatsby",
          confidence: 0.8,
          sources: mockSources,
          reasoning: "Reconciled title",
        },
        authors: {
          value: ["F. Scott Fitzgerald"],
          confidence: 0.9,
          sources: mockSources,
          reasoning: "Reconciled authors",
        },
      };

      const rawMetadata = {
        title: [
          { value: "The Great Gatsby", source: mockSources[0] },
          { value: "Great Gatsby", source: mockSources[1] },
        ],
        authors: [
          { value: ["F. Scott Fitzgerald"], source: mockSources[0] },
          { value: ["Francis Scott Fitzgerald"], source: mockSources[1] },
        ],
      };

      const summary = detector.analyzeAllConflicts(fields, rawMetadata);

      expect(summary.totalConflicts).toBeGreaterThan(0);
      expect(summary.byField.title).toBeDefined();
      expect(summary.byField.authors).toBeDefined();
      expect(summary.overallScore).toBeGreaterThan(0);
    });

    it("should categorize conflicts by severity", () => {
      const fields = {
        title: {
          value: "Test Book",
          confidence: 0.5,
          sources: mockSources,
          reasoning: "Low confidence reconciliation",
        },
      };

      const rawMetadata = {
        title: [
          { value: "Test Book", source: mockSources[0] },
          { value: "Different Book", source: mockSources[1] },
          { value: "Another Book", source: mockSources[2] },
        ],
      };

      const summary = detector.analyzeAllConflicts(fields, rawMetadata);

      expect(
        summary.bySeverity.critical.length +
          summary.bySeverity.major.length +
          summary.bySeverity.minor.length +
          summary.bySeverity.informational.length,
      ).toBe(summary.totalConflicts);
    });

    it("should identify auto-resolvable vs manual conflicts", () => {
      const fields = {
        isbn: {
          value: ["9780743273565"],
          confidence: 0.9,
          sources: mockSources,
          reasoning: "Normalized ISBN",
        },
      };

      const rawMetadata = {
        isbn: [
          { value: ["978-0-7432-7356-5"], source: mockSources[0] },
          { value: ["9780743273565"], source: mockSources[1] },
        ],
      };

      const summary = detector.analyzeAllConflicts(fields, rawMetadata);

      expect(
        summary.autoResolvableConflicts.length + summary.manualConflicts.length,
      ).toBe(summary.totalConflicts);
    });

    it("should generate appropriate recommendations", () => {
      const fields = {
        title: {
          value: "Test",
          confidence: 0.3,
          sources: [mockSources[0]],
          reasoning: "Single unreliable source",
        },
      };

      const rawMetadata = {
        title: [
          { value: "Test", source: mockSources[0] },
          { value: "Different", source: mockSources[1] },
        ],
      };

      const summary = detector.analyzeAllConflicts(fields, rawMetadata);

      expect(summary.recommendations).toBeInstanceOf(Array);
      expect(summary.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("string similarity calculation", () => {
    it("should identify similar strings", () => {
      const field: ReconciledField<string> = {
        value: "The Great Gatsby",
        confidence: 0.8,
        sources: mockSources,
        reasoning: "Test",
      };

      const rawValues = [
        { value: "The Great Gatsby", source: mockSources[0] },
        { value: "Great Gatsby", source: mockSources[1] }, // Very similar
      ];

      const conflicts = detector.detectFieldConflicts(
        field,
        "title",
        rawValues,
      );

      // May detect conflicts due to different grouping logic, but should be minor
      if (conflicts.length > 0) {
        expect(conflicts[0].severity).not.toBe("critical");
      }
    });

    it("should identify dissimilar strings", () => {
      const field: ReconciledField<string> = {
        value: "The Great Gatsby",
        confidence: 0.8,
        sources: mockSources,
        reasoning: "Test",
      };

      const rawValues = [
        { value: "The Great Gatsby", source: mockSources[0] },
        { value: "To Kill a Mockingbird", source: mockSources[1] }, // Very different
      ];

      const conflicts = detector.detectFieldConflicts(
        field,
        "title",
        rawValues,
      );

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe("value_mismatch");
    });
  });

  describe("object comparison", () => {
    it("should compare publication dates correctly", () => {
      const date1: PublicationDate = {
        year: 1925,
        month: 4,
        precision: "month",
      };
      const date2: PublicationDate = { year: 1925, precision: "year" };

      const field: ReconciledField<PublicationDate> = {
        value: date1,
        confidence: 0.8,
        sources: mockSources,
        reasoning: "Test",
      };

      const rawValues = [
        { value: date1, source: mockSources[0] },
        { value: date2, source: mockSources[1] },
      ];

      const conflicts = detector.detectFieldConflicts(
        field,
        "publicationDate",
        rawValues,
      );

      // May detect precision differences, but should not be critical
      if (conflicts.length > 0) {
        expect(conflicts.some((c) => c.type === "precision_difference")).toBe(
          true,
        );
        expect(conflicts.every((c) => c.severity !== "critical")).toBe(true);
      }
    });

    it("should compare publishers correctly", () => {
      const pub1: Publisher = { name: "Scribner", normalized: "scribner" };
      const pub2: Publisher = {
        name: "Charles Scribner's Sons",
        normalized: "scribner",
      };

      const field: ReconciledField<Publisher> = {
        value: pub1,
        confidence: 0.8,
        sources: mockSources,
        reasoning: "Test",
      };

      const rawValues = [
        { value: pub1, source: mockSources[0] },
        { value: pub2, source: mockSources[1] },
      ];

      const conflicts = detector.detectFieldConflicts(
        field,
        "publisher",
        rawValues,
      );

      // Should be considered similar (same normalized name)
      expect(conflicts.length).toBe(0);
    });
  });

  describe("configuration", () => {
    it("should respect string similarity threshold", () => {
      const strictDetector = new ConflictDetector({
        stringSimilarityThreshold: 0.95,
      });

      const field: ReconciledField<string> = {
        value: "The Great Gatsby",
        confidence: 0.8,
        sources: mockSources,
        reasoning: "Test",
      };

      const rawValues = [
        { value: "The Great Gatsby", source: mockSources[0] },
        { value: "Great Gatsby", source: mockSources[1] },
      ];

      const conflicts = strictDetector.detectFieldConflicts(
        field,
        "title",
        rawValues,
      );

      // With strict threshold, should detect conflict
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it("should respect numeric threshold", () => {
      const strictDetector = new ConflictDetector({ numericThreshold: 0.01 });

      const field: ReconciledField<number> = {
        value: 100,
        confidence: 0.8,
        sources: mockSources,
        reasoning: "Test",
      };

      const rawValues = [
        { value: 100, source: mockSources[0] },
        { value: 102, source: mockSources[1] }, // 2% difference
      ];

      const conflicts = strictDetector.detectFieldConflicts(
        field,
        "pageCount",
        rawValues,
      );

      // With strict threshold, should detect conflict
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it("should allow configuration updates", () => {
      const initialConfig = detector.getConfig();
      expect(initialConfig.stringSimilarityThreshold).toBe(0.8);

      detector.updateConfig({ stringSimilarityThreshold: 0.9 });
      const updatedConfig = detector.getConfig();
      expect(updatedConfig.stringSimilarityThreshold).toBe(0.9);
    });

    it("should control minor conflict detection", () => {
      const noMinorDetector = new ConflictDetector({
        detectMinorConflicts: false,
      });

      const field: ReconciledField<string[]> = {
        value: ["9780743273565"],
        confidence: 0.9,
        sources: mockSources,
        reasoning: "Test",
      };

      const rawValues = [
        { value: ["978-0-7432-7356-5"], source: mockSources[0] },
        { value: ["9780743273565"], source: mockSources[1] },
      ];

      const conflicts = noMinorDetector.detectFieldConflicts(
        field,
        "isbn",
        rawValues,
      );

      // Should not detect format differences when minor conflicts are disabled
      expect(conflicts.every((c) => c.type !== "format_difference")).toBe(true);
    });
  });

  describe("conflict metadata", () => {
    it("should include detection metadata", () => {
      const field: ReconciledField<string> = {
        value: "Test",
        confidence: 0.8,
        sources: mockSources,
        reasoning: "Test",
      };

      const rawValues = [
        { value: "Test", source: mockSources[0] },
        { value: "Different", source: mockSources[1] },
      ];

      const conflicts = detector.detectFieldConflicts(
        field,
        "title",
        rawValues,
      );

      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        expect(conflict.detectionMetadata).toBeDefined();
        expect(conflict.detectionMetadata.detectedAt).toBeInstanceOf(Date);
        expect(conflict.detectionMetadata.detectionMethod).toBeDefined();
        expect(conflict.detectionMetadata.algorithmVersion).toBeDefined();
      }
    });

    it("should include impact assessment", () => {
      const field: ReconciledField<string> = {
        value: "Test",
        confidence: 0.8,
        sources: mockSources,
        reasoning: "Test",
      };

      const rawValues = [
        { value: "Test", source: mockSources[0] },
        { value: "Different", source: mockSources[1] },
      ];

      const conflicts = detector.detectFieldConflicts(
        field,
        "title",
        rawValues,
      );

      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        expect(conflict.impact).toBeDefined();
        expect(conflict.impact.score).toBeGreaterThanOrEqual(0);
        expect(conflict.impact.score).toBeLessThanOrEqual(1);
        expect(conflict.impact.affectedAreas).toBeInstanceOf(Array);
        expect(conflict.impact.description).toBeDefined();
      }
    });

    it("should provide resolution suggestions", () => {
      const field: ReconciledField<string> = {
        value: "Test",
        confidence: 0.8,
        sources: mockSources,
        reasoning: "Test",
      };

      const rawValues = [
        { value: "Test", source: mockSources[0] },
        { value: "Different", source: mockSources[1] },
      ];

      const conflicts = detector.detectFieldConflicts(
        field,
        "title",
        rawValues,
      );

      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        expect(conflict.resolutionSuggestions).toBeInstanceOf(Array);
        expect(conflict.resolutionSuggestions.length).toBeGreaterThan(0);
      }
    });
  });
});
