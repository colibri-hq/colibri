import { describe, expect, it } from "vitest";
import { IdentifierReconciler } from "./identifiers.js";
import type { Identifier, IdentifierInput, MetadataSource } from "./types.js";

describe("IdentifierReconciler", () => {
  const reconciler = new IdentifierReconciler();

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

  const _mockSource3: MetadataSource = {
    name: "GoodReads",
    reliability: 0.7,
    timestamp: new Date("2024-01-03"),
  };

  describe("normalizeIdentifier", () => {
    describe("ISBN normalization", () => {
      it("should normalize ISBN-10 to ISBN-13", () => {
        const result = reconciler.normalizeIdentifier("0123456789");
        expect(result.type).toBe("isbn");
        expect(result.normalized).toBe("9780123456786");
        expect(result.valid).toBe(true);
      });

      it("should handle ISBN-13 correctly", () => {
        const result = reconciler.normalizeIdentifier("9780123456786");
        expect(result.type).toBe("isbn");
        expect(result.normalized).toBe("9780123456786");
        expect(result.valid).toBe(true);
      });

      it("should handle ISBN with hyphens and spaces", () => {
        const result = reconciler.normalizeIdentifier("978-0-12-345678-6");
        expect(result.type).toBe("isbn");
        expect(result.normalized).toBe("9780123456786");
        expect(result.valid).toBe(true);
      });

      it("should handle ISBN-10 with X check digit", () => {
        const result = reconciler.normalizeIdentifier("012345678X");
        expect(result.type).toBe("isbn");
        expect(result.normalized).toBe("9780123456786");
        expect(result.valid).toBe(true);
      });
    });

    describe("DOI normalization", () => {
      it("should normalize DOI with prefix", () => {
        const result = reconciler.normalizeIdentifier("doi:10.1000/182");
        expect(result.type).toBe("doi");
        expect(result.normalized).toBe("10.1000/182");
        expect(result.valid).toBe(true);
      });

      it("should normalize DOI URL", () => {
        const result = reconciler.normalizeIdentifier(
          "https://doi.org/10.1000/182",
        );
        expect(result.type).toBe("doi");
        expect(result.normalized).toBe("10.1000/182");
        expect(result.valid).toBe(true);
      });

      it("should handle plain DOI", () => {
        const result = reconciler.normalizeIdentifier("10.1000/182");
        expect(result.type).toBe("doi");
        expect(result.normalized).toBe("10.1000/182");
        expect(result.valid).toBe(true);
      });
    });

    describe("OCLC normalization", () => {
      it("should normalize OCLC with prefix", () => {
        const result = reconciler.normalizeIdentifier("ocm12345678");
        expect(result.type).toBe("oclc");
        expect(result.normalized).toBe("12345678");
        expect(result.valid).toBe(true);
      });

      it("should handle plain OCLC number", () => {
        const result = reconciler.normalizeIdentifier("123456789");
        expect(result.type).toBe("oclc");
        expect(result.normalized).toBe("123456789");
        expect(result.valid).toBe(true);
      });
    });

    describe("LCCN normalization", () => {
      it("should normalize LCCN with letters", () => {
        const result = reconciler.normalizeIdentifier("abc1234567890");
        expect(result.type).toBe("lccn");
        expect(result.normalized).toBe("abc1234567890");
        expect(result.valid).toBe(true);
      });

      it("should normalize numeric LCCN", () => {
        const result = reconciler.normalizeIdentifier("20241234567");
        expect(result.type).toBe("lccn");
        expect(result.normalized).toBe("20241234567");
        expect(result.valid).toBe(true);
      });
    });

    describe("GoodReads normalization", () => {
      it("should normalize GoodReads URL", () => {
        const result = reconciler.normalizeIdentifier(
          "https://www.goodreads.com/book/show/12345678",
        );
        expect(result.type).toBe("goodreads");
        expect(result.normalized).toBe("12345678");
        expect(result.valid).toBe(true);
      });

      it("should handle GoodReads prefix", () => {
        const result = reconciler.normalizeIdentifier("goodreads:12345678");
        expect(result.type).toBe("goodreads");
        expect(result.normalized).toBe("12345678");
        expect(result.valid).toBe(true);
      });
    });

    describe("Amazon normalization", () => {
      it("should normalize Amazon URL", () => {
        const result = reconciler.normalizeIdentifier(
          "https://amazon.com/dp/B01234567X",
        );
        expect(result.type).toBe("amazon");
        expect(result.normalized).toBe("B01234567X");
        expect(result.valid).toBe(true);
      });

      it("should handle Amazon prefix", () => {
        const result = reconciler.normalizeIdentifier("amazon:B01234567X");
        expect(result.type).toBe("amazon");
        expect(result.normalized).toBe("B01234567X");
        expect(result.valid).toBe(true);
      });
    });

    describe("Google Books normalization", () => {
      it("should normalize Google Books URL", () => {
        const result = reconciler.normalizeIdentifier(
          "https://books.google.com/books?id=ABC123DEF456",
        );
        expect(result.type).toBe("google");
        expect(result.normalized).toBe("ABC123DEF456");
        expect(result.valid).toBe(true);
      });

      it("should handle Google prefix", () => {
        const result = reconciler.normalizeIdentifier("google:ABC123DEF456");
        expect(result.type).toBe("google");
        expect(result.normalized).toBe("ABC123DEF456");
        expect(result.valid).toBe(true);
      });
    });
  });

  describe("reconcileIdentifiers", () => {
    it("should handle single input with multiple identifiers", () => {
      const input: IdentifierInput = {
        isbn: "9780123456786",
        oclc: "123456789",
        doi: "10.1000/182",
        source: mockSource1,
      };

      const result = reconciler.reconcileIdentifiers([input]);

      expect(result.value).toHaveLength(3);
      expect(result.value.find((id) => id.type === "isbn")).toBeDefined();
      expect(result.value.find((id) => id.type === "oclc")).toBeDefined();
      expect(result.value.find((id) => id.type === "doi")).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.sources).toHaveLength(1);
    });

    it("should deduplicate identical identifiers from different sources", () => {
      const inputs: IdentifierInput[] = [
        {
          isbn: "9780123456786",
          source: mockSource1,
        },
        {
          isbn: "978-0-12-345678-6", // Same ISBN with formatting
          source: mockSource2,
        },
      ];

      const result = reconciler.reconcileIdentifiers(inputs);

      expect(result.value).toHaveLength(1);
      expect(result.value[0].type).toBe("isbn");
      expect(result.value[0].normalized).toBe("9780123456786");
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts).toHaveLength(1);
    });

    it("should prefer more reliable sources for conflicts", () => {
      const inputs: IdentifierInput[] = [
        {
          isbn: "9780123456786",
          source: mockSource1, // reliability 0.8
        },
        {
          isbn: "9780123456786",
          source: mockSource2, // reliability 0.9
        },
      ];

      const result = reconciler.reconcileIdentifiers(inputs);

      expect(result.value).toHaveLength(1);
      expect(result.sources).toContain(mockSource2);
      expect(result.conflicts).toBeDefined();
    });

    it("should handle mixed valid and invalid identifiers", () => {
      const inputs: IdentifierInput[] = [
        {
          isbn: "9780123456786", // valid
          oclc: "12345", // too short, invalid
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcileIdentifiers(inputs);

      expect(result.value).toHaveLength(2);
      const validIds = result.value.filter((id) => id.valid);
      const invalidIds = result.value.filter((id) => !id.valid);
      expect(validIds).toHaveLength(1);
      expect(invalidIds).toHaveLength(1);
      expect(validIds[0].type).toBe("isbn");
    });

    it("should sort identifiers by priority and validity", () => {
      const inputs: IdentifierInput[] = [
        {
          goodreads: "12345678",
          isbn: "9780123456786",
          amazon: "B01234567X",
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcileIdentifiers(inputs);

      expect(result.value).toHaveLength(3);
      // ISBN should come first (highest priority)
      expect(result.value[0].type).toBe("isbn");
      // Amazon should come before GoodReads
      expect(result.value.findIndex((id) => id.type === "amazon")).toBeLessThan(
        result.value.findIndex((id) => id.type === "goodreads"),
      );
    });

    it("should handle identifiers array input", () => {
      const identifiers: Identifier[] = [
        { type: "isbn", value: "9780123456786", valid: true },
        { type: "doi", value: "10.1000/182", valid: true },
      ];

      const input: IdentifierInput = {
        identifiers,
        source: mockSource1,
      };

      const result = reconciler.reconcileIdentifiers([input]);

      expect(result.value).toHaveLength(2);
      expect(result.value.find((id) => id.type === "isbn")).toBeDefined();
      expect(result.value.find((id) => id.type === "doi")).toBeDefined();
    });

    it("should handle empty input gracefully", () => {
      expect(() => reconciler.reconcileIdentifiers([])).toThrow(
        "No identifiers to reconcile",
      );
    });

    it("should handle input with no valid identifiers", () => {
      const input: IdentifierInput = {
        source: mockSource1,
      };

      const result = reconciler.reconcileIdentifiers([input]);

      expect(result.value).toHaveLength(0);
      expect(result.confidence).toBe(0.1);
      expect(result.reasoning).toContain("No valid identifiers found");
    });

    it("should calculate confidence based on validity and source reliability", () => {
      const inputs: IdentifierInput[] = [
        {
          isbn: "9780123456786", // valid
          oclc: "123456789", // valid
          source: mockSource2, // high reliability (0.9)
        },
      ];

      const result = reconciler.reconcileIdentifiers(inputs);

      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.reasoning).toContain("2 valid");
    });
  });

  describe("ISBN validation", () => {
    it("should validate correct ISBN-13", () => {
      const result = reconciler.normalizeIdentifier("9780123456786");
      expect(result.valid).toBe(true);
    });

    it("should invalidate incorrect ISBN-13", () => {
      const result = reconciler.normalizeIdentifier("9780123456787"); // wrong check digit
      expect(result.valid).toBe(false);
    });

    it("should invalidate non-978/979 prefix", () => {
      const result = reconciler.normalizeIdentifier("9770123456786");
      expect(result.valid).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle malformed identifiers gracefully", () => {
      const result = reconciler.normalizeIdentifier("not-an-identifier");
      expect(result.type).toBe("other");
      expect(result.valid).toBe(true); // 'other' type is valid if non-empty
    });

    it("should handle empty string", () => {
      const result = reconciler.normalizeIdentifier("");
      expect(result.type).toBe("other");
      expect(result.valid).toBe(false);
    });

    it("should handle very long identifier", () => {
      const longId = "a".repeat(1000);
      const result = reconciler.normalizeIdentifier(longId);
      expect(result.type).toBe("other");
      expect(result.valid).toBe(true);
    });
  });
});
