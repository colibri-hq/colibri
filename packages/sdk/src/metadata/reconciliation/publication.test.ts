import { describe, expect, it } from "vitest";
import type { MetadataSource, PublicationInfoInput } from "./types.js";
import { PublicationReconciler } from "./publication.js";

describe("PublicationReconciler", () => {
  const reconciler = new PublicationReconciler();

  const mockSource1: MetadataSource = {
    name: "OpenLibrary",
    reliability: 0.8,
    timestamp: new Date("2024-01-01"),
  };

  const mockSource2: MetadataSource = {
    name: "WikiData",
    reliability: 0.9,
    timestamp: new Date("2024-01-02"),
  };

  describe("reconcilePublicationInfo", () => {
    it("should reconcile complete publication information", () => {
      const inputs: PublicationInfoInput[] = [
        {
          date: "2023-05-15",
          publisher: "Penguin Random House",
          place: "New York",
          source: mockSource1,
        },
        { date: "2023", publisher: "Penguin", place: "NYC", source: mockSource2 },
      ];

      const result = reconciler.reconcilePublicationInfo(inputs);

      expect(result.date.value.year).toBe(2023);
      expect(result.date.value.precision).toBe("day");
      expect(result.publisher.value.normalized).toBe("penguin random house");
      expect(result.place.value.normalized).toBe("new york");
    });

    it("should handle partial information", () => {
      const inputs: PublicationInfoInput[] = [
        { date: "2023", source: mockSource1 },
        { publisher: "Example Press", source: mockSource2 },
      ];

      const result = reconciler.reconcilePublicationInfo(inputs);

      expect(result.date.value.year).toBe(2023);
      expect(result.publisher.value.name).toBe("Example Press");
      expect(result.place.confidence).toBe(0); // No place information
    });

    it("should handle missing information gracefully", () => {
      const inputs: PublicationInfoInput[] = [{ date: "2023", source: mockSource1 }];

      const result = reconciler.reconcilePublicationInfo(inputs);

      expect(result.date.value.year).toBe(2023);
      expect(result.publisher.confidence).toBe(0);
      expect(result.place.confidence).toBe(0);
      expect(result.publisher.reasoning).toContain("No publisher information");
      expect(result.place.reasoning).toContain("No place information");
    });

    it("should throw error for empty input", () => {
      expect(() => reconciler.reconcilePublicationInfo([])).toThrow(
        "No publication information to reconcile",
      );
    });

    it("should throw error for no valid information", () => {
      const inputs: PublicationInfoInput[] = [{ source: mockSource1 }];

      expect(() => reconciler.reconcilePublicationInfo(inputs)).toThrow(
        "No valid publication information found",
      );
    });
  });

  describe("getOverallConfidence", () => {
    it("should calculate weighted confidence score", () => {
      const reconciledInfo = {
        date: {
          value: { year: 2023, precision: "year" as const },
          confidence: 0.8,
          sources: [mockSource1],
        },
        publisher: {
          value: { name: "Test Publisher", normalized: "test publisher" },
          confidence: 0.9,
          sources: [mockSource1],
        },
        place: {
          value: { name: "Test City", normalized: "test city" },
          confidence: 0.7,
          sources: [mockSource1],
        },
      };

      const overallConfidence = reconciler.getOverallConfidence(reconciledInfo);

      // Expected: 0.8 * 0.4 + 0.9 * 0.4 + 0.7 * 0.2 = 0.82
      expect(overallConfidence).toBeCloseTo(0.82, 2);
    });

    it("should handle zero confidence values", () => {
      const reconciledInfo = {
        date: { value: { precision: "unknown" as const }, confidence: 0, sources: [] },
        publisher: { value: { name: "", normalized: "" }, confidence: 0, sources: [] },
        place: { value: { name: "", normalized: "" }, confidence: 0, sources: [] },
      };

      const overallConfidence = reconciler.getOverallConfidence(reconciledInfo);
      expect(overallConfidence).toBe(0);
    });
  });

  describe("getAllConflicts", () => {
    it("should collect conflicts from all fields", () => {
      const reconciledInfo = {
        date: {
          value: { year: 2023, precision: "year" as const },
          confidence: 0.8,
          sources: [mockSource1],
          conflicts: [
            {
              field: "publication_date",
              values: [{ value: "2023", source: mockSource1 }],
              resolution: "test",
            },
          ],
        },
        publisher: {
          value: { name: "Test Publisher", normalized: "test publisher" },
          confidence: 0.9,
          sources: [mockSource1],
          conflicts: [
            {
              field: "publisher",
              values: [{ value: "Test", source: mockSource1 }],
              resolution: "test",
            },
          ],
        },
        place: {
          value: { name: "Test City", normalized: "test city" },
          confidence: 0.7,
          sources: [mockSource1],
        },
      };

      const conflicts = reconciler.getAllConflicts(reconciledInfo);
      expect(conflicts).toHaveLength(2);
      expect(conflicts[0].field).toBe("publication_date");
      expect(conflicts[1].field).toBe("publisher");
    });

    it("should return empty array when no conflicts", () => {
      const reconciledInfo = {
        date: {
          value: { year: 2023, precision: "year" as const },
          confidence: 0.8,
          sources: [mockSource1],
        },
        publisher: {
          value: { name: "Test Publisher", normalized: "test publisher" },
          confidence: 0.9,
          sources: [mockSource1],
        },
        place: {
          value: { name: "Test City", normalized: "test city" },
          confidence: 0.7,
          sources: [mockSource1],
        },
      };

      const conflicts = reconciler.getAllConflicts(reconciledInfo);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe("getAllSources", () => {
    it("should collect unique sources from all fields", () => {
      const reconciledInfo = {
        date: {
          value: { year: 2023, precision: "year" as const },
          confidence: 0.8,
          sources: [mockSource1],
        },
        publisher: {
          value: { name: "Test Publisher", normalized: "test publisher" },
          confidence: 0.9,
          sources: [mockSource2],
        },
        place: {
          value: { name: "Test City", normalized: "test city" },
          confidence: 0.7,
          sources: [mockSource1, mockSource2],
        },
      };

      const sources = reconciler.getAllSources(reconciledInfo);
      expect(sources).toHaveLength(2);
      expect(sources.map((s) => s.name)).toContain("OpenLibrary");
      expect(sources.map((s) => s.name)).toContain("WikiData");
    });

    it("should handle empty sources", () => {
      const reconciledInfo = {
        date: { value: { precision: "unknown" as const }, confidence: 0, sources: [] },
        publisher: { value: { name: "", normalized: "" }, confidence: 0, sources: [] },
        place: { value: { name: "", normalized: "" }, confidence: 0, sources: [] },
      };

      const sources = reconciler.getAllSources(reconciledInfo);
      expect(sources).toHaveLength(0);
    });
  });
});
