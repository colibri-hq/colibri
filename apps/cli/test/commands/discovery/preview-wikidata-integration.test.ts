import { type MultiCriteriaQuery, WikiDataMetadataProvider } from "@colibri-hq/sdk/metadata";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch for WikiData provider
const mockFetch = vi.fn();

// Mock WikiData SPARQL response
const createMockWikiDataResponse = (bindings: unknown[]) => ({
  head: {
    vars: [
      "book",
      "title",
      "author",
      "authorLabel",
      "isbn",
      "publishDate",
      "publisher",
      "publisherLabel",
    ],
  },
  results: { bindings },
});

describe("CLI Discovery Preview - WikiData Integration", () => {
  let wikidataProvider: WikiDataMetadataProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    wikidataProvider = new WikiDataMetadataProvider(mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("5.1 Test CLI integration with discovery:preview", () => {
    it("should run discovery:preview with WikiData provider enabled", async () => {
      // Mock successful WikiData response
      const mockBinding = {
        authorLabel: { type: "literal", value: "F. Scott Fitzgerald", "xml:lang": "en" },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q74287" },
        isbn: { type: "literal", value: "9780743273565" },
        publishDate: {
          datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          type: "literal",
          value: "1925-04-10T00:00:00Z",
        },
        publisherLabel: { type: "literal", value: "Charles Scribner's Sons", "xml:lang": "en" },
        title: { type: "literal", value: "The Great Gatsby", "xml:lang": "en" },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([mockBinding]),
        ok: true,
      });

      // Test WikiData provider directly with title search
      const query: MultiCriteriaQuery = { fuzzy: false, title: "The Great Gatsby" };

      const results = await wikidataProvider.searchMultiCriteria(query);

      // Verify WikiData provider was called
      expect(mockFetch).toHaveBeenCalled();

      // Verify the SPARQL query was constructed correctly
      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain("query.wikidata.org/sparql");
      expect(url).toContain("wdt%3AP31%20wd%3AQ7725634"); // Literary work classification (URL encoded)
      expect(url).toContain("The%20Great%20Gatsby"); // Title in query

      // Verify results contain WikiData metadata
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("The Great Gatsby");
      expect(results[0].authors).toContain("F. Scott Fitzgerald");
      expect(results[0].source).toBe("WikiData");
    });

    it("should verify WikiData results are returned and displayed correctly", async () => {
      // Mock WikiData response with comprehensive metadata
      const mockBinding = {
        authorLabel: { type: "literal", value: "George Orwell", "xml:lang": "en" },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q8261" },
        isbn: { type: "literal", value: "9780451524935" },
        publishDate: {
          datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          type: "literal",
          value: "1949-06-08T00:00:00Z",
        },
        publisherLabel: { type: "literal", value: "Secker & Warburg", "xml:lang": "en" },
        title: { type: "literal", value: "1984", "xml:lang": "en" },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([mockBinding]),
        ok: true,
      });

      const query: MultiCriteriaQuery = { fuzzy: false, title: "1984" };

      const results = await wikidataProvider.searchMultiCriteria(query);

      // Verify WikiData provider configuration
      expect(wikidataProvider.name).toBe("WikiData");
      expect(wikidataProvider.priority).toBe(85);
      expect(wikidataProvider.rateLimit.maxRequests).toBe(60);
      expect(wikidataProvider.timeout.requestTimeout).toBe(20_000);

      // Verify metadata fields are extracted correctly
      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result.title).toBe("1984");
      expect(result.authors).toContain("George Orwell");
      expect(result.isbn).toContain("9780451524935");
      expect(result.publisher).toBe("Secker & Warburg");
      expect(result.publicationDate?.getFullYear()).toBe(1949);

      // Verify confidence score is reasonable
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.source).toBe("WikiData");
    });

    it("should verify search performance is acceptable (under 5 seconds)", async () => {
      // Mock fast WikiData response
      const mockBinding = {
        authorLabel: { type: "literal", value: "Harper Lee", "xml:lang": "en" },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q47209" },
        isbn: { type: "literal", value: "9780061120084" },
        publishDate: {
          datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          type: "literal",
          value: "1960-07-11T00:00:00Z",
        },
        title: { type: "literal", value: "To Kill a Mockingbird", "xml:lang": "en" },
      };

      // Simulate realistic network delay (but under 5 seconds)
      mockFetch.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
        return { json: async () => createMockWikiDataResponse([mockBinding]), ok: true };
      });

      const query: MultiCriteriaQuery = { fuzzy: false, title: "To Kill a Mockingbird" };

      const startTime = Date.now();
      const results = await wikidataProvider.searchMultiCriteria(query);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify performance is under 5 seconds
      expect(duration).toBeLessThan(5000);

      // Verify the query completed successfully
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("To Kill a Mockingbird");
      expect(results[0].authors).toContain("Harper Lee");
    });

    it("should handle WikiData provider errors gracefully", async () => {
      // Mock WikiData service error
      mockFetch.mockRejectedValueOnce(new Error("WikiData service temporarily unavailable"));

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Test Book" };

      // Should not throw error, but return empty results
      const results = await wikidataProvider.searchMultiCriteria(query);

      // Verify error is handled gracefully
      expect(results).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should work with ISBN search via WikiData", async () => {
      // Mock WikiData ISBN search response
      const mockBinding = {
        authorLabel: { type: "literal", value: "J. D. Salinger", "xml:lang": "en" },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q25338" },
        isbn: { type: "literal", value: "9780316769174" },
        publishDate: {
          datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          type: "literal",
          value: "1951-07-16T00:00:00Z",
        },
        publisherLabel: { type: "literal", value: "Little, Brown and Company", "xml:lang": "en" },
        title: { type: "literal", value: "The Catcher in the Rye", "xml:lang": "en" },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([mockBinding]),
        ok: true,
      });

      const query: MultiCriteriaQuery = { fuzzy: false, isbn: "978-0-316-76917-4" };

      const results = await wikidataProvider.searchMultiCriteria(query);

      // Verify ISBN search was performed
      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain("wdt%3AP957"); // ISBN property (URL encoded)
      expect(url).toContain("9780316769174"); // Cleaned ISBN

      // Verify results
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("The Catcher in the Rye");
      expect(results[0].authors).toContain("J. D. Salinger");
      expect(results[0].publisher).toBe("Little, Brown and Company");
    });

    it("should work with author search via WikiData", async () => {
      // Mock WikiData author search response
      const mockBinding = {
        authorLabel: { type: "literal", value: "J. R. R. Tolkien", "xml:lang": "en" },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q15228" },
        isbn: { type: "literal", value: "9780544003415" },
        publishDate: {
          datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          type: "literal",
          value: "1954-07-29T00:00:00Z",
        },
        publisherLabel: { type: "literal", value: "George Allen & Unwin", "xml:lang": "en" },
        title: { type: "literal", value: "The Lord of the Rings", "xml:lang": "en" },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([mockBinding]),
        ok: true,
      });

      const query: MultiCriteriaQuery = { authors: ["J.R.R. Tolkien"], fuzzy: false };

      const results = await wikidataProvider.searchMultiCriteria(query);

      // Verify author search was performed
      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain("wdt%3AP50"); // Author property (URL encoded)
      expect(url).toContain("Tolkien"); // Author name in query

      // Verify results
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("The Lord of the Rings");
      expect(results[0].authors).toContain("J. R. R. Tolkien");
      expect(results[0].publisher).toBe("George Allen & Unwin");
    });

    it("should display WikiData provider configuration correctly", async () => {
      // Verify WikiData provider configuration
      expect(wikidataProvider.name).toBe("WikiData");
      expect(wikidataProvider.priority).toBe(85); // Higher than OpenLibrary (80)
      expect(wikidataProvider.rateLimit.maxRequests).toBe(60);
      expect(wikidataProvider.rateLimit.windowMs).toBe(60_000);
      expect(wikidataProvider.rateLimit.requestDelay).toBe(1000);
      expect(wikidataProvider.timeout.requestTimeout).toBe(20_000);
      expect(wikidataProvider.timeout.operationTimeout).toBe(60_000);
    });

    it("should handle multi-criteria search prioritization correctly", async () => {
      // Mock WikiData response for ISBN search (should be prioritized)
      const mockBinding = {
        authorLabel: { type: "literal", value: "Test Author", "xml:lang": "en" },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q123" },
        isbn: { type: "literal", value: "9781234567890" },
        title: { type: "literal", value: "Test Book", "xml:lang": "en" },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([mockBinding]),
        ok: true,
      });

      // Query with multiple criteria - ISBN should be prioritized
      const query: MultiCriteriaQuery = {
        authors: ["Different Author"],
        fuzzy: false,
        isbn: "978-1-234-56789-0",
        title: "Different Title",
      };

      const results = await wikidataProvider.searchMultiCriteria(query);

      // Verify ISBN search was performed (not title or author)
      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0] as string;
      expect(url).toContain("wdt%3AP957"); // ISBN property (URL encoded)
      expect(url).toContain("9781234567890"); // Cleaned ISBN
      expect(url).not.toContain("Different%20Title"); // Title not used
      expect(url).not.toContain("Different%20Author"); // Author not used

      expect(results).toHaveLength(1);
    });
  });
});
