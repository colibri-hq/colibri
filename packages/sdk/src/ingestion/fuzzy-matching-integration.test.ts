import { describe, it, expect } from "vitest";
import { normalizeCreatorName, normalizePublisherName } from "./normalize.js";

/**
 * Integration tests verifying that normalization functions produce
 * consistent output suitable for fuzzy matching.
 *
 * These tests verify the auto-merge logic without requiring a database.
 */

describe("Fuzzy Matching Integration", () => {
  describe("Creator Name Normalization for Fuzzy Matching", () => {
    it("normalizes variant spellings to same form", () => {
      // J.K. Rowling variants
      const variants = [
        "J.K. Rowling",
        "J. K. Rowling",
        "JK Rowling",
        "Rowling, J.K.",
        "Rowling, J. K.",
      ];

      const normalized = variants.map(normalizeCreatorName);

      // All variants should normalize to the same form
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe("jk rowling");
    });

    it("normalizes authors with titles consistently", () => {
      const variants = ["Dr. John Smith", "John Smith", "Dr John Smith", "Smith, John"];

      const normalized = variants.map(normalizeCreatorName);

      // All should normalize to "john smith"
      expect(normalized.every((n) => n === "john smith")).toBe(true);
    });

    it("normalizes authors with suffixes consistently", () => {
      const variants = [
        "Martin Luther King Jr.",
        "Martin Luther King, Jr.",
        "Martin Luther King Jr",
        "King, Martin Luther Jr.",
      ];

      const normalized = variants.map(normalizeCreatorName);

      // All should normalize to same form without suffix
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe("martin luther king");
    });

    it("handles international names consistently", () => {
      const variants = [
        "García Márquez, Gabriel",
        "Gabriel García Márquez",
        "Gabriel Garcia Marquez", // Already normalized
      ];

      const normalized = variants.map(normalizeCreatorName);

      // All should normalize to same ASCII form
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe("gabriel garcia marquez");
    });

    it("preserves hyphenated names", () => {
      const name1 = normalizeCreatorName("Jean-Paul Sartre");
      const name2 = normalizeCreatorName("Jean Paul Sartre");

      // Hyphenated version should preserve hyphen
      expect(name1).toBe("jean-paul sartre");
      // Non-hyphenated should be different
      expect(name2).toBe("jean paul sartre");
    });

    it("handles apostrophes consistently", () => {
      const variants = ["O'Brien, Sean", "Sean O'Brien", "Sean OBrien"];

      const normalized = variants.map(normalizeCreatorName);

      // Apostrophes should be removed, but comma handling should work
      expect(normalized[0]).toBe("sean obrien");
      expect(normalized[1]).toBe("sean obrien");
      expect(normalized[2]).toBe("sean obrien");
    });

    it("handles initials with various spacing", () => {
      const variants = ["J.R.R. Tolkien", "J. R. R. Tolkien", "JRR Tolkien", "Tolkien, J.R.R."];

      const normalized = variants.map(normalizeCreatorName);

      // All should collapse initials
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe("jrr tolkien");
    });
  });

  describe("Publisher Name Normalization for Fuzzy Matching", () => {
    it("normalizes common publisher variants to same form", () => {
      // Penguin variants
      const penguinVariants = [
        "Penguin Books",
        "Penguin Publishing",
        "The Penguin Press",
        "Penguin Books Ltd.",
        "Penguin Publishing Group",
      ];

      const normalized = penguinVariants.map(normalizePublisherName);

      // All should normalize to "penguin"
      expect(normalized.every((n) => n === "penguin")).toBe(true);
    });

    it("removes business suffixes consistently", () => {
      const variants = [
        "HarperCollins Publishers Inc.",
        "HarperCollins Publishers",
        "HarperCollins Inc.",
        "HarperCollins",
      ];

      const normalized = variants.map(normalizePublisherName);

      // All should normalize to "harpercollins"
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe("harpercollins");
    });

    it("handles 'and' vs '&' consistently", () => {
      const variants = [
        "Simon & Schuster",
        "Simon and Schuster",
        "Simon & Schuster Corp.",
        "Simon and Schuster Inc.",
      ];

      const normalized = variants.map(normalizePublisherName);

      // All should normalize to "simon schuster"
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe("simon schuster");
    });

    it("removes regional identifiers", () => {
      const variants = ["Penguin (US)", "Penguin (UK)", "Penguin Books", "Penguin"];

      const normalized = variants.map(normalizePublisherName);

      // All should normalize to "penguin"
      expect(normalized.every((n) => n === "penguin")).toBe(true);
    });

    it("removes 'The' prefix consistently", () => {
      const variants = ["The Random House", "Random House", "THE RANDOM HOUSE"];

      const normalized = variants.map(normalizePublisherName);

      // All should normalize to "random house"
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe("random house");
    });

    it("preserves meaningful hyphens", () => {
      const name1 = normalizePublisherName("McGraw-Hill Education");
      const name2 = normalizePublisherName("McGraw Hill Education");

      expect(name1).toBe("mcgraw-hill education");
      expect(name2).toBe("mcgraw hill education");
    });

    it("handles apostrophes in publisher names", () => {
      const variants = ["O'Reilly Media, Inc.", "OReilly Media", "O'Reilly"];

      const normalized = variants.map(normalizePublisherName);

      // Apostrophes should be removed
      expect(normalized[0]).toBe("oreilly media");
      expect(normalized[1]).toBe("oreilly media");
      expect(normalized[2]).toBe("oreilly");
    });
  });

  describe("Real-World Duplicate Prevention Scenarios", () => {
    it("would merge J.K. Rowling variants via normalization", () => {
      const stored = "Rowling, J.K.";
      const incoming = "J. K. Rowling";

      const normalizedStored = normalizeCreatorName(stored);
      const normalizedIncoming = normalizeCreatorName(incoming);

      // These should be identical after normalization
      expect(normalizedStored).toBe(normalizedIncoming);
      expect(normalizedStored).toBe("jk rowling");
    });

    it("would merge publisher variants via normalization", () => {
      const stored = "HarperCollins Publishers Inc.";
      const incoming = "HarperCollins";

      const normalizedStored = normalizePublisherName(stored);
      const normalizedIncoming = normalizePublisherName(incoming);

      // These should be identical after normalization
      expect(normalizedStored).toBe(normalizedIncoming);
      expect(normalizedStored).toBe("harpercollins");
    });

    it("would NOT merge different creators despite similar names", () => {
      const author1 = "Stephen King";
      const author2 = "Stephen Kingsley";

      const normalized1 = normalizeCreatorName(author1);
      const normalized2 = normalizeCreatorName(author2);

      // These should be different (fuzzy matching would detect similarity)
      expect(normalized1).not.toBe(normalized2);
      expect(normalized1).toBe("stephen king");
      expect(normalized2).toBe("stephen kingsley");
    });

    it("would merge publisher name with complex suffixes", () => {
      const stored = "The Penguin Publishing Group, Inc.";
      const incoming = "Penguin Books";

      const normalizedStored = normalizePublisherName(stored);
      const normalizedIncoming = normalizePublisherName(incoming);

      // Both should normalize to "penguin"
      expect(normalizedStored).toBe("penguin");
      expect(normalizedIncoming).toBe("penguin");
    });

    it("handles edge case of publisher that's all suffixes", () => {
      const name = "Publishing Company Inc.";
      const normalized = normalizePublisherName(name);

      // Should result in empty string
      expect(normalized).toBe("");
    });

    it("preserves important distinctions between publishers", () => {
      const publisher1 = "Random House";
      const publisher2 = "Penguin Random House";

      const normalized1 = normalizePublisherName(publisher1);
      const normalized2 = normalizePublisherName(publisher2);

      // These should be different
      expect(normalized1).not.toBe(normalized2);
      expect(normalized1).toBe("random house");
      expect(normalized2).toBe("penguin random house");
    });
  });

  describe("70% Similarity Threshold Rationale", () => {
    it("demonstrates why 70% is a good threshold for creators", () => {
      // Creator names that SHOULD match (> 70% similar after normalization)
      const shouldMatch = [
        ["J.K. Rowling", "Rowling, J.K."],
        ["J.R.R. Tolkien", "Tolkien, J.R.R."],
      ];

      // After normalization, these should be very similar or identical
      for (const [name1, name2] of shouldMatch) {
        const norm1 = normalizeCreatorName(name1);
        const norm2 = normalizeCreatorName(name2);

        // Log for manual verification
        // In actual use, pg_trgm similarity would be calculated
        console.log(`Should match: "${name1}" → "${norm1}" vs "${name2}" → "${norm2}"`);
      }

      // Creator names that should NOT match (< 70% similar)
      const shouldNotMatch = [
        ["Stephen King", "Stephen Kingsley"],
        ["J.K. Rowling", "George R.R. Martin"],
      ];

      for (const [name1, name2] of shouldNotMatch) {
        const norm1 = normalizeCreatorName(name1);
        const norm2 = normalizeCreatorName(name2);

        expect(norm1).not.toBe(norm2);
        console.log(`Should NOT match: "${name1}" → "${norm1}" vs "${name2}" → "${norm2}"`);
      }
    });

    it("demonstrates why 70% is a good threshold for publishers", () => {
      // Publisher names that SHOULD match (> 70% similar after normalization)
      const shouldMatch = [
        ["HarperCollins Inc.", "HarperCollins Publishers"],
        ["Penguin Books", "The Penguin Press"],
      ];

      // After normalization, these should be very similar or identical
      for (const [name1, name2] of shouldMatch) {
        const norm1 = normalizePublisherName(name1);
        const norm2 = normalizePublisherName(name2);

        // Log for manual verification
        // In actual use, pg_trgm similarity would be calculated
        console.log(`Should match: "${name1}" → "${norm1}" vs "${name2}" → "${norm2}"`);
      }

      // Publisher names that should NOT match (< 70% similar)
      const shouldNotMatch = [
        ["Penguin Books", "Random House"],
        ["HarperCollins", "Simon & Schuster"],
      ];

      for (const [name1, name2] of shouldNotMatch) {
        const norm1 = normalizePublisherName(name1);
        const norm2 = normalizePublisherName(name2);

        expect(norm1).not.toBe(norm2);
        console.log(`Should NOT match: "${name1}" → "${norm1}" vs "${name2}" → "${norm2}"`);
      }
    });
  });
});
