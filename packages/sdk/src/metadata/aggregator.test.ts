/**
 * Tests for MetadataAggregator
 *
 * Comprehensive test suite covering:
 * - Basic aggregation functionality
 * - Parallel provider queries
 * - Result deduplication
 * - Consensus calculation
 * - Error handling
 * - Timeout handling
 * - Provider prioritization
 */

import { describe, expect, it, vi } from "vitest";
import type {
  MetadataProvider,
  MetadataRecord,
  MultiCriteriaQuery,
  RateLimitConfig,
  TimeoutConfig,
  TitleQuery,
} from "./providers/provider.js";
import { MetadataAggregator } from "./aggregator.js";
import { MetadataType } from "./providers/provider.js";

/**
 * Mock provider for testing
 */
class MockProvider implements MetadataProvider {
  readonly name: string;
  readonly priority: number;
  readonly rateLimit: RateLimitConfig = { maxRequests: 100, windowMs: 60000, requestDelay: 0 };
  readonly timeout: TimeoutConfig = { requestTimeout: 10000, operationTimeout: 30000 };

  private searchByISBNFn: (isbn: string) => Promise<MetadataRecord[]>;
  private searchByTitleFn: (query: TitleQuery) => Promise<MetadataRecord[]>;
  private searchMultiCriteriaFn: (query: MultiCriteriaQuery) => Promise<MetadataRecord[]>;

  constructor(
    name: string,
    priority: number = 50,
    options: {
      searchByISBN?: (isbn: string) => Promise<MetadataRecord[]>;
      searchByTitle?: (query: TitleQuery) => Promise<MetadataRecord[]>;
      searchMultiCriteria?: (query: MultiCriteriaQuery) => Promise<MetadataRecord[]>;
    } = {},
  ) {
    this.name = name;
    this.priority = priority;
    this.searchByISBNFn = options.searchByISBN ?? this.defaultSearch;
    this.searchByTitleFn = options.searchByTitle ?? this.defaultSearch;
    this.searchMultiCriteriaFn = options.searchMultiCriteria ?? this.defaultSearch;
  }

  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    return this.searchByISBNFn(isbn);
  }

  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    return this.searchByTitleFn(query);
  }

  async searchByCreator(): Promise<MetadataRecord[]> {
    return [];
  }

  async searchMultiCriteria(query: MultiCriteriaQuery): Promise<MetadataRecord[]> {
    return this.searchMultiCriteriaFn(query);
  }

  getReliabilityScore(_dataType: MetadataType): number {
    return 0.8;
  }

  supportsDataType(_dataType: MetadataType): boolean {
    return true;
  }

  private defaultSearch = async (): Promise<MetadataRecord[]> => [];
}

/**
 * Helper to create test metadata records
 */
function createTestRecord(overrides: Partial<MetadataRecord> = {}): MetadataRecord {
  return {
    id: "test-id-" + Math.random(),
    source: "test",
    confidence: 0.8,
    timestamp: new Date(),
    title: "Test Book",
    authors: ["Test Author"],
    isbn: ["9780306406157"], // Valid ISBN-13 for testing
    ...overrides,
  };
}

