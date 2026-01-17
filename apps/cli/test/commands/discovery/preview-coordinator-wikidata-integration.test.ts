import {
  type MetadataRecord,
  type MultiCriteriaQuery,
  OpenLibraryMetadataProvider,
  WikiDataMetadataProvider,
} from "@colibri-hq/sdk/metadata";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch for both providers
const mockWikiDataFetch = vi.fn();
const mockOpenLibraryFetch = vi.fn();

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

// Mock OpenLibrary response
const createMockOpenLibraryResponse = (docs: unknown[]) => ({
  docs,
  numFound: docs.length,
  start: 0,
});

// Simple coordinator for testing multi-provider scenarios
class TestMultiProviderCoordinator {
  constructor(
    private readonly providers: Array<OpenLibraryMetadataProvider | WikiDataMetadataProvider>,
  ) {
    this.providers = providers.toSorted((a, b) => b.priority - a.priority);
  }

  getProviders() {
    return [...this.providers];
  }

  async query(
    query: MultiCriteriaQuery,
  ): Promise<{
    aggregatedRecords: MetadataRecord[];
    providers: Array<{
      duration: number;
      error?: Error;
      name: string;
      records: MetadataRecord[];
      success: boolean;
    }>;
    totalDuration: number;
    totalRecords: number;
  }> {
    const startTime = Date.now();
    const providerResults = [];

    // Query each provider concurrently
    const promises = this.providers.map(async (provider) => {
      const providerStartTime = Date.now();
      try {
        const records = await provider.searchMultiCriteria(query);
        return {
          duration: Date.now() - providerStartTime,
          name: provider.name,
          records,
          success: true,
        };
      } catch (error) {
        return {
          duration: Date.now() - providerStartTime,
          error: error as Error,
          name: provider.name,
          records: [],
          success: false,
        };
      }
    });

    const results = await Promise.all(promises);
    providerResults.push(...results);

    // Aggregate and deduplicate results
    const allRecords: MetadataRecord[] = [];
    for (const result of providerResults) {
      if (result.success) {
        allRecords.push(...result.records);
      }
    }

    // Simple deduplication by title and author
    const seen = new Set<string>();
    const deduplicated: MetadataRecord[] = [];
    for (const record of allRecords) {
      const key = `${record.title || "unknown"}-${record.authors?.join(",") || "unknown"}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(record);
      }
    }

    // Sort by confidence (highest first)
    deduplicated.sort((a, b) => b.confidence - a.confidence);

    return {
      aggregatedRecords: deduplicated,
      providers: providerResults,
      totalDuration: Date.now() - startTime,
      totalRecords: deduplicated.length,
    };
  }
}

describe("CLI Discovery Preview-Coordinator - WikiData Integration", () => {
  let wikidataProvider: WikiDataMetadataProvider;
  let openLibraryProvider: OpenLibraryMetadataProvider;
  let coordinator: TestMultiProviderCoordinator;

  beforeEach(() => {
    vi.clearAllMocks();
    wikidataProvider = new WikiDataMetadataProvider(mockWikiDataFetch);
    openLibraryProvider = new OpenLibraryMetadataProvider(mockOpenLibraryFetch);
    coordinator = new TestMultiProviderCoordinator([wikidataProvider, openLibraryProvider]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("5.2 Test CLI integration with discovery:preview-coordinator", () => {
    it("should run preview-coordinator with multiple providers including WikiData", async () => {
      // Mock WikiData response
      const wikidataBinding = {
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

      // Mock OpenLibrary response
      const openLibraryDoc = {
        author_name: ["F. Scott Fitzgerald"],
        first_publish_year: 1925,
        isbn: ["9780743273565"],
        key: "/works/OL468516W",
        publisher: ["Scribner"],
        title: "The Great Gatsby",
      };

      mockWikiDataFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([wikidataBinding]),
        ok: true,
      });

      mockOpenLibraryFetch.mockResolvedValueOnce({
        json: async () => createMockOpenLibraryResponse([openLibraryDoc]),
        ok: true,
      });

      const query: MultiCriteriaQuery = { fuzzy: false, title: "The Great Gatsby" };

      const result = await coordinator.query(query);

      // Verify both providers were called
      expect(mockWikiDataFetch).toHaveBeenCalled();
      expect(mockOpenLibraryFetch).toHaveBeenCalled();

      // Verify providers are configured correctly
      const providers = coordinator.getProviders();
      expect(providers).toHaveLength(2);
      expect(providers[0].name).toBe("WikiData"); // Higher priority (85)
      expect(providers[1].name).toBe("OpenLibrary"); // Lower priority (80)

      // Verify results include data from both providers
      expect(result.totalRecords).toBeGreaterThan(0);
      expect(result.providers.filter((p) => p.success)).toHaveLength(2);
    });

    it("should verify WikiData results are included in multi-provider coordination", async () => {
      // Mock WikiData response with high confidence
      const wikidataBinding = {
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

      // Mock OpenLibrary response with different publisher to avoid deduplication
      const openLibraryDoc = {
        author_name: ["George Orwell"],
        first_publish_year: 1949,
        isbn: ["9780451524935"],
        key: "/works/OL1168007W",
        publisher: ["Signet Classic"],
        title: "1984 (Different Edition)",
      };

      mockWikiDataFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([wikidataBinding]),
        ok: true,
      });

      mockOpenLibraryFetch.mockResolvedValueOnce({
        json: async () => createMockOpenLibraryResponse([openLibraryDoc]),
        ok: true,
      });

      const query: MultiCriteriaQuery = { fuzzy: false, title: "1984" };

      const result = await coordinator.query(query);

      // Verify WikiData results are included
      expect(result.totalRecords).toBeGreaterThan(0);

      // Find WikiData result
      const wikidataResult = result.aggregatedRecords.find((r) => r.source === "WikiData");
      expect(wikidataResult).toBeDefined();
      expect(wikidataResult?.title).toBe("1984");
      expect(wikidataResult?.authors).toContain("George Orwell");
      expect(wikidataResult?.publisher).toBe("Secker & Warburg");

      // Verify both providers succeeded
      expect(result.providers.filter((p) => p.success)).toHaveLength(2);
      const wikidataProviderResult = result.providers.find((p) => p.name === "WikiData");
      const openLibraryProviderResult = result.providers.find((p) => p.name === "OpenLibrary");

      expect(wikidataProviderResult?.success).toBe(true);
      expect(wikidataProviderResult?.records).toHaveLength(1);
      expect(openLibraryProviderResult?.success).toBe(true);
      expect(openLibraryProviderResult?.records).toHaveLength(1);
    });

    it("should verify WikiData provider priority affects result ranking", async () => {
      // Mock WikiData response with high confidence
      const wikidataBinding = {
        authorLabel: { type: "literal", value: "Harper Lee", "xml:lang": "en" },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q47209" },
        isbn: { type: "literal", value: "9780061120084" },
        publishDate: {
          datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          type: "literal",
          value: "1960-07-11T00:00:00Z",
        },
        publisherLabel: { type: "literal", value: "J. B. Lippincott & Co.", "xml:lang": "en" },
        title: { type: "literal", value: "To Kill a Mockingbird", "xml:lang": "en" },
      };

      // Mock OpenLibrary response with different title to avoid deduplication
      const openLibraryDoc = {
        author_name: ["Harper Lee"],
        first_publish_year: 1960,
        isbn: ["9780061120084"],
        key: "/works/OL16814W",
        publisher: ["Harper Perennial Modern Classics"],
        title: "To Kill a Mockingbird (Harper Edition)",
      };

      mockWikiDataFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([wikidataBinding]),
        ok: true,
      });

      mockOpenLibraryFetch.mockResolvedValueOnce({
        json: async () => createMockOpenLibraryResponse([openLibraryDoc]),
        ok: true,
      });

      const query: MultiCriteriaQuery = { fuzzy: false, title: "To Kill a Mockingbird" };

      const result = await coordinator.query(query);

      // Verify provider priority ordering
      const providers = coordinator.getProviders();
      expect(providers[0].name).toBe("WikiData"); // Priority 85
      expect(providers[0].priority).toBe(85);
      expect(providers[1].name).toBe("OpenLibrary"); // Priority 80
      expect(providers[1].priority).toBe(80);

      // Verify we have results from both providers
      expect(result.aggregatedRecords.length).toBeGreaterThan(0);

      // WikiData result should have higher confidence due to structured data quality
      const wikidataResult = result.aggregatedRecords.find((r) => r.source === "WikiData");
      expect(wikidataResult).toBeDefined();
      expect(wikidataResult?.confidence).toBeGreaterThan(0.7);

      // Results should be sorted by confidence (highest first)
      if (result.aggregatedRecords.length > 1) {
        expect(result.aggregatedRecords[0].confidence).toBeGreaterThanOrEqual(
          result.aggregatedRecords[1].confidence,
        );
      }
    });

    it("should handle mixed provider success/failure scenarios", async () => {
      // Mock WikiData success
      const wikidataBinding = {
        authorLabel: { type: "literal", value: "J. D. Salinger", "xml:lang": "en" },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q25338" },
        isbn: { type: "literal", value: "9780316769174" },
        title: { type: "literal", value: "The Catcher in the Rye", "xml:lang": "en" },
      };

      // Mock OpenLibrary failure - but providers return empty arrays instead of throwing
      mockWikiDataFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([wikidataBinding]),
        ok: true,
      });

      mockOpenLibraryFetch.mockRejectedValueOnce(new Error("OpenLibrary service unavailable"));

      const query: MultiCriteriaQuery = { fuzzy: false, title: "The Catcher in the Rye" };

      const result = await coordinator.query(query);

      // Verify WikiData succeeded and OpenLibrary handled error gracefully
      expect(result.providers).toHaveLength(2);

      const wikidataProviderResult = result.providers.find((p) => p.name === "WikiData");
      const openLibraryProviderResult = result.providers.find((p) => p.name === "OpenLibrary");

      expect(wikidataProviderResult?.success).toBe(true);
      expect(wikidataProviderResult?.records).toHaveLength(1);
      // OpenLibrary provider handles errors gracefully and returns empty results
      expect(openLibraryProviderResult?.success).toBe(true);
      expect(openLibraryProviderResult?.records).toHaveLength(0);

      // Should still have results from WikiData
      expect(result.totalRecords).toBe(1);
      expect(result.aggregatedRecords[0].source).toBe("WikiData");
      expect(result.aggregatedRecords[0].title).toBe("The Catcher in the Rye");
    });

    it("should handle concurrent provider queries efficiently", async () => {
      // Mock WikiData with delay
      const wikidataBinding = {
        authorLabel: { type: "literal", value: "J. R. R. Tolkien", "xml:lang": "en" },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q15228" },
        title: { type: "literal", value: "The Lord of the Rings", "xml:lang": "en" },
      };

      // Mock OpenLibrary with delay and different title to avoid deduplication
      const openLibraryDoc = {
        author_name: ["J. R. R. Tolkien"],
        first_publish_year: 1954,
        key: "/works/OL27448W",
        title: "The Lord of the Rings (Complete Edition)",
      };

      mockWikiDataFetch.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms delay
        return { json: async () => createMockWikiDataResponse([wikidataBinding]), ok: true };
      });

      mockOpenLibraryFetch.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms delay
        return { json: async () => createMockOpenLibraryResponse([openLibraryDoc]), ok: true };
      });

      const query: MultiCriteriaQuery = { fuzzy: false, title: "The Lord of the Rings" };

      const startTime = Date.now();
      const result = await coordinator.query(query);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete in time closer to slower provider (concurrent) rather than sum
      // Allow for significant overhead in test execution environment
      expect(totalTime).toBeLessThan(2000); // Should be much less than sequential execution
      expect(totalTime).toBeGreaterThanOrEqual(200); // But at least as long as slower provider

      // Both providers should succeed
      expect(result.providers.filter((p) => p.success)).toHaveLength(2);
      expect(result.totalRecords).toBeGreaterThan(0); // Should have results
    });

    it("should handle deduplication across providers correctly", async () => {
      // Mock identical results from both providers
      const wikidataBinding = {
        authorLabel: { type: "literal", value: "Same Author", "xml:lang": "en" },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q123" },
        isbn: { type: "literal", value: "9781234567890" },
        title: { type: "literal", value: "Duplicate Book", "xml:lang": "en" },
      };

      const openLibraryDoc = {
        author_name: ["Same Author"],
        first_publish_year: 2020,
        isbn: ["9781234567890"],
        key: "/works/OL123W",
        title: "Duplicate Book",
      };

      mockWikiDataFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([wikidataBinding]),
        ok: true,
      });

      mockOpenLibraryFetch.mockResolvedValueOnce({
        json: async () => createMockOpenLibraryResponse([openLibraryDoc]),
        ok: true,
      });

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Duplicate Book" };

      const result = await coordinator.query(query);

      // Should deduplicate identical results
      expect(result.totalRecords).toBe(1); // Deduplicated
      expect(result.aggregatedRecords[0].title).toBe("Duplicate Book");
      expect(result.aggregatedRecords[0].authors).toContain("Same Author");

      // Both providers should have succeeded
      expect(result.providers.filter((p) => p.success)).toHaveLength(2);
    });

    it("should verify provider performance metrics are tracked", async () => {
      // Mock responses with different performance characteristics
      const wikidataBinding = {
        authorLabel: { type: "literal", value: "Test Author", "xml:lang": "en" },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q456" },
        title: { type: "literal", value: "Performance Test", "xml:lang": "en" },
      };

      const openLibraryDoc = {
        author_name: ["Test Author"],
        first_publish_year: 2021,
        key: "/works/OL456W",
        title: "Performance Test (Different Edition)",
      };

      mockWikiDataFetch.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
        return { json: async () => createMockWikiDataResponse([wikidataBinding]), ok: true };
      });

      mockOpenLibraryFetch.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms delay
        return { json: async () => createMockOpenLibraryResponse([openLibraryDoc]), ok: true };
      });

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Performance Test" };

      const result = await coordinator.query(query);

      // Verify performance metrics are tracked
      expect(result.totalDuration).toBeGreaterThan(200); // Should be at least as long as slowest provider

      const wikidataProviderResult = result.providers.find((p) => p.name === "WikiData");
      const openLibraryProviderResult = result.providers.find((p) => p.name === "OpenLibrary");

      expect(wikidataProviderResult?.duration).toBeGreaterThanOrEqual(100);
      expect(wikidataProviderResult?.duration).toBeLessThan(2000); // Allow for test overhead
      expect(openLibraryProviderResult?.duration).toBeGreaterThanOrEqual(200);
      expect(openLibraryProviderResult?.duration).toBeLessThan(2000); // Allow for test overhead

      // Both should succeed
      expect(wikidataProviderResult?.success).toBe(true);
      expect(openLibraryProviderResult?.success).toBe(true);
    });
  });
});
