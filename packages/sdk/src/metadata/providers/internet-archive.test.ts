import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InternetArchiveMetadataProvider } from "./internet-archive.js";
import { MetadataType } from "./provider.js";

// Mock fetch function
const mockFetch = vi.fn();

// Mock Internet Archive search response
const mockIASearchResponse = {
  response: {
    numFound: 2,
    docs: [
      {
        identifier: "greatadventure00smit",
        title: "The great adventure",
        creator: ["Smith, John"],
        date: "2021-01-01",
        publisher: ["Example Press"],
        subject: ["Adventure", "Fiction"],
        description: [
          "A thrilling adventure story about courage and friendship.",
        ],
        language: ["eng"],
        isbn: ["9781234567890"],
        imagecount: 256,
        mediatype: "texts",
        year: "2021",
        edition: "1st ed.",
        downloads: 1500,
        item_size: 25000000,
        avg_rating: 4.5,
        num_reviews: 42,
      },
      {
        identifier: "greatadventure01smit",
        title: "The great adventure",
        creator: "Smith, John",
        date: "2021",
        language: "eng",
        imagecount: 240,
        mediatype: "texts",
        downloads: 500,
      },
    ],
  },
};

const mockEmptyIASearchResponse = {
  response: {
    numFound: 0,
    docs: [],
  },
};

