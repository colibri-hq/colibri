/**
 * Tests for normalization utilities
 */

import { describe, expect, it } from "vitest";
import {
  cleanIsbn,
  formatAuthorName,
  isbn10To13,
  ISO_639_LANGUAGE_MAP,
  isValidIsbn,
  isValidIsbn10,
  isValidIsbn13,
  normalizeAuthorName,
  normalizeDoi,
  normalizeIsbn,
  normalizeLanguageCode,
  normalizePublisher,
  normalizeTitle,
  parseAuthorName,
} from "./normalization.js";

describe("Language Normalization", () => {
  describe("ISO_639_LANGUAGE_MAP", () => {
    it("should contain common ISO 639-2 bibliographic codes", () => {
      expect(ISO_639_LANGUAGE_MAP.eng).toBe("en");
      expect(ISO_639_LANGUAGE_MAP.ger).toBe("de");
      expect(ISO_639_LANGUAGE_MAP.fre).toBe("fr");
      expect(ISO_639_LANGUAGE_MAP.spa).toBe("es");
    });

    it("should contain ISO 639-2 terminological codes", () => {
      expect(ISO_639_LANGUAGE_MAP.deu).toBe("de");
      expect(ISO_639_LANGUAGE_MAP.fra).toBe("fr");
    });

    it("should contain language names", () => {
      expect(ISO_639_LANGUAGE_MAP.english).toBe("en");
      expect(ISO_639_LANGUAGE_MAP.german).toBe("de");
      expect(ISO_639_LANGUAGE_MAP.french).toBe("fr");
    });

    it("should map special codes to empty string", () => {
      expect(ISO_639_LANGUAGE_MAP.und).toBe("");
      expect(ISO_639_LANGUAGE_MAP.mul).toBe("");
      expect(ISO_639_LANGUAGE_MAP.zxx).toBe("");
    });
  });

  describe("normalizeLanguageCode", () => {
    it("should return 2-letter codes as-is", () => {
      expect(normalizeLanguageCode("en")).toBe("en");
      expect(normalizeLanguageCode("de")).toBe("de");
      expect(normalizeLanguageCode("fr")).toBe("fr");
    });

    it("should convert 3-letter ISO 639-2 codes", () => {
      expect(normalizeLanguageCode("eng")).toBe("en");
      expect(normalizeLanguageCode("ger")).toBe("de");
      expect(normalizeLanguageCode("deu")).toBe("de");
      expect(normalizeLanguageCode("fra")).toBe("fr");
      expect(normalizeLanguageCode("fre")).toBe("fr");
    });

    it("should convert language names", () => {
      expect(normalizeLanguageCode("English")).toBe("en");
      expect(normalizeLanguageCode("German")).toBe("de");
      expect(normalizeLanguageCode("FRENCH")).toBe("fr");
    });

    it("should handle empty and null-like inputs", () => {
      expect(normalizeLanguageCode("")).toBe("");
      expect(normalizeLanguageCode("   ")).toBe("");
    });

    it("should be case-insensitive", () => {
      expect(normalizeLanguageCode("ENG")).toBe("en");
      expect(normalizeLanguageCode("Eng")).toBe("en");
      expect(normalizeLanguageCode("ENGLISH")).toBe("en");
    });

    it("should return unrecognized 3-letter codes as-is", () => {
      expect(normalizeLanguageCode("xyz")).toBe("xyz");
    });

    it("should return empty for unrecognized longer strings", () => {
      expect(normalizeLanguageCode("unknown language")).toBe("");
    });
  });
});

