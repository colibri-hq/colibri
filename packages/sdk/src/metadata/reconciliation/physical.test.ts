import { describe, expect, it } from "vitest";
import type { MetadataSource, PhysicalDescriptionInput } from "./types.js";
import { PhysicalReconciler } from "./physical.js";

describe("PhysicalReconciler", () => {
  const reconciler = new PhysicalReconciler();

  const mockSource1: MetadataSource = {
    name: "OpenLibrary",
    reliability: 0.8,
    timestamp: new Date("2024-01-01"),
  };

  const mockSource2: MetadataSource = {
    name: "GoogleBooks",
    reliability: 0.9,
    timestamp: new Date("2024-01-02"),
  };

  const mockSource3: MetadataSource = {
    name: "LibraryOfCongress",
    reliability: 0.95,
    timestamp: new Date("2024-01-03"),
  };

  describe("normalizePageCount", () => {
    it("should normalize numeric page counts", () => {
      expect(reconciler.normalizePageCount(320)).toBe(320);
      expect(reconciler.normalizePageCount(0)).toBeUndefined();
      expect(reconciler.normalizePageCount(-5)).toBeUndefined();
      expect(reconciler.normalizePageCount(100000)).toBeUndefined();
    });

    it("should extract page counts from strings", () => {
      expect(reconciler.normalizePageCount("320 pages")).toBe(320);
      expect(reconciler.normalizePageCount("pp. 256")).toBe(256);
      expect(reconciler.normalizePageCount("xiv + 342 pages")).toBe(342);
      expect(reconciler.normalizePageCount("Pages: 180")).toBe(180);
      expect(reconciler.normalizePageCount("no pages")).toBeUndefined();
    });

    it("should handle complex page count strings", () => {
      expect(reconciler.normalizePageCount("xvi, 284 p.")).toBe(284);
      expect(reconciler.normalizePageCount("12 + 345 + 8 pages")).toBe(345);
    });
  });

  describe("normalizeDimensions", () => {
    it("should parse dimension strings with various formats", () => {
      const result1 = reconciler.normalizeDimensions("8.5 x 11 in");
      expect(result1.width).toBeCloseTo(215.9, 1);
      expect(result1.height).toBeCloseTo(279.4, 1);
      expect(result1.unit).toBe("mm");

      const result2 = reconciler.normalizeDimensions("210 x 297 mm");
      expect(result2.width).toBe(210);
      expect(result2.height).toBe(297);
      expect(result2.unit).toBe("mm");

      const result3 = reconciler.normalizeDimensions("15.2 cm x 22.9 cm x 2.5 cm");
      expect(result3.width).toBe(152);
      expect(result3.height).toBe(229);
      expect(result3.depth).toBe(25);
      expect(result3.unit).toBe("mm");
    });

    it("should handle dimension objects", () => {
      const input = { width: 8.5, height: 11, unit: "in" as const };

      const result = reconciler.normalizeDimensions(input);
      expect(result.width).toBeCloseTo(215.9, 1);
      expect(result.height).toBeCloseTo(279.4, 1);
      expect(result.unit).toBe("mm");
    });

    it("should validate dimension ranges", () => {
      const result = reconciler.normalizeDimensions({
        width: 5, // Too small
        height: 2000, // Too large
        depth: 15,
        unit: "mm",
      });

      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
      expect(result.depth).toBe(15);
    });
  });

  describe("normalizeFormat", () => {
    it("should detect binding types", () => {
      expect(reconciler.normalizeFormat("Hardcover").binding).toBe("hardcover");
      expect(reconciler.normalizeFormat("Paperback").binding).toBe("paperback");
      expect(reconciler.normalizeFormat("Mass Market Paperback").binding).toBe("mass_market");
      expect(reconciler.normalizeFormat("Board Book").binding).toBe("board_book");
      expect(reconciler.normalizeFormat("Spiral Bound").binding).toBe("spiral");
      expect(reconciler.normalizeFormat("Leather Bound").binding).toBe("leather");
    });

    it("should detect format and medium types", () => {
      const ebook = reconciler.normalizeFormat("Kindle eBook");
      expect(ebook.format).toBe("ebook");
      expect(ebook.medium).toBe("digital");

      const audiobook = reconciler.normalizeFormat("Audible Audiobook");
      expect(audiobook.format).toBe("audiobook");
      expect(audiobook.medium).toBe("audio");

      const print = reconciler.normalizeFormat("Hardcover Book");
      expect(print.format).toBe("book");
      expect(print.medium).toBe("print");
    });

    it("should use binding hints", () => {
      const result = reconciler.normalizeFormat("Book", "hardcover");
      expect(result.binding).toBe("hardcover");
    });
  });

  describe("normalizeLanguages", () => {
    it("should normalize ISO 639-1 codes", () => {
      const result = reconciler.normalizeLanguages("en");
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("eng");
      expect(result[0].name).toBe("English");
      expect(result[0].confidence).toBe(0.9);
    });

    it("should normalize ISO 639-3 codes", () => {
      const result = reconciler.normalizeLanguages("fra");
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("fra");
      expect(result[0].name).toBe("French");
      expect(result[0].confidence).toBe(0.9);
    });

    it("should handle language-region codes", () => {
      const result = reconciler.normalizeLanguages("en-US");
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("eng");
      expect(result[0].name).toBe("English");
      expect(result[0].region).toBe("US");
    });

    it("should normalize language names", () => {
      const result = reconciler.normalizeLanguages("Spanish");
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("spa");
      expect(result[0].name).toBe("Spanish");
    });

    it("should handle arrays of languages", () => {
      const result = reconciler.normalizeLanguages(["en", "fr", "de"]);
      expect(result).toHaveLength(3);
      expect(result.map((l) => l.code)).toEqual(["eng", "fra", "deu"]);
    });

    it("should handle language objects", () => {
      const input = [{ code: "eng", name: "English", confidence: 0.95 }];
      const result = reconciler.normalizeLanguages(input);
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("eng");
      expect(result[0].confidence).toBe(0.95);
    });
  });

  describe("reconcilePageCounts", () => {
    it("should handle single page count", () => {
      const inputs: PhysicalDescriptionInput[] = [{ pageCount: 320, source: mockSource1 }];

      const result = reconciler.reconcilePageCounts(inputs);
      expect(result.value).toBe(320);
      expect(result.confidence).toBeCloseTo(0.64, 2); // 0.8 * 0.8
      expect(result.sources).toHaveLength(1);
    });

    it("should reconcile agreeing page counts", () => {
      const inputs: PhysicalDescriptionInput[] = [
        { pageCount: 320, source: mockSource1 },
        { pageCount: 322, source: mockSource2 }, // Within 5% tolerance
        { pageCount: 318, source: mockSource3 },
      ];

      const result = reconciler.reconcilePageCounts(inputs);
      expect(result.value).toBeCloseTo(320, 0); // Weighted average
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.sources).toHaveLength(3);
    });

    it("should handle conflicting page counts", () => {
      const inputs: PhysicalDescriptionInput[] = [
        { pageCount: 320, source: mockSource1 },
        { pageCount: 450, source: mockSource2 }, // Significantly different
        { pageCount: 325, source: mockSource3 },
      ];

      const result = reconciler.reconcilePageCounts(inputs);
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts).toHaveLength(1);
      // Should prefer the group with higher total reliability
    });

    it("should handle string page counts", () => {
      const inputs: PhysicalDescriptionInput[] = [
        { pageCount: "320 pages", source: mockSource1 },
        { pageCount: "pp. 318", source: mockSource2 },
      ];

      const result = reconciler.reconcilePageCounts(inputs);
      expect(result.value).toBeCloseTo(319, 0);
    });
  });

  describe("reconcilePhysicalDescriptions", () => {
    it("should reconcile complete physical descriptions", () => {
      const inputs: PhysicalDescriptionInput[] = [
        {
          pageCount: 320,
          dimensions: "8.5 x 11 in",
          format: "Hardcover",
          languages: ["en", "fr"],
          weight: "500g",
          source: mockSource1,
        },
        {
          pageCount: 322,
          dimensions: { width: 216, height: 279, unit: "mm" },
          binding: "hardcover",
          languages: "English",
          weight: 510,
          source: mockSource2,
        },
      ];

      const result = reconciler.reconcilePhysicalDescriptions(inputs);

      expect(result.pageCount.value).toBeCloseTo(321, 0);
      expect(result.dimensions.value.width).toBeCloseTo(216, 1);
      expect(result.format.value.binding).toBe("hardcover");
      expect(result.languages.value).toHaveLength(2); // en and fr (deduplicated)
      expect(result.weight.value).toBeCloseTo(505, 0);
    });

    it("should handle missing data gracefully", () => {
      const inputs: PhysicalDescriptionInput[] = [
        { pageCount: 320, source: mockSource1 },
        { dimensions: "210 x 297 mm", source: mockSource2 },
      ];

      const result = reconciler.reconcilePhysicalDescriptions(inputs);

      expect(result.pageCount.value).toBe(320);
      expect(result.dimensions.value.width).toBe(210);
      expect(result.format.value.format).toBe("book"); // Default
      expect(result.languages.value).toHaveLength(0);
      expect(result.weight.value).toBe(0);
    });

    it("should prioritize more reliable sources", () => {
      const inputs: PhysicalDescriptionInput[] = [
        {
          pageCount: 300,
          format: "Paperback",
          source: mockSource1, // reliability: 0.8
        },
        {
          pageCount: 320,
          format: "Hardcover",
          source: mockSource3, // reliability: 0.95
        },
      ];

      const result = reconciler.reconcilePhysicalDescriptions(inputs);

      // Should prefer the more reliable source for conflicting data
      expect(result.format.value.binding).toBe("hardcover");
    });
  });

  describe("language reconciliation edge cases", () => {
    it("should handle unknown language codes", () => {
      const result = reconciler.normalizeLanguages("xyz");
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("xyz");
      // Unknown codes now get low confidence (0.3) since they can't be resolved
      expect(result[0].confidence).toBe(0.3);
    });

    it("should deduplicate languages in reconciliation", () => {
      const inputs: PhysicalDescriptionInput[] = [
        { languages: ["en", "English"], source: mockSource1 },
        { languages: ["eng", "fr"], source: mockSource2 },
      ];

      const result = reconciler.reconcileLanguages(inputs);
      expect(result.value).toHaveLength(2); // eng and fra (deduplicated)
      expect(result.value.map((l) => l.code).sort()).toEqual(["eng", "fra"]);
    });
  });

  describe("weight normalization", () => {
    it("should normalize weight units", () => {
      const inputs: PhysicalDescriptionInput[] = [
        { weight: "1.2 kg", source: mockSource1 },
        { weight: "2.6 lbs", source: mockSource2 },
        { weight: 500, source: mockSource3 },
      ];

      const result = reconciler.reconcileWeights(inputs);
      // Should convert all to grams and average
      expect(result.value).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should throw error for empty inputs", () => {
      expect(() => reconciler.reconcilePhysicalDescriptions([])).toThrow();
    });

    it("should handle invalid dimension strings gracefully", () => {
      const result = reconciler.normalizeDimensions("invalid dimensions");
      expect(result.raw).toBe("invalid dimensions");
      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
    });

    it("should handle empty language inputs", () => {
      const result = reconciler.normalizeLanguages("");
      expect(result).toHaveLength(0);
    });
  });
});
