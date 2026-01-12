import { describe, it, expect } from "vitest";
import {
  GLOSSARY,
  getGlossaryEntry,
  hasGlossaryEntry,
  getAllGlossaryEntries,
  searchGlossary,
  type GlossaryEntry,
} from "./glossary-data.js";

describe("glossary-data", () => {
  describe("GLOSSARY constant", () => {
    it("should be an array of GlossaryEntry objects", () => {
      expect(Array.isArray(GLOSSARY)).toBe(true);
      expect(GLOSSARY.length).toBeGreaterThan(0);
    });

    it("should have entries with required fields", () => {
      GLOSSARY.forEach((entry) => {
        expect(entry.id).toBeTruthy();
        expect(entry.displayTerm).toBeTruthy();
        expect(entry.definition).toBeTruthy();

        // Optional fields
        if (entry.learnMoreUrl) {
          expect(typeof entry.learnMoreUrl).toBe("string");
        }
        if (entry.aliases) {
          expect(Array.isArray(entry.aliases)).toBe(true);
        }
      });
    });

    it("should have core ebook format entries", () => {
      const ids = GLOSSARY.map((e) => e.id);
      expect(ids).toContain("epub");
      expect(ids).toContain("mobi");
      expect(ids).toContain("pdf");
    });

    it("should have core Colibri concept entries", () => {
      const ids = GLOSSARY.map((e) => e.id);
      expect(ids).toContain("work");
      expect(ids).toContain("edition");
      expect(ids).toContain("asset");
      expect(ids).toContain("collection");
    });
  });

  describe("hasGlossaryEntry", () => {
    it("should return true for existing entries", () => {
      expect(hasGlossaryEntry("postgresql")).toBe(true);
      expect(hasGlossaryEntry("epub")).toBe(true);
      expect(hasGlossaryEntry("mobi")).toBe(true);
      expect(hasGlossaryEntry("s3")).toBe(true);
    });

    it("should return false for non-existing entries", () => {
      expect(hasGlossaryEntry("nonexistent")).toBe(false);
      expect(hasGlossaryEntry("fake-term")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(hasGlossaryEntry("postgresql")).toBe(true);
      expect(hasGlossaryEntry("PostgreSQL")).toBe(true);
      expect(hasGlossaryEntry("POSTGRESQL")).toBe(true);
    });

    it("should find entries by alias", () => {
      expect(hasGlossaryEntry("postgres")).toBe(true); // alias for postgresql
    });
  });

  describe("getGlossaryEntry", () => {
    it("should return entry for existing terms", () => {
      const entry = getGlossaryEntry("postgresql");
      expect(entry).toBeDefined();
      expect(entry?.displayTerm).toBe("PostgreSQL");
      expect(entry?.definition).toBeTruthy();
    });

    it("should return undefined for non-existing terms", () => {
      expect(getGlossaryEntry("nonexistent")).toBeUndefined();
    });

    it("should be case-insensitive", () => {
      const entry1 = getGlossaryEntry("postgresql");
      const entry2 = getGlossaryEntry("PostgreSQL");
      const entry3 = getGlossaryEntry("POSTGRESQL");

      expect(entry1).toBeDefined();
      expect(entry2).toBeDefined();
      expect(entry3).toBeDefined();
      expect(entry1?.id).toBe(entry2?.id);
      expect(entry2?.id).toBe(entry3?.id);
    });

    it("should find entries by alias", () => {
      const entry = getGlossaryEntry("postgres");
      expect(entry).toBeDefined();
      expect(entry?.displayTerm).toBe("PostgreSQL");
    });
  });

  describe("getAllGlossaryEntries", () => {
    it("should return all entries as array", () => {
      const entries = getAllGlossaryEntries();
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBe(GLOSSARY.length);
    });

    it("should return entries sorted alphabetically by displayTerm", () => {
      const entries = getAllGlossaryEntries();
      const terms = entries.map((e) => e.displayTerm);

      // Check if sorted
      for (let i = 1; i < terms.length; i++) {
        expect(terms[i].localeCompare(terms[i - 1])).toBeGreaterThanOrEqual(0);
      }
    });

    it("should not modify original array", () => {
      const entries = getAllGlossaryEntries();
      const originalLength = GLOSSARY.length;

      entries.push({
        id: "test",
        displayTerm: "Test",
        definition: "Test entry",
      });

      expect(GLOSSARY.length).toBe(originalLength);
    });
  });

  describe("searchGlossary", () => {
    it("should find entries by displayTerm", () => {
      const results = searchGlossary("PostgreSQL");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.displayTerm === "PostgreSQL")).toBe(true);
    });

    it("should be case-insensitive", () => {
      const results1 = searchGlossary("postgresql");
      const results2 = searchGlossary("PostgreSQL");
      const results3 = searchGlossary("POSTGRESQL");

      expect(results1.length).toBeGreaterThan(0);
      expect(results2.length).toBeGreaterThan(0);
      expect(results3.length).toBeGreaterThan(0);
    });

    it("should find entries by partial displayTerm match", () => {
      const results = searchGlossary("Post");
      expect(results.some((r) => r.displayTerm === "PostgreSQL")).toBe(true);
    });

    it("should find entries in definition text", () => {
      const results = searchGlossary("database");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find entries by aliases", () => {
      const results = searchGlossary("postgres");
      expect(results.some((r) => r.displayTerm === "PostgreSQL")).toBe(true);
    });

    it("should return empty array for no matches", () => {
      const results = searchGlossary("xyzabc123nonexistent");
      expect(results).toEqual([]);
    });

    it("should handle empty query", () => {
      const results = searchGlossary("");
      expect(results).toEqual([]);
    });

    it("should trim query whitespace", () => {
      const results1 = searchGlossary("  PostgreSQL  ");
      const results2 = searchGlossary("PostgreSQL");
      expect(results1.length).toBe(results2.length);
    });
  });

  describe("glossary content quality", () => {
    it("should have at least 20 glossary entries", () => {
      expect(GLOSSARY.length).toBeGreaterThanOrEqual(20);
    });

    it("should have entries for core Colibri concepts", () => {
      const coreTerms = [
        "work",
        "edition",
        "asset",
        "collection",
        "metadata",
        "enrichment",
      ];
      coreTerms.forEach((term) => {
        expect(hasGlossaryEntry(term)).toBe(true);
      });
    });

    it("should have entries for ebook formats", () => {
      const formats = ["epub", "mobi", "pdf"];
      formats.forEach((format) => {
        expect(hasGlossaryEntry(format)).toBe(true);
      });
    });

    it("should have entries for technical infrastructure", () => {
      const techTerms = ["postgresql", "s3", "api", "cli"];
      techTerms.forEach((term) => {
        expect(hasGlossaryEntry(term)).toBe(true);
      });
    });

    it("should have meaningful definitions (> 20 characters)", () => {
      GLOSSARY.forEach((entry) => {
        expect(entry.definition.length).toBeGreaterThan(20);
      });
    });

    it("should not have duplicate IDs", () => {
      const ids = GLOSSARY.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("should have IDs in lowercase kebab-case", () => {
      GLOSSARY.forEach((entry) => {
        expect(entry.id).toMatch(/^[a-z0-9-]+$/);
      });
    });

    it("should have valid learnMoreUrl paths", () => {
      GLOSSARY.forEach((entry) => {
        if (entry.learnMoreUrl) {
          expect(entry.learnMoreUrl).toMatch(/^\//); // Should start with /
        }
      });
    });
  });
});