describe("ISBN Normalization", () => {
  describe("cleanIsbn", () => {
    it("should remove hyphens and spaces", () => {
      expect(cleanIsbn("978-0-571-08989-5")).toBe("9780571089895");
      expect(cleanIsbn("978 0 571 08989 5")).toBe("9780571089895");
      expect(cleanIsbn("0-571-08989-5")).toBe("0571089895");
    });

    it("should uppercase X check digit", () => {
      expect(cleanIsbn("0-8044-2957-x")).toBe("080442957X");
    });

    it("should handle empty input", () => {
      expect(cleanIsbn("")).toBe("");
    });
  });

  describe("isValidIsbn10", () => {
    it("should validate correct ISBN-10", () => {
      expect(isValidIsbn10("0571089895")).toBe(true);
      expect(isValidIsbn10("080442957X")).toBe(true);
    });

    it("should reject invalid ISBN-10 checksum", () => {
      expect(isValidIsbn10("1234567890")).toBe(false);
    });

    it("should reject wrong length", () => {
      expect(isValidIsbn10("12345")).toBe(false);
      expect(isValidIsbn10("12345678901")).toBe(false);
    });
  });

  describe("isValidIsbn13", () => {
    it("should validate correct ISBN-13", () => {
      expect(isValidIsbn13("9780571089895")).toBe(true);
    });

    it("should reject invalid ISBN-13 checksum", () => {
      expect(isValidIsbn13("9781234567890")).toBe(false);
    });

    it("should reject wrong length", () => {
      expect(isValidIsbn13("978123456789")).toBe(false);
      expect(isValidIsbn13("97812345678901")).toBe(false);
    });
  });

  describe("isValidIsbn", () => {
    it("should validate both ISBN-10 and ISBN-13", () => {
      expect(isValidIsbn("0571089895")).toBe(true);
      expect(isValidIsbn("9780571089895")).toBe(true);
      expect(isValidIsbn("080442957X")).toBe(true);
    });

    it("should reject invalid ISBNs", () => {
      expect(isValidIsbn("1234567890")).toBe(false);
      expect(isValidIsbn("9781234567890")).toBe(false);
      expect(isValidIsbn("12345")).toBe(false);
    });
  });

  describe("isbn10To13", () => {
    it("should convert ISBN-10 to ISBN-13", () => {
      expect(isbn10To13("0571089895")).toBe("9780571089895");
      expect(isbn10To13("080442957X")).toBe("9780804429573");
    });

    it("should throw for invalid length", () => {
      expect(() => isbn10To13("12345")).toThrow();
    });
  });

  describe("normalizeIsbn", () => {
    it("should normalize and validate ISBN-13", () => {
      expect(normalizeIsbn("978-0-571-08989-5")).toBe("9780571089895");
      expect(normalizeIsbn("9780571089895")).toBe("9780571089895");
    });

    it("should convert ISBN-10 to ISBN-13 by default", () => {
      expect(normalizeIsbn("0-571-08989-5")).toBe("9780571089895");
    });

    it("should not convert ISBN-10 when option is false", () => {
      expect(normalizeIsbn("0-571-08989-5", false)).toBe("0571089895");
    });

    it("should return null for invalid ISBN", () => {
      expect(normalizeIsbn("1234567890")).toBeNull();
      expect(normalizeIsbn("9781234567890")).toBeNull();
      expect(normalizeIsbn("12345")).toBeNull();
      expect(normalizeIsbn("")).toBeNull();
    });

    it("should produce same result for equivalent ISBNs", () => {
      const formatted = normalizeIsbn("978-0-571-08989-5");
      const clean = normalizeIsbn("9780571089895");
      const isbn10 = normalizeIsbn("0-571-08989-5");

      expect(formatted).toBe(clean);
      expect(formatted).toBe(isbn10);
    });
  });
});

