import { describe, expect, it } from "vitest";
import { DateReconciler } from "./dates.js";
import type { MetadataSource, PublicationInfoInput } from "./types.js";

describe("DateReconciler", () => {
  const reconciler = new DateReconciler();

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

  describe("normalizeDate", () => {
    it("should parse ISO date format", () => {
      const result = reconciler.normalizeDate("2023-05-15");
      expect(result).toEqual({
        year: 2023,
        month: 5,
        day: 15,
        raw: "2023-05-15",
        precision: "day",
      });
    });

    it("should parse year-month format", () => {
      const result = reconciler.normalizeDate("2023-05");
      expect(result).toEqual({
        year: 2023,
        month: 5,
        raw: "2023-05",
        precision: "month",
      });
    });

    it("should parse year only", () => {
      const result = reconciler.normalizeDate("2023");
      expect(result).toEqual({
        year: 2023,
        raw: "2023",
        precision: "year",
      });
    });

    it("should extract year from longer strings", () => {
      const result = reconciler.normalizeDate(
        "Published in 2023 by Example Press",
      );
      expect(result).toEqual({
        year: 2023,
        raw: "Published in 2023 by Example Press",
        precision: "year",
      });
    });

    it("should handle unknown date formats", () => {
      const result = reconciler.normalizeDate("sometime in the past");
      expect(result).toEqual({
        raw: "sometime in the past",
        precision: "unknown",
      });
    });

    it("should validate PublicationDate objects", () => {
      const input = {
        year: 2023,
        month: 13, // Invalid month
        day: 15,
        precision: "day" as const,
      };

      const result = reconciler.normalizeDate(input);
      expect(result.month).toBeUndefined();
      expect(result.precision).toBe("year");
    });
  });

  describe("reconcileDates", () => {
    it("should handle single date input", () => {
      const inputs: PublicationInfoInput[] = [
        {
          date: "2023-05-15",
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcileDates(inputs);
      expect(result.value.year).toBe(2023);
      expect(result.value.month).toBe(5);
      expect(result.value.day).toBe(15);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sources).toHaveLength(1);
      expect(result.reasoning).toBe("Single source");
    });

    it("should prefer more specific dates", () => {
      const inputs: PublicationInfoInput[] = [
        {
          date: "2023",
          source: mockSource1,
        },
        {
          date: "2023-05-15",
          source: mockSource2,
        },
      ];

      const result = reconciler.reconcileDates(inputs);
      expect(result.value.precision).toBe("day");
      expect(result.value.day).toBe(15);
      expect(result.reasoning).toContain("most specific");
    });

    it("should prefer more reliable sources when precision is equal", () => {
      const inputs: PublicationInfoInput[] = [
        {
          date: "2023-05-15",
          source: mockSource1, // reliability 0.8
        },
        {
          date: "2023-05-16",
          source: mockSource2, // reliability 0.9
        },
      ];

      const result = reconciler.reconcileDates(inputs);
      expect(result.value.day).toBe(16); // From more reliable source
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts![0].values).toHaveLength(2);
    });

    it("should handle dates with unknown precision", () => {
      const inputs: PublicationInfoInput[] = [
        {
          date: "unknown date",
          source: mockSource1,
        },
        {
          date: "sometime",
          source: mockSource2,
        },
      ];

      const result = reconciler.reconcileDates(inputs);
      expect(result.value.precision).toBe("unknown");
      expect(result.confidence).toBeLessThan(0.5);
    });

    it("should throw error for empty input", () => {
      expect(() => reconciler.reconcileDates([])).toThrow(
        "No publication dates to reconcile",
      );
    });
  });
});
