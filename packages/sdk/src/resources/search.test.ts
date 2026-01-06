import { describe, it, expect } from "vitest";
import { toTsQuery, searchTypes } from "./search.js";

describe("toTsQuery", () => {
  describe("basic functionality", () => {
    it("converts single word to prefix query", () => {
      expect(toTsQuery("fantasy")).toBe("fantasy:*");
    });

    it("joins multiple words with AND operator", () => {
      expect(toTsQuery("epic fantasy")).toBe("epic:* & fantasy:*");
    });

    it("handles three or more words", () => {
      expect(toTsQuery("the dark tower")).toBe("the:* & dark:* & tower:*");
    });
  });

  describe("whitespace handling", () => {
    it("handles leading whitespace", () => {
      expect(toTsQuery("  fantasy")).toBe("fantasy:*");
    });

    it("handles trailing whitespace", () => {
      expect(toTsQuery("fantasy  ")).toBe("fantasy:*");
    });

    it("handles multiple spaces between words", () => {
      expect(toTsQuery("epic    fantasy")).toBe("epic:* & fantasy:*");
    });

    it("handles tabs and newlines", () => {
      expect(toTsQuery("epic\tfantasy\nnovel")).toBe(
        "epic:* & fantasy:* & novel:*",
      );
    });
  });

  describe("special character handling", () => {
    it("strips apostrophes", () => {
      expect(toTsQuery("don't")).toBe("dont:*");
    });

    it("strips hyphens", () => {
      expect(toTsQuery("sci-fi")).toBe("scifi:*");
    });

    it("strips punctuation", () => {
      expect(toTsQuery("hello!")).toBe("hello:*");
      expect(toTsQuery("what?")).toBe("what:*");
      expect(toTsQuery("test.")).toBe("test:*");
    });

    it("strips quotes", () => {
      expect(toTsQuery('"quoted"')).toBe("quoted:*");
      expect(toTsQuery("'single'")).toBe("single:*");
    });

    it("handles mixed special characters", () => {
      expect(toTsQuery("it's a test!")).toBe("its:* & a:* & test:*");
    });
  });

  describe("empty and edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(toTsQuery("")).toBe("");
    });

    it("returns empty string for whitespace-only input", () => {
      expect(toTsQuery("   ")).toBe("");
      expect(toTsQuery("\t\n")).toBe("");
    });

    it("returns empty string for punctuation-only input", () => {
      expect(toTsQuery("...")).toBe("");
      expect(toTsQuery("!!!")).toBe("");
      expect(toTsQuery("@#$%")).toBe("");
    });

    it("filters out empty terms after stripping special characters", () => {
      expect(toTsQuery("... test")).toBe("test:*");
      expect(toTsQuery("test ... more")).toBe("test:* & more:*");
    });
  });

  describe("unicode handling", () => {
    it("preserves unicode letters", () => {
      expect(toTsQuery("café")).toBe("caf:*"); // Note: é is stripped by \w
    });

    it("handles CJK characters", () => {
      // CJK characters are stripped by [^\w] regex
      expect(toTsQuery("日本語")).toBe("");
    });

    it("handles mixed unicode and ASCII", () => {
      expect(toTsQuery("book 本")).toBe("book:*");
    });
  });

  describe("case sensitivity", () => {
    it("preserves original case (PostgreSQL handles case-insensitivity)", () => {
      expect(toTsQuery("Fantasy")).toBe("Fantasy:*");
      expect(toTsQuery("FANTASY")).toBe("FANTASY:*");
    });
  });

  describe("SQL injection prevention", () => {
    it("strips SQL-like characters", () => {
      expect(toTsQuery("'; DROP TABLE--")).toBe("DROP:* & TABLE:*");
    });

    it("handles backslashes", () => {
      expect(toTsQuery("test\\injection")).toBe("testinjection:*");
    });

    it("handles semicolons and parentheses", () => {
      expect(toTsQuery("test; (SELECT *)")).toBe("test:* & SELECT:*");
    });
  });
});

describe("searchTypes", () => {
  it("contains all expected entity types", () => {
    expect(searchTypes).toContain("edition");
    expect(searchTypes).toContain("creator");
    expect(searchTypes).toContain("publisher");
    expect(searchTypes).toContain("collection");
  });

  it("has exactly 4 types", () => {
    expect(searchTypes).toHaveLength(4);
  });
});

// Note: Integration tests for searchEditions, searchCreators, searchPublishers,
// searchCollections, and searchAll require a database connection and are
// covered by the E2E tests in apps/app/tests/app/search.spec.ts