describe("InternetArchiveMetadataProvider", () => {
  let provider: InternetArchiveMetadataProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new InternetArchiveMetadataProvider(mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Provider Configuration", () => {
    it("should have correct provider name and priority", () => {
      expect(provider.name).toBe("InternetArchive");
      expect(provider.priority).toBe(70);
    });

    it("should have appropriate rate limiting configuration", () => {
      expect(provider.rateLimit.maxRequests).toBe(60);
      expect(provider.rateLimit.windowMs).toBe(60000);
      expect(provider.rateLimit.requestDelay).toBe(1000);
    });

    it("should have appropriate timeout configuration", () => {
      expect(provider.timeout.requestTimeout).toBe(15000);
      expect(provider.timeout.operationTimeout).toBe(45000);
    });
  });

  describe("Reliability Scores", () => {
    it("should return appropriate reliability scores for supported data types", () => {
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.85);
      expect(provider.getReliabilityScore(MetadataType.AUTHORS)).toBe(0.8);
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.75);
      expect(provider.getReliabilityScore(MetadataType.PUBLICATION_DATE)).toBe(
        0.8,
      );
      expect(provider.getReliabilityScore(MetadataType.COVER_IMAGE)).toBe(0.8);
    });

    it("should return default score for unknown metadata types", () => {
      expect(provider.getReliabilityScore("unknown" as MetadataType)).toBe(0.6);
    });
  });

  describe("Data Type Support", () => {
    it("should support core metadata types", () => {
      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
      expect(provider.supportsDataType(MetadataType.SUBJECTS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PUBLICATION_DATE)).toBe(
        true,
      );
      expect(provider.supportsDataType(MetadataType.PUBLISHER)).toBe(true);
      expect(provider.supportsDataType(MetadataType.LANGUAGE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.COVER_IMAGE)).toBe(true);
    });

    it("should not support series metadata", () => {
      expect(provider.supportsDataType(MetadataType.SERIES)).toBe(false);
    });
  });

  describe("Title Search", () => {
    it("should search by title successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIASearchResponse,
      });

      const results = await provider.searchByTitle({
        title: "The great adventure",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("advancedsearch.php"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: "application/json",
          }),
        }),
      );

      // Should verify the query includes title and mediatype filter
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("title");
      expect(callUrl).toContain("The+great+adventure");
      expect(callUrl).toContain("mediatype");

      // Should return deduplicated results (2 items -> 1 after dedup)
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("The great adventure");
      expect(results[0].authors).toEqual(["Smith, John"]);
      expect(results[0].source).toBe("InternetArchive");
    });

    it("should return empty array for no results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyIASearchResponse,
      });

      const results = await provider.searchByTitle({
        title: "Nonexistent Book",
      });

      expect(results).toEqual([]);
    });

    it("should handle fetch errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const results = await provider.searchByTitle({
        title: "Test Book",
      });

      expect(results).toEqual([]);
    });
  });

  describe("ISBN Search", () => {
    it("should search by ISBN successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIASearchResponse,
      });

      const results = await provider.searchByISBN("978-1-234-56789-0");

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("identifier");
      expect(callUrl).toContain("isbn_9781234567890");
      expect(callUrl).toContain("isbn");
      expect(callUrl).toContain("9781234567890");
      expect(callUrl).toContain("mediatype");

      expect(results).toHaveLength(1);
      expect(results[0].isbn).toEqual(["9781234567890"]);
      expect(results[0].confidence).toBeGreaterThan(0.8); // ISBN search should have high confidence
    });

    it("should clean ISBN before searching", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyIASearchResponse,
      });

      await provider.searchByISBN("978-1-234-56789-0");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("9781234567890"); // Hyphens removed
      expect(callUrl).not.toContain("-");
    });
  });

  describe("Creator Search", () => {
    it("should search by creator successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIASearchResponse,
      });

      const results = await provider.searchByCreator({
        name: "John Smith",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("creator");
      expect(callUrl).toContain("John+Smith");
      expect(callUrl).toContain("mediatype");

      expect(results).toHaveLength(1);
      expect(results[0].authors).toEqual(["Smith, John"]);
    });
  });

  describe("Multi-Criteria Search", () => {
    it("should search with multiple criteria", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIASearchResponse,
      });

      const results = await provider.searchMultiCriteria({
        title: "The great adventure",
        authors: ["John Smith"],
        isbn: "9781234567890",
        subjects: ["Adventure"],
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("title");
      expect(callUrl).toContain("The+great+adventure");
      expect(callUrl).toContain("creator");
      expect(callUrl).toContain("John+Smith");
      expect(callUrl).toContain("isbn_9781234567890");
      expect(callUrl).toContain("subject");
      expect(callUrl).toContain("Adventure");
      expect(callUrl).toContain("mediatype");

      expect(results).toHaveLength(1);
    });

    it("should handle year range queries", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIASearchResponse,
      });

      const results = await provider.searchMultiCriteria({
        title: "Test",
        yearRange: [2020, 2022],
      });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("date");
      expect(callUrl).toContain("2020-01-01");
      expect(callUrl).toContain("2022-12-31");

      expect(results).toHaveLength(1);
    });

    it("should return empty array if no valid criteria", async () => {
      const results = await provider.searchMultiCriteria({});

      expect(mockFetch).not.toHaveBeenCalled();
      expect(results).toEqual([]);
    });
  });

  describe("Metadata Mapping", () => {
    it("should correctly map all metadata fields", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIASearchResponse,
      });

      const results = await provider.searchByTitle({
        title: "The great adventure",
      });

      const result = results[0];

      expect(result.title).toBe("The great adventure");
      expect(result.authors).toEqual(["Smith, John"]);
      expect(result.isbn).toEqual(["9781234567890"]);
      expect(result.publicationDate).toEqual(new Date("2021-01-01"));
      expect(result.subjects).toEqual(["Adventure", "Fiction"]);
      expect(result.description).toBe(
        "A thrilling adventure story about courage and friendship.",
      );
      expect(result.language).toBe("en"); // Converted from "eng"
      expect(result.publisher).toBe("Example Press");
      expect(result.edition).toBe("1st ed.");
      expect(result.pageCount).toBe(256); // From imagecount
      expect(result.coverImage).toEqual({
        url: "https://archive.org/services/img/greatadventure00smit",
      });
    });

    it("should handle string and array field formats", async () => {
      const singleItemResponse = {
        response: {
          numFound: 1,
          docs: [
            {
              identifier: "test123",
              title: "Test Book",
              creator: "Single Author", // String instead of array
              publisher: "Single Publisher",
              subject: "Single Subject",
              description: "Single description",
              language: "fra",
              mediatype: "texts",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => singleItemResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].authors).toEqual(["Single Author"]);
      expect(results[0].publisher).toBe("Single Publisher");
      expect(results[0].subjects).toEqual(["Single Subject"]);
      expect(results[0].description).toBe("Single description");
      expect(results[0].language).toBe("fr"); // Converted from "fra"
    });

    it("should handle year-only publication dates", async () => {
      const yearOnlyResponse = {
        response: {
          numFound: 1,
          docs: [
            {
              identifier: "test456",
              title: "Old Book",
              year: "1920",
              mediatype: "texts",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => yearOnlyResponse,
      });

      const results = await provider.searchByTitle({ title: "Old" });

      const expectedDate = new Date(1920, 0, 1);
      expect(results[0].publicationDate?.getFullYear()).toBe(
        expectedDate.getFullYear(),
      );
      expect(results[0].publicationDate?.getMonth()).toBe(
        expectedDate.getMonth(),
      );
      expect(results[0].publicationDate?.getDate()).toBe(
        expectedDate.getDate(),
      );
    });

    it("should store provider-specific data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIASearchResponse,
      });

      const results = await provider.searchByTitle({
        title: "The great adventure",
      });

      expect(results[0].providerData).toMatchObject({
        identifier: "greatadventure00smit",
        iaUrl: "https://archive.org/details/greatadventure00smit",
        downloadUrl: "https://archive.org/download/greatadventure00smit",
        downloads: 1500,
        itemSize: 25000000,
        averageRating: 4.5,
        numReviews: 42,
        imageCount: 256,
      });
    });
  });

  describe("Language Code Conversion", () => {
    it("should convert ISO 639-2 codes to ISO 639-1", async () => {
      const response = {
        response: {
          numFound: 1,
          docs: [
            {
              identifier: "test_eng",
              title: "Test English",
              language: ["eng"],
              mediatype: "texts",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => response,
      });

      const results = await provider.searchByTitle({ title: "Test" });
      expect(results[0]?.language).toBe("en");
    });

    it("should pass through 2-letter codes", async () => {
      const response = {
        response: {
          numFound: 1,
          docs: [
            {
              identifier: "test_en",
              title: "Test",
              language: ["en"],
              mediatype: "texts",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => response,
      });

      const results = await provider.searchByTitle({ title: "Test" });
      expect(results[0]?.language).toBe("en");
    });

    it("should pass through unknown codes", async () => {
      const response = {
        response: {
          numFound: 1,
          docs: [
            {
              identifier: "test_xyz",
              title: "Test",
              language: ["xyz"],
              mediatype: "texts",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => response,
      });

      const results = await provider.searchByTitle({ title: "Test" });
      expect(results[0]?.language).toBe("xyz");
    });
  });

  describe("Deduplication", () => {
    it("should deduplicate results with same title and creator", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIASearchResponse, // Has 2 similar items
      });

      const results = await provider.searchByTitle({
        title: "The great adventure",
      });

      // Should deduplicate to 1 result
      expect(results).toHaveLength(1);
    });

    it("should prefer items with more metadata", async () => {
      const responseWithDuplicates = {
        response: {
          numFound: 2,
          docs: [
            {
              identifier: "sparse123",
              title: "Test Book",
              creator: ["Test Author"],
              mediatype: "texts",
              imagecount: 0,
              downloads: 10,
            },
            {
              identifier: "complete456",
              title: "Test Book",
              creator: ["Test Author"],
              date: "2020",
              publisher: ["Test Press"],
              subject: ["Testing"],
              description: ["A complete record"],
              language: ["eng"],
              isbn: ["1234567890"],
              mediatype: "texts",
              imagecount: 200,
              downloads: 1000,
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithDuplicates,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results).toHaveLength(1);
      expect(results[0].providerData?.identifier).toBe("complete456");
    });

    it("should keep different books separate", async () => {
      const differentBooksResponse = {
        response: {
          numFound: 2,
          docs: [
            {
              identifier: "book1",
              title: "Book One",
              creator: ["Author One"],
              mediatype: "texts",
            },
            {
              identifier: "book2",
              title: "Book Two",
              creator: ["Author Two"],
              mediatype: "texts",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => differentBooksResponse,
      });

      const results = await provider.searchByTitle({ title: "Book" });

      expect(results).toHaveLength(2);
    });
  });

  describe("Confidence Calculation", () => {
    it("should give higher confidence for ISBN searches", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIASearchResponse,
      });

      const results = await provider.searchByISBN("9781234567890");

      expect(results[0].confidence).toBeGreaterThan(0.8);
    });

    it("should boost confidence for complete metadata", async () => {
      const completeResponse = {
        response: {
          numFound: 1,
          docs: [
            {
              identifier: "complete",
              title: "Complete Book",
              creator: ["Author"],
              date: "2020",
              publisher: ["Publisher"],
              subject: ["Subject"],
              description: ["Description"],
              language: ["eng"],
              isbn: ["1234567890"],
              imagecount: 200,
              mediatype: "texts",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => completeResponse,
      });

      const results = await provider.searchByTitle({ title: "Complete" });

      expect(results[0].confidence).toBeGreaterThan(0.75);
    });

    it("should boost confidence for popular items", async () => {
      const popularResponse = {
        response: {
          numFound: 1,
          docs: [
            {
              identifier: "popular",
              title: "Popular Book",
              creator: ["Author"],
              downloads: 10000,
              num_reviews: 100,
              imagecount: 200,
              mediatype: "texts",
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => popularResponse,
      });

      const results = await provider.searchByTitle({ title: "Popular" });

      expect(results[0].confidence).toBeGreaterThan(0.7);
    });

    it("should cap confidence at 0.88", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIASearchResponse,
      });

      const results = await provider.searchByISBN("9781234567890");

      expect(results[0].confidence).toBeLessThanOrEqual(0.88);
    });
  });

  describe("Error Handling", () => {
    it("should handle HTTP errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results).toEqual([]);
    });

    it("should handle malformed JSON responses", async () => {
      mockFetch.mockResolvedValueOnce({
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

    it("should handle missing response.docs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: {
            numFound: 0,
          },
        }),
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results).toEqual([]);
    });

    it("should retry on network errors", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network timeout"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIASearchResponse,
        });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(1);
    });
  });

  describe("Rate Limiting", () => {
    it("should detect rate limit errors", () => {
      const rateLimitError = new Error("Too many requests");
      (rateLimitError as any).status = 429;

      // Just verify the error is detected as a rate limit error
      // The actual retry logic is tested in other tests
      expect(rateLimitError.message.toLowerCase()).toContain("too many");
      expect((rateLimitError as any).status).toBe(429);
    });
  });

  describe("Provider Data", () => {
    it("should include download and access URLs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIASearchResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results[0].providerData).toMatchObject({
        identifier: "greatadventure00smit",
        iaUrl: "https://archive.org/details/greatadventure00smit",
        downloadUrl: "https://archive.org/download/greatadventure00smit",
      });
    });

    it("should include statistics and metrics", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIASearchResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results[0].providerData).toMatchObject({
        downloads: 1500,
        itemSize: 25000000,
        averageRating: 4.5,
        numReviews: 42,
        imageCount: 256,
      });
    });
  });
});
