import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetadataType } from "./provider.js";
import { SpringerNatureMetadataProvider } from "./springer.js";

// Sample Springer API response for a book
const sampleBookResponse: Record<string, unknown> = {
  result: [{ total: "1", start: "1", pageLength: "10", recordsDisplayed: "1" }],
  records: [
    {
      identifier: "doi:10.1007/978-3-030-12345-6",
      url: "http://link.springer.com/10.1007/978-3-030-12345-6",
      title: "Advanced Machine Learning Techniques",
      creators: [
        { creator: "Smith, John", ORCID: "0000-0001-2345-6789", affiliation: "MIT" },
        { creator: "Johnson, Jane", affiliation: "Stanford University" },
      ],
      publicationName: "Springer Series in Data Science",
      openaccess: "true",
      publicationDate: "2023-05-15",
      publicationType: "Book",
      isbn: "978-3-030-12345-6",
      printIsbn: "978-3-030-12345-6",
      electronicIsbn: "978-3-030-12346-3",
      doi: "10.1007/978-3-030-12345-6",
      publisher: "Springer Nature",
      abstract: "This comprehensive book covers advanced machine learning techniques...",
      subjects: [
        { term: "Computer Science" },
        { term: "Machine Learning" },
        { term: "Artificial Intelligence" },
      ],
      keyword: ["deep learning", "neural networks", "data science"],
      language: "en",
      genre: ["Monograph"],
      volume: "15",
    },
  ],
};

const sampleBookChapterResponse: Record<string, unknown> = {
  result: [{ total: "1", start: "1", pageLength: "10", recordsDisplayed: "1" }],
  records: [
    {
      identifier: "doi:10.1007/978-3-030-98765-4_5",
      url: "http://link.springer.com/chapter/10.1007/978-3-030-98765-4_5",
      title: "Introduction to Neural Networks",
      creators: [{ creator: "Wilson, Robert" }],
      publicationName: "Handbook of AI",
      openaccess: "false",
      publicationDate: "2022",
      publicationType: "BookChapter",
      doi: "10.1007/978-3-030-98765-4_5",
      publisher: "Springer",
      abstract: "This chapter introduces the fundamentals of neural networks.",
    },
  ],
};

const emptyResponse: Record<string, unknown> = {
  result: [{ total: "0", start: "1", pageLength: "10", recordsDisplayed: "0" }],
  records: [],
};

const journalArticleResponse: Record<string, unknown> = {
  result: [{ total: "1", start: "1", pageLength: "10", recordsDisplayed: "1" }],
  records: [
    {
      identifier: "doi:10.1007/s00123-456-789",
      title: "Some Journal Article",
      publicationType: "Journal",
      publisher: "Springer",
    },
  ],
};

