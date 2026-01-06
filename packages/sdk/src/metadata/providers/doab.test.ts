import { beforeEach, describe, expect, it, vi } from "vitest";
import { DOABMetadataProvider } from "./doab.js";
import { MetadataType } from "./provider.js";

// Sample DOAB API response for a book
const sampleBookResponse: Record<string, unknown> = {
  items: [
    {
      uuid: "abc123-def456-ghi789",
      name: "Open Access Book",
      handle: "20.500.12657/12345",
      type: "item",
      metadata: [
        { key: "dc.title", value: "Introduction to Open Science" },
        { key: "dc.contributor.author", value: "Smith, John" },
        { key: "dc.contributor.author", value: "Johnson, Mary" },
        { key: "dc.identifier.isbn", value: "978-3-030-55555-5" },
        { key: "dc.identifier.doi", value: "10.1007/978-3-030-55555-5" },
        { key: "dc.publisher", value: "Open Access Publisher" },
        { key: "dc.date.issued", value: "2023-06-15" },
        {
          key: "dc.description.abstract",
          value:
            "This book provides a comprehensive introduction to open science practices...",
        },
        { key: "dc.subject", value: "Open Access" },
        { key: "dc.subject", value: "Academic Publishing" },
        { key: "dc.subject.classification", value: "Science" },
        { key: "dc.language.iso", value: "eng" },
        {
          key: "dc.rights.uri",
          value: "https://creativecommons.org/licenses/by/4.0/",
        },
      ],
      bitstreams: [
        {
          name: "fulltext.pdf",
          format: "application/pdf",
          sizeBytes: 5242880,
          retrieveLink:
            "https://directory.doabooks.org/bitstream/20.500.12657/12345/1/fulltext.pdf",
        },
        {
          name: "cover.jpg",
          format: "image/jpeg",
          sizeBytes: 102400,
          retrieveLink:
            "https://directory.doabooks.org/bitstream/20.500.12657/12345/2/cover.jpg",
        },
      ],
    },
  ],
  total: 1,
  offset: 0,
  limit: 10,
};

const sampleMultipleAuthorsResponse: Record<string, unknown> = {
  items: [
    {
      uuid: "xyz789-abc123",
      name: "Multi-Author Book",
      handle: "20.500.12657/67890",
      type: "item",
      metadata: [
        { key: "dc.title", value: "Collaborative Research Methods" },
        { key: "dc.creator", value: "Wilson, Alice" },
        { key: "dc.creator", value: "Brown, Bob" },
        { key: "dc.creator", value: "Davis, Carol" },
        { key: "dc.publisher", value: "Academic Press" },
        { key: "dc.date", value: "2022" },
        { key: "dc.language", value: "en" },
      ],
    },
  ],
  total: 1,
};

const emptyResponse: Record<string, unknown> = {
  items: [],
  total: 0,
  offset: 0,
  limit: 10,
};

