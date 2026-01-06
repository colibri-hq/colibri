/**
 * Tests for OpenLibrary name utilities
 */

import { describe, expect, it } from "vitest";
import {
  areNamesEquivalent,
  convertToFirstLastFormat,
  getPreferredNameFormat,
  isLastFirstFormat,
  matchesWithInitials,
  normalizeAuthorName,
  normalizeNameForComparison,
  parseNameComponents,
} from "./name-utils.js";

describe("Name Utilities", () => {
  describe("parseNameComponents", () => {
    it("should parse simple first last name", () => {
      const result = parseNameComponents("John Smith");
      expect(result.first).toBe("John");
      expect(result.last).toBe("Smith");
      expect(result.middle).toEqual([]);
    });

    it("should parse first middle last name", () => {
      const result = parseNameComponents("John Robert Smith");
      expect(result.first).toBe("John");
      expect(result.middle).toEqual(["Robert"]);
      expect(result.last).toBe("Smith");
    });

    it("should parse last, first format", () => {
      const result = parseNameComponents("Smith, John");
      expect(result.first).toBe("John");
      expect(result.last).toBe("Smith");
    });

    it("should parse last, first middle format", () => {
      const result = parseNameComponents("Smith, John Robert");
      expect(result.first).toBe("John");
      expect(result.middle).toEqual(["Robert"]);
      expect(result.last).toBe("Smith");
    });

    it("should handle name prefixes", () => {
      const result = parseNameComponents("Dr. John Smith");
      expect(result.prefixes).toContain("Dr.");
      expect(result.first).toBe("John");
      expect(result.last).toBe("Smith");
    });

    it("should handle name suffixes", () => {
      const result = parseNameComponents("John Smith Jr.");
      expect(result.suffixes).toContain("Jr.");
      expect(result.first).toBe("John");
      expect(result.last).toBe("Smith");
    });

    it("should handle Dutch particles", () => {
      const result = parseNameComponents("Vincent van Gogh");
      expect(result.first).toBe("Vincent");
      expect(result.last).toBe("van Gogh");
    });

    it("should handle German particles", () => {
      const result = parseNameComponents("Ludwig von Beethoven");
      expect(result.first).toBe("Ludwig");
      expect(result.last).toBe("von Beethoven");
    });

    it("should handle multiple particles", () => {
      const result = parseNameComponents("Oscar de la Renta");
      expect(result.first).toBe("Oscar");
      expect(result.last).toBe("de la Renta");
    });

    it("should handle empty input", () => {
      const result = parseNameComponents("");
      expect(result.first).toBe("");
      expect(result.last).toBe("");
      expect(result.original).toBe("");
    });

    it("should handle single name", () => {
      const result = parseNameComponents("Plato");
      expect(result.first).toBe("Plato");
      expect(result.last).toBe("");
    });

    it("should preserve original name", () => {
      const original = "Tolkien, J.R.R.";
      const result = parseNameComponents(original);
      expect(result.original).toBe(original);
    });
  });

  describe("convertToFirstLastFormat", () => {
    it("should convert last, first to first last", () => {
      expect(convertToFirstLastFormat("Smith, John")).toBe("John Smith");
    });

    it("should handle already in first last format", () => {
      expect(convertToFirstLastFormat("John Smith")).toBe("John Smith");
    });

    it("should handle middle names", () => {
      expect(convertToFirstLastFormat("Smith, John Robert")).toBe(
        "John Robert Smith",
      );
    });

    it("should preserve particles", () => {
      expect(convertToFirstLastFormat("van Gogh, Vincent")).toBe(
        "Vincent van Gogh",
      );
    });

    it("should preserve titles and suffixes", () => {
      expect(convertToFirstLastFormat("Dr. John Smith Jr.")).toBe(
        "Dr. John Smith Jr.",
      );
    });
  });

  describe("normalizeNameForComparison", () => {
    it("should lowercase names", () => {
      const result = normalizeNameForComparison("JOHN SMITH");
      expect(result).toBe("john smith");
    });

    it("should remove diacritics", () => {
      const result = normalizeNameForComparison("José García");
      expect(result).toBe("jose garcia");
    });

    it("should normalize different formats to same result", () => {
      const name1 = normalizeNameForComparison("Smith, John");
      const name2 = normalizeNameForComparison("John Smith");
      expect(name1).toBe(name2);
    });

    it("should remove punctuation", () => {
      const result = normalizeNameForComparison("J.R.R. Tolkien");
      expect(result).toBe("jrr tolkien");
    });
  });

  describe("matchesWithInitials", () => {
    it("should match full name with initial", () => {
      const comp1 = parseNameComponents("J. Smith");
      const comp2 = parseNameComponents("John Smith");
      expect(matchesWithInitials(comp1, comp2)).toBe(true);
    });

    it("should match initials with full name", () => {
      const comp1 = parseNameComponents("John Smith");
      const comp2 = parseNameComponents("J. Smith");
      expect(matchesWithInitials(comp1, comp2)).toBe(true);
    });

    it("should not match different initials", () => {
      const comp1 = parseNameComponents("M. Smith");
      const comp2 = parseNameComponents("John Smith");
      expect(matchesWithInitials(comp1, comp2)).toBe(false);
    });

    it("should not match different last names", () => {
      const comp1 = parseNameComponents("J. Smith");
      const comp2 = parseNameComponents("John Jones");
      expect(matchesWithInitials(comp1, comp2)).toBe(false);
    });
  });

  describe("areNamesEquivalent", () => {
    it("should match exact same names", () => {
      expect(areNamesEquivalent("John Smith", "John Smith")).toBe(true);
    });

    it("should match different cases", () => {
      expect(areNamesEquivalent("john smith", "JOHN SMITH")).toBe(true);
    });

    it("should match different formats", () => {
      expect(areNamesEquivalent("Smith, John", "John Smith")).toBe(true);
    });

    it("should match with initials", () => {
      expect(areNamesEquivalent("J. Smith", "John Smith")).toBe(true);
    });

    it("should match with diacritics vs without", () => {
      expect(areNamesEquivalent("José García", "Jose Garcia")).toBe(true);
    });

    it("should not match completely different names", () => {
      expect(areNamesEquivalent("John Smith", "Jane Doe")).toBe(false);
    });

    it("should handle empty strings", () => {
      expect(areNamesEquivalent("", "John Smith")).toBe(false);
      expect(areNamesEquivalent("John Smith", "")).toBe(false);
      expect(areNamesEquivalent("", "")).toBe(false);
    });

    it("should match Tolkien name variants", () => {
      expect(areNamesEquivalent("J.R.R. Tolkien", "Tolkien, J.R.R.")).toBe(
        true,
      );
    });
  });

  describe("getPreferredNameFormat", () => {
    it("should prefer First Last over Last, First", () => {
      const preferred = getPreferredNameFormat(["Smith, John", "John Smith"]);
      expect(preferred).toBe("John Smith");
    });

    it("should prefer full names over initials", () => {
      const preferred = getPreferredNameFormat(["J. Smith", "John Smith"]);
      expect(preferred).toBe("John Smith");
    });

    it("should return first if only one variant", () => {
      const preferred = getPreferredNameFormat(["John Smith"]);
      expect(preferred).toBe("John Smith");
    });

    it("should return empty string for empty array", () => {
      const preferred = getPreferredNameFormat([]);
      expect(preferred).toBe("");
    });
  });

  describe("isLastFirstFormat", () => {
    it("should detect Last, First format", () => {
      expect(isLastFirstFormat("Smith, John")).toBe(true);
    });

    it("should reject First Last format", () => {
      expect(isLastFirstFormat("John Smith")).toBe(false);
    });

    it("should reject names with multiple commas", () => {
      expect(isLastFirstFormat("Smith, John, Jr.")).toBe(false);
    });

    it("should reject names with trailing comma", () => {
      expect(isLastFirstFormat("John Smith,")).toBe(false);
    });
  });

  describe("normalizeAuthorName", () => {
    it("should normalize whitespace", () => {
      expect(normalizeAuthorName("John  Smith")).toBe("John Smith");
    });

    it("should convert Last, First to First Last", () => {
      expect(normalizeAuthorName("Smith, John")).toBe("John Smith");
    });

    it("should handle empty input", () => {
      expect(normalizeAuthorName("")).toBe("");
    });

    it("should trim whitespace", () => {
      expect(normalizeAuthorName("  John Smith  ")).toBe("John Smith");
    });
  });
});
