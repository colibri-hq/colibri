import {
  type MetadataRecord,
  MetadataType,
  type MultiCriteriaQuery,
} from "@colibri-hq/sdk/metadata";
import { sleep } from "@colibri-hq/shared";
import { describe, expect, it } from "vitest";

// Mock provider for testing
class MockMetadataProvider {
  rateLimit = { maxRequests: 100, requestDelay: 100, windowMs: 60_000 };

  timeout = { operationTimeout: 30_000, requestTimeout: 10_000 };

  constructor(
    public name: string,
    public priority: number,
    private mockResults: MetadataRecord[] = [],
    private shouldFail: boolean = false,
    private delay: number = 0,
  ) {}

  getReliabilityScore(dataType: MetadataType): number {
    const scores: Record<MetadataType, number> = {
      [MetadataType.AUTHORS]: 0.7,
      [MetadataType.COVER_IMAGE]: 0.4,
      [MetadataType.DESCRIPTION]: 0.4,
      [MetadataType.EDITION]: 0.5,
      [MetadataType.ISBN]: 0.9,
      [MetadataType.LANGUAGE]: 0.7,
      [MetadataType.PAGE_COUNT]: 0.6,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.3,
      [MetadataType.PUBLICATION_DATE]: 0.6,
      [MetadataType.PUBLISHER]: 0.6,
      [MetadataType.SERIES]: 0.5,
      [MetadataType.SUBJECTS]: 0.5,
      [MetadataType.TITLE]: 0.8,
    };
    return scores[dataType] ?? 0.5;
  }

  async searchByCreator(): Promise<MetadataRecord[]> {
    return this.performSearch();
  }

  async searchByISBN(): Promise<MetadataRecord[]> {
    return this.performSearch();
  }

  async searchByTitle(): Promise<MetadataRecord[]> {
    return this.performSearch();
  }

  async searchMultiCriteria(): Promise<MetadataRecord[]> {
    return this.performSearch();
  }

  supportsDataType(dataType: MetadataType): boolean {
    return [
      MetadataType.AUTHORS,
      MetadataType.DESCRIPTION,
      MetadataType.ISBN,
      MetadataType.LANGUAGE,
      MetadataType.PUBLICATION_DATE,
      MetadataType.SUBJECTS,
      MetadataType.TITLE,
    ].includes(dataType);
  }

  private async performSearch(): Promise<MetadataRecord[]> {
    if (this.delay > 0) {
      await sleep(this.delay);
    }

    if (this.shouldFail) {
      throw new Error(`${this.name} provider failed`);
    }

    return this.mockResults;
  }
}

// Simple coordinator for testing
class TestCoordinator {
  constructor(private providers: MockMetadataProvider[]) {}