describe("SpringerNatureMetadataProvider", () => {
  let provider: SpringerNatureMetadataProvider;
  let mockFetch: ReturnType<typeof vi.fn>;
  const testApiKey = "test-api-key-12345";

  beforeEach(() => {
    mockFetch = vi.fn();
    provider = new SpringerNatureMetadataProvider(testApiKey, mockFetch);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  describe("searchByTitle", () => {
    it("should search by title and return metadata records", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByTitle({ title: "Advanced Machine Learning" });

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);

      const record = results[0];
      expect(record.title).toBe("Advanced Machine Learning Techniques");
      expect(record.authors).toContain("Smith, John");
      expect(record.authors).toContain("Johnson, Jane");
      expect(record.isbn).toContain("978-3-030-12345-6");
      expect(record.publisher).toBe("Springer Nature");
      expect(record.language).toBe("en");
    });

    it("should include API key in request", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      await provider.searchByTitle({ title: "Test" });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain(`api_key=${testApiKey}`);
    });

    it("should filter for book types", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      await provider.searchByTitle({ title: "Test" });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("type=Book");
    });

    it("should return empty array when no results", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => emptyResponse });

      const results = await provider.searchByTitle({ title: "Nonexistent Book" });

      expect(results).toEqual([]);
    });

    it("should filter out journal articles", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => journalArticleResponse });

      const results = await provider.searchByTitle({ title: "Some Article" });

      expect(results).toEqual([]);
    });

    it("should handle exact match searches", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      await provider.searchByTitle({ title: "Machine Learning", exactMatch: true });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("title%3A%22Machine+Learning%22");
    });
  });

  describe("searchByISBN", () => {
    it("should search by ISBN", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByISBN("978-3-030-12345-6");

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should clean ISBN before searching", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      await provider.searchByISBN("978-3-030-12345-6");

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("isbn%3A9783030123456");
    });
  });

  describe("searchByDOI", () => {
    it("should search by DOI", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByDOI("10.1007/978-3-030-12345-6");

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should handle doi.org URL format", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      await provider.searchByDOI("https://doi.org/10.1007/978-3-030-12345-6");

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("doi%3A10.1007%2F978-3-030-12345-6");
    });
  });

  describe("searchByCreator", () => {
    it("should search by author name", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByCreator({ name: "Smith" });

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].authors).toContain("Smith, John");
    });

    it("should use name parameter in query", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      await provider.searchByCreator({ name: "Smith" });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("name%3ASmith");
    });
  });

  describe("searchMultiCriteria", () => {
    it("should prioritize ISBN when available", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      await provider.searchMultiCriteria({ title: "Machine Learning", isbn: "9783030123456" });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("isbn%3A9783030123456");
    });

    it("should combine title and author with AND", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      await provider.searchMultiCriteria({ title: "Machine Learning", authors: ["Smith"] });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("title%3AMachine");
      expect(call[0]).toContain("name%3ASmith");
      expect(call[0]).toContain("AND");
    });

    it("should include publisher in search", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      await provider.searchMultiCriteria({ title: "Test", publisher: "Springer" });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("pub%3ASpringer");
    });

    it("should return empty array when no criteria provided", async () => {
      const results = await provider.searchMultiCriteria({});
      expect(results).toEqual([]);
    });
  });

  describe("Provider Data", () => {
    it("should include DOI in provider data", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.doi).toBe("10.1007/978-3-030-12345-6");
    });

    it("should include open access status", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.openAccess).toBe(true);
    });

    it("should include publication type", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.publicationType).toBe("Book");
    });

    it("should include series name", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.publicationName).toBe("Springer Series in Data Science");
    });
  });

  describe("ISBN Extraction", () => {
    it("should extract all ISBN variants", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].isbn).toContain("978-3-030-12345-6");
      expect(results[0].isbn).toContain("978-3-030-12346-3");
    });
  });

  describe("Subject Extraction", () => {
    it("should extract subjects from both subjects and keywords", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].subjects).toContain("Computer Science");
      expect(results[0].subjects).toContain("Machine Learning");
      expect(results[0].subjects).toContain("deep learning");
    });
  });

  describe("Book Chapters", () => {
    it("should include book chapters in results", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookChapterResponse });

      const results = await provider.searchByTitle({ title: "Neural Networks" });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].providerData?.publicationType).toBe("BookChapter");
    });
  });

  describe("Error Handling", () => {
    it("should handle HTTP errors gracefully", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: "Internal Server Error" });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results).toEqual([]);
    }, 30000);

    it("should handle network errors with retry", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results.length).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 30000);

    it("should handle missing records gracefully", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ result: [] }) });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results).toEqual([]);
    });
  });

  describe("Confidence Scoring", () => {
    it("should assign high confidence for ISBN searches", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByISBN("9783030123456");
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.92);
    });

    it("should assign high confidence for DOI searches", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByDOI("10.1007/test");
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.92);
    });

    it("should boost confidence for complete metadata", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => sampleBookResponse });

      const results = await provider.searchByTitle({ title: "Test" });

      // Complete record should have higher confidence
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("Reliability Scores", () => {
    it("should report high reliability for title", () => {
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.95);
    });

    it("should report very high reliability for publisher (own publications)", () => {
      expect(provider.getReliabilityScore(MetadataType.PUBLISHER)).toBe(0.98);
    });

    it("should report very high reliability for ISBN", () => {
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.98);
    });

    it("should report good reliability for abstracts", () => {
      expect(provider.getReliabilityScore(MetadataType.DESCRIPTION)).toBe(0.9);
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
      expect(provider.name).toBe("SpringerNature");
    });

    it("should have correct priority", () => {
      expect(provider.priority).toBe(75);
    });

    it("should have appropriate rate limits", () => {
      expect(provider.rateLimit.maxRequests).toBe(5);
      expect(provider.rateLimit.windowMs).toBe(1000);
    });
  });
});
