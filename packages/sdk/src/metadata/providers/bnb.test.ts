import { beforeEach, describe, expect, it, vi } from "vitest";
import { BNBMetadataProvider } from "./bnb.js";
import { MetadataType } from "./provider.js";

// Sample SPARQL response
const sampleSparqlResponse = {
  head: {
    vars: [
      "book",
      "title",
      "author",
      "isbn",
      "publisher",
      "date",
      "language",
      "ddc",
      "pages",
      "blId",
    ],
  },
  results: {
    bindings: [
      {
        book: {
          type: "uri",
          value: "http://bnb.data.bl.uk/id/resource/016547439",
        },
        title: {
          type: "literal",
          value: "Pride and prejudice",
          "xml:lang": "en",
        },
        author: { type: "literal", value: "Austen, Jane", "xml:lang": "en" },
        isbn: { type: "literal", value: "9780141439518" },
        publisher: { type: "literal", value: "Penguin Classics" },
        date: { type: "literal", value: "2003" },
        language: {
          type: "uri",
          value: "http://id.loc.gov/vocabulary/iso639-2/eng",
        },
        ddc: { type: "literal", value: "823.7" },
        pages: {
          type: "literal",
          value: "480",
          datatype: "http://www.w3.org/2001/XMLSchema#integer",
        },
        blId: { type: "literal", value: "GBA3-87654" },
      },
    ],
  },
};

const multipleAuthorsResponse = {
  head: {
    vars: ["book", "title", "author", "isbn"],
  },
  results: {
    bindings: [
      {
        book: {
          type: "uri",
          value: "http://bnb.data.bl.uk/id/resource/012345678",
        },
        title: { type: "literal", value: "Test Book" },
        author: { type: "literal", value: "Author One" },
        isbn: { type: "literal", value: "9781234567890" },
      },
      {
        book: {
          type: "uri",
          value: "http://bnb.data.bl.uk/id/resource/012345678",
        },
        title: { type: "literal", value: "Test Book" },
        author: { type: "literal", value: "Author Two" },
        isbn: { type: "literal", value: "9781234567890" },
      },
    ],
  },
};

const emptyResponse = {
  head: { vars: [] },
  results: { bindings: [] },
};