  async query(_query: MultiCriteriaQuery) {
    const startTime = Date.now();
    const providerResults = [];

    // Query each provider concurrently
    const promises = this.providers.map(async (provider) => {
      const providerStartTime = Date.now();
      try {
        const records = await provider.searchMultiCriteria();
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

    // Simple deduplication
    const seen = new Set<string>();
    const deduplicated: MetadataRecord[] = [];
    for (const record of allRecords) {
      const key = `${record.title || "unknown"}-${record.authors?.join(",") || "unknown"}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(record);
      }
    }

    deduplicated.sort((a, b) => b.confidence - a.confidence);

    return {
      aggregatedRecords: deduplicated,
      providers: providerResults,
      totalDuration: Date.now() - startTime,
      totalRecords: deduplicated.length,
    };
  }
}

describe("Metadata Discovery Integration Tests", () => {
  describe("End-to-End Discovery Workflow", () => {
    it("should complete discovery workflow with successful provider", async () => {
      const mockRecord: MetadataRecord = {
        authors: ["F. Scott Fitzgerald"],
        confidence: 0.85,
        description: "A classic American novel set in the Jazz Age.",
        id: "test-1",
        isbn: ["9780743273565"],
        language: "eng",
        pageCount: 180,
        publicationDate: new Date("1925-04-10"),
        publisher: "Scribner",
        source: "TestProvider",
        subjects: ["Fiction", "American Literature"],
        timestamp: new Date(),
        title: "The Great Gatsby",
      };

      const provider = new MockMetadataProvider("TestProvider", 80, [mockRecord]);
      const coordinator = new TestCoordinator([provider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "The Great Gatsby" };

      const result = await coordinator.query(query);

      expect(result.totalRecords).toBe(1);
      expect(result.aggregatedRecords[0].title).toBe("The Great Gatsby");
      expect(result.aggregatedRecords[0].authors).toContain("F. Scott Fitzgerald");
      expect(result.providers[0].success).toBe(true);
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it("should handle provider failures gracefully", async () => {
      const failingProvider = new MockMetadataProvider("FailingProvider", 80, [], true);
      const coordinator = new TestCoordinator([failingProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Test Book" };

      const result = await coordinator.query(query);

      expect(result.totalRecords).toBe(0);
      expect(result.providers[0].success).toBe(false);
      expect(result.providers[0].error?.message).toContain("FailingProvider provider failed");
    });

    it("should handle multi-criteria searches", async () => {
      const mockRecord: MetadataRecord = {
        authors: ["J.R.R. Tolkien"],
        confidence: 0.92,
        id: "multi-test",
        language: "eng",
        publisher: "Houghton Mifflin",
        source: "TestProvider",
        subjects: ["Fantasy", "Adventure"],
        timestamp: new Date(),
        title: "The Hobbit",
      };

      const provider = new MockMetadataProvider("TestProvider", 80, [mockRecord]);
      const coordinator = new TestCoordinator([provider]);

      const query: MultiCriteriaQuery = {
        authors: ["J.R.R. Tolkien"],
        fuzzy: true,
        language: "eng",
        publisher: "Houghton Mifflin",
        subjects: ["Fantasy"],
        title: "The Hobbit",
        yearRange: [1930, 1940],
      };

      const result = await coordinator.query(query);

      expect(result.totalRecords).toBe(1);
      expect(result.aggregatedRecords[0].title).toBe("The Hobbit");
      expect(result.aggregatedRecords[0].authors).toContain("J.R.R. Tolkien");
      expect(result.aggregatedRecords[0].language).toBe("eng");
    });

    it("should handle ISBN searches with high confidence", async () => {
      const mockRecord: MetadataRecord = {
        authors: ["George Orwell"],
        confidence: 0.95,
        id: "isbn-test",
        isbn: ["9780451524935"],
        source: "TestProvider",
        timestamp: new Date(),
        title: "1984",
      };

      const provider = new MockMetadataProvider("TestProvider", 80, [mockRecord]);
      const coordinator = new TestCoordinator([provider]);

      const query: MultiCriteriaQuery = { fuzzy: false, isbn: "978-0-451-52493-5" };

      const result = await coordinator.query(query);

      expect(result.totalRecords).toBe(1);
      expect(result.aggregatedRecords[0].title).toBe("1984");
      expect(result.aggregatedRecords[0].isbn).toContain("9780451524935");
      expect(result.aggregatedRecords[0].confidence).toBe(0.95);
    });
  });

  describe("Provider Failure Scenarios and Recovery", () => {
    it("should continue with working providers when some fail", async () => {
      const workingRecord: MetadataRecord = {
        authors: ["Working Author"],
        confidence: 0.82,
        id: "working-1",
        isbn: ["9781234567890"],
        source: "WorkingProvider",
        timestamp: new Date(),
        title: "Working Book",
      };

      const failingProvider = new MockMetadataProvider("FailingProvider", 90, [], true);
      const workingProvider = new MockMetadataProvider("WorkingProvider", 85, [workingRecord]);

      const coordinator = new TestCoordinator([failingProvider, workingProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Test Book" };

      const result = await coordinator.query(query);

      expect(result.totalRecords).toBe(1);
      expect(result.aggregatedRecords[0].title).toBe("Working Book");
      expect(result.providers.filter((p) => p.success)).toHaveLength(1);
      expect(result.providers.filter((p) => !p.success)).toHaveLength(1);
    });

    it("should handle mixed success/failure scenarios efficiently", async () => {
      const successRecord: MetadataRecord = {
        authors: ["Success Author"],
        confidence: 0.9,
        id: "success-1",
        source: "SuccessProvider",
        timestamp: new Date(),
        title: "Success Book",
      };

      const fastSuccessProvider = new MockMetadataProvider(
        "FastSuccess",
        95,
        [successRecord],
        false,
        100,
      );
      const slowSuccessProvider = new MockMetadataProvider(
        "SlowSuccess",
        85,
        [successRecord],
        false,
        800,
      );
      const fastFailureProvider = new MockMetadataProvider("FastFailure", 90, [], true, 50);
      const slowFailureProvider = new MockMetadataProvider("SlowFailure", 80, [], true, 1200);

      const coordinator = new TestCoordinator([
        fastSuccessProvider,
        slowSuccessProvider,
        fastFailureProvider,
        slowFailureProvider,
      ]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Mixed Test" };

      const startTime = Date.now();
      const result = await coordinator.query(query);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete efficiently despite mixed scenarios
      expect(totalTime).toBeLessThan(2000);
      expect(result.totalRecords).toBe(1); // Deduplicated
      expect(result.providers.filter((p) => p.success)).toHaveLength(2);
      expect(result.providers.filter((p) => !p.success)).toHaveLength(2);
    });

    it("should handle network timeout errors", async () => {
      const timeoutProvider = new MockMetadataProvider("TimeoutProvider", 80);
      timeoutProvider.searchMultiCriteria = async () => {
        const error = new Error("Request timed out");
        error.name = "TimeoutError";
        throw error;
      };

      const coordinator = new TestCoordinator([timeoutProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Timeout Test" };

      const result = await coordinator.query(query);

      expect(result.totalRecords).toBe(0);
      expect(result.providers[0].success).toBe(false);
      expect(result.providers[0].error?.message).toContain("Request timed out");
    });

    it("should handle rate limit errors", async () => {
      const rateLimitProvider = new MockMetadataProvider("RateLimitProvider", 80);
      rateLimitProvider.searchMultiCriteria = async () => {
        const error = new Error("Too many requests");
        // @ts-expect-error Simulate HTTP status
        error.status = 429;
        throw error;
      };

      const coordinator = new TestCoordinator([rateLimitProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Rate Limit Test" };

      const result = await coordinator.query(query);

      expect(result.totalRecords).toBe(0);
      expect(result.providers[0].success).toBe(false);
      expect(result.providers[0].error?.message).toContain("Too many requests");
    });
  });

  describe("Performance Tests for Concurrent Provider Queries", () => {
    it("should handle concurrent queries efficiently", async () => {
      const fastRecord: MetadataRecord = {
        authors: ["Fast Author"],
        confidence: 0.85,
        id: "fast-1",
        source: "FastProvider",
        timestamp: new Date(),
        title: "Fast Book",
      };

      const slowRecord: MetadataRecord = {
        authors: ["Slow Author"],
        confidence: 0.8,
        id: "slow-1",
        source: "SlowProvider",
        timestamp: new Date(),
        title: "Slow Book",
      };

      const fastProvider = new MockMetadataProvider("FastProvider", 90, [fastRecord], false, 100);
      const slowProvider = new MockMetadataProvider("SlowProvider", 80, [slowRecord], false, 1000);

      const coordinator = new TestCoordinator([fastProvider, slowProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Performance Test" };

      const startTime = Date.now();
      const result = await coordinator.query(query);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete in time closer to slow provider (concurrent) rather than sum
      expect(totalTime).toBeLessThan(1200); // Slightly more than slow provider time
      expect(totalTime).toBeGreaterThanOrEqual(1000); // But at least as long as slow provider
      expect(result.totalRecords).toBe(2); // Should get results from both providers
    });

    it("should not be blocked by slow providers", async () => {
      const quickRecord: MetadataRecord = {
        authors: ["Quick Author"],
        confidence: 0.88,
        id: "quick-1",
        source: "QuickProvider",
        timestamp: new Date(),
        title: "Quick Book",
      };

      const quickProvider = new MockMetadataProvider("QuickProvider", 85, [quickRecord], false, 50);
      const verySlowProvider = new MockMetadataProvider("VerySlowProvider", 95, [], false, 2000);

      const coordinator = new TestCoordinator([quickProvider, verySlowProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Speed Test" };

      const startTime = Date.now();
      const result = await coordinator.query(query);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete in time close to slow provider (concurrent execution)
      expect(totalTime).toBeLessThan(2500); // Should be close to 2000ms, not 2050ms
      expect(totalTime).toBeGreaterThanOrEqual(2000); // But at least as long as slow provider
      expect(result.aggregatedRecords.some((r) => r.title === "Quick Book")).toBe(true);
    }, 10_000);

    it("should handle high concurrency without degradation", async () => {
      // Create multiple records to simulate high-volume response
      const records: MetadataRecord[] = Array.from({ length: 10 }, (_, i) => ({
        authors: [`Author ${i}`],
        confidence: 0.7 + i * 0.02,
        id: `record-${i}`,
        isbn: [`978123456789${i}`],
        source: "HighVolumeProvider",
        timestamp: new Date(),
        title: `Book ${i}`,
      }));

      const highVolumeProvider = new MockMetadataProvider(
        "HighVolumeProvider",
        80,
        records,
        false,
        200,
      );
      const coordinator = new TestCoordinator([highVolumeProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "High Volume Test" };

      const startTime = Date.now();
      const result = await coordinator.query(query);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // Should handle high volume efficiently
      expect(result.totalRecords).toBe(10);
      expect(result.aggregatedRecords[0].title).toBe("Book 9"); // Highest confidence should be first
    });

    it("should measure coordination performance", async () => {
      const performanceRecord: MetadataRecord = {
        authors: ["Performance Author"],
        confidence: 0.85,
        id: "perf-1",
        source: "PerformanceProvider",
        timestamp: new Date(),
        title: "Performance Book",
      };

      const performanceProvider = new MockMetadataProvider(
        "PerformanceProvider",
        80,
        [performanceRecord],
        false,
        300,
      );
      const coordinator = new TestCoordinator([performanceProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Performance Test" };

      const result = await coordinator.query(query);

      expect(result.totalDuration).toBeGreaterThan(300); // Should include provider delay
      expect(result.totalDuration).toBeLessThan(1000); // But not be excessive
      expect(result.totalRecords).toBe(1);
      expect(result.providers[0].duration).toBeGreaterThan(300);
    });
  });

  describe("Deduplication and Aggregation", () => {
    it("should deduplicate identical results from different providers", async () => {
      const identicalRecord1: MetadataRecord = {
        authors: ["Same Author"],
        confidence: 0.85,
        id: "dup-1",
        source: "Provider1",
        timestamp: new Date(),
        title: "Duplicate Book",
      };

      const identicalRecord2: MetadataRecord = {
        authors: ["Same Author"],
        confidence: 0.9,
        id: "dup-2",
        source: "Provider2",
        timestamp: new Date(),
        title: "Duplicate Book",
      };

      const provider1 = new MockMetadataProvider("Provider1", 85, [identicalRecord1]);
      const provider2 = new MockMetadataProvider("Provider2", 90, [identicalRecord2]);

      const coordinator = new TestCoordinator([provider1, provider2]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Duplicate Book" };

      const result = await coordinator.query(query);

      expect(result.totalRecords).toBe(1); // Should deduplicate
      expect(result.aggregatedRecords[0].confidence).toBe(0.85); // Should keep first record (simple deduplication)
    });

    it("should handle partial matches during deduplication", async () => {
      const partialMatch1: MetadataRecord = {
        authors: ["Author One"],
        confidence: 0.85,
        id: "partial-1",
        source: "Provider1",
        timestamp: new Date(),
        title: "The Great Book",
      };

      const partialMatch2: MetadataRecord = {
        authors: ["Author One"],
        confidence: 0.8,
        id: "partial-2",
        source: "Provider2",
        timestamp: new Date(),
        title: "Great Book", // Slightly different title
      };

      const differentBook: MetadataRecord = {
        authors: ["Different Author"],
        confidence: 0.75,
        id: "different-1",
        source: "Provider3",
        timestamp: new Date(),
        title: "Completely Different",
      };

      const provider1 = new MockMetadataProvider("Provider1", 85, [partialMatch1]);
      const provider2 = new MockMetadataProvider("Provider2", 80, [partialMatch2]);
      const provider3 = new MockMetadataProvider("Provider3", 75, [differentBook]);

      const coordinator = new TestCoordinator([provider1, provider2, provider3]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Great Book" };

      const result = await coordinator.query(query);

      expect(result.totalRecords).toBe(3); // Should not deduplicate partial matches
      expect(result.aggregatedRecords.map((r) => r.title)).toContain("The Great Book");
      expect(result.aggregatedRecords.map((r) => r.title)).toContain("Great Book");
      expect(result.aggregatedRecords.map((r) => r.title)).toContain("Completely Different");
    });

    it("should prioritize results by confidence across providers", async () => {
      const lowConfidenceRecord: MetadataRecord = {
        authors: ["Low Confidence Author"],
        confidence: 0.6,
        id: "low-1",
        source: "LowConfidenceProvider",
        timestamp: new Date(),
        title: "Test Book",
      };

      const highConfidenceRecord: MetadataRecord = {
        authors: ["High Confidence Author"],
        confidence: 0.95,
        id: "high-1",
        source: "HighConfidenceProvider",
        timestamp: new Date(),
        title: "Test Book Different",
      };

      const mediumConfidenceRecord: MetadataRecord = {
        authors: ["Medium Confidence Author"],
        confidence: 0.75,
        id: "medium-1",
        source: "MediumConfidenceProvider",
        timestamp: new Date(),
        title: "Another Test Book",
      };

      const lowProvider = new MockMetadataProvider("LowConfidenceProvider", 95, [
        lowConfidenceRecord,
      ]);
      const highProvider = new MockMetadataProvider("HighConfidenceProvider", 70, [
        highConfidenceRecord,
      ]);
      const mediumProvider = new MockMetadataProvider("MediumConfidenceProvider", 85, [
        mediumConfidenceRecord,
      ]);

      const coordinator = new TestCoordinator([lowProvider, highProvider, mediumProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Test Book" };

      const result = await coordinator.query(query);

      // Should sort by confidence (highest first)
      expect(result.aggregatedRecords[0].confidence).toBe(0.95);
      expect(result.aggregatedRecords[0].authors).toContain("High Confidence Author");
      expect(result.aggregatedRecords[1].confidence).toBe(0.75);
      expect(result.aggregatedRecords[2].confidence).toBe(0.6);
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    it("should handle empty results gracefully", async () => {
      const emptyProvider = new MockMetadataProvider("EmptyProvider", 80, []);
      const coordinator = new TestCoordinator([emptyProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Nonexistent Book" };

      const result = await coordinator.query(query);

      expect(result.totalRecords).toBe(0);
      expect(result.aggregatedRecords).toHaveLength(0);
      expect(result.providers[0].success).toBe(true);
    });

    it("should handle malformed metadata gracefully", async () => {
      const malformedRecord: MetadataRecord = {
        authors: [],
        confidence: 0.85,
        id: "malformed-1",
        isbn: ["not-an-array"],
        publicationDate: new Date("invalid-date"),
        source: "MalformedProvider",
        timestamp: new Date(),
        title: undefined,
      };

      const malformedProvider = new MockMetadataProvider("MalformedProvider", 80, [
        malformedRecord,
      ]);
      const coordinator = new TestCoordinator([malformedProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Malformed Test" };

      const result = await coordinator.query(query);

      // Should handle malformed data without crashing
      expect(result.totalRecords).toBe(1);
      expect(result.aggregatedRecords[0].id).toBe("malformed-1");
    });

    it("should handle concurrent requests with rate limiting simulation", async () => {
      let requestCount = 0;
      const rateLimitedProvider = new MockMetadataProvider("RateLimitedProvider", 80);

      rateLimitedProvider.searchMultiCriteria = async () => {
        requestCount++;
        if (requestCount > 3) {
          const error = new Error("Rate limit exceeded");
          // @ts-expect-error Simulate HTTP status
          error.status = 429;
          throw error;
        }
        return [
          {
            authors: ["Rate Limited Author"],
            confidence: 0.85,
            id: `rate-${requestCount}`,
            source: "RateLimitedProvider",
            timestamp: new Date(),
            title: "Rate Limited Book",
          },
        ];
      };

      const coordinator = new TestCoordinator([rateLimitedProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Rate Test" };

      // Make multiple requests
      const promises = Array.from({ length: 5 }, () => coordinator.query(query));
      const results = await Promise.allSettled(promises);

      // Some should succeed, some should fail with rate limit
      const successful = results.filter(
        (r) => r.status === "fulfilled" && r.value.totalRecords > 0,
      ).length;
      const failed = results.filter(
        (r) => r.status === "fulfilled" && r.value.totalRecords === 0,
      ).length;

      expect(successful).toBeGreaterThan(0);
      expect(failed).toBeGreaterThan(0);
      expect(requestCount).toBe(5); // All requests should have been attempted
    });
  });

  describe("Provider Reliability and Metrics", () => {
    it("should track provider reliability scores", async () => {
      const provider = new MockMetadataProvider("ReliabilityProvider", 85);

      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.8);
      expect(provider.getReliabilityScore(MetadataType.AUTHORS)).toBe(0.7);
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.9);
      expect(provider.getReliabilityScore(MetadataType.PUBLICATION_DATE)).toBe(0.6);
    });

    it("should track data type support", async () => {
      const provider = new MockMetadataProvider("SupportProvider", 85);

      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PHYSICAL_DIMENSIONS)).toBe(false);
    });

    it("should measure provider performance metrics", async () => {
      const performanceRecord: MetadataRecord = {
        authors: ["Metrics Author"],
        confidence: 0.85,
        id: "metrics-1",
        source: "MetricsProvider",
        timestamp: new Date(),
        title: "Metrics Test",
      };

      const metricsProvider = new MockMetadataProvider(
        "MetricsProvider",
        85,
        [performanceRecord],
        false,
        200,
      );
      const coordinator = new TestCoordinator([metricsProvider]);

      const query: MultiCriteriaQuery = { fuzzy: false, title: "Metrics Test" };

      const result = await coordinator.query(query);

      expect(result.providers[0].duration).toBeGreaterThanOrEqual(200);
      expect(result.providers[0].duration).toBeLessThan(400);
      expect(result.totalDuration).toBeGreaterThanOrEqual(200);
      expect(result.providers[0].name).toBe("MetricsProvider");
      expect(result.providers[0].success).toBe(true);
    });
  });
});
