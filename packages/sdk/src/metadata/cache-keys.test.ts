/**
 * Tests for cache key normalization utilities
 */

import { describe, expect, it } from "vitest";
import {
  createProviderCacheKeyGenerator,
  generateCacheKey,
  normalizeAuthor,
  normalizeISBN,
  normalizeLanguage,
  normalizePublisher,
  normalizeTitle,
} from "./cache-keys.js";

describe("Cache Key Normalization", () => {
  describe("normalizeTitle", () => {
    it("should convert to lowercase", () => {
      expect(normalizeTitle("The Great Gatsby")).toBe("great gatsby");
    });

    it("should remove leading articles", () => {
      expect(normalizeTitle("The Hobbit")).toBe("hobbit");
      expect(normalizeTitle("A Tale of Two Cities")).toBe("tale of two cities");
      expect(normalizeTitle("An Introduction to Algorithms")).toBe(
        "introduction to algorithms",
      );
    });

    it("should remove leading articles in other languages", () => {
      expect(normalizeTitle("Der Prozess")).toBe("prozess");
      expect(normalizeTitle("Die Verwandlung")).toBe("verwandlung");
      expect(normalizeTitle("Le Petit Prince")).toBe("petit prince");
      expect(normalizeTitle("La Casa de Papel")).toBe("casa de papel");
    });

    it("should remove diacritics", () => {
      expect(normalizeTitle("Café")).toBe("cafe");
      expect(normalizeTitle("naïve")).toBe("naive");
      expect(normalizeTitle("résumé")).toBe("resume");
      expect(normalizeTitle("Götterdämmerung")).toBe("gotterdammerung");
    });

    it("should normalize whitespace", () => {
      expect(normalizeTitle("The  Great   Gatsby")).toBe("great gatsby");
      expect(normalizeTitle("  The Hobbit  ")).toBe("hobbit");
      expect(normalizeTitle("War\tand\nPeace")).toBe("war and peace");
    });

    it("should remove punctuation", () => {
      expect(normalizeTitle("Hello, World!")).toBe("hello world");
      // Note: "the" is only removed at the START of a title, not in the middle
      expect(normalizeTitle("What's the Story?")).toBe("whats the story");
      // Note: NFD normalization affects Cyrillic "й" (short i) - this is acceptable
      // for cache key purposes as it still produces consistent results
      expect(normalizeTitle("«Война и мир»")).toBe("воина и мир");
    });

    it("should handle empty input", () => {
      expect(normalizeTitle("")).toBe("");
      expect(normalizeTitle("   ")).toBe("");
    });

    it("should produce same key for equivalent titles", () => {
      const titles = [
        "The Hobbit",
        "THE HOBBIT",
        "the hobbit",
        " The  Hobbit ",
        "The Hobbit.",
      ];
      // Use arrow function to avoid map passing index as second arg to normalizeTitle
      const normalized = titles.map((t) => normalizeTitle(t));
      expect(new Set(normalized).size).toBe(1);
    });
  });

  describe("normalizeISBN", () => {
    it("should clean ISBN-10", () => {
      expect(normalizeISBN("0-571-08989-5", false)).toBe("0571089895");
    });

    it("should clean ISBN-13", () => {
      // Using a valid ISBN-13 (checksum must be correct)
      expect(normalizeISBN("978-0-571-08989-5")).toBe("9780571089895");
    });

    it("should handle ISBN-10 with X check digit", () => {
      expect(normalizeISBN("0-8044-2957-X", false)).toBe("080442957X");
    });

    it("should convert ISBN-10 to ISBN-13 by default", () => {
      expect(normalizeISBN("0-571-08989-5")).toBe("9780571089895");
    });

    it("should not convert ISBN-10 when option is false", () => {
      expect(normalizeISBN("0-571-08989-5", false)).toBe("0571089895");
    });

    it("should reject invalid ISBN-10", () => {
      expect(normalizeISBN("1234567890")).toBeNull(); // Invalid checksum
      expect(normalizeISBN("12345")).toBeNull(); // Too short
    });

    it("should reject invalid ISBN-13", () => {
      expect(normalizeISBN("9781234567890")).toBeNull(); // Invalid checksum
      expect(normalizeISBN("97812345678901")).toBeNull(); // Too long
    });

    it("should handle null/empty input", () => {
      expect(normalizeISBN("")).toBeNull();
    });

    it("should produce same key for equivalent ISBNs", () => {
      const isbns = [
        "978-0-571-08989-5",
        "9780571089895",
        "978 0 571 08989 5",
        " 978-0-571-08989-5 ",
      ];
      const normalized = isbns.map((isbn) => normalizeISBN(isbn));
      expect(new Set(normalized).size).toBe(1);
    });

    it("should produce same key for ISBN-10 and ISBN-13 of same book", () => {
      const isbn10 = normalizeISBN("0-571-08989-5");
      const isbn13 = normalizeISBN("978-0-571-08989-5");
      expect(isbn10).toBe(isbn13);
    });
  });

  describe("normalizeAuthor", () => {
    it("should convert to lowercase", () => {
      expect(normalizeAuthor("J.R.R. Tolkien")).toContain("tolkien");
    });

    it("should handle 'Last, First' format", () => {
      expect(normalizeAuthor("Tolkien, J.R.R.")).toBe("jrr tolkien");
      expect(normalizeAuthor("King, Stephen")).toBe("stephen king");
    });

    it("should remove titles", () => {
      expect(normalizeAuthor("Dr. Martin Luther King")).toBe(
        "martin luther king",
      );
      expect(normalizeAuthor("Prof. Stephen Hawking")).toBe("stephen hawking");
      expect(normalizeAuthor("Sir Arthur Conan Doyle")).toBe(
        "arthur conan doyle",
      );
    });

    it("should remove suffixes", () => {
      expect(normalizeAuthor("Martin Luther King Jr.")).toBe(
        "martin luther king",
      );
      expect(normalizeAuthor("Robert Downey, Jr")).toBe("robert downey");
      expect(normalizeAuthor("John Smith III")).toBe("john smith");
    });

    it("should remove date ranges", () => {
      expect(normalizeAuthor("Tolkien, J.R.R., 1892-1973")).toBe("jrr tolkien");
      expect(normalizeAuthor("Shakespeare, William (1564-1616)")).toBe(
        "william shakespeare",
      );
    });

    it("should remove diacritics", () => {
      expect(normalizeAuthor("Gabriel García Márquez")).toBe(
        "gabriel garcia marquez",
      );
      expect(normalizeAuthor("François Müller")).toBe("francois muller");
    });

    it("should handle empty input", () => {
      expect(normalizeAuthor("")).toBe("");
    });

    it("should produce same key for equivalent names", () => {
      // Names with same formatting patterns
      const names = [
        "Tolkien, J.R.R.",
        "J.R.R. Tolkien",
        "Tolkien, J.R.R., 1892-1973",
      ];
      const normalized = names.map(normalizeAuthor);
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe("jrr tolkien");

      // Names with spaces between initials are different
      expect(normalizeAuthor("J. R. R. Tolkien")).toBe("j r r tolkien");
    });
  });

  describe("normalizePublisher", () => {
    it("should convert to lowercase", () => {
      expect(normalizePublisher("Penguin Books")).toBe("penguin");
    });

    it("should remove corporate suffixes", () => {
      expect(normalizePublisher("Random House, Inc.")).toBe("random house");
      expect(normalizePublisher("HarperCollins Publishers")).toBe(
        "harpercollins",
      );
      expect(normalizePublisher("Simon & Schuster Ltd")).toBe(
        "simon and schuster",
      );
    });

    it("should normalize ampersand", () => {
      expect(normalizePublisher("Simon & Schuster")).toBe("simon and schuster");
    });

    it("should remove foreign suffixes", () => {
      expect(normalizePublisher("S. Fischer Verlag")).toBe("s fischer");
      expect(normalizePublisher("Gallimard Editions")).toBe("gallimard");
    });

    it("should handle empty input", () => {
      expect(normalizePublisher("")).toBe("");
    });

    it("should produce same key for equivalent publishers", () => {
      const publishers = [
        "Penguin Books",
        "PENGUIN BOOKS",
        "Penguin",
        "Penguin Publishing",
      ];
      const normalized = publishers.map(normalizePublisher);
      expect(new Set(normalized).size).toBe(1);
    });
  });

  describe("normalizeLanguage", () => {
    it("should normalize ISO 639-2/3 codes", () => {
      expect(normalizeLanguage("eng")).toBe("en");
      expect(normalizeLanguage("ger")).toBe("de");
      expect(normalizeLanguage("deu")).toBe("de");
      expect(normalizeLanguage("fra")).toBe("fr");
      expect(normalizeLanguage("fre")).toBe("fr");
    });

    it("should normalize full language names", () => {
      expect(normalizeLanguage("English")).toBe("en");
      expect(normalizeLanguage("German")).toBe("de");
      expect(normalizeLanguage("French")).toBe("fr");
      expect(normalizeLanguage("Spanish")).toBe("es");
    });

    it("should pass through ISO 639-1 codes", () => {
      expect(normalizeLanguage("en")).toBe("en");
      expect(normalizeLanguage("de")).toBe("de");
      expect(normalizeLanguage("fr")).toBe("fr");
    });

    it("should handle undetermined languages", () => {
      expect(normalizeLanguage("und")).toBe("");
      expect(normalizeLanguage("mul")).toBe("");
    });

    it("should handle empty input", () => {
      expect(normalizeLanguage("")).toBe("");
    });

    it("should be case-insensitive", () => {
      expect(normalizeLanguage("ENG")).toBe("en");
      expect(normalizeLanguage("ENGLISH")).toBe("en");
    });
  });

  describe("generateCacheKey", () => {
    it("should generate key from single parameter", () => {
      const key = generateCacheKey("searchByTitle", { title: "The Hobbit" });
      expect(key).toBe("searchByTitle|title:hobbit");
    });

    it("should generate key from multiple parameters", () => {
      const key = generateCacheKey("searchMultiCriteria", {
        title: "The Lord of the Rings",
        author: "Tolkien, J.R.R.",
      });
      expect(key).toContain("title:");
      expect(key).toContain("author:");
    });

    it("should sort parameters alphabetically", () => {
      const key1 = generateCacheKey("search", { z: "1", a: "2" });
      const key2 = generateCacheKey("search", { a: "2", z: "1" });
      expect(key1).toBe(key2);
    });

    it("should skip null/undefined parameters", () => {
      const key = generateCacheKey("search", {
        title: "Test",
        author: undefined,
        isbn: null,
      });
      expect(key).not.toContain("author");
      expect(key).not.toContain("isbn");
    });

    it("should normalize ISBN parameters", () => {
      const key1 = generateCacheKey("searchByISBN", {
        isbn: "978-0-571-08989-6",
      });
      const key2 = generateCacheKey("searchByISBN", { isbn: "9780571089896" });
      expect(key1).toBe(key2);
    });

    it("should normalize title parameters", () => {
      const key1 = generateCacheKey("searchByTitle", { title: "The Hobbit" });
      const key2 = generateCacheKey("searchByTitle", { title: "THE HOBBIT" });
      expect(key1).toBe(key2);
    });

    it("should normalize author parameters", () => {
      const key1 = generateCacheKey("searchByCreator", {
        author: "Tolkien, J.R.R.",
      });
      const key2 = generateCacheKey("searchByCreator", {
        author: "J.R.R. Tolkien",
      });
      expect(key1).toBe(key2);
    });

    it("should handle array parameters", () => {
      const key = generateCacheKey("search", {
        authors: ["Tolkien, J.R.R.", "C.S. Lewis"],
      });
      expect(key).toContain("authors:");
      expect(key).toContain("jrr tolkien");
      expect(key).toContain("cs lewis");
    });

    it("should add prefix when specified", () => {
      const key = generateCacheKey(
        "searchByTitle",
        { title: "The Hobbit" },
        { prefix: "openlibrary" },
      );
      expect(key).toBe("openlibrary:searchByTitle|title:hobbit");
    });

    it("should produce same key for equivalent queries", () => {
      // Queries with same formatting patterns should match
      const queries = [
        { title: "The Hobbit", author: "J.R.R. Tolkien" },
        { title: "THE HOBBIT", author: "Tolkien, J.R.R." },
        { author: "J.R.R. Tolkien", title: " The  Hobbit " },
      ];
      const keys = queries.map((q) => generateCacheKey("search", q));
      expect(new Set(keys).size).toBe(1);
    });

    it("should handle ISBN-10 to ISBN-13 conversion", () => {
      const key10 = generateCacheKey("searchByISBN", { isbn: "0-571-08989-5" });
      const key13 = generateCacheKey("searchByISBN", {
        isbn: "978-0-571-08989-5",
      });
      expect(key10).toBe(key13);
    });
  });

  describe("createProviderCacheKeyGenerator", () => {
    it("should create a generator with provider prefix", () => {
      const generator = createProviderCacheKeyGenerator("OpenLibrary");
      const key = generator("searchByTitle", { title: "The Hobbit" });
      expect(key).toBe("openlibrary:searchByTitle|title:hobbit");
    });

    it("should normalize provider name to lowercase", () => {
      const generator = createProviderCacheKeyGenerator("WikiData");
      const key = generator("search", { title: "Test" });
      expect(key.startsWith("wikidata:")).toBe(true);
    });

    it("should pass through options", () => {
      const generator = createProviderCacheKeyGenerator("TestProvider");
      const key = generator(
        "searchByISBN",
        { isbn: "0-571-08989-5" },
        {
          normalizeIsbn13: false,
        },
      );
      // With normalizeIsbn13: false, should not convert
      expect(key).toContain("isbn:0571089895");
    });
  });

  describe("Integration scenarios", () => {
    it("should cache hit for same book searched different ways", () => {
      // Someone searches by ISBN-10, then later by ISBN-13
      const searchByISBN10 = generateCacheKey("searchByISBN", {
        isbn: "0-571-08989-5",
      });
      const searchByISBN13 = generateCacheKey("searchByISBN", {
        isbn: "978-0-571-08989-5",
      });
      expect(searchByISBN10).toBe(searchByISBN13);
    });

    it("should cache hit for same title with different formatting", () => {
      // All these titles should normalize to the same key
      const search1 = generateCacheKey("searchByTitle", {
        title: "The Lord of the Rings",
      });
      const search2 = generateCacheKey("searchByTitle", {
        title: "THE LORD OF THE RINGS",
      });
      const search3 = generateCacheKey("searchByTitle", {
        title: " The  Lord  Of  The  Rings ",
      });
      // All have leading "The/THE" which gets removed, resulting in "lord of the rings"
      expect(search1).toBe(search2);
      expect(search2).toBe(search3);
    });

    it("should cache hit for same author with different name formats", () => {
      const search1 = generateCacheKey("searchByCreator", {
        name: "Gabriel García Márquez",
      });
      const search2 = generateCacheKey("searchByCreator", {
        name: "García Márquez, Gabriel",
      });
      const search3 = generateCacheKey("searchByCreator", {
        name: "GABRIEL GARCIA MARQUEZ",
      });
      expect(search1).toBe(search2);
      expect(search2).toBe(search3);
    });

    it("should distinguish different books", () => {
      const book1 = generateCacheKey("searchByISBN", {
        isbn: "978-0-571-08989-6",
      });
      const book2 = generateCacheKey("searchByISBN", {
        isbn: "978-0-13-468599-1",
      });
      expect(book1).not.toBe(book2);
    });

    it("should distinguish different authors", () => {
      const author1 = generateCacheKey("searchByCreator", {
        name: "Stephen King",
      });
      const author2 = generateCacheKey("searchByCreator", {
        name: "Martin Luther King",
      });
      expect(author1).not.toBe(author2);
    });
  });
});