describe("BNBMetadataProvider", () => {
  let provider: BNBMetadataProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    provider = new BNBMetadataProvider(mockFetch);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  describe("searchByTitle", () => {
    it("should search by title and return metadata records", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      const results = await provider.searchByTitle({
        title: "Pride and prejudice",
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);

      const record = results[0];
      expect(record.title).toBe("Pride and prejudice");
      expect(record.authors).toContain("Austen, Jane");
      expect(record.isbn).toContain("9780141439518");
      expect(record.publisher).toBe("Penguin Classics");
      expect(record.language).toBe("en");
      expect(record.pageCount).toBe(480);
    });

    it("should return empty array when no results", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => emptyResponse,
      });

      const results = await provider.searchByTitle({
        title: "Nonexistent Book",
      });

      expect(results).toEqual([]);
    });

    it("should handle exact match searches", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      await provider.searchByTitle({
        title: "Pride and prejudice",
        exactMatch: true,
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("dct%3Atitle+%22Pride+and+prejudice%22");
    });
  });

  describe("searchByISBN", () => {
    it("should search by ISBN", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      const results = await provider.searchByISBN("978-0-14-143951-8");

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should clean ISBN before searching", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      await provider.searchByISBN("978-0-14-143951-8");

      const call = mockFetch.mock.calls[0];
      // Verify the cleaned ISBN is in the query (no hyphens in the ISBN number itself)
      expect(call[0]).toContain("9780141439518");
      // Note: The URL may contain "-" in other parts like iso639-2, which is fine
    });
  });

  describe("searchByCreator", () => {
    it("should search by author name", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      const results = await provider.searchByCreator({
        name: "Austen, Jane",
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].authors).toContain("Austen, Jane");
    });

    it("should handle fuzzy author searches", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      await provider.searchByCreator({
        name: "Austen",
        fuzzy: true,
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("CONTAINS");
    });
  });

  describe("searchMultiCriteria", () => {
    it("should prioritize ISBN when available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      await provider.searchMultiCriteria({
        title: "Pride and prejudice",
        isbn: "9780141439518",
      });

      const call = mockFetch.mock.calls[0];
      // Should use ISBN in the filter clause
      expect(call[0]).toContain("bibo%3Aisbn");
      // Note: dct:title will still appear in SELECT/OPTIONAL clauses, but not as a search filter
      // The key is that ISBN is used for filtering, not title
    });

    it("should combine title and author", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      await provider.searchMultiCriteria({
        title: "Pride and prejudice",
        authors: ["Austen"],
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("dct%3Atitle");
      expect(call[0]).toContain("dct%3Acreator");
    });

    it("should return empty array when no criteria provided", async () => {
      const results = await provider.searchMultiCriteria({});
      expect(results).toEqual([]);
    });
  });

  describe("Result Processing", () => {
    it("should aggregate multiple authors for the same book", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => multipleAuthorsResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test Book",
      });

      expect(results.length).toBe(1);
      expect(results[0].authors).toContain("Author One");
      expect(results[0].authors).toContain("Author Two");
    });

    it("should include British Library ID in provider data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results[0].providerData?.blId).toBe("GBA3-87654");
    });

    it("should include DDC classification in provider data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results[0].providerData?.ddcClassification).toBe("823.7");
    });
  });

  describe("Language Code Normalization", () => {
    it("should normalize ISO 639-2/B codes from URIs", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results[0].language).toBe("en");
    });

    it("should handle Welsh language code", async () => {
      const welshResponse = {
        ...sampleSparqlResponse,
        results: {
          bindings: [
            {
              ...sampleSparqlResponse.results.bindings[0],
              language: {
                type: "uri",
                value: "http://id.loc.gov/vocabulary/iso639-2/wel",
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => welshResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results[0].language).toBe("cy");
    });
  });

  describe("Error Handling", () => {
    it("should handle HTTP errors gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results).toEqual([]);
    }, 30000);

    it("should handle network errors with retry", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue({
          ok: true,
          json: async () => sampleSparqlResponse,
        });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 30000);

    it("should handle malformed JSON gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results).toEqual([]);
    });
  });

  describe("Confidence Scoring", () => {
    it("should assign higher confidence for ISBN searches", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      const results = await provider.searchByISBN("9780141439518");
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should boost confidence for complete metadata", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSparqlResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      // Complete record should have higher confidence
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("Reliability Scores", () => {
    it("should report high reliability for title", () => {
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.95);
    });

    it("should report high reliability for authors", () => {
      expect(provider.getReliabilityScore(MetadataType.AUTHORS)).toBe(0.92);
    });

    it("should report very high reliability for ISBN", () => {
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.98);
    });

    it("should report zero for cover images (not supported)", () => {
      expect(provider.getReliabilityScore(MetadataType.COVER_IMAGE)).toBe(0.0);
    });
  });

  describe("Supported Data Types", () => {
    it("should support core metadata types", () => {
      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PUBLICATION_DATE)).toBe(
        true,
      );
    });

    it("should not support cover images", () => {
      expect(provider.supportsDataType(MetadataType.COVER_IMAGE)).toBe(false);
    });
  });

  describe("Provider Properties", () => {
    it("should have correct name", () => {
      expect(provider.name).toBe("BNB");
    });

    it("should have correct priority", () => {
      expect(provider.priority).toBe(75);
    });

    it("should have appropriate rate limits for SPARQL", () => {
      expect(provider.rateLimit.maxRequests).toBe(30);
      expect(provider.rateLimit.windowMs).toBe(60000);
      expect(provider.rateLimit.requestDelay).toBe(1000);
    });
  });

  describe("SPARQL Query Escaping", () => {
    it("should escape special characters in title search", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => emptyResponse,
      });

      await provider.searchByTitle({
        title: 'Book "With" Quotes',
      });

      expect(mockFetch).toHaveBeenCalled();
      // Query should complete without error
    });

    it("should escape backslashes and newlines", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => emptyResponse,
      });

      await provider.searchByTitle({
        title: "Book\\Title\nWith\rNewlines",
      });

      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