describe("Author Name Normalization", () => {
  describe("normalizeAuthorName", () => {
    it("should convert to lowercase", () => {
      expect(normalizeAuthorName("Stephen King")).toBe("stephen king");
    });

    it("should remove diacritics", () => {
      expect(normalizeAuthorName("Gabriel García Márquez")).toBe("gabriel garcia marquez");
      expect(normalizeAuthorName("François Müller")).toBe("francois muller");
    });

    it("should remove titles", () => {
      expect(normalizeAuthorName("Dr. Martin Luther King")).toBe("martin luther king");
      expect(normalizeAuthorName("Prof. Stephen Hawking")).toBe("stephen hawking");
      expect(normalizeAuthorName("Sir Arthur Conan Doyle")).toBe("arthur conan doyle");
    });

    it("should remove suffixes", () => {
      expect(normalizeAuthorName("Martin Luther King Jr.")).toBe("martin luther king");
      expect(normalizeAuthorName("Robert Downey, Jr")).toBe("robert downey");
      expect(normalizeAuthorName("John Smith III")).toBe("john smith");
    });

    it("should remove life dates", () => {
      expect(normalizeAuthorName("Tolkien, J.R.R., 1892-1973")).toBe("jrr tolkien");
      expect(normalizeAuthorName("Shakespeare, William (1564-1616)")).toBe("william shakespeare");
    });

    it("should convert 'Last, First' to 'First Last'", () => {
      expect(normalizeAuthorName("Tolkien, J.R.R.")).toBe("jrr tolkien");
      expect(normalizeAuthorName("King, Stephen")).toBe("stephen king");
      expect(normalizeAuthorName("García Márquez, Gabriel")).toBe("gabriel garcia marquez");
    });

    it("should handle empty input", () => {
      expect(normalizeAuthorName("")).toBe("");
    });

    it("should normalize whitespace", () => {
      expect(normalizeAuthorName("  Stephen   King  ")).toBe("stephen king");
    });
  });

  describe("parseAuthorName", () => {
    it("should parse 'First Last' format", () => {
      const result = parseAuthorName("Stephen King");
      expect(result.firstName).toBe("Stephen");
      expect(result.lastName).toBe("King");
      expect(result.suffix).toBeUndefined();
    });

    it("should parse 'First Middle Last' format", () => {
      const result = parseAuthorName("Martin Luther King");
      expect(result.firstName).toBe("Martin Luther");
      expect(result.lastName).toBe("King");
    });

    it("should parse 'Last, First' format", () => {
      const result = parseAuthorName("King, Stephen");
      expect(result.firstName).toBe("Stephen");
      expect(result.lastName).toBe("King");
    });

    it("should extract suffixes", () => {
      const result = parseAuthorName("Martin Luther King Jr.");
      expect(result.firstName).toBe("Martin Luther");
      expect(result.lastName).toBe("King");
      expect(result.suffix).toBe("JR");
    });

    it("should handle single name", () => {
      const result = parseAuthorName("Madonna");
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBe("Madonna");
    });

    it("should handle empty input", () => {
      const result = parseAuthorName("");
      expect(result.lastName).toBe("");
    });
  });

  describe("formatAuthorName", () => {
    it("should format as 'First Last'", () => {
      const result = formatAuthorName({ firstName: "Stephen", lastName: "King" }, "first-last");
      expect(result).toBe("Stephen King");
    });

    it("should format as 'Last, First'", () => {
      const result = formatAuthorName({ firstName: "Stephen", lastName: "King" }, "last-first");
      expect(result).toBe("King, Stephen");
    });

    it("should include suffix", () => {
      const result = formatAuthorName(
        { firstName: "Martin", lastName: "King", suffix: "JR" },
        "first-last",
      );
      expect(result).toBe("Martin King, JR");
    });

    it("should handle missing first name", () => {
      const result = formatAuthorName({ lastName: "Madonna" }, "first-last");
      expect(result).toBe("Madonna");
    });
  });
});

