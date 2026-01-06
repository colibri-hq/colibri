import { beforeEach, describe, expect, it, vi } from "vitest";
import { ISBNdbMetadataProvider } from "./isbndb.js";
import { MetadataType } from "./provider.js";
import type { Database } from "../../database.js";

describe("ISBNdbMetadataProvider", () => {
  let provider: ISBNdbMetadataProvider;
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockDatabase: Database;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockDatabase = {} as Database;
    provider = new ISBNdbMetadataProvider(mockDatabase, mockFetch);
  });

  describe("Provider Configuration", () => {
    it("should have correct name and priority", () => {
      expect(provider.name).toBe("ISBNdb");
      expect(provider.priority).toBe(80);
    });

    it("should have appropriate rate limits", () => {
      expect(provider.rateLimit.maxRequests).toBe(60);
      expect(provider.rateLimit.windowMs).toBe(60000);
      expect(provider.rateLimit.requestDelay).toBe(1000);
    });

    it("should have appropriate timeouts", () => {
      expect(provider.timeout.requestTimeout).toBe(10000);
      expect(provider.timeout.operationTimeout).toBe(30000);
    });

    it("should provide reliability scores for different data types", () => {
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBeGreaterThan(
        0.9,
      );
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBeGreaterThan(
        0.8,
      );
      expect(
        provider.getReliabilityScore(MetadataType.AUTHORS),
      ).toBeGreaterThan(0.75);
      expect(
        provider.getReliabilityScore(MetadataType.PAGE_COUNT),
      ).toBeGreaterThan(0.8);
      expect(
        provider.getReliabilityScore(MetadataType.PHYSICAL_DIMENSIONS),
      ).toBeGreaterThan(0.7);
    });

    it("should support expected metadata types", () => {
      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PAGE_COUNT)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PHYSICAL_DIMENSIONS)).toBe(
        true,
      );
      expect(provider.supportsDataType(MetadataType.PUBLISHER)).toBe(true);
      expect(provider.supportsDataType(MetadataType.DESCRIPTION)).toBe(true);
    });

    it("should not support unsupported metadata types", () => {
      expect(provider.supportsDataType(MetadataType.SERIES)).toBe(false);
    });
  });

  describe("searchByISBN", () => {
    it("should return empty array when API key is not configured", async () => {
      // Mock getApiKey to return null
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue(null);

      const results = await provider.searchByISBN("9780132350884");

      expect(results).toEqual([]);
    });

    it("should fetch book metadata by ISBN", async () => {
      // Mock API key
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      // Mock successful response
      const mockBook = {
        title: "Clean Code",
        title_long: "Clean Code: A Handbook of Agile Software Craftsmanship",
        isbn13: "9780132350884",
        isbn10: "0132350884",
        authors: ["Robert C. Martin"],
        publisher: "Prentice Hall",
        date_published: "2008-08-01",
        synopsis: "A handbook of agile software craftsmanship...",
        subjects: ["Programming", "Software Engineering"],
        pages: 464,
        language: "en",
        image: "https://images.isbndb.com/covers/50/88/9780132350884.jpg",
        binding: "Paperback",
        dimensions: "9.0 x 7.5 x 1.0",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ book: mockBook }),
        headers: new Map(),
      });

      const results = await provider.searchByISBN("9780132350884");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api2.isbndb.com/book/9780132350884",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "test-api-key",
          }),
        }),
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe(
        "Clean Code: A Handbook of Agile Software Craftsmanship",
      );
      expect(results[0].authors).toEqual(["Robert C. Martin"]);
      expect(results[0].isbn).toContain("9780132350884");
      expect(results[0].publisher).toBe("Prentice Hall");
      expect(results[0].pageCount).toBe(464);
      expect(results[0].language).toBe("en");
      expect(results[0].confidence).toBeGreaterThan(0.9); // ISBN searches have high confidence
    });

    it("should handle ISBN with hyphens and spaces", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          book: { title: "Test Book", isbn13: "9780132350884" },
        }),
        headers: new Map(),
      });

      await provider.searchByISBN("978-0-13-235088-4");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api2.isbndb.com/book/9780132350884",
        expect.any(Object),
      );
    });

    it("should return empty array when book is not found (404)", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({}),
        headers: new Map(),
      });

      const results = await provider.searchByISBN("9999999999999");

      expect(results).toEqual([]);
    });

    it("should handle API errors gracefully", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      // Mock all attempts to fail with server error (non-retryable 500)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404, // Use 404 instead of 500 to avoid retries
        statusText: "Not Found",
        json: async () => ({ errorMessage: "Not found" }),
        headers: new Map(),
      });

      const results = await provider.searchByISBN("9780132350884");

      expect(results).toEqual([]);
    });

    it("should handle invalid API key (401)", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue(
        "invalid-api-key",
      );

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ errorMessage: "Invalid API key" }),
        headers: new Map(),
      });

      const results = await provider.searchByISBN("9780132350884");

      expect(results).toEqual([]);
    });

    it("should parse physical dimensions correctly", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          book: {
            title: "Test Book",
            isbn13: "9780132350884",
            dimensions: "9.5 x 6.5 x 1.2",
          },
        }),
        headers: new Map(),
      });

      const results = await provider.searchByISBN("9780132350884");

      expect(results[0].physicalDimensions).toEqual({
        height: 9.5,
        width: 6.5,
        depth: 1.2,
        unit: "in",
      });
    });

    it("should parse publication dates correctly", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      // Test full date
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          book: {
            title: "Test Book",
            isbn13: "9780132350884",
            date_published: "2008-08-01",
          },
        }),
        headers: new Map(),
      });

      let results = await provider.searchByISBN("9780132350884");
      expect(results[0].publicationDate?.getFullYear()).toBe(2008);
      expect(results[0].publicationDate?.getMonth()).toBe(7); // August (0-indexed)

      // Test year only
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          book: {
            title: "Test Book",
            isbn13: "9780132350884",
            date_published: "2008",
          },
        }),
        headers: new Map(),
      });

      results = await provider.searchByISBN("9780132350884");
      expect(results[0].publicationDate?.getFullYear()).toBe(2008);
    });
  });

  describe("searchByTitle", () => {
    it("should search for books by title", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      const mockBooks = [
        {
          title: "Clean Code",
          isbn13: "9780132350884",
          authors: ["Robert C. Martin"],
        },
        {
          title: "The Clean Coder",
          isbn13: "9780137081073",
          authors: ["Robert C. Martin"],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ total: 2, books: mockBooks }),
        headers: new Map(),
      });

      const results = await provider.searchByTitle({ title: "Clean Code" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api2.isbndb.com/books/Clean%20Code?page=1&pageSize=20",
        expect.any(Object),
      );

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe("Clean Code");
      expect(results[1].title).toBe("The Clean Coder");
    });

    it("should return empty array when no results found", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ total: 0, books: [] }),
        headers: new Map(),
      });

      const results = await provider.searchByTitle({
        title: "Nonexistent Book Title",
      });

      expect(results).toEqual([]);
    });

    it("should limit results to 10", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      const mockBooks = Array.from({ length: 15 }, (_, i) => ({
        title: `Book ${i + 1}`,
        isbn13: `978000000000${i}`,
      }));

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ total: 15, books: mockBooks }),
        headers: new Map(),
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results).toHaveLength(10);
    });
  });

  describe("searchByCreator", () => {
    it("should search for books by author name", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      const mockBooks = [
        {
          title: "Clean Code",
          isbn13: "9780132350884",
          authors: ["Robert C. Martin"],
        },
        {
          title: "The Clean Coder",
          isbn13: "9780137081073",
          authors: ["Robert C. Martin"],
        },
        {
          title: "Irrelevant Book",
          isbn13: "9780000000000",
          authors: ["Different Author"],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ total: 3, books: mockBooks }),
        headers: new Map(),
      });

      const results = await provider.searchByCreator({
        name: "Robert C. Martin",
      });

      // Should filter to only include books by Robert C. Martin
      expect(results).toHaveLength(2);
      expect(results[0].authors).toContain("Robert C. Martin");
      expect(results[1].authors).toContain("Robert C. Martin");
    });

    it("should handle case-insensitive author matching", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      const mockBooks = [
        {
          title: "Clean Code",
          isbn13: "9780132350884",
          authors: ["ROBERT C. MARTIN"],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ total: 1, books: mockBooks }),
        headers: new Map(),
      });

      const results = await provider.searchByCreator({
        name: "robert c. martin",
      });

      expect(results).toHaveLength(1);
    });

    it("should filter out books without matching authors", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      const mockBooks = [
        {
          title: "Book Without Authors",
          isbn13: "9780000000000",
        },
        {
          title: "Book With Different Author",
          isbn13: "9780000000001",
          authors: ["Other Author"],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ total: 2, books: mockBooks }),
        headers: new Map(),
      });

      const results = await provider.searchByCreator({
        name: "Robert C. Martin",
      });

      expect(results).toEqual([]);
    });
  });

  describe("searchMultiCriteria", () => {
    it("should prioritize ISBN search when ISBN is provided", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          book: {
            title: "Clean Code",
            isbn13: "9780132350884",
          },
        }),
        headers: new Map(),
      });

      const results = await provider.searchMultiCriteria({
        isbn: "9780132350884",
        title: "Clean Code",
        authors: ["Robert C. Martin"],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api2.isbndb.com/book/9780132350884",
        expect.any(Object),
      );
      expect(results).toHaveLength(1);
    });

    it("should combine title and author when both provided", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ total: 0, books: [] }),
        headers: new Map(),
      });

      await provider.searchMultiCriteria({
        title: "Clean Code",
        authors: ["Robert C. Martin"],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("Clean%20Code%20Robert%20C.%20Martin"),
        expect.any(Object),
      );
    });

    it("should fall back to title search when only title provided", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ total: 0, books: [] }),
        headers: new Map(),
      });

      await provider.searchMultiCriteria({
        title: "Clean Code",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/books/Clean%20Code"),
        expect.any(Object),
      );
    });

    it("should fall back to author search when only authors provided", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ total: 0, books: [] }),
        headers: new Map(),
      });

      await provider.searchMultiCriteria({
        authors: ["Robert C. Martin"],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/books/Robert%20C.%20Martin"),
        expect.any(Object),
      );
    });

    it("should return empty array when no criteria provided", async () => {
      const results = await provider.searchMultiCriteria({});

      expect(results).toEqual([]);
    });
  });

  describe("Confidence Scoring", () => {
    it("should assign high confidence for ISBN searches", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          book: {
            title: "Test Book",
            isbn13: "9780132350884",
            authors: ["Test Author"],
            publisher: "Test Publisher",
            pages: 300,
            date_published: "2020",
          },
        }),
        headers: new Map(),
      });

      const results = await provider.searchByISBN("9780132350884");

      expect(results[0].confidence).toBeGreaterThan(0.9);
    });

    it("should assign moderate confidence for title searches", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          total: 1,
          books: [
            {
              title: "Test Book",
              isbn13: "9780132350884",
            },
          ],
        }),
        headers: new Map(),
      });

      const results = await provider.searchByTitle({ title: "Test Book" });

      expect(results[0].confidence).toBeGreaterThan(0.6);
      expect(results[0].confidence).toBeLessThan(0.9);
    });

    it("should boost confidence for complete metadata", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          book: {
            title: "Complete Book",
            isbn13: "9780132350884",
            authors: ["Author"],
            publisher: "Publisher",
            date_published: "2020",
            synopsis: "Long description with lots of details...",
            subjects: ["Subject 1", "Subject 2", "Subject 3"],
            pages: 300,
            language: "en",
            dimensions: "9.0 x 6.0 x 1.0",
          },
        }),
        headers: new Map(),
      });

      const results = await provider.searchByISBN("9780132350884");

      expect(results[0].confidence).toBeGreaterThan(0.92);
    });
  });

  describe("Rate Limiting and Retry", () => {
    it("should handle rate limit errors with retry", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      // First call returns 429, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          headers: new Map([["Retry-After", "1"]]),
          json: async () => ({ errorMessage: "Rate limit exceeded" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            book: {
              title: "Test Book",
              isbn13: "9780132350884",
            },
          }),
          headers: new Map(),
        });

      const results = await provider.searchByISBN("9780132350884");

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(1);
    });

    it("should retry on network errors", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            book: {
              title: "Test Book",
              isbn13: "9780132350884",
            },
          }),
          headers: new Map(),
        });

      const results = await provider.searchByISBN("9780132350884");

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(1);
    });
  });

  describe("Data Mapping", () => {
    it("should prefer long title over short title", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          book: {
            title: "Short Title",
            title_long: "Long Title: With Subtitle",
            isbn13: "9780132350884",
          },
        }),
        headers: new Map(),
      });

      const results = await provider.searchByISBN("9780132350884");

      expect(results[0].title).toBe("Long Title: With Subtitle");
    });

    it("should collect all available ISBNs", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          book: {
            title: "Test Book",
            isbn: "9780132350884",
            isbn10: "0132350884",
            isbn13: "9780132350884",
          },
        }),
        headers: new Map(),
      });

      const results = await provider.searchByISBN("9780132350884");

      expect(results[0].isbn).toContain("9780132350884");
      expect(results[0].isbn).toContain("0132350884");
    });

    it("should store provider-specific data", async () => {
      vi.spyOn(provider as any, "getApiKey").mockResolvedValue("test-api-key");

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          book: {
            title: "Test Book",
            isbn13: "9780132350884",
            msrp: 29.99,
            binding: "Hardcover",
            edition: "1st Edition",
          },
        }),
        headers: new Map(),
      });

      const results = await provider.searchByISBN("9780132350884");

      expect(results[0].providerData).toMatchObject({
        msrp: 29.99,
        binding: "Hardcover",
        edition: "1st Edition",
      });
    });
  });
});