describe("DOABMetadataProvider", () => {
  let provider: DOABMetadataProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    provider = new DOABMetadataProvider(mockFetch);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("searchByTitle", () => {
    it("should search by title and return metadata records", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({
        title: "Open Science",
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);

      const record = results[0];
      expect(record.title).toBe("Introduction to Open Science");
      expect(record.authors).toContain("Smith, John");
      expect(record.authors).toContain("Johnson, Mary");
      expect(record.isbn).toContain("9783030555555");
      expect(record.publisher).toBe("Open Access Publisher");
      expect(record.language).toBe("en");
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
        json: async () => sampleBookResponse,
      });

      await provider.searchByTitle({
        title: "Open Science",
        exactMatch: true,
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("dc.title%3A%22Open+Science%22");
    });

    it("should extract subjects from both dc.subject and dc.subject.classification", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].subjects).toContain("Open Access");
      expect(results[0].subjects).toContain("Academic Publishing");
      expect(results[0].subjects).toContain("Science");
    });
  });

  describe("searchByISBN", () => {
    it("should search by ISBN", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByISBN("978-3-030-55555-5");

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should clean ISBN before searching", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchByISBN("978-3-030-55555-5");

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("dc.identifier.isbn%3A9783030555555");
    });
  });

  describe("searchByDOI", () => {
    it("should search by DOI", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByDOI("10.1007/978-3-030-55555-5");

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should handle doi.org URL format", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchByDOI("https://doi.org/10.1007/978-3-030-55555-5");

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain(
        "dc.identifier.doi%3A10.1007%2F978-3-030-55555-5",
      );
    });
  });

  describe("searchByCreator", () => {
    it("should search by author name", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByCreator({
        name: "Smith",
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].authors).toContain("Smith, John");
    });

    it("should handle fuzzy author searches", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchByCreator({
        name: "Smith",
        fuzzy: true,
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("dc.contributor.author%3ASmith");
    });

    it("should handle exact author searches", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchByCreator({
        name: "Smith, John",
        fuzzy: false,
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("dc.contributor.author%3A%22Smith%2C+John%22");
    });
  });

  describe("searchMultiCriteria", () => {
    it("should prioritize ISBN when available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchMultiCriteria({
        title: "Open Science",
        isbn: "9783030555555",
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("dc.identifier.isbn%3A9783030555555");
    });

    it("should combine title and author with AND", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchMultiCriteria({
        title: "Open Science",
        authors: ["Smith"],
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("dc.title%3AOpen");
      expect(call[0]).toContain("dc.contributor.author%3ASmith");
      expect(call[0]).toContain("AND");
    });

    it("should include publisher in search", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchMultiCriteria({
        title: "Open Science",
        publisher: "Academic Press",
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("dc.publisher%3AAcademic");
    });

    it("should return empty array when no criteria provided", async () => {
      const results = await provider.searchMultiCriteria({});
      expect(results).toEqual([]);
    });
  });

  describe("Provider Data", () => {
    it("should include DOI in provider data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.doi).toBe("10.1007/978-3-030-55555-5");
    });

    it("should include open access URL", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.openAccessUrl).toContain("fulltext.pdf");
    });

    it("should include license information", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.license).toContain("creativecommons.org");
    });

    it("should include bitstream information", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.bitstreams).toBeDefined();
      expect(results[0].providerData?.bitstreams?.length).toBe(2);
    });

    it("should include UUID and handle", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.uuid).toBe("abc123-def456-ghi789");
      expect(results[0].providerData?.handle).toBe("20.500.12657/12345");
    });
  });

  describe("Author Extraction", () => {
    it("should extract authors from dc.contributor.author", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].authors).toContain("Smith, John");
      expect(results[0].authors).toContain("Johnson, Mary");
    });

    it("should extract authors from dc.creator", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleMultipleAuthorsResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].authors).toContain("Wilson, Alice");
      expect(results[0].authors).toContain("Brown, Bob");
      expect(results[0].authors).toContain("Davis, Carol");
    });
  });

  describe("Language Normalization", () => {
    it("should normalize 3-letter language codes", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].language).toBe("en");
    });

    it("should keep 2-letter language codes as-is", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleMultipleAuthorsResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].language).toBe("en");
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
          json: async () => sampleBookResponse,
        });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 30000);

    it("should handle missing items gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results).toEqual([]);
    }, 30000);
  });

  describe("Confidence Scoring", () => {
    it("should assign high confidence for ISBN searches", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByISBN("9783030555555");
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    }, 30000);

    it("should assign high confidence for DOI searches", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByDOI("10.1007/test");
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    }, 30000);

    it("should boost confidence for complete metadata", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      // Complete record should have higher confidence
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.75);
    }, 30000);
  });

  describe("Reliability Scores", () => {
    it("should report high reliability for title", () => {
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.9);
    });

    it("should report high reliability for ISBN", () => {
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.95);
    });

    it("should report good reliability for publisher", () => {
      expect(provider.getReliabilityScore(MetadataType.PUBLISHER)).toBe(0.9);
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
      expect(provider.supportsDataType(MetadataType.DESCRIPTION)).toBe(true);
    });

    it("should not support cover images", () => {
      expect(provider.supportsDataType(MetadataType.COVER_IMAGE)).toBe(false);
    });

    it("should not support page count", () => {
      expect(provider.supportsDataType(MetadataType.PAGE_COUNT)).toBe(false);
    });
  });

  describe("Provider Properties", () => {
    it("should have correct name", () => {
      expect(provider.name).toBe("DOAB");
    });

    it("should have correct priority", () => {
      expect(provider.priority).toBe(65);
    });

    it("should have appropriate rate limits", () => {
      expect(provider.rateLimit.maxRequests).toBe(30);
      expect(provider.rateLimit.windowMs).toBe(30000);
    });
  });
});