describe("MetadataAggregator", () => {
  describe("Constructor", () => {
    it("should require at least one provider", () => {
      expect(() => new MetadataAggregator([])).toThrow(
        "MetadataAggregator requires at least one provider",
      );
    });

    it("should accept a single provider", () => {
      const provider = new MockProvider("Test");
      const aggregator = new MetadataAggregator([provider]);
      expect(aggregator.getProviders()).toHaveLength(1);
    });

    it("should accept multiple providers", () => {
      const providers = [
        new MockProvider("Provider1"),
        new MockProvider("Provider2"),
        new MockProvider("Provider3"),
      ];
      const aggregator = new MetadataAggregator(providers);
      expect(aggregator.getProviders()).toHaveLength(3);
    });

    it("should apply default options", () => {
      const provider = new MockProvider("Test");
      const aggregator = new MetadataAggregator([provider]);
      const options = aggregator.getOptions();

      expect(options.timeout).toBe(30000);
      expect(options.minProviders).toBe(1);
      expect(options.deduplicateByIsbn).toBe(true);
      expect(options.calculateConsensus).toBe(true);
      expect(options.enableLogging).toBe(false);
    });

    it("should accept custom options", () => {
      const provider = new MockProvider("Test");
      const aggregator = new MetadataAggregator([provider], {
        timeout: 60000,
        minProviders: 2,
        deduplicateByIsbn: false,
        calculateConsensus: false,
      });
      const options = aggregator.getOptions();

      expect(options.timeout).toBe(60000);
      expect(options.minProviders).toBe(2);
      expect(options.deduplicateByIsbn).toBe(false);
      expect(options.calculateConsensus).toBe(false);
    });
  });

  describe("searchByISBN", () => {
    it("should query all providers in parallel", async () => {
      const record1 = createTestRecord({ source: "Provider1", isbn: ["9780306406157"] });
      const record2 = createTestRecord({ source: "Provider2", isbn: ["9780306406157"] });

      const provider1 = new MockProvider("Provider1", 80, { searchByISBN: async () => [record1] });
      const provider2 = new MockProvider("Provider2", 70, { searchByISBN: async () => [record2] });

      const aggregator = new MetadataAggregator([provider1, provider2]);
      const result = await aggregator.searchByISBN("9780306406157");

      expect(result.providerResults.size).toBe(2);
      expect(result.providerResults.get("Provider1")).toEqual([record1]);
      expect(result.providerResults.get("Provider2")).toEqual([record2]);
    });

    it("should track timing per provider", async () => {
      const provider1 = new MockProvider("Provider1", 80, {
        searchByISBN: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return [createTestRecord()];
        },
      });
      const provider2 = new MockProvider("Provider2", 70, {
        searchByISBN: async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          return [createTestRecord()];
        },
      });

      const aggregator = new MetadataAggregator([provider1, provider2]);
      const result = await aggregator.searchByISBN("9780306406157");

      expect(result.timing.get("Provider1")).toBeGreaterThan(0);
      expect(result.timing.get("Provider2")).toBeGreaterThan(0);
    });

    it("should handle provider errors gracefully", async () => {
      const provider1 = new MockProvider("Provider1", 80, {
        searchByISBN: async () => {
          throw new Error("Provider1 failed");
        },
      });
      const provider2 = new MockProvider("Provider2", 70, {
        searchByISBN: async () => [createTestRecord({ source: "Provider2" })],
      });

      const aggregator = new MetadataAggregator([provider1, provider2]);
      const result = await aggregator.searchByISBN("9780306406157");

      expect(result.errors.size).toBe(1);
      expect(result.errors.get("Provider1")).toBeDefined();
      expect(result.errors.get("Provider1")?.message).toBe("Provider1 failed");
      expect(result.results.length).toBe(1);
    });

    it("should fail if minimum providers requirement not met", async () => {
      const provider1 = new MockProvider("Provider1", 80, {
        searchByISBN: async () => {
          throw new Error("Provider1 failed");
        },
      });
      const provider2 = new MockProvider("Provider2", 70, {
        searchByISBN: async () => {
          throw new Error("Provider2 failed");
        },
      });

      const aggregator = new MetadataAggregator([provider1, provider2], { minProviders: 1 });

      await expect(aggregator.searchByISBN("9780306406157")).rejects.toThrow(
        /Only 0 provider\(s\) responded successfully/,
      );
    });

    it("should deduplicate results by ISBN", async () => {
      const record1 = createTestRecord({
        id: "id1",
        source: "Provider1",
        isbn: ["9780306406157"], // Valid ISBN-13
        title: "Test Book",
        confidence: 0.9,
      });
      const record2 = createTestRecord({
        id: "id2",
        source: "Provider2",
        isbn: ["978-0-306-40615-7"], // Same ISBN with hyphens
        title: "Test Book",
        confidence: 0.8,
      });

      const provider1 = new MockProvider("Provider1", 80, { searchByISBN: async () => [record1] });
      const provider2 = new MockProvider("Provider2", 70, { searchByISBN: async () => [record2] });

      const aggregator = new MetadataAggregator([provider1, provider2]);
      const result = await aggregator.searchByISBN("9780306406157");

      // Should be deduplicated to 1 result
      expect(result.results.length).toBe(1);
      // Should merge results from both providers
      expect(result.results[0].provider).toContain("Provider1");
      expect(result.results[0].provider).toContain("Provider2");
    });

    it("should not deduplicate when option is disabled", async () => {
      const record1 = createTestRecord({ source: "Provider1", isbn: ["9780306406157"] });
      const record2 = createTestRecord({ source: "Provider2", isbn: ["9780306406157"] });

      const provider1 = new MockProvider("Provider1", 80, { searchByISBN: async () => [record1] });
      const provider2 = new MockProvider("Provider2", 70, { searchByISBN: async () => [record2] });

      const aggregator = new MetadataAggregator([provider1, provider2], {
        deduplicateByIsbn: false,
      });
      const result = await aggregator.searchByISBN("9780306406157");

      // Should keep both results
      expect(result.results.length).toBe(2);
    });

    it("should calculate consensus confidence", async () => {
      const record1 = createTestRecord({
        source: "Provider1",
        isbn: ["9780306406157"],
        title: "Test Book",
        authors: ["Author One"],
        confidence: 0.85,
      });
      const record2 = createTestRecord({
        source: "Provider2",
        isbn: ["9780306406157"],
        title: "Test Book",
        authors: ["Author One"],
        confidence: 0.9,
      });

      const provider1 = new MockProvider("Provider1", 80, { searchByISBN: async () => [record1] });
      const provider2 = new MockProvider("Provider2", 70, { searchByISBN: async () => [record2] });

      const aggregator = new MetadataAggregator([provider1, provider2], {
        deduplicateByIsbn: false,
      });
      const result = await aggregator.searchByISBN("9780306406157");

      expect(result.consensus).toBeDefined();
      expect(result.consensus?.confidence).toBeGreaterThan(0);
      expect(result.consensus?.confidence).toBeLessThanOrEqual(1);
      expect(result.consensus?.agreementScore).toBeGreaterThan(0);
      expect(result.consensus?.factors).toBeDefined();
    });

    it("should not calculate consensus when option is disabled", async () => {
      const provider = new MockProvider("Provider1", 80, {
        searchByISBN: async () => [createTestRecord()],
      });

      const aggregator = new MetadataAggregator([provider], { calculateConsensus: false });
      const result = await aggregator.searchByISBN("9780306406157");

      expect(result.consensus).toBeUndefined();
    });
  });

  describe("searchByTitle", () => {
    it("should query all providers with the same query", async () => {
      const record1 = createTestRecord({ source: "Provider1" });
      const record2 = createTestRecord({ source: "Provider2" });

      const spy1 = vi.fn(async () => [record1]);
      const spy2 = vi.fn(async () => [record2]);

      const provider1 = new MockProvider("Provider1", 80, { searchByTitle: spy1 });
      const provider2 = new MockProvider("Provider2", 70, { searchByTitle: spy2 });

      const aggregator = new MetadataAggregator([provider1, provider2]);
      const query: TitleQuery = { title: "Test Book", fuzzy: true };
      await aggregator.searchByTitle(query);

      expect(spy1).toHaveBeenCalledWith(query);
      expect(spy2).toHaveBeenCalledWith(query);
    });

    it("should deduplicate by title when no ISBN available", async () => {
      const record1 = createTestRecord({
        source: "Provider1",
        title: "The Great Gatsby",
        isbn: undefined,
        confidence: 0.9,
      });
      const record2 = createTestRecord({
        source: "Provider2",
        title: "The Great Gatsby",
        isbn: undefined,
        confidence: 0.8,
      });

      const provider1 = new MockProvider("Provider1", 80, { searchByTitle: async () => [record1] });
      const provider2 = new MockProvider("Provider2", 70, { searchByTitle: async () => [record2] });

      const aggregator = new MetadataAggregator([provider1, provider2]);
      const result = await aggregator.searchByTitle({ title: "The Great Gatsby" });

      // Should deduplicate by title
      expect(result.results.length).toBe(1);
    });

    it("should keep results with different titles", async () => {
      const record1 = createTestRecord({ source: "Provider1", title: "Book A", isbn: undefined });
      const record2 = createTestRecord({ source: "Provider2", title: "Book B", isbn: undefined });

      const provider1 = new MockProvider("Provider1", 80, { searchByTitle: async () => [record1] });
      const provider2 = new MockProvider("Provider2", 70, { searchByTitle: async () => [record2] });

      const aggregator = new MetadataAggregator([provider1, provider2]);
      const result = await aggregator.searchByTitle({ title: "Book" });

      expect(result.results.length).toBe(2);
    });
  });

  describe("searchMultiCriteria", () => {
    it("should query all providers with the same criteria", async () => {
      const spy1 = vi.fn(async () => [createTestRecord()]);
      const spy2 = vi.fn(async () => [createTestRecord()]);

      const provider1 = new MockProvider("Provider1", 80, { searchMultiCriteria: spy1 });
      const provider2 = new MockProvider("Provider2", 70, { searchMultiCriteria: spy2 });

      const aggregator = new MetadataAggregator([provider1, provider2]);
      const query: MultiCriteriaQuery = {
        title: "Test Book",
        authors: ["Test Author"],
        isbn: "9780306406157",
      };
      await aggregator.searchMultiCriteria(query);

      expect(spy1).toHaveBeenCalledWith(query);
      expect(spy2).toHaveBeenCalledWith(query);
    });

    it("should handle complex deduplication scenarios", async () => {
      // Record 1: Has ISBN A
      const record1 = createTestRecord({
        id: "1",
        source: "Provider1",
        title: "Book Title",
        isbn: ["9780306406157"],
        authors: ["Author One"],
        confidence: 0.95,
      });

      // Record 2: Has ISBN A (should merge with record1)
      const record2 = createTestRecord({
        id: "2",
        source: "Provider2",
        title: "Book Title",
        isbn: ["9780306406157"],
        authors: ["Author One", "Author Two"],
        confidence: 0.85,
      });

      // Record 3: Has ISBN B (different book)
      const record3 = createTestRecord({
        id: "3",
        source: "Provider3",
        title: "Different Book",
        isbn: ["9781405076401"],
        authors: ["Author Three"],
        confidence: 0.8,
      });

      const provider1 = new MockProvider("Provider1", 90, {
        searchMultiCriteria: async () => [record1],
      });
      const provider2 = new MockProvider("Provider2", 80, {
        searchMultiCriteria: async () => [record2],
      });
      const provider3 = new MockProvider("Provider3", 70, {
        searchMultiCriteria: async () => [record3],
      });

      const aggregator = new MetadataAggregator([provider1, provider2, provider3]);
      const result = await aggregator.searchMultiCriteria({ title: "Book" });

      // Should have 2 results after deduplication
      expect(result.results.length).toBe(2);

      // Find the merged record
      const mergedRecord = result.results.find((r) => r.isbn?.includes("9780306406157"));
      expect(mergedRecord).toBeDefined();
      expect(mergedRecord?.authors).toContain("Author One");
      expect(mergedRecord?.authors).toContain("Author Two");
      expect(mergedRecord?.provider).toContain("Provider1");
      expect(mergedRecord?.provider).toContain("Provider2");
    });
  });

  describe("Record Merging", () => {
    it("should merge array fields by combining unique values", async () => {
      const record1 = createTestRecord({
        source: "Provider1",
        isbn: ["9780306406157"],
        authors: ["Author A", "Author B"],
        subjects: ["Fiction", "Drama"],
        confidence: 0.9,
      });
      const record2 = createTestRecord({
        source: "Provider2",
        isbn: ["9780306406157"],
        authors: ["Author B", "Author C"],
        subjects: ["Drama", "Classic"],
        confidence: 0.85,
      });

      const provider1 = new MockProvider("Provider1", 80, { searchByISBN: async () => [record1] });
      const provider2 = new MockProvider("Provider2", 70, { searchByISBN: async () => [record2] });

      const aggregator = new MetadataAggregator([provider1, provider2]);
      const result = await aggregator.searchByISBN("9780306406157");

      const merged = result.results[0];
      expect(merged.authors).toHaveLength(3);
      expect(merged.authors).toContain("Author A");
      expect(merged.authors).toContain("Author B");
      expect(merged.authors).toContain("Author C");

      expect(merged.subjects).toHaveLength(3);
      expect(merged.subjects).toContain("Fiction");
      expect(merged.subjects).toContain("Drama");
      expect(merged.subjects).toContain("Classic");
    });

    it("should prefer values from higher-confidence records", async () => {
      const record1 = createTestRecord({
        source: "Provider1",
        isbn: ["9780306406157"],
        title: "Accurate Title",
        description: "Detailed description",
        publisher: "Publisher One",
        confidence: 0.95,
      });
      const record2 = createTestRecord({
        source: "Provider2",
        isbn: ["9780306406157"],
        title: "Less Accurate Title",
        description: undefined,
        publisher: "Publisher Two",
        confidence: 0.7,
      });

      const provider1 = new MockProvider("Provider1", 80, { searchByISBN: async () => [record1] });
      const provider2 = new MockProvider("Provider2", 70, { searchByISBN: async () => [record2] });

      const aggregator = new MetadataAggregator([provider1, provider2]);
      const result = await aggregator.searchByISBN("9780306406157");

      const merged = result.results[0];
      expect(merged.title).toBe("Accurate Title");
      expect(merged.description).toBe("Detailed description");
      expect(merged.publisher).toBe("Publisher One");
    });

    it("should fill in missing fields from lower-confidence records", async () => {
      const record1 = createTestRecord({
        source: "Provider1",
        isbn: ["9780306406157"],
        title: "Book Title",
        description: undefined,
        publisher: undefined,
        pageCount: undefined,
        confidence: 0.95,
      });
      const record2 = createTestRecord({
        source: "Provider2",
        isbn: ["9780306406157"],
        title: undefined,
        description: "A great book",
        publisher: "Publisher Name",
        pageCount: 300,
        confidence: 0.7,
      });

      const provider1 = new MockProvider("Provider1", 80, { searchByISBN: async () => [record1] });
      const provider2 = new MockProvider("Provider2", 70, { searchByISBN: async () => [record2] });

      const aggregator = new MetadataAggregator([provider1, provider2]);
      const result = await aggregator.searchByISBN("9780306406157");

      const merged = result.results[0];
      expect(merged.title).toBe("Book Title");
      expect(merged.description).toBe("A great book");
      expect(merged.publisher).toBe("Publisher Name");
      expect(merged.pageCount).toBe(300);
    });
  });

  describe("Error Handling", () => {
    it("should continue when some providers fail", async () => {
      const provider1 = new MockProvider("Provider1", 80, {
        searchByISBN: async () => {
          throw new Error("Network error");
        },
      });
      const provider2 = new MockProvider("Provider2", 70, {
        searchByISBN: async () => [
          createTestRecord({ source: "Provider2", isbn: ["9780306406157"], title: "Book A" }),
        ],
      });
      const provider3 = new MockProvider("Provider3", 60, {
        searchByISBN: async () => [
          createTestRecord({ source: "Provider3", isbn: ["9781405076401"], title: "Book B" }),
        ],
      });

      const aggregator = new MetadataAggregator([provider1, provider2, provider3]);
      const result = await aggregator.searchByISBN("9780306406157");

      expect(result.errors.size).toBe(1);
      expect(result.results.length).toBe(2);
      expect(result.providerResults.size).toBe(3);
    });

    it("should capture error details", async () => {
      const testError = new Error("Detailed error message");
      const provider = new MockProvider("Provider1", 80, {
        searchByISBN: async () => {
          throw testError;
        },
      });

      const aggregator = new MetadataAggregator([provider], {
        minProviders: 0, // Allow completion even with errors
      });
      const result = await aggregator.searchByISBN("9780306406157");

      expect(result.errors.get("Provider1")).toBe(testError);
      expect(result.errors.get("Provider1")?.message).toBe("Detailed error message");
    });
  });

  describe("Empty Results", () => {
    it("should handle providers returning empty results", async () => {
      const provider1 = new MockProvider("Provider1", 80, { searchByISBN: async () => [] });
      const provider2 = new MockProvider("Provider2", 70, { searchByISBN: async () => [] });

      const aggregator = new MetadataAggregator([provider1, provider2]);
      const result = await aggregator.searchByISBN("9780306406157");

      expect(result.results).toHaveLength(0);
      expect(result.errors.size).toBe(0);
      expect(result.consensus).toBeUndefined();
    });

    it("should not calculate consensus for empty results", async () => {
      const provider = new MockProvider("Provider1", 80, { searchByISBN: async () => [] });

      const aggregator = new MetadataAggregator([provider], { calculateConsensus: true });
      const result = await aggregator.searchByISBN("9780306406157");

      expect(result.consensus).toBeUndefined();
    });
  });
});