describe("Title Normalization", () => {
  describe("normalizeTitle", () => {
    it("should convert to lowercase", () => {
      expect(normalizeTitle("The Great Gatsby")).toBe("great gatsby");
    });

    it("should remove diacritics", () => {
      expect(normalizeTitle("Café")).toBe("cafe");
      expect(normalizeTitle("naïve")).toBe("naive");
      expect(normalizeTitle("Götterdämmerung")).toBe("gotterdammerung");
    });

    it("should remove leading articles (English)", () => {
      expect(normalizeTitle("The Hobbit")).toBe("hobbit");
      expect(normalizeTitle("A Tale of Two Cities")).toBe("tale of two cities");
      expect(normalizeTitle("An Introduction")).toBe("introduction");
    });

    it("should remove leading articles (other languages)", () => {
      expect(normalizeTitle("Der Prozess")).toBe("prozess");
      expect(normalizeTitle("Die Verwandlung")).toBe("verwandlung");
      expect(normalizeTitle("Das Boot")).toBe("boot");
      expect(normalizeTitle("Le Petit Prince")).toBe("petit prince");
      expect(normalizeTitle("La Casa")).toBe("casa");
      expect(normalizeTitle("Los Angeles")).toBe("angeles");
    });

    it("should preserve articles when removeArticles is false", () => {
      expect(normalizeTitle("The Hobbit", false)).toBe("the hobbit");
    });

    it("should normalize whitespace", () => {
      expect(normalizeTitle("  The   Great   Gatsby  ")).toBe("great gatsby");
    });

    it("should remove punctuation", () => {
      expect(normalizeTitle("Hello, World!")).toBe("hello world");
      expect(normalizeTitle("What's Up?")).toBe("whats up");
    });

    it("should handle empty input", () => {
      expect(normalizeTitle("")).toBe("");
      expect(normalizeTitle("   ")).toBe("");
    });
  });
});

describe("Publisher Normalization", () => {
  describe("normalizePublisher", () => {
    it("should convert to lowercase", () => {
      expect(normalizePublisher("Penguin Books")).toBe("penguin");
    });

    it("should remove corporate suffixes", () => {
      expect(normalizePublisher("Random House, Inc.")).toBe("random house");
      expect(normalizePublisher("HarperCollins Publishers")).toBe("harpercollins");
      expect(normalizePublisher("Simon & Schuster Ltd")).toBe("simon and schuster");
    });

    it("should normalize ampersand to 'and'", () => {
      expect(normalizePublisher("Simon & Schuster")).toBe("simon and schuster");
    });

    it("should remove foreign suffixes", () => {
      expect(normalizePublisher("S. Fischer Verlag")).toBe("s fischer");
      expect(normalizePublisher("Gallimard Editions")).toBe("gallimard");
    });

    it("should handle empty input", () => {
      expect(normalizePublisher("")).toBe("");
    });
  });
});

describe("DOI Normalization", () => {
  describe("normalizeDoi", () => {
    it("should remove doi.org URL prefix", () => {
      expect(normalizeDoi("https://doi.org/10.1000/xyz123")).toBe("10.1000/xyz123");
      expect(normalizeDoi("http://doi.org/10.1000/xyz123")).toBe("10.1000/xyz123");
    });

    it("should return clean DOI as-is", () => {
      expect(normalizeDoi("10.1000/xyz123")).toBe("10.1000/xyz123");
    });

    it("should trim whitespace", () => {
      expect(normalizeDoi("  10.1000/xyz123  ")).toBe("10.1000/xyz123");
    });

    it("should handle empty input", () => {
      expect(normalizeDoi("")).toBe("");
    });
  });
});

describe("Integration: Equivalent Inputs", () => {
  it("should produce same normalized author for different formats", () => {
    const formats = [
      "J.R.R. Tolkien",
      "Tolkien, J.R.R.",
      "Tolkien, J.R.R., 1892-1973",
      "  J.R.R.  TOLKIEN  ",
    ];

    const normalized = formats.map(normalizeAuthorName);
    expect(new Set(normalized).size).toBe(1);
  });

  it("should produce same normalized ISBN for different formats", () => {
    const formats = [
      "978-0-571-08989-5",
      "9780571089895",
      "978 0 571 08989 5",
      "0-571-08989-5", // ISBN-10 converted to ISBN-13
    ];

    const normalized = formats.map((isbn) => normalizeIsbn(isbn));
    expect(new Set(normalized).size).toBe(1);
  });

  it("should produce same normalized title for different formats", () => {
    const formats = [
      "The Lord of the Rings",
      "THE LORD OF THE RINGS",
      "  The  Lord  of  the  Rings  ",
    ];

    // Note: Use arrow function to avoid map passing index as second arg to normalizeTitle
    const normalized = formats.map((f) => normalizeTitle(f));
    expect(new Set(normalized).size).toBe(1);
  });
});
