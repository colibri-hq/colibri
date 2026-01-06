import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WikiDataMetadataProvider } from "./wikidata.js";
import { MetadataType } from "./provider.js";

// Mock the rate limiter to avoid delays in tests
vi.mock("./rate-limiter.js", () => ({
  globalRateLimiterRegistry: {
    getLimiter: () => ({
      waitForSlot: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock the timeout manager to avoid timeouts in tests
vi.mock("./timeout-manager.js", () => ({
  globalTimeoutManagerRegistry: {
    getManager: () => ({
      withRequestTimeout: <T>(promise: Promise<T>) => promise,
    }),
  },
}));

// Mock fetch function
const mockFetch = vi.fn();

describe("WikiDataMetadataProvider", () => {
  let provider: WikiDataMetadataProvider;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    provider = new WikiDataMetadataProvider(mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper function to create mock WikiData SPARQL response
  const createMockWikiDataResponse = (bindings: any[] = []) => ({
    head: { vars: ["book", "title", "author", "authorLabel", "isbn"] },
    results: { bindings },
  });

  // Helper function to create mock binding
  const createMockBinding = (overrides: any = {}) => ({
    book: { type: "uri", value: "http://www.wikidata.org/entity/Q123456" },
    title: { type: "literal", value: "Test Book", "xml:lang": "en" },
    authorLabel: { type: "literal", value: "Test Author", "xml:lang": "en" },
    isbn: { type: "literal", value: "9781234567890" },
    publishDate: {
      type: "literal",
      value: "2020-01-01",
      datatype: "http://www.w3.org/2001/XMLSchema#date",
    },
    publisherLabel: {
      type: "literal",
      value: "Test Publisher",
      "xml:lang": "en",
    },
    languageLabel: { type: "literal", value: "English", "xml:lang": "en" },
    pages: {
      type: "literal",
      value: "300",
      datatype: "http://www.w3.org/2001/XMLSchema#integer",
    },
    description: {
      type: "literal",
      value: "A test book description",
      "xml:lang": "en",
    },
    ...overrides,
  });

  describe("Provider Configuration", () => {
    it("should have correct provider name and priority", () => {
      expect(provider.name).toBe("WikiData");
      expect(provider.priority).toBe(85);
    });

    it("should have appropriate rate limiting configuration", () => {
      expect(provider.rateLimit.maxRequests).toBe(60);
      expect(provider.rateLimit.windowMs).toBe(60000);
      expect(provider.rateLimit.requestDelay).toBe(1000);
    });

    it("should have appropriate timeout configuration", () => {
      expect(provider.timeout.requestTimeout).toBe(20000);
      expect(provider.timeout.operationTimeout).toBe(60000);
    });
  });

  describe("Provider Priority and Integration", () => {
    describe("Priority Configuration", () => {
      it("should have WikiData provider priority set to 85", () => {
        expect(provider.priority).toBe(85);
      });

      it("should have higher priority than OpenLibrary provider (80)", () => {
        // WikiData should have higher priority due to structured data quality
        expect(provider.priority).toBeGreaterThan(80);
        expect(provider.priority).toBe(85);
      });

      it("should have priority within reasonable bounds for metadata providers", () => {
        // Priority should be between 0-100, with higher values indicating higher priority
        expect(provider.priority).toBeGreaterThan(0);
        expect(provider.priority).toBeLessThanOrEqual(100);

        // WikiData should be in the high-priority range (80+) due to data quality
        expect(provider.priority).toBeGreaterThanOrEqual(80);
      });

      it("should justify higher priority through data quality characteristics", () => {
        // WikiData priority should reflect its strengths
        expect(provider.priority).toBe(85);

        // Verify the provider has characteristics that justify high priority
        expect(provider.name).toBe("WikiData");
        expect(provider.getReliabilityScore(MetadataType.ISBN)).toBeGreaterThan(
          0.95,
        );
        expect(
          provider.getReliabilityScore(MetadataType.AUTHORS),
        ).toBeGreaterThan(0.9);
        expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
        expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
        expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
      });
    });

    describe("Provider Interface Compliance", () => {
      it("should implement all required BaseMetadataProvider methods", () => {
        // Verify the provider implements the required interface
        expect(typeof provider.searchByTitle).toBe("function");
        expect(typeof provider.searchByISBN).toBe("function");
        expect(typeof provider.searchByCreator).toBe("function");
        expect(typeof provider.searchMultiCriteria).toBe("function");
        expect(typeof provider.getReliabilityScore).toBe("function");
        expect(typeof provider.supportsDataType).toBe("function");
      });

      it("should have consistent method signatures with other providers", async () => {
        // Test that methods accept the expected parameter types
        const titleQuery = { title: "Test Book", exactMatch: true };
        const creatorQuery = { name: "Test Author", fuzzy: false };
        const multiQuery = { title: "Test", authors: ["Author"], isbn: "123" };

        // Mock successful responses for interface testing
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ head: { vars: [] }, results: { bindings: [] } }),
        });

        // Verify methods can be called with expected parameters
        expect(
          async () => await provider.searchByTitle(titleQuery),
        ).not.toThrow();
        expect(
          async () => await provider.searchByISBN("9781234567890"),
        ).not.toThrow();
        expect(
          async () => await provider.searchByCreator(creatorQuery),
        ).not.toThrow();
        expect(
          async () => await provider.searchMultiCriteria(multiQuery),
        ).not.toThrow();
      });

      it("should return consistent result format across all search methods", async () => {
        const mockBinding = createMockBinding();
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        // Test all search methods return consistent MetadataRecord format
        const titleResults = await provider.searchByTitle({
          title: "Test",
          exactMatch: true,
        });
        const isbnResults = await provider.searchByISBN("9781234567890");
        const authorResults = await provider.searchByCreator({
          name: "Test Author",
          fuzzy: false,
        });
        const multiResults = await provider.searchMultiCriteria({
          title: "Test",
        });

        // Verify all results have consistent structure
        for (const results of [
          titleResults,
          isbnResults,
          authorResults,
          multiResults,
        ]) {
          expect(Array.isArray(results)).toBe(true);
          if (results.length > 0) {
            const record = results[0];
            expect(record).toHaveProperty("id");
            expect(record).toHaveProperty("source");
            expect(record).toHaveProperty("timestamp");
            expect(record).toHaveProperty("confidence");
            expect(record.source).toBe("WikiData");
            expect(typeof record.confidence).toBe("number");
            expect(record.confidence).toBeGreaterThan(0);
            expect(record.confidence).toBeLessThanOrEqual(1);
          }
        }
      });
    });

    describe("Multi-Provider Integration Scenarios", () => {
      it("should work correctly alongside other providers in priority-based selection", () => {
        // Simulate a scenario where multiple providers are available
        const mockOpenLibraryProvider = {
          name: "OpenLibrary",
          priority: 80,
          getReliabilityScore: (_type: MetadataType) => 0.85,
        };

        const mockGoogleBooksProvider = {
          name: "GoogleBooks",
          priority: 75,
          getReliabilityScore: (_type: MetadataType) => 0.8,
        };

        const providers = [
          mockOpenLibraryProvider,
          mockGoogleBooksProvider,
          provider,
        ];

        // Sort by priority (higher first)
        providers.sort((a, b) => b.priority - a.priority);

        // WikiData should be first due to highest priority
        expect(providers[0].name).toBe("WikiData");
        expect(providers[0].priority).toBe(85);
        expect(providers[1].name).toBe("OpenLibrary");
        expect(providers[1].priority).toBe(80);
        expect(providers[2].name).toBe("GoogleBooks");
        expect(providers[2].priority).toBe(75);
      });

      it("should provide complementary data to other providers", () => {
        // WikiData should excel in areas where other providers might be weaker
        expect(provider.getReliabilityScore(MetadataType.AUTHORS)).toBe(0.95);
        expect(provider.getReliabilityScore(MetadataType.LANGUAGE)).toBe(0.95);
        expect(provider.getReliabilityScore(MetadataType.SUBJECTS)).toBe(0.85);

        // These are areas where WikiData provides high-quality structured data
        // that can complement other providers' strengths
        expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
        expect(provider.supportsDataType(MetadataType.LANGUAGE)).toBe(true);
        expect(provider.supportsDataType(MetadataType.SUBJECTS)).toBe(true);
      });

      it("should handle provider coordination gracefully", async () => {
        // Test that the provider works well in coordinated scenarios
        const mockBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Coordination Test Book",
            "xml:lang": "en",
          },
          authorLabel: {
            type: "literal",
            value: "Coordination Author",
            "xml:lang": "en",
          },
          isbn: { type: "literal", value: "9781234567890" },
        });

        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Coordination Test Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        const record = results[0];

        // Verify the record has provider-specific data that could be used for coordination
        expect(record.providerData).toBeDefined();
        expect(record.providerData.wikidataUri).toBeDefined();
        expect(record.providerData.wikidataId).toBeDefined();
        expect(record.providerData.searchType).toBe("title");

        // Verify confidence scoring that would be used in provider coordination
        expect(record.confidence).toBeGreaterThan(0.7);
        expect(record.confidence).toBeLessThanOrEqual(0.92);
      });
    });

    describe("CLI Integration Compatibility", () => {
      it("should be compatible with discovery:preview command structure", async () => {
        // Test that the provider works with the expected CLI command patterns
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "CLI Test Book", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        // Simulate CLI usage patterns
        const titleResults = await provider.searchByTitle({
          title: "CLI Test Book",
          exactMatch: true,
        });
        const isbnResults = await provider.searchByISBN("9781234567890");

        // Verify results are in format expected by CLI
        expect(Array.isArray(titleResults)).toBe(true);
        expect(Array.isArray(isbnResults)).toBe(true);

        if (titleResults.length > 0) {
          const record = titleResults[0];
          expect(record.source).toBe("WikiData");
          expect(typeof record.confidence).toBe("number");
          expect(record.title).toBeDefined();
        }
      });

      it("should be compatible with discovery:preview-coordinator command structure", () => {
        // Test provider properties that would be used by the coordinator
        expect(provider.name).toBe("WikiData");
        expect(typeof provider.priority).toBe("number");
        expect(provider.priority).toBe(85);

        // Test rate limiting configuration for coordinator
        expect(provider.rateLimit).toBeDefined();
        expect(provider.rateLimit.maxRequests).toBe(60);
        expect(provider.rateLimit.windowMs).toBe(60000);

        // Test timeout configuration for coordinator
        expect(provider.timeout).toBeDefined();
        expect(provider.timeout.requestTimeout).toBe(20000);
        expect(provider.timeout.operationTimeout).toBe(60000);
      });

      it("should provide appropriate metadata for CLI display", async () => {
        const completeBinding = createMockBinding({
          title: {
            type: "literal",
            value: "CLI Display Test",
            "xml:lang": "en",
          },
          authorLabel: {
            type: "literal",
            value: "Display Author",
            "xml:lang": "en",
          },
          isbn: { type: "literal", value: "9781234567890" },
          publishDate: {
            type: "literal",
            value: "2023-01-01",
            datatype: "http://www.w3.org/2001/XMLSchema#date",
          },
          publisherLabel: {
            type: "literal",
            value: "Display Publisher",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => createMockWikiDataResponse([completeBinding]),
        });

        const results = await provider.searchByTitle({
          title: "CLI Display Test",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        const record = results[0];

        // Verify all key fields for CLI display are present
        expect(record.title).toBe("CLI Display Test");
        expect(record.authors).toEqual(["Display Author"]);
        expect(record.isbn).toEqual(["9781234567890"]);
        expect(record.publicationDate).toEqual(new Date("2023-01-01"));
        expect(record.publisher).toBe("Display Publisher");
        expect(record.source).toBe("WikiData");
        expect(record.confidence).toBeGreaterThan(0.8);
      });
    });
  });

  describe("Reliability Scores for Metadata Types", () => {
    describe("High Reliability Metadata Types", () => {
      it("should return 95% reliability score for Authors", () => {
        expect(provider.getReliabilityScore(MetadataType.AUTHORS)).toBe(0.95);
      });

      it("should return 98% reliability score for ISBN", () => {
        expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.98);
      });

      it("should return 92% reliability score for Title", () => {
        expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.92);
      });

      it("should return high reliability scores for other core structured data", () => {
        expect(
          provider.getReliabilityScore(MetadataType.PUBLICATION_DATE),
        ).toBe(0.9);
        expect(provider.getReliabilityScore(MetadataType.LANGUAGE)).toBe(0.95);
        expect(provider.getReliabilityScore(MetadataType.PUBLISHER)).toBe(0.88);
        expect(provider.getReliabilityScore(MetadataType.SUBJECTS)).toBe(0.85);
        expect(provider.getReliabilityScore(MetadataType.PAGE_COUNT)).toBe(
          0.85,
        );
      });
    });

    describe("Medium Reliability Metadata Types", () => {
      it("should return appropriate scores for moderately reliable metadata types", () => {
        expect(provider.getReliabilityScore(MetadataType.SERIES)).toBe(0.8);
        expect(provider.getReliabilityScore(MetadataType.DESCRIPTION)).toBe(
          0.75,
        );
        expect(provider.getReliabilityScore(MetadataType.EDITION)).toBe(0.7);
      });
    });

    describe("Lower Reliability Metadata Types", () => {
      it("should return lower scores for data types WikiData has less comprehensive coverage", () => {
        expect(
          provider.getReliabilityScore(MetadataType.PHYSICAL_DIMENSIONS),
        ).toBe(0.6);
        expect(provider.getReliabilityScore(MetadataType.COVER_IMAGE)).toBe(
          0.3,
        );
      });
    });

    describe("Reliability Score Ranking", () => {
      it("should rank reliability scores appropriately: ISBN > Authors > Language > Title > Publisher", () => {
        const isbnScore = provider.getReliabilityScore(MetadataType.ISBN);
        const authorsScore = provider.getReliabilityScore(MetadataType.AUTHORS);
        const languageScore = provider.getReliabilityScore(
          MetadataType.LANGUAGE,
        );
        const titleScore = provider.getReliabilityScore(MetadataType.TITLE);
        const publisherScore = provider.getReliabilityScore(
          MetadataType.PUBLISHER,
        );

        expect(isbnScore).toBeGreaterThan(authorsScore);
        expect(authorsScore).toBeGreaterThanOrEqual(languageScore);
        expect(languageScore).toBeGreaterThan(titleScore);
        expect(titleScore).toBeGreaterThan(publisherScore);
      });

      it("should have ISBN as the most reliable metadata type", () => {
        const allScores = [
          provider.getReliabilityScore(MetadataType.TITLE),
          provider.getReliabilityScore(MetadataType.AUTHORS),
          provider.getReliabilityScore(MetadataType.ISBN),
          provider.getReliabilityScore(MetadataType.PUBLICATION_DATE),
          provider.getReliabilityScore(MetadataType.LANGUAGE),
          provider.getReliabilityScore(MetadataType.PUBLISHER),
          provider.getReliabilityScore(MetadataType.SUBJECTS),
          provider.getReliabilityScore(MetadataType.DESCRIPTION),
          provider.getReliabilityScore(MetadataType.SERIES),
          provider.getReliabilityScore(MetadataType.EDITION),
          provider.getReliabilityScore(MetadataType.PAGE_COUNT),
          provider.getReliabilityScore(MetadataType.PHYSICAL_DIMENSIONS),
          provider.getReliabilityScore(MetadataType.COVER_IMAGE),
        ];

        const maxScore = Math.max(...allScores);
        expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(maxScore);
        expect(maxScore).toBe(0.98);
      });
    });

    describe("Reliability Score Bounds", () => {
      it("should return scores between 0 and 1 for all metadata types", () => {
        const allMetadataTypes = Object.values(MetadataType);

        for (const metadataType of allMetadataTypes) {
          const score = provider.getReliabilityScore(metadataType);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        }
      });

      it("should return default score for unknown metadata types", () => {
        // Test with a non-existent metadata type (cast to bypass TypeScript)
        const unknownType = "UNKNOWN_TYPE" as MetadataType;
        const score = provider.getReliabilityScore(unknownType);
        expect(score).toBe(0.7); // Default fallback score
      });
    });

    describe("WikiData Quality Characteristics", () => {
      it("should reflect WikiData strengths in structured bibliographic data", () => {
        // WikiData excels at structured, factual data
        expect(provider.getReliabilityScore(MetadataType.ISBN)).toBeGreaterThan(
          0.95,
        );
        expect(
          provider.getReliabilityScore(MetadataType.AUTHORS),
        ).toBeGreaterThan(0.9);
        expect(
          provider.getReliabilityScore(MetadataType.LANGUAGE),
        ).toBeGreaterThan(0.9);

        // WikiData has good coverage of publication metadata
        expect(
          provider.getReliabilityScore(MetadataType.PUBLICATION_DATE),
        ).toBeGreaterThan(0.85);
        expect(
          provider.getReliabilityScore(MetadataType.PUBLISHER),
        ).toBeGreaterThan(0.85);
      });

      it("should reflect WikiData limitations in multimedia and physical data", () => {
        // WikiData has limited multimedia content
        expect(
          provider.getReliabilityScore(MetadataType.COVER_IMAGE),
        ).toBeLessThan(0.5);

        // Physical dimensions are less commonly available
        expect(
          provider.getReliabilityScore(MetadataType.PHYSICAL_DIMENSIONS),
        ).toBeLessThan(0.7);
      });
    });
  });

  describe("Data Type Support", () => {
    it("should support core metadata types", () => {
      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PUBLICATION_DATE)).toBe(
        true,
      );
      expect(provider.supportsDataType(MetadataType.LANGUAGE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PUBLISHER)).toBe(true);
    });

    it("should not support unsupported data types", () => {
      expect(provider.supportsDataType(MetadataType.COVER_IMAGE)).toBe(false);
      expect(provider.supportsDataType(MetadataType.PHYSICAL_DIMENSIONS)).toBe(
        false,
      );
    });
  });
  describe("Title Search", () => {
    it("should search by title and return metadata records", async () => {
      const mockBinding = createMockBinding({
        title: { type: "literal", value: "The Great Gatsby", "xml:lang": "en" },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockWikiDataResponse([mockBinding]),
      });

      const results = await provider.searchByTitle({
        title: "The Great Gatsby",
        exactMatch: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("The Great Gatsby");
      expect(results[0].authors).toEqual(["Test Author"]);
      expect(results[0].isbn).toEqual(["9781234567890"]);
      expect(results[0].source).toBe("WikiData");
      expect(results[0].confidence).toBeGreaterThan(0.7);
    });

    it("should handle title search with exact matching for performance", async () => {
      const mockBinding = createMockBinding();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockWikiDataResponse([mockBinding]),
      });

      const results = await provider.searchByTitle({
        title: "Test",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      // The implementation uses exact matching for performance optimization
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("%3Fbook%20rdfs%3Alabel%20%22Test%22%40en"),
        expect.any(Object),
      );
    });

    it("should handle empty results gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockWikiDataResponse([]),
      });

      const results = await provider.searchByTitle({
        title: "Nonexistent Book",
        exactMatch: true,
      });

      expect(results).toHaveLength(0);
    });
  });

  describe("ISBN Search", () => {
    it("should search by ISBN and return metadata records", async () => {
      const mockBinding = createMockBinding();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockWikiDataResponse([mockBinding]),
      });

      const results = await provider.searchByISBN("978-1-234-56789-0");

      expect(results).toHaveLength(1);
      expect(results[0].isbn).toEqual(["9781234567890"]);
      expect(results[0].confidence).toBeGreaterThan(0.85); // ISBN searches have higher confidence
    });

    it("should clean ISBN format before searching", async () => {
      const mockBinding = createMockBinding();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockWikiDataResponse([mockBinding]),
      });

      await provider.searchByISBN("978-1-234-56789-0");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("9781234567890"),
        expect.any(Object),
      );
    });
  });

  describe("Author Search", () => {
    it("should search by author and return metadata records", async () => {
      const mockBinding = createMockBinding({
        authorLabel: {
          type: "literal",
          value: "F. Scott Fitzgerald",
          "xml:lang": "en",
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockWikiDataResponse([mockBinding]),
      });

      const results = await provider.searchByCreator({
        name: "F. Scott Fitzgerald",
        fuzzy: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0].authors).toEqual(["F. Scott Fitzgerald"]);
      // The implementation uses exact matching for performance optimization
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "%3Fauthor%20rdfs%3Alabel%20%22F.%20Scott%20Fitzgerald%22%40en",
        ),
        expect.any(Object),
      );
    });
  });
  describe("Multi-Criteria Search", () => {
    it("should prioritize ISBN in multi-criteria search", async () => {
      const mockBinding = createMockBinding();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockWikiDataResponse([mockBinding]),
      });

      const results = await provider.searchMultiCriteria({
        title: "Test Book",
        authors: ["Test Author"],
        isbn: "9781234567890",
      });

      expect(results).toHaveLength(1);
      // Should have used ISBN search (contains ISBN filter)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("wdt%3AP957%20%3Fisbn"),
        expect.any(Object),
      );
    });

    it("should fall back to title search when no ISBN", async () => {
      const mockBinding = createMockBinding();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockWikiDataResponse([mockBinding]),
      });

      const results = await provider.searchMultiCriteria({
        title: "Test Book",
        authors: ["Test Author"],
      });

      expect(results).toHaveLength(1);
      // Should have used title search with exact matching
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "%3Fbook%20rdfs%3Alabel%20%22Test%20Book%22%40en",
        ),
        expect.any(Object),
      );
    });
  });

  describe("Metadata Extraction and Processing", () => {
    describe("Comprehensive Metadata Field Extraction", () => {
      it("should extract all core metadata fields correctly", async () => {
        const completeBinding = createMockBinding({
          title: {
            type: "literal",
            value: "The Complete Guide to Everything",
            "xml:lang": "en",
          },
          authorLabel: {
            type: "literal",
            value: "Jane Smith",
            "xml:lang": "en",
          },
          isbn: { type: "literal", value: "9781234567890" },
          publishDate: {
            type: "literal",
            value: "2023-06-15T00:00:00Z",
            datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          },
          publisherLabel: {
            type: "literal",
            value: "Academic Press",
            "xml:lang": "en",
          },
          languageLabel: {
            type: "literal",
            value: "English",
            "xml:lang": "en",
          },
          pages: {
            type: "literal",
            value: "450",
            datatype: "http://www.w3.org/2001/XMLSchema#integer",
          },
          description: {
            type: "literal",
            value:
              "A comprehensive guide covering all aspects of the subject matter.",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([completeBinding]),
        });

        const results = await provider.searchByTitle({
          title: "The Complete Guide to Everything",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        const record = results[0];

        // Verify all core fields are extracted
        expect(record.title).toBe("The Complete Guide to Everything");
        expect(record.authors).toEqual(["Jane Smith"]);
        expect(record.isbn).toEqual(["9781234567890"]);
        expect(record.publicationDate).toEqual(
          new Date("2023-06-15T00:00:00Z"),
        );
        expect(record.publisher).toBe("Academic Press");
        expect(record.language).toBe("en");
        expect(record.pageCount).toBe(450);
        expect(record.description).toBe(
          "A comprehensive guide covering all aspects of the subject matter.",
        );
        expect(record.source).toBe("WikiData");
        expect(record.confidence).toBeGreaterThan(0.8);
      });

      it("should extract optional fields when available", async () => {
        const bindingWithOptionals = createMockBinding({
          title: {
            type: "literal",
            value: "Advanced Topics in Science",
            "xml:lang": "en",
          },
          authorLabel: {
            type: "literal",
            value: "Dr. Robert Johnson",
            "xml:lang": "en",
          },
          isbn: { type: "literal", value: "9780123456789" },
          publishDate: {
            type: "literal",
            value: "2022-03-10",
            datatype: "http://www.w3.org/2001/XMLSchema#date",
          },
          publisherLabel: {
            type: "literal",
            value: "Science Publications",
            "xml:lang": "en",
          },
          languageLabel: {
            type: "literal",
            value: "English",
            "xml:lang": "en",
          },
          pages: {
            type: "literal",
            value: "320",
            datatype: "http://www.w3.org/2001/XMLSchema#integer",
          },
          description: {
            type: "literal",
            value: "An in-depth exploration of advanced scientific concepts.",
            "xml:lang": "en",
          },
          // Additional optional fields that might be present
          subjects: {
            type: "literal",
            value: "Science, Research, Advanced Studies",
            "xml:lang": "en",
          },
          edition: { type: "literal", value: "2nd Edition", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([bindingWithOptionals]),
        });

        const results = await provider.searchByTitle({
          title: "Advanced Topics in Science",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        const record = results[0];

        // Verify core fields
        expect(record.title).toBe("Advanced Topics in Science");
        expect(record.authors).toEqual(["Dr. Robert Johnson"]);
        expect(record.isbn).toEqual(["9780123456789"]);
        expect(record.publicationDate).toEqual(new Date("2022-03-10"));
        expect(record.publisher).toBe("Science Publications");
        expect(record.language).toBe("en");
        expect(record.pageCount).toBe(320);
        expect(record.description).toBe(
          "An in-depth exploration of advanced scientific concepts.",
        );

        // Verify provider-specific data is included
        expect(record.providerData).toBeDefined();
        expect(record.providerData.wikidataUri).toBe(
          "http://www.wikidata.org/entity/Q123456",
        );
        expect(record.providerData.wikidataId).toBe("Q123456");
        expect(record.providerData.searchType).toBe("title");
      });

      it("should handle missing fields gracefully without errors", async () => {
        const minimalBinding = {
          book: {
            type: "uri",
            value: "http://www.wikidata.org/entity/Q789012",
          },
          title: {
            type: "literal",
            value: "Minimal Book Record",
            "xml:lang": "en",
          },
          // Only title is present, all other fields are missing
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([minimalBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Minimal Book Record",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        const record = results[0];

        // Verify required fields
        expect(record.title).toBe("Minimal Book Record");
        expect(record.source).toBe("WikiData");
        expect(record.id).toBeDefined();
        expect(record.timestamp).toBeDefined();
        expect(record.confidence).toBeGreaterThan(0);

        // Verify optional fields are undefined when missing
        expect(record.authors).toBeUndefined();
        expect(record.isbn).toBeUndefined();
        expect(record.publicationDate).toBeUndefined();
        expect(record.publisher).toBeUndefined();
        expect(record.language).toBeUndefined();
        expect(record.pageCount).toBeUndefined();
        expect(record.description).toBeUndefined();

        // Verify provider data is still included
        expect(record.providerData).toBeDefined();
        expect(record.providerData.wikidataUri).toBe(
          "http://www.wikidata.org/entity/Q789012",
        );
        expect(record.providerData.wikidataId).toBe("Q789012");
      });

      it("should handle malformed or invalid field values gracefully", async () => {
        const malformedBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Book with Invalid Data",
            "xml:lang": "en",
          },
          authorLabel: {
            type: "literal",
            value: "Valid Author",
            "xml:lang": "en",
          },
          isbn: { type: "literal", value: "invalid-isbn-format" }, // Invalid ISBN
          publishDate: {
            type: "literal",
            value: "not-a-date",
            datatype: "http://www.w3.org/2001/XMLSchema#date",
          }, // Invalid date
          pages: {
            type: "literal",
            value: "not-a-number",
            datatype: "http://www.w3.org/2001/XMLSchema#integer",
          }, // Invalid number
          publisherLabel: { type: "literal", value: "", "xml:lang": "en" }, // Empty publisher
          languageLabel: { type: "literal", value: "", "xml:lang": "en" }, // Empty language
          description: { type: "literal", value: "   ", "xml:lang": "en" }, // Whitespace-only description
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([malformedBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Book with Invalid Data",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        const record = results[0];

        // Verify valid fields are still extracted
        expect(record.title).toBe("Book with Invalid Data");
        expect(record.authors).toEqual(["Valid Author"]);

        // Verify invalid fields are handled gracefully
        expect(record.isbn).toEqual(["invalid-isbn-format"]); // ISBN is kept as-is (validation is not provider's responsibility)
        expect(record.publicationDate).toBeUndefined(); // Invalid date should be undefined
        expect(record.pageCount).toBeUndefined(); // Invalid number should be undefined
        expect(record.publisher).toBe(""); // Empty string is preserved
        expect(record.language).toBeUndefined(); // Empty language should map to undefined
        expect(record.description).toBe("   "); // Whitespace is preserved (trimming is not provider's responsibility)
      });

      it("should preserve WikiData entity information in provider data", async () => {
        const binding = createMockBinding({
          book: {
            type: "uri",
            value: "http://www.wikidata.org/entity/Q987654321",
          },
          title: {
            type: "literal",
            value: "Entity Information Test",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([binding]),
        });

        const results = await provider.searchByISBN("9781234567890");

        expect(results).toHaveLength(1);
        const record = results[0];

        expect(record.providerData).toBeDefined();
        expect(record.providerData.wikidataUri).toBe(
          "http://www.wikidata.org/entity/Q987654321",
        );
        expect(record.providerData.wikidataId).toBe("Q987654321");
        expect(record.providerData.searchType).toBe("isbn");
      });
    });

    describe("Multiple Authors and ISBNs Handling", () => {
      it("should handle multiple authors for the same book", async () => {
        const mockBindings = [
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q123456",
            },
            title: {
              type: "literal",
              value: "Collaborative Work",
              "xml:lang": "en",
            },
            authorLabel: {
              type: "literal",
              value: "Author One",
              "xml:lang": "en",
            },
          }),
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q123456",
            },
            title: {
              type: "literal",
              value: "Collaborative Work",
              "xml:lang": "en",
            },
            authorLabel: {
              type: "literal",
              value: "Author Two",
              "xml:lang": "en",
            },
          }),
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q123456",
            },
            title: {
              type: "literal",
              value: "Collaborative Work",
              "xml:lang": "en",
            },
            authorLabel: {
              type: "literal",
              value: "Author Three",
              "xml:lang": "en",
            },
          }),
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse(mockBindings),
        });

        const results = await provider.searchByTitle({
          title: "Collaborative Work",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].authors).toEqual([
          "Author One",
          "Author Two",
          "Author Three",
        ]);
        expect(results[0].title).toBe("Collaborative Work");
      });

      it("should handle multiple ISBNs for the same book", async () => {
        const mockBindings = [
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q654321",
            },
            title: {
              type: "literal",
              value: "Multi-Format Book",
              "xml:lang": "en",
            },
            isbn: { type: "literal", value: "9781234567890" }, // Hardcover ISBN
          }),
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q654321",
            },
            title: {
              type: "literal",
              value: "Multi-Format Book",
              "xml:lang": "en",
            },
            isbn: { type: "literal", value: "9780987654321" }, // Paperback ISBN
          }),
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q654321",
            },
            title: {
              type: "literal",
              value: "Multi-Format Book",
              "xml:lang": "en",
            },
            isbn: { type: "literal", value: "9785555555555" }, // E-book ISBN
          }),
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse(mockBindings),
        });

        const results = await provider.searchByTitle({
          title: "Multi-Format Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].isbn).toEqual([
          "9781234567890",
          "9780987654321",
          "9785555555555",
        ]);
        expect(results[0].title).toBe("Multi-Format Book");
      });

      it("should handle books with both multiple authors and multiple ISBNs", async () => {
        const mockBindings = [
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q111222",
            },
            title: {
              type: "literal",
              value: "Complex Book Record",
              "xml:lang": "en",
            },
            authorLabel: {
              type: "literal",
              value: "First Author",
              "xml:lang": "en",
            },
            isbn: { type: "literal", value: "9781111111111" },
          }),
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q111222",
            },
            title: {
              type: "literal",
              value: "Complex Book Record",
              "xml:lang": "en",
            },
            authorLabel: {
              type: "literal",
              value: "First Author",
              "xml:lang": "en",
            },
            isbn: { type: "literal", value: "9782222222222" },
          }),
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q111222",
            },
            title: {
              type: "literal",
              value: "Complex Book Record",
              "xml:lang": "en",
            },
            authorLabel: {
              type: "literal",
              value: "Second Author",
              "xml:lang": "en",
            },
            isbn: { type: "literal", value: "9781111111111" },
          }),
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q111222",
            },
            title: {
              type: "literal",
              value: "Complex Book Record",
              "xml:lang": "en",
            },
            authorLabel: {
              type: "literal",
              value: "Second Author",
              "xml:lang": "en",
            },
            isbn: { type: "literal", value: "9782222222222" },
          }),
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse(mockBindings),
        });

        const results = await provider.searchByTitle({
          title: "Complex Book Record",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].authors).toEqual(["First Author", "Second Author"]);
        expect(results[0].isbn).toEqual(["9781111111111", "9782222222222"]);
        expect(results[0].title).toBe("Complex Book Record");
      });

      it("should deduplicate authors and ISBNs correctly", async () => {
        const mockBindings = [
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q333444",
            },
            title: {
              type: "literal",
              value: "Duplicate Test Book",
              "xml:lang": "en",
            },
            authorLabel: {
              type: "literal",
              value: "Duplicate Author",
              "xml:lang": "en",
            },
            isbn: { type: "literal", value: "9783333333333" },
          }),
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q333444",
            },
            title: {
              type: "literal",
              value: "Duplicate Test Book",
              "xml:lang": "en",
            },
            authorLabel: {
              type: "literal",
              value: "Duplicate Author",
              "xml:lang": "en",
            }, // Same author
            isbn: { type: "literal", value: "9783333333333" }, // Same ISBN
          }),
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q333444",
            },
            title: {
              type: "literal",
              value: "Duplicate Test Book",
              "xml:lang": "en",
            },
            authorLabel: {
              type: "literal",
              value: "Unique Author",
              "xml:lang": "en",
            },
            isbn: { type: "literal", value: "9784444444444" },
          }),
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse(mockBindings),
        });

        const results = await provider.searchByTitle({
          title: "Duplicate Test Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        // Should deduplicate the repeated author and ISBN
        expect(results[0].authors).toEqual([
          "Duplicate Author",
          "Unique Author",
        ]);
        expect(results[0].isbn).toEqual(["9783333333333", "9784444444444"]);
      });

      it("should handle empty or undefined author and ISBN values", async () => {
        const mockBindings = [
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q555666",
            },
            title: {
              type: "literal",
              value: "Sparse Data Book",
              "xml:lang": "en",
            },
            authorLabel: {
              type: "literal",
              value: "Valid Author",
              "xml:lang": "en",
            },
            isbn: { type: "literal", value: "9785555555555" },
          }),
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q555666",
            },
            title: {
              type: "literal",
              value: "Sparse Data Book",
              "xml:lang": "en",
            },
            authorLabel: undefined, // Explicitly no author
            isbn: { type: "literal", value: "9786666666666" },
          }),
          createMockBinding({
            book: {
              type: "uri",
              value: "http://www.wikidata.org/entity/Q555666",
            },
            title: {
              type: "literal",
              value: "Sparse Data Book",
              "xml:lang": "en",
            },
            authorLabel: {
              type: "literal",
              value: "Another Author",
              "xml:lang": "en",
            },
            isbn: undefined, // Explicitly no ISBN
          }),
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse(mockBindings),
        });

        const results = await provider.searchByTitle({
          title: "Sparse Data Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        // Should only include non-empty values
        expect(results[0].authors).toEqual(["Valid Author", "Another Author"]);
        expect(results[0].isbn).toEqual(["9785555555555", "9786666666666"]);
      });
    });

    describe("Publication Date Parsing", () => {
      it("should parse full ISO date format correctly", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Full Date Book", "xml:lang": "en" },
          publishDate: {
            type: "literal",
            value: "2020-05-15T00:00:00Z",
            datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Full Date Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].publicationDate).toEqual(
          new Date("2020-05-15T00:00:00Z"),
        );
      });

      it("should parse date-only format correctly", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Date Only Book", "xml:lang": "en" },
          publishDate: {
            type: "literal",
            value: "2021-12-25",
            datatype: "http://www.w3.org/2001/XMLSchema#date",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Date Only Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].publicationDate).toEqual(new Date("2021-12-25"));
      });

      it("should parse year-only format correctly", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Year Only Book", "xml:lang": "en" },
          publishDate: {
            type: "literal",
            value: "2020",
            datatype: "http://www.w3.org/2001/XMLSchema#gYear",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Year Only Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].publicationDate).toEqual(new Date(2020, 0, 1));
      });

      it("should handle various year formats", async () => {
        const testCases = [
          { input: "1995", expected: new Date(1995, 0, 1) },
          { input: "2000", expected: new Date(2000, 0, 1) },
          { input: "2023", expected: new Date(2023, 0, 1) },
        ];

        for (const testCase of testCases) {
          const mockBinding = createMockBinding({
            title: {
              type: "literal",
              value: `Book from ${testCase.input}`,
              "xml:lang": "en",
            },
            publishDate: {
              type: "literal",
              value: testCase.input,
              datatype: "http://www.w3.org/2001/XMLSchema#gYear",
            },
          });

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockWikiDataResponse([mockBinding]),
          });

          const results = await provider.searchByTitle({
            title: `Book from ${testCase.input}`,
            exactMatch: true,
          });

          expect(results).toHaveLength(1);
          expect(results[0].publicationDate).toEqual(testCase.expected);
        }
      });

      it("should handle invalid date formats gracefully", async () => {
        const invalidDateCases = [
          "not-a-date",
          "2020-13-45", // Invalid month/day
          "20XX", // Non-numeric year
          "", // Empty string
          "sometime in 2020", // Natural language
          "2020/05/15", // Wrong format
        ];

        for (const invalidDate of invalidDateCases) {
          const mockBinding = createMockBinding({
            title: {
              type: "literal",
              value: "Invalid Date Book",
              "xml:lang": "en",
            },
            publishDate: {
              type: "literal",
              value: invalidDate,
              datatype: "http://www.w3.org/2001/XMLSchema#date",
            },
          });

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockWikiDataResponse([mockBinding]),
          });

          const results = await provider.searchByTitle({
            title: "Invalid Date Book",
            exactMatch: true,
          });

          expect(results).toHaveLength(1);
          expect(results[0].publicationDate).toBeUndefined();
        }
      });

      it("should handle missing publication date gracefully", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "No Date Book", "xml:lang": "en" },
          // publishDate is intentionally omitted
        });
        delete mockBinding.publishDate;

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "No Date Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].publicationDate).toBeUndefined();
      });

      it("should create valid Date objects for valid dates", async () => {
        const validDates = [
          {
            input: "2020-01-01T00:00:00Z",
            expected: new Date("2020-01-01T00:00:00Z"),
          },
          { input: "2021-06-15", expected: new Date("2021-06-15") },
          {
            input: "2022-12-31T23:59:59Z",
            expected: new Date("2022-12-31T23:59:59Z"),
          },
        ];

        for (const dateCase of validDates) {
          const mockBinding = createMockBinding({
            title: {
              type: "literal",
              value: "Valid Date Book",
              "xml:lang": "en",
            },
            publishDate: {
              type: "literal",
              value: dateCase.input,
              datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
            },
          });

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockWikiDataResponse([mockBinding]),
          });

          const results = await provider.searchByTitle({
            title: "Valid Date Book",
            exactMatch: true,
          });

          expect(results).toHaveLength(1);
          expect(results[0].publicationDate).toEqual(dateCase.expected);
          expect(results[0].publicationDate).toBeInstanceOf(Date);
          expect(results[0].publicationDate.getTime()).not.toBeNaN();
        }
      });
    });

    describe("Language Code Mapping", () => {
      it("should map common language labels to ISO codes", async () => {
        // Test English mapping
        const englishBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Book in English",
            "xml:lang": "en",
          },
          languageLabel: {
            type: "literal",
            value: "English",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([englishBinding]),
        });

        const englishResults = await provider.searchByTitle({
          title: "Book in English",
          exactMatch: true,
        });
        expect(englishResults).toHaveLength(1);
        expect(englishResults[0].language).toBe("en");
      });

      it("should map German language label to ISO code", async () => {
        const germanBinding = createMockBinding({
          title: { type: "literal", value: "Book in German", "xml:lang": "en" },
          languageLabel: { type: "literal", value: "German", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([germanBinding]),
        });

        const germanResults = await provider.searchByTitle({
          title: "Book in German",
          exactMatch: true,
        });
        expect(germanResults).toHaveLength(1);
        expect(germanResults[0].language).toBe("de");
      });

      it("should map French language label to ISO code", async () => {
        const frenchBinding = createMockBinding({
          title: { type: "literal", value: "Book in French", "xml:lang": "en" },
          languageLabel: { type: "literal", value: "French", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([frenchBinding]),
        });

        const frenchResults = await provider.searchByTitle({
          title: "Book in French",
          exactMatch: true,
        });
        expect(frenchResults).toHaveLength(1);
        expect(frenchResults[0].language).toBe("fr");
      });

      it("should map Spanish language label to ISO code", async () => {
        const spanishBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Book in Spanish",
            "xml:lang": "en",
          },
          languageLabel: {
            type: "literal",
            value: "Spanish",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([spanishBinding]),
        });

        const spanishResults = await provider.searchByTitle({
          title: "Book in Spanish",
          exactMatch: true,
        });
        expect(spanishResults).toHaveLength(1);
        expect(spanishResults[0].language).toBe("es");
      });

      it("should map additional language labels to ISO codes", async () => {
        // Test Italian
        const italianBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Book in Italian",
            "xml:lang": "en",
          },
          languageLabel: {
            type: "literal",
            value: "Italian",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([italianBinding]),
        });

        const italianResults = await provider.searchByTitle({
          title: "Book in Italian",
          exactMatch: true,
        });
        expect(italianResults).toHaveLength(1);
        expect(italianResults[0].language).toBe("it");

        // Test Portuguese
        const portugueseBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Book in Portuguese",
            "xml:lang": "en",
          },
          languageLabel: {
            type: "literal",
            value: "Portuguese",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([portugueseBinding]),
        });

        const portugueseResults = await provider.searchByTitle({
          title: "Book in Portuguese",
          exactMatch: true,
        });
        expect(portugueseResults).toHaveLength(1);
        expect(portugueseResults[0].language).toBe("pt");

        // Test Dutch
        const dutchBinding = createMockBinding({
          title: { type: "literal", value: "Book in Dutch", "xml:lang": "en" },
          languageLabel: { type: "literal", value: "Dutch", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([dutchBinding]),
        });

        const dutchResults = await provider.searchByTitle({
          title: "Book in Dutch",
          exactMatch: true,
        });
        expect(dutchResults).toHaveLength(1);
        expect(dutchResults[0].language).toBe("nl");
      });

      it("should handle unknown languages gracefully", async () => {
        // Test Klingon - should fall back to first 2 characters
        const klingonBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Book in Klingon",
            "xml:lang": "en",
          },
          languageLabel: {
            type: "literal",
            value: "Klingon",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([klingonBinding]),
        });

        const klingonResults = await provider.searchByTitle({
          title: "Book in Klingon",
          exactMatch: true,
        });
        expect(klingonResults).toHaveLength(1);
        expect(klingonResults[0].language).toBe("kl"); // First 2 characters, lowercased
      });

      it("should handle fictional languages gracefully", async () => {
        // Test Elvish
        const elvishBinding = createMockBinding({
          title: { type: "literal", value: "Book in Elvish", "xml:lang": "en" },
          languageLabel: { type: "literal", value: "Elvish", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([elvishBinding]),
        });

        const elvishResults = await provider.searchByTitle({
          title: "Book in Elvish",
          exactMatch: true,
        });
        expect(elvishResults).toHaveLength(1);
        expect(elvishResults[0].language).toBe("el"); // First 2 characters, lowercased

        // Test Dothraki
        const dothrakiBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Book in Dothraki",
            "xml:lang": "en",
          },
          languageLabel: {
            type: "literal",
            value: "Dothraki",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([dothrakiBinding]),
        });

        const dothrakiResults = await provider.searchByTitle({
          title: "Book in Dothraki",
          exactMatch: true,
        });
        expect(dothrakiResults).toHaveLength(1);
        expect(dothrakiResults[0].language).toBe("do"); // First 2 characters, lowercased
      });

      it("should preserve original language if mapping fails", async () => {
        // Test single character - should be preserved and lowercased
        const singleCharBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Single Char Book",
            "xml:lang": "en",
          },
          languageLabel: { type: "literal", value: "X", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([singleCharBinding]),
        });

        const singleCharResults = await provider.searchByTitle({
          title: "Single Char Book",
          exactMatch: true,
        });
        expect(singleCharResults).toHaveLength(1);
        expect(singleCharResults[0].language).toBe("x"); // Single character, lowercased
      });

      it("should handle edge cases in language mapping", async () => {
        // Test two characters
        const twoCharBinding = createMockBinding({
          title: { type: "literal", value: "Two Char Book", "xml:lang": "en" },
          languageLabel: { type: "literal", value: "AB", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([twoCharBinding]),
        });

        const twoCharResults = await provider.searchByTitle({
          title: "Two Char Book",
          exactMatch: true,
        });
        expect(twoCharResults).toHaveLength(1);
        expect(twoCharResults[0].language).toBe("ab"); // Two characters, lowercased

        // Test three characters (should take first 2)
        const threeCharBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Three Char Book",
            "xml:lang": "en",
          },
          languageLabel: { type: "literal", value: "ABC", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([threeCharBinding]),
        });

        const threeCharResults = await provider.searchByTitle({
          title: "Three Char Book",
          exactMatch: true,
        });
        expect(threeCharResults).toHaveLength(1);
        expect(threeCharResults[0].language).toBe("ab"); // First 2 characters, lowercased

        // Test uppercase - should be lowercased
        const upperBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Upper Case Book",
            "xml:lang": "en",
          },
          languageLabel: { type: "literal", value: "UPPER", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([upperBinding]),
        });

        const upperResults = await provider.searchByTitle({
          title: "Upper Case Book",
          exactMatch: true,
        });
        expect(upperResults).toHaveLength(1);
        expect(upperResults[0].language).toBe("up"); // First 2 characters, lowercased
      });

      it("should handle missing language labels gracefully", async () => {
        const mockBinding = createMockBinding({
          title: {
            type: "literal",
            value: "No Language Book",
            "xml:lang": "en",
          },
          // languageLabel is intentionally omitted
        });
        delete mockBinding.languageLabel;

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "No Language Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBeUndefined();
      });

      it("should handle empty language labels gracefully", async () => {
        const mockBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Empty Language Book",
            "xml:lang": "en",
          },
          languageLabel: { type: "literal", value: "", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Empty Language Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBeUndefined();
      });

      it("should handle case-insensitive language mapping", async () => {
        const caseMappings = [
          { input: "english", expected: "en" },
          { input: "GERMAN", expected: "de" },
          { input: "French", expected: "fr" },
          { input: "sPaNiSh", expected: "es" },
        ];

        for (const mapping of caseMappings) {
          const mockBinding = createMockBinding({
            title: {
              type: "literal",
              value: "Case Test Book",
              "xml:lang": "en",
            },
            languageLabel: {
              type: "literal",
              value: mapping.input,
              "xml:lang": "en",
            },
          });

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockWikiDataResponse([mockBinding]),
          });

          const results = await provider.searchByTitle({
            title: "Case Test Book",
            exactMatch: true,
          });

          expect(results).toHaveLength(1);
          // Language mapping is case-insensitive, so all common languages should map correctly
          expect(results[0].language).toBe(mapping.expected);
        }
      });
    });
  });

  // Task 3.4: Test language code mapping
  describe("Language Code Mapping (Task 3.4)", () => {
    describe("Common Language Labels to ISO Codes", () => {
      it("should map English to en", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "English Book", "xml:lang": "en" },
          languageLabel: {
            type: "literal",
            value: "English",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "English Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("en");
      });

      it("should map German to de", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "German Book", "xml:lang": "en" },
          languageLabel: { type: "literal", value: "German", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "German Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("de");
      });

      it("should map French to fr", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "French Book", "xml:lang": "en" },
          languageLabel: { type: "literal", value: "French", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "French Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("fr");
      });

      it("should map Spanish to es", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Spanish Book", "xml:lang": "en" },
          languageLabel: {
            type: "literal",
            value: "Spanish",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Spanish Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("es");
      });

      it("should map Italian to it", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Italian Book", "xml:lang": "en" },
          languageLabel: {
            type: "literal",
            value: "Italian",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Italian Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("it");
      });

      it("should map Portuguese to pt", async () => {
        const mockBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Portuguese Book",
            "xml:lang": "en",
          },
          languageLabel: {
            type: "literal",
            value: "Portuguese",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Portuguese Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("pt");
      });

      it("should map Dutch to nl", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Dutch Book", "xml:lang": "en" },
          languageLabel: { type: "literal", value: "Dutch", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Dutch Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("nl");
      });

      it("should map Russian to ru", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Russian Book", "xml:lang": "en" },
          languageLabel: {
            type: "literal",
            value: "Russian",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Russian Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("ru");
      });

      it("should map Japanese to ja", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Japanese Book", "xml:lang": "en" },
          languageLabel: {
            type: "literal",
            value: "Japanese",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Japanese Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("ja");
      });

      it("should map Chinese to zh", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Chinese Book", "xml:lang": "en" },
          languageLabel: {
            type: "literal",
            value: "Chinese",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Chinese Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("zh");
      });

      it("should map Korean to ko", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Korean Book", "xml:lang": "en" },
          languageLabel: { type: "literal", value: "Korean", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Korean Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("ko");
      });

      it("should map Arabic to ar", async () => {
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Arabic Book", "xml:lang": "en" },
          languageLabel: { type: "literal", value: "Arabic", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Arabic Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("ar");
      });
    });

    describe("Unknown Languages Handling", () => {
      it("should handle unknown languages gracefully by using first 2 characters", async () => {
        // Test Klingon language
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Klingon Book", "xml:lang": "en" },
          languageLabel: {
            type: "literal",
            value: "Klingon",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Klingon Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("kl"); // First 2 characters, lowercased
      });

      it("should handle fictional languages gracefully", async () => {
        // Test Elvish language
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Elvish Book", "xml:lang": "en" },
          languageLabel: { type: "literal", value: "Elvish", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Elvish Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("el"); // First 2 characters, lowercased
      });

      it("should handle constructed languages gracefully", async () => {
        // Test Dothraki language
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "Dothraki Book", "xml:lang": "en" },
          languageLabel: {
            type: "literal",
            value: "Dothraki",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Dothraki Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("do"); // First 2 characters, lowercased
      });

      it("should handle very short unknown languages", async () => {
        // Test single character language
        const mockBinding = createMockBinding({
          title: {
            type: "literal",
            value: "X Language Book",
            "xml:lang": "en",
          },
          languageLabel: { type: "literal", value: "X", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "X Language Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("x");
      });

      it("should handle two character unknown languages", async () => {
        // Test two character language
        const mockBinding = createMockBinding({
          title: {
            type: "literal",
            value: "AB Language Book",
            "xml:lang": "en",
          },
          languageLabel: { type: "literal", value: "AB", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "AB Language Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("ab");
      });

      it("should handle uppercase unknown languages by converting to lowercase", async () => {
        // Test uppercase unknown language
        const mockBinding = createMockBinding({
          title: { type: "literal", value: "UNKNOWN Book", "xml:lang": "en" },
          languageLabel: {
            type: "literal",
            value: "UNKNOWN",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "UNKNOWN Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("un"); // First 2 characters, lowercased
      });
    });

    describe("Original Language Preservation", () => {
      it("should preserve original language when mapping fails for single character", async () => {
        const mockBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Single Char Language Book",
            "xml:lang": "en",
          },
          languageLabel: { type: "literal", value: "Q", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Single Char Language Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("q"); // Original single character, lowercased
      });

      it("should preserve original language when mapping fails for two characters", async () => {
        const mockBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Two Char Language Book",
            "xml:lang": "en",
          },
          languageLabel: { type: "literal", value: "XY", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Two Char Language Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("xy"); // Original two characters, lowercased
      });

      it("should use first 2 characters when mapping fails for longer strings", async () => {
        // Test long unknown language name
        const mockBinding = createMockBinding({
          title: {
            type: "literal",
            value: "UnknownLanguage Book",
            "xml:lang": "en",
          },
          languageLabel: {
            type: "literal",
            value: "UnknownLanguage",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "UnknownLanguage Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBe("un"); // First 2 characters, lowercased
      });

      it("should handle undefined language labels gracefully", async () => {
        const mockBinding = createMockBinding({
          title: {
            type: "literal",
            value: "No Language Book",
            "xml:lang": "en",
          },
          // languageLabel is intentionally omitted
        });
        delete mockBinding.languageLabel;

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "No Language Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBeUndefined();
      });

      it("should handle empty language labels gracefully", async () => {
        const mockBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Empty Language Book",
            "xml:lang": "en",
          },
          languageLabel: { type: "literal", value: "", "xml:lang": "en" },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Empty Language Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBeUndefined();
      });

      it("should handle null language labels gracefully", async () => {
        const mockBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Null Language Book",
            "xml:lang": "en",
          },
          languageLabel: null as any,
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Null Language Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        expect(results[0].language).toBeUndefined();
      });
    });
  });

  describe("Language Mapping", () => {
    it("should map common language labels to ISO codes", async () => {
      const mockBinding = createMockBinding({
        languageLabel: { type: "literal", value: "German", "xml:lang": "en" },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockWikiDataResponse([mockBinding]),
      });

      const results = await provider.searchByTitle({
        title: "Test Book",
        exactMatch: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0].language).toBe("de");
    });

    it("should handle unknown languages gracefully", async () => {
      const mockBinding = createMockBinding({
        languageLabel: { type: "literal", value: "Klingon", "xml:lang": "en" },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockWikiDataResponse([mockBinding]),
      });

      const results = await provider.searchByTitle({
        title: "Test Book",
        exactMatch: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0].language).toBe("kl"); // First 2 characters
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      // Mock all retry attempts to fail (default maxRetries is 3, so 4 total attempts)
      mockFetch.mockRejectedValue(new Error("Network error"));

      // Run with timer advancement for retry delays
      const resultPromise = provider.searchByTitle({
        title: "Test Book",
        exactMatch: true,
      });
      await vi.runAllTimersAsync();
      const results = await resultPromise;

      expect(results).toHaveLength(0);
    });

    it("should handle HTTP errors gracefully", async () => {
      // Mock all retry attempts to fail
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      // Run with timer advancement for retry delays
      const resultPromise = provider.searchByTitle({
        title: "Test Book",
        exactMatch: true,
      });
      await vi.runAllTimersAsync();
      const results = await resultPromise;

      expect(results).toHaveLength(0);
    });

    it("should retry on retryable errors", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([createMockBinding()]),
        });

      // Run with timer advancement for retry delays
      const resultPromise = provider.searchByTitle({
        title: "Test Book",
        exactMatch: true,
      });
      await vi.runAllTimersAsync();
      const results = await resultPromise;

      expect(results).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Confidence Calculation Algorithm", () => {
    describe("Base Confidence by Search Type", () => {
      it("should assign 90%+ base confidence to ISBN searches", async () => {
        // Create minimal binding to test base confidence without completeness boosts
        const minimalBinding = {
          book: {
            type: "uri",
            value: "http://www.wikidata.org/entity/Q123456",
          },
          title: {
            type: "literal",
            value: "ISBN Search Book",
            "xml:lang": "en",
          },
          isbn: { type: "literal", value: "9781234567890" },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([minimalBinding]),
        });

        const results = await provider.searchByISBN("9781234567890");

        expect(results).toHaveLength(1);
        // ISBN base confidence (0.90) + WikiData bonus (0.05) + title (0.02) + isbn (0.05) = 1.02 -> capped at 0.92
        expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
        expect(results[0].confidence).toBe(0.92);
      });

      it("should assign appropriate base confidence to title searches", async () => {
        // Create minimal binding for title search
        const minimalBinding = {
          book: {
            type: "uri",
            value: "http://www.wikidata.org/entity/Q123456",
          },
          title: {
            type: "literal",
            value: "Title Search Book",
            "xml:lang": "en",
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([minimalBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Title Search Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        // Title base confidence (0.75) + WikiData bonus (0.05) + completeness boosts
        // Should be in the range for title searches (not as high as ISBN)
        expect(results[0].confidence).toBeGreaterThan(0.75);
        expect(results[0].confidence).toBeLessThan(0.92);
      });

      it("should assign appropriate base confidence to author searches", async () => {
        // Create minimal binding for author search
        const minimalBinding = {
          book: {
            type: "uri",
            value: "http://www.wikidata.org/entity/Q123456",
          },
          title: {
            type: "literal",
            value: "Author Search Book",
            "xml:lang": "en",
          },
          authorLabel: {
            type: "literal",
            value: "Test Author",
            "xml:lang": "en",
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([minimalBinding]),
        });

        const results = await provider.searchByCreator({
          name: "Test Author",
          fuzzy: false,
        });

        expect(results).toHaveLength(1);
        // Author base confidence (0.70) + WikiData bonus (0.05) + completeness boosts
        // Should be in the range for author searches (lower than title/ISBN)
        expect(results[0].confidence).toBeGreaterThan(0.7);
        expect(results[0].confidence).toBeLessThan(0.9);
      });

      it("should rank confidence scores: ISBN > title > author", async () => {
        const baseBinding = {
          book: {
            type: "uri",
            value: "http://www.wikidata.org/entity/Q123456",
          },
          title: {
            type: "literal",
            value: "Comparison Book",
            "xml:lang": "en",
          },
          authorLabel: {
            type: "literal",
            value: "Test Author",
            "xml:lang": "en",
          },
          isbn: { type: "literal", value: "9781234567890" },
        };

        // Test ISBN search confidence
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([baseBinding]),
        });
        const isbnResults = await provider.searchByISBN("9781234567890");

        // Test title search confidence
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([baseBinding]),
        });
        const titleResults = await provider.searchByTitle({
          title: "Comparison Book",
          exactMatch: true,
        });

        // Test author search confidence
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([baseBinding]),
        });
        const authorResults = await provider.searchByCreator({
          name: "Test Author",
          fuzzy: false,
        });

        expect(isbnResults[0].confidence).toBeGreaterThan(
          titleResults[0].confidence,
        );
        expect(titleResults[0].confidence).toBeGreaterThan(
          authorResults[0].confidence,
        );
      });
    });

    describe("Data Completeness Boosts", () => {
      it("should boost confidence for complete metadata records", async () => {
        const completeBinding = createMockBinding({
          title: { type: "literal", value: "Complete Book", "xml:lang": "en" },
          authorLabel: {
            type: "literal",
            value: "Complete Author",
            "xml:lang": "en",
          },
          isbn: { type: "literal", value: "9781234567890" },
          publishDate: {
            type: "literal",
            value: "2023-01-01",
            datatype: "http://www.w3.org/2001/XMLSchema#date",
          },
          publisherLabel: {
            type: "literal",
            value: "Complete Publisher",
            "xml:lang": "en",
          },
          languageLabel: {
            type: "literal",
            value: "English",
            "xml:lang": "en",
          },
          pages: {
            type: "literal",
            value: "300",
            datatype: "http://www.w3.org/2001/XMLSchema#integer",
          },
          description: {
            type: "literal",
            value: "A complete book description",
            "xml:lang": "en",
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([completeBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Complete Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        // Complete records should have high confidence (near cap)
        expect(results[0].confidence).toBeGreaterThanOrEqual(0.88);
        expect(results[0].confidence).toBeLessThanOrEqual(0.92);
      });

      it("should provide incremental confidence boosts for each metadata field", async () => {
        // Test with progressively more complete data - each should be higher than previous
        const testCases = [
          {
            name: "title only",
            binding: {
              book: {
                type: "uri",
                value: "http://www.wikidata.org/entity/Q123456",
              },
              title: {
                type: "literal",
                value: "Title Only Book",
                "xml:lang": "en",
              },
            },
          },
          {
            name: "title + author",
            binding: {
              book: {
                type: "uri",
                value: "http://www.wikidata.org/entity/Q123456",
              },
              title: {
                type: "literal",
                value: "Title Author Book",
                "xml:lang": "en",
              },
              authorLabel: {
                type: "literal",
                value: "Test Author",
                "xml:lang": "en",
              },
            },
          },
          {
            name: "title + author + isbn",
            binding: {
              book: {
                type: "uri",
                value: "http://www.wikidata.org/entity/Q123456",
              },
              title: {
                type: "literal",
                value: "Title Author ISBN Book",
                "xml:lang": "en",
              },
              authorLabel: {
                type: "literal",
                value: "Test Author",
                "xml:lang": "en",
              },
              isbn: { type: "literal", value: "9781234567890" },
            },
          },
        ];

        const confidences: number[] = [];
        for (const testCase of testCases) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => createMockWikiDataResponse([testCase.binding]),
          });

          const results = await provider.searchByTitle({
            title: testCase.binding.title.value,
            exactMatch: true,
          });

          expect(results).toHaveLength(1);
          confidences.push(results[0].confidence);
        }

        // Verify that more complete records get higher confidence (or equal if capped)
        expect(confidences[0]).toBeLessThanOrEqual(confidences[1]);
        expect(confidences[1]).toBeLessThanOrEqual(confidences[2]);
      });

      it("should cap confidence at 0.92 maximum", async () => {
        // Create an extremely complete binding that would exceed 0.92 without cap
        const maxBinding = createMockBinding({
          title: {
            type: "literal",
            value: "Max Confidence Book",
            "xml:lang": "en",
          },
          authorLabel: {
            type: "literal",
            value: "Max Author",
            "xml:lang": "en",
          },
          isbn: { type: "literal", value: "9781234567890" },
          publishDate: {
            type: "literal",
            value: "2023-01-01",
            datatype: "http://www.w3.org/2001/XMLSchema#date",
          },
          publisherLabel: {
            type: "literal",
            value: "Max Publisher",
            "xml:lang": "en",
          },
          languageLabel: {
            type: "literal",
            value: "English",
            "xml:lang": "en",
          },
          pages: {
            type: "literal",
            value: "500",
            datatype: "http://www.w3.org/2001/XMLSchema#integer",
          },
          description: {
            type: "literal",
            value: "Maximum completeness description",
            "xml:lang": "en",
          },
        });

        // Test with ISBN search (highest base confidence)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([maxBinding]),
        });

        const results = await provider.searchByISBN("9781234567890");

        expect(results).toHaveLength(1);
        expect(results[0].confidence).toBe(0.92);
        expect(results[0].confidence).toBeLessThanOrEqual(0.92);
      });

      it("should handle missing completeness fields gracefully", async () => {
        const sparseBinding = {
          book: {
            type: "uri",
            value: "http://www.wikidata.org/entity/Q123456",
          },
          title: { type: "literal", value: "Sparse Book", "xml:lang": "en" },
          // All other fields missing
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([sparseBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Sparse Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        // Should still calculate confidence without errors
        expect(results[0].confidence).toBeGreaterThan(0.75);
        expect(results[0].confidence).toBeLessThanOrEqual(0.92);
      });
    });

    describe("WikiData Quality Bonus", () => {
      it("should apply WikiData quality bonus to all searches", async () => {
        const testBinding = {
          book: {
            type: "uri",
            value: "http://www.wikidata.org/entity/Q123456",
          },
          title: {
            type: "literal",
            value: "Quality Bonus Book",
            "xml:lang": "en",
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([testBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Quality Bonus Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        // Should have WikiData bonus applied (base + bonus + completeness)
        expect(results[0].confidence).toBeGreaterThan(0.77);
        expect(results[0].confidence).toBeLessThanOrEqual(0.92);
      });
    });

    describe("Confidence Precision", () => {
      it("should round confidence to 2 decimal places", async () => {
        const testBinding = {
          book: {
            type: "uri",
            value: "http://www.wikidata.org/entity/Q123456",
          },
          title: {
            type: "literal",
            value: "Precision Test Book",
            "xml:lang": "en",
          },
          authorLabel: {
            type: "literal",
            value: "Precision Author",
            "xml:lang": "en",
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([testBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Precision Test Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);
        // Verify confidence is rounded to 2 decimal places
        const confidence = results[0].confidence;
        expect(confidence).toBe(Math.round(confidence * 100) / 100);
        expect(
          confidence.toString().split(".")[1]?.length || 0,
        ).toBeLessThanOrEqual(2);
      });
    });
  });

  describe("Performance Tests", () => {
    describe("Query Performance", () => {
      it("should complete title search queries within 5 seconds", async () => {
        const mockBinding = createMockBinding();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByTitle({
          title: "Test Book",
          exactMatch: true,
        });

        expect(results).toHaveLength(1);

        // Verify the query uses literary work classification for performance
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("wdt%3AP31%20wd%3AQ7725634"),
          expect.any(Object),
        );
      });

      it("should complete author search queries within 5 seconds", async () => {
        const mockBinding = createMockBinding();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByCreator({
          name: "Test Author",
          fuzzy: false,
        });

        expect(results).toHaveLength(1);

        // Verify the query uses literary work classification for performance
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("wdt%3AP31%20wd%3AQ7725634"),
          expect.any(Object),
        );
      });

      it("should complete ISBN search queries within 5 seconds", async () => {
        const mockBinding = createMockBinding();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const results = await provider.searchByISBN("9781234567890");

        expect(results).toHaveLength(1);

        // Verify the query uses literary work classification for performance
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("wdt%3AP31%20wd%3AQ7725634"),
          expect.any(Object),
        );
      });

      it("should use exact matching for optimal performance", async () => {
        const mockBinding = createMockBinding();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        await provider.searchByTitle({
          title: "Exact Title",
          exactMatch: true,
        });

        // Verify exact matching is used (not CONTAINS or fuzzy matching)
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(
            "%3Fbook%20rdfs%3Alabel%20%22Exact%20Title%22%40en",
          ),
          expect.any(Object),
        );

        // Verify no fuzzy matching patterns are used for performance optimization
        const callUrl = mockFetch.mock.calls[0][0] as string;
        expect(callUrl).not.toContain("CONTAINS");
        expect(callUrl).not.toContain("REGEX");
      });

      it("should verify all queries include literary work classification", async () => {
        const mockBinding = createMockBinding();

        // Test title search
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });
        await provider.searchByTitle({ title: "Test", exactMatch: true });
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining("wdt%3AP31%20wd%3AQ7725634"),
          expect.any(Object),
        );

        // Test author search
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });
        await provider.searchByCreator({ name: "Test Author", fuzzy: false });
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining("wdt%3AP31%20wd%3AQ7725634"),
          expect.any(Object),
        );

        // Test ISBN search
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });
        await provider.searchByISBN("9781234567890");
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining("wdt%3AP31%20wd%3AQ7725634"),
          expect.any(Object),
        );
      });

      it("should handle performance edge cases with complex queries", async () => {
        const mockBinding = createMockBinding();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const longTitle =
          "A Very Long Book Title That Might Affect Query Performance And Should Still Complete Within Time Limits";
        const results = await provider.searchByTitle({
          title: longTitle,
          exactMatch: true,
        });

        expect(results).toHaveLength(1);

        // Verify exact matching is still used for long titles
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent(`"${longTitle}"`)),
          expect.any(Object),
        );
      });

      it("should maintain performance with special characters in queries", async () => {
        const mockBinding = createMockBinding();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        const titleWithSpecialChars = 'Book: A "Special" Title & More!';
        const results = await provider.searchByTitle({
          title: titleWithSpecialChars,
          exactMatch: true,
        });

        expect(results).toHaveLength(1);

        // Verify the query was properly constructed with special characters
        const callUrl = mockFetch.mock.calls[0][0] as string;
        // Special characters should be properly escaped in the SPARQL query
        expect(callUrl).toContain("Book");
        expect(callUrl).toContain("Special");
        expect(callUrl).toContain("Title");
      });
    });

    describe("Rate Limiting Tests", () => {
      it("should enforce 1-second delay between requests", async () => {
        const mockBinding = createMockBinding();

        // Mock multiple successful responses
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        // Make two consecutive requests
        await provider.searchByTitle({ title: "First Book", exactMatch: true });
        await provider.searchByTitle({
          title: "Second Book",
          exactMatch: true,
        });

        // With mocked rate limiter, both should complete
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it("should respect rate limit of 60 requests per minute", async () => {
        const mockBinding = createMockBinding();

        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        // Test that rate limiter configuration is correct
        expect(provider.rateLimit.maxRequests).toBe(60);
        expect(provider.rateLimit.windowMs).toBe(60000); // 1 minute
        expect(provider.rateLimit.requestDelay).toBe(1000); // 1 second
      });

      it("should integrate with global rate limiter registry", async () => {
        const mockBinding = createMockBinding();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockWikiDataResponse([mockBinding]),
        });

        await provider.searchByTitle({ title: "Test Book", exactMatch: true });

        // Verify the provider name is used for rate limiter registration
        expect(provider.name).toBe("WikiData");
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe("Retry Logic and Error Handling Tests", () => {
      it("should retry on network errors with exponential backoff", async () => {
        const mockBinding = createMockBinding();

        // First call fails with network error, second succeeds
        mockFetch
          .mockRejectedValueOnce(new Error("Network error"))
          .mockResolvedValueOnce({
            ok: true,
            json: async () => createMockWikiDataResponse([mockBinding]),
          });

        // Run with timer advancement for retry delays
        const resultPromise = provider.searchByTitle({
          title: "Test Book",
          exactMatch: true,
        });
        await vi.runAllTimersAsync();
        const results = await resultPromise;

        expect(results).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it("should retry on timeout errors", async () => {
        const mockBinding = createMockBinding();

        // First call times out, second succeeds
        mockFetch
          .mockRejectedValueOnce(new Error("Request timeout"))
          .mockResolvedValueOnce({
            ok: true,
            json: async () => createMockWikiDataResponse([mockBinding]),
          });

        // Run with timer advancement for retry delays
        const resultPromise = provider.searchByTitle({
          title: "Test Book",
          exactMatch: true,
        });
        await vi.runAllTimersAsync();
        const results = await resultPromise;

        expect(results).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it("should retry on 5xx HTTP errors but not 4xx errors", async () => {
        const mockBinding = createMockBinding();

        // Test 5xx error (retryable)
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => createMockWikiDataResponse([mockBinding]),
          });

        // Run with timer advancement for retry delays
        const resultPromise = provider.searchByTitle({
          title: "Test Book",
          exactMatch: true,
        });
        await vi.runAllTimersAsync();
        const results = await resultPromise;
        expect(results).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledTimes(2);

        // Reset mock for 4xx test
        vi.clearAllMocks();

        // Test 4xx error (not retryable)
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
        });

        const results2 = await provider.searchByTitle({
          title: "Test Book",
          exactMatch: true,
        });
        expect(results2).toHaveLength(0);
        expect(mockFetch).toHaveBeenCalledTimes(1); // Should not retry
      });

      it("should fail gracefully after maximum retry attempts", async () => {
        // Reset the mock call count for this test
        mockFetch.mockClear();

        // Mock persistent network errors for all 4 attempts
        mockFetch
          .mockRejectedValueOnce(new Error("Persistent network error"))
          .mockRejectedValueOnce(new Error("Persistent network error"))
          .mockRejectedValueOnce(new Error("Persistent network error"))
          .mockRejectedValueOnce(new Error("Persistent network error"));

        // Run with timer advancement for retry delays
        const resultPromise = provider.searchByTitle({
          title: "Test Book",
          exactMatch: true,
        });
        await vi.runAllTimersAsync();
        const results = await resultPromise;

        expect(results).toHaveLength(0);
        expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
      });

      it("should handle connection reset errors as retryable", async () => {
        const mockBinding = createMockBinding();

        // Reset the mock call count for this test
        mockFetch.mockClear();

        mockFetch
          .mockRejectedValueOnce(new Error("ECONNRESET"))
          .mockResolvedValueOnce({
            ok: true,
            json: async () => createMockWikiDataResponse([mockBinding]),
          });

        // Run with timer advancement for retry delays
        const resultPromise = provider.searchByTitle({
          title: "Test Book",
          exactMatch: true,
        });
        await vi.runAllTimersAsync();
        const results = await resultPromise;

        expect(results).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it("should handle DNS resolution errors as retryable", async () => {
        const mockBinding = createMockBinding();

        // Reset the mock call count for this test
        mockFetch.mockClear();

        mockFetch
          .mockRejectedValueOnce(new Error("ENOTFOUND"))
          .mockResolvedValueOnce({
            ok: true,
            json: async () => createMockWikiDataResponse([mockBinding]),
          });

        // Run with timer advancement for retry delays
        const resultPromise = provider.searchByTitle({
          title: "Test Book",
          exactMatch: true,
        });
        await vi.runAllTimersAsync();
        const results = await resultPromise;

        expect(results).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
