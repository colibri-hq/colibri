import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleBooksMetadataProvider } from "./google-books.js";
import { MetadataType } from "./provider.js";
import { globalRateLimiterRegistry } from "../rate-limiter.js";

describe("GoogleBooksMetadataProvider", () => {
  let provider: GoogleBooksMetadataProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear all rate limiters
    globalRateLimiterRegistry.clearAll();

    mockFetch = vi.fn();
    provider = new GoogleBooksMetadataProvider(mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    globalRateLimiterRegistry.clearAll();
  });

  describe("initialization", () => {
    it("should initialize with correct default values", () => {
      expect(provider.name).toBe("GoogleBooks");
      expect(provider.priority).toBe(85);
    });

    it("should have conservative rate limit without API key", () => {
      const providerWithoutKey = new GoogleBooksMetadataProvider(mockFetch);
      expect(providerWithoutKey.rateLimit.maxRequests).toBe(10);
      expect(providerWithoutKey.rateLimit.windowMs).toBe(60000);
      expect(providerWithoutKey.rateLimit.requestDelay).toBe(1000);
    });

    it("should have higher rate limit with API key", () => {
      const providerWithKey = new GoogleBooksMetadataProvider(
        mockFetch,
        "test-api-key",
      );
      expect(providerWithKey.rateLimit.maxRequests).toBe(100);
      expect(providerWithKey.rateLimit.windowMs).toBe(60000);
      expect(providerWithKey.rateLimit.requestDelay).toBe(200);
    });

    it("should have correct timeout values", () => {
      expect(provider.timeout.requestTimeout).toBe(10000);
      expect(provider.timeout.operationTimeout).toBe(30000);
    });
  });

  describe("searchByISBN", () => {
    it("should search by ISBN and return metadata records", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-book-id",
            volumeInfo: {
              title: "Test Book",
              subtitle: "A Subtitle",
              authors: ["Test Author"],
              publisher: "Test Publisher",
              publishedDate: "2020-01-15",
              description: "A test book description",
              industryIdentifiers: [
                { type: "ISBN_13", identifier: "9781234567890" },
                { type: "ISBN_10", identifier: "1234567890" },
              ],
              pageCount: 350,
              categories: ["Fiction", "Fantasy"],
              language: "en",
              imageLinks: {
                thumbnail:
                  "http://books.google.com/books/content?id=test&printsec=frontcover&img=1&zoom=1",
              },
              maturityRating: "NOT_MATURE",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByISBN("978-1-234567-89-0");

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Test Book: A Subtitle");
      expect(results[0].authors).toEqual(["Test Author"]);
      expect(results[0].isbn).toEqual(["9781234567890", "1234567890"]);
      expect(results[0].publisher).toBe("Test Publisher");
      expect(results[0].pageCount).toBe(350);
      expect(results[0].subjects).toEqual(["Fiction", "Fantasy"]);
      expect(results[0].language).toBe("en");
      expect(results[0].description).toBe("A test book description");
      expect(results[0].source).toBe("GoogleBooks");
      expect(results[0].confidence).toBeGreaterThan(0.8);

      // Verify cover image URL was enhanced
      expect(results[0].coverImage?.url).toContain("https://");
      expect(results[0].coverImage?.url).toContain("zoom=1");
    });

    it("should clean ISBN before searching", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ kind: "books#volumes", totalItems: 0 }),
      });

      await provider.searchByISBN("978-1-234567-89-0");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("isbn%3A9781234567890");
    });

    it("should handle empty results", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          kind: "books#volumes",
          totalItems: 0,
          items: [],
        }),
      });

      const results = await provider.searchByISBN("0000000000");

      expect(results).toHaveLength(0);
    });

    it("should calculate high confidence for ISBN matches", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Complete Book",
              authors: ["Author"],
              industryIdentifiers: [{ type: "ISBN_13", identifier: "123" }],
              publishedDate: "2020",
              publisher: "Publisher",
              description: "Description",
              pageCount: 200,
              categories: ["Fiction"],
              imageLinks: { thumbnail: "http://example.com/cover.jpg" },
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByISBN("123");

      // ISBN search with complete data should have high confidence
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("searchByTitle", () => {
    it("should search by title and return results", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "The Great Gatsby",
              authors: ["F. Scott Fitzgerald"],
              publishedDate: "1925",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({
        title: "The Great Gatsby",
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("The Great Gatsby");
      expect(results[0].authors).toEqual(["F. Scott Fitzgerald"]);
    });

    it("should escape special characters in title", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ kind: "books#volumes", totalItems: 0 }),
      });

      await provider.searchByTitle({ title: 'Book "Title" [Special]' });

      // Should remove brackets and escape quotes
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("intitle");
      expect(callUrl).toContain("Book+Title+Special");
    });
  });

  describe("searchByCreator", () => {
    it("should search by author name", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 2,
        items: [
          {
            id: "book1",
            volumeInfo: {
              title: "Book One",
              authors: ["Jane Doe"],
            },
          },
          {
            id: "book2",
            volumeInfo: {
              title: "Book Two",
              authors: ["Jane Doe", "John Smith"],
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByCreator({ name: "Jane Doe" });

      expect(results).toHaveLength(2);
      expect(results[0].authors).toContain("Jane Doe");
      expect(results[1].authors).toContain("Jane Doe");
    });
  });

  describe("searchMultiCriteria", () => {
    it("should prioritize ISBN search when available", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Test Book",
              authors: ["Test Author"],
              industryIdentifiers: [{ type: "ISBN_13", identifier: "123" }],
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await provider.searchMultiCriteria({
        isbn: "123",
        title: "Test Book",
        authors: ["Test Author"],
      });

      // Should search by ISBN, not combine criteria
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("isbn%3A123");
    });

    it("should combine title and author when ISBN not available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ kind: "books#volumes", totalItems: 0 }),
      });

      await provider.searchMultiCriteria({
        title: "Test Book",
        authors: ["Test Author"],
      });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("intitle");
      expect(callUrl).toContain("Test+Book");
      expect(callUrl).toContain("inauthor");
      expect(callUrl).toContain("Test+Author");
    });

    it("should boost confidence when multiple criteria match", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Exact Match Book",
              authors: ["Exact Author"],
              publisher: "Exact Publisher",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchMultiCriteria({
        title: "Exact Match Book",
        authors: ["Exact Author"],
        publisher: "Exact Publisher",
      });

      expect(results[0].confidence).toBeGreaterThan(0.75);
    });

    it("should return empty array when no criteria provided", async () => {
      const results = await provider.searchMultiCriteria({});

      expect(results).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("cover image handling", () => {
    it("should prioritize higher quality image links", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Test Book",
              imageLinks: {
                thumbnail: "http://example.com/thumb.jpg",
                small: "http://example.com/small.jpg",
                medium: "http://example.com/medium.jpg",
                large: "http://example.com/large.jpg",
                extraLarge: "http://example.com/xlarge.jpg",
              },
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({ title: "Test Book" });

      // Should use extraLarge (highest quality)
      expect(results[0].coverImage?.url).toContain("xlarge.jpg");
    });

    it("should convert HTTP to HTTPS for cover images", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Test Book",
              imageLinks: {
                thumbnail: "http://example.com/cover.jpg",
              },
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({ title: "Test Book" });

      expect(results[0].coverImage?.url).toContain("https://");
    });

    it("should add zoom parameter for larger images", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Test Book",
              imageLinks: {
                thumbnail: "http://example.com/cover.jpg",
              },
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({ title: "Test Book" });

      expect(results[0].coverImage?.url).toContain("zoom=1");
    });
  });

  describe("date parsing", () => {
    it("should parse full date (YYYY-MM-DD)", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Test Book",
              publishedDate: "2020-06-15",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({ title: "Test Book" });

      expect(results[0].publicationDate).toEqual(new Date("2020-06-15"));
    });

    it("should parse year-month date (YYYY-MM)", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Test Book",
              publishedDate: "2020-06",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({ title: "Test Book" });

      expect(results[0].publicationDate).toEqual(new Date("2020-06-01"));
    });

    it("should parse year-only date (YYYY)", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Test Book",
              publishedDate: "2020",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({ title: "Test Book" });

      expect(results[0].publicationDate).toEqual(new Date(2020, 0, 1));
    });

    it("should handle invalid dates gracefully", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Test Book",
              publishedDate: "invalid-date",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({ title: "Test Book" });

      expect(results[0].publicationDate).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("should handle network errors with retry", async () => {
      vi.useFakeTimers();

      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            kind: "books#volumes",
            totalItems: 1,
            items: [
              {
                id: "test-id",
                volumeInfo: { title: "Test Book" },
              },
            ],
          }),
        });

      const promise = provider.searchByTitle({ title: "Test Book" });
      await vi.runAllTimersAsync();
      const results = await promise;

      expect(results).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle rate limit errors", async () => {
      vi.useFakeTimers();

      const rateLimitError = new Error("Rate limit exceeded: 429");
      (rateLimitError as any).status = 429;

      mockFetch.mockRejectedValueOnce(rateLimitError).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          kind: "books#volumes",
          totalItems: 1,
          items: [{ id: "test-id", volumeInfo: { title: "Test" } }],
        }),
      });

      const promise = provider.searchByTitle({ title: "Test" });
      await vi.runAllTimersAsync();
      const results = await promise;

      expect(results).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle API errors gracefully", async () => {
      vi.useFakeTimers();

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Server error",
      });

      const promise = provider.searchByTitle({ title: "Test Book" });
      await vi.runAllTimersAsync();
      const results = await promise;

      expect(results).toHaveLength(0);
    });

    it("should return empty results after max retries", async () => {
      vi.useFakeTimers();

      mockFetch.mockRejectedValue(new Error("Persistent network error"));

      const promise = provider.searchByTitle({ title: "Test Book" });
      await vi.runAllTimersAsync();
      const results = await promise;

      expect(results).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe("API key handling", () => {
    it("should include API key in request when provided", async () => {
      const providerWithKey = new GoogleBooksMetadataProvider(
        mockFetch,
        "test-api-key",
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ kind: "books#volumes", totalItems: 0 }),
      });

      await providerWithKey.searchByTitle({ title: "Test" });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("key=test-api-key");
    });

    it("should not include API key when not provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ kind: "books#volumes", totalItems: 0 }),
      });

      await provider.searchByTitle({ title: "Test" });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).not.toContain("key=");
    });
  });

  describe("reliability scores", () => {
    it("should return correct reliability scores for supported types", () => {
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.95);
      expect(provider.getReliabilityScore(MetadataType.AUTHORS)).toBe(0.92);
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.95);
      expect(provider.getReliabilityScore(MetadataType.DESCRIPTION)).toBe(0.9);
      expect(provider.getReliabilityScore(MetadataType.COVER_IMAGE)).toBe(0.95);
      expect(provider.getReliabilityScore(MetadataType.PAGE_COUNT)).toBe(0.85);
    });

    it("should return default score for unsupported types", () => {
      expect(
        provider.getReliabilityScore(MetadataType.PHYSICAL_DIMENSIONS),
      ).toBe(0.3);
    });
  });

  describe("data type support", () => {
    it("should support common metadata types", () => {
      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PUBLICATION_DATE)).toBe(
        true,
      );
      expect(provider.supportsDataType(MetadataType.DESCRIPTION)).toBe(true);
      expect(provider.supportsDataType(MetadataType.COVER_IMAGE)).toBe(true);
    });

    it("should not support physical dimensions", () => {
      expect(provider.supportsDataType(MetadataType.PHYSICAL_DIMENSIONS)).toBe(
        false,
      );
    });
  });

  describe("provider data", () => {
    it("should include Google Books ID in provider data", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "unique-google-books-id",
            volumeInfo: {
              title: "Test Book",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({ title: "Test Book" });

      expect(results[0].providerData).toEqual({
        googleBooksId: "unique-google-books-id",
        maturityRating: undefined,
        searchType: "title",
      });
    });

    it("should include maturity rating when available", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Test Book",
              maturityRating: "MATURE",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({ title: "Test Book" });

      expect(results[0].providerData?.maturityRating).toBe("MATURE");
    });
  });

  describe("subtitle handling", () => {
    it("should combine title and subtitle", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Main Title",
              subtitle: "A Descriptive Subtitle",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({ title: "Main Title" });

      expect(results[0].title).toBe("Main Title: A Descriptive Subtitle");
    });

    it("should use title only when no subtitle", async () => {
      const mockResponse = {
        kind: "books#volumes",
        totalItems: 1,
        items: [
          {
            id: "test-id",
            volumeInfo: {
              title: "Main Title",
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({ title: "Main Title" });

      expect(results[0].title).toBe("Main Title");
    });
  });
});
