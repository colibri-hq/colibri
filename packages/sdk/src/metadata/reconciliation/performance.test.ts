import { describe, expect, it } from "vitest";
import type {
  CreatorQuery,
  MetadataProvider,
  MetadataRecord,
  MultiCriteriaQuery,
  TitleQuery,
} from "../providers/provider.js";
import { MetadataType } from "../providers/provider.js";
import { MetadataCoordinator } from "./fetch.js";
import { PreviewGenerator } from "./preview.js";

describe("Performance Tests for Metadata Reconciliation", () => {
  // Performance test provider that can simulate various response times
  class PerformanceTestProvider implements MetadataProvider {
    readonly rateLimit = { maxRequests: 1000, windowMs: 60000, requestDelay: 0 };
    readonly timeout = { requestTimeout: 10000, operationTimeout: 20000 };

    constructor(
      public readonly name: string,
      public readonly priority: number,
      private responseDelay: number = 0,
      private resultCount: number = 1,
      private failureRate: number = 0,
    ) {}

    async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
      return this.searchMultiCriteria({ title: query.title });
    }

    async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
      return this.searchMultiCriteria({ isbn });
    }

    async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
      return this.searchMultiCriteria({ authors: [query.name] });
    }

    async searchMultiCriteria(query: MultiCriteriaQuery): Promise<MetadataRecord[]> {
      // Simulate response delay
      if (this.responseDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.responseDelay));
      }

      // Simulate random failures
      if (Math.random() < this.failureRate) {
        throw new Error(`Provider ${this.name} failed randomly`);
      }

      // Generate test results
      return Array.from({ length: this.resultCount }, (_, i) => ({
        id: `${this.name.toLowerCase()}-${i}`,
        source: this.name,
        confidence: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
        timestamp: new Date(),
        title: query.title || `Test Book ${i}`,
        authors: query.authors || [`Test Author ${i}`],
        isbn: query.isbn ? [query.isbn] : [`978000000000${i}`],
        publicationDate: new Date(2020 + i, 0, 1),
        subjects: [`Subject ${i}`, "Test Subject"],
        description: `Test description for book ${i}`,
        language: "en",
        publisher: `Test Publisher ${i}`,
        pageCount: 200 + i * 10,
      }));
    }

    getReliabilityScore(_dataType: MetadataType): number {
      return 0.8;
    }

    supportsDataType(_dataType: MetadataType): boolean {
      return true;
    }
  }

  describe("concurrent provider queries", () => {
    it("should handle multiple providers with different response times efficiently", async () => {
      const providers = [
        new PerformanceTestProvider("FastProvider", 3, 50, 1), // 50ms delay
        new PerformanceTestProvider("MediumProvider", 2, 200, 2), // 200ms delay, 2 results
        new PerformanceTestProvider("SlowProvider", 1, 500, 3), // 500ms delay, 3 results
      ];

      const coordinator = new MetadataCoordinator(providers);

      const startTime = Date.now();
      const result = await coordinator.query({ title: "Performance Test Book" });
      const duration = Date.now() - startTime;

      // Should complete in roughly the time of the slowest provider (plus overhead)
      expect(duration).toBeLessThan(1000); // Should be less than 1 second
      expect(duration).toBeGreaterThan(400); // Should take at least as long as slowest provider

      expect(result.totalRecords).toBe(6); // 1 + 2 + 3 results
      expect(result.successfulProviders).toBe(3);
      expect(result.failedProviders).toBe(0);
    });

    it("should respect global timeout with concurrent providers", async () => {
      const providers = [
        new PerformanceTestProvider("Provider1", 1, 2000), // 2 second delay
        new PerformanceTestProvider("Provider2", 1, 3000), // 3 second delay
        new PerformanceTestProvider("Provider3", 1, 4000), // 4 second delay
      ];

      const coordinator = new MetadataCoordinator(providers, {
        globalTimeout: 1500, // 1.5 second global timeout
        continueOnFailure: true,
      });

      const startTime = Date.now();
      const result = await coordinator.query({ title: "Timeout Test" });
      const duration = Date.now() - startTime;

      // Should timeout before all providers complete
      expect(duration).toBeLessThan(2000);
      expect(result.failedProviders).toBeGreaterThan(0);
    });

    it("should handle provider timeout while others continue", async () => {
      const providers = [
        new PerformanceTestProvider("FastProvider", 3, 100), // Fast
        new PerformanceTestProvider("TimeoutProvider", 2, 2000), // Will timeout
        new PerformanceTestProvider("MediumProvider", 1, 300), // Medium
      ];

      const coordinator = new MetadataCoordinator(providers, {
        providerTimeout: 500, // 500ms per provider
        continueOnFailure: true,
      });

      const startTime = Date.now();
      const result = await coordinator.query({ title: "Provider Timeout Test" });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should not wait for timed out provider
      expect(result.successfulProviders).toBe(2); // Fast and Medium providers
      expect(result.failedProviders).toBe(1); // Timeout provider
      expect(result.totalRecords).toBe(2);
    });

    it("should handle high concurrency with many providers", async () => {
      const providers = Array.from(
        { length: 20 },
        (_, i) => new PerformanceTestProvider(`Provider${i}`, i + 1, Math.random() * 200, 1),
      );

      const coordinator = new MetadataCoordinator(providers, {
        maxConcurrency: 5, // Limit concurrency
      });

      const startTime = Date.now();
      const result = await coordinator.query({ title: "High Concurrency Test" });
      const duration = Date.now() - startTime;

      expect(result.totalRecords).toBe(20);
      expect(result.successfulProviders).toBe(20);
      expect(duration).toBeLessThan(5000); // Should complete within reasonable time
    });

    it("should handle provider failures without blocking others", async () => {
      const providers = [
        new PerformanceTestProvider("ReliableProvider1", 3, 100, 1, 0), // No failures
        new PerformanceTestProvider("UnreliableProvider", 2, 150, 1, 0.8), // 80% failure rate
        new PerformanceTestProvider("ReliableProvider2", 1, 200, 1, 0), // No failures
      ];

      const coordinator = new MetadataCoordinator(providers);

      // Run multiple queries to test failure handling
      const queries = Array.from({ length: 10 }, (_, i) => ({ title: `Test Book ${i}` }));
      const results = await Promise.all(queries.map((query) => coordinator.query(query)));

      // Should have some successful results from reliable providers
      const totalSuccessfulResults = results.reduce((sum, r) => sum + r.totalRecords, 0);
      expect(totalSuccessfulResults).toBeGreaterThan(10); // At least some results from reliable providers

      // Unreliable provider should have some failures
      const totalFailures = results.reduce((sum, r) => sum + r.failedProviders, 0);
      expect(totalFailures).toBeGreaterThan(0);
    });
  });

  describe("large dataset performance", () => {
    it("should handle large result sets efficiently", async () => {
      const provider = new PerformanceTestProvider("LargeResultProvider", 1, 100, 1000); // 1000 results
      const coordinator = new MetadataCoordinator([provider]);

      const startTime = Date.now();
      const result = await coordinator.query({ title: "Large Dataset Test" });
      const processingTime = Date.now() - startTime;

      expect(result.totalRecords).toBe(1000);
      expect(processingTime).toBeLessThan(2000); // Should process 1000 records quickly

      // Test deduplication performance with large dataset
      const duplicateProvider = new PerformanceTestProvider("DuplicateProvider", 1, 50, 500);
      // Override to return duplicate IDs
      duplicateProvider.searchMultiCriteria = async () => {
        return Array.from({ length: 500 }, (_, i) => ({
          id: `duplicate-${i % 100}`, // Only 100 unique IDs, rest are duplicates
          source: "DuplicateProvider",
          confidence: 0.8,
          timestamp: new Date(),
          title: `Book ${i % 100}`,
          authors: [`Author ${i % 100}`],
        }));
      };

      const duplicateCoordinator = new MetadataCoordinator([duplicateProvider]);
      const duplicateStartTime = Date.now();
      const duplicateResult = await duplicateCoordinator.query({ title: "Deduplication Test" });
      const deduplicationTime = Date.now() - duplicateStartTime;

      expect(duplicateResult.totalRecords).toBe(100); // Should deduplicate to 100 unique records
      expect(deduplicationTime).toBeLessThan(1000); // Deduplication should be fast
    });

    it("should handle preview generation with large datasets efficiently", async () => {
      // Generate large metadata dataset
      const largeMetadataSet: MetadataRecord[] = Array.from({ length: 500 }, (_, i) => ({
        id: `large-${i}`,
        source: `Provider${i % 10}`,
        confidence: Math.random() * 0.4 + 0.6,
        timestamp: new Date(),
        title: `Book ${i}`,
        authors: [`Author ${i % 50}`],
        isbn: [`978000000${String(i).padStart(4, "0")}`],
        publicationDate: new Date(2000 + (i % 24), i % 12, 1),
        subjects: [`Subject ${i % 20}`, `Category ${i % 15}`],
        description: `Description for book ${i}`,
        language: ["en", "es", "fr", "de"][i % 4],
        publisher: `Publisher ${i % 30}`,
        pageCount: 100 + (i % 500),
      }));

      const previewGenerator = new PreviewGenerator();

      const startTime = Date.now();
      const preview = previewGenerator.generatePreview(largeMetadataSet);
      const previewTime = Date.now() - startTime;

      expect(preview.sourceCount).toBe(10);
      expect(previewTime).toBeLessThan(1000); // Should generate preview quickly

      // Test enhanced preview with large dataset
      const enhancedStartTime = Date.now();
      const enhancedPreview = previewGenerator.generateEnhancedPreview(largeMetadataSet);
      const enhancedTime = Date.now() - enhancedStartTime;

      expect(enhancedPreview.conflictAnalysis).toBeDefined();
      expect(enhancedTime).toBeLessThan(2000); // Enhanced preview should still be reasonably fast
    });

    it("should handle memory efficiently with large datasets", async () => {
      // Test memory usage with very large dataset
      const veryLargeDataset: MetadataRecord[] = Array.from({ length: 2000 }, (_, i) => ({
        id: `memory-test-${i}`,
        source: `Provider${i % 5}`,
        confidence: 0.8,
        timestamp: new Date(),
        title: `Memory Test Book ${i}`,
        authors: [`Author ${i}`],
        description:
          `This is a longer description for book ${i} to test memory usage with larger text content. `.repeat(
            10,
          ),
        subjects: Array.from({ length: 10 }, (_, j) => `Subject ${i}-${j}`),
      }));

      const previewGenerator = new PreviewGenerator();

      // Monitor memory usage (basic check)
      const initialMemory = process.memoryUsage().heapUsed;

      const preview = previewGenerator.generatePreview(veryLargeDataset);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(preview.sourceCount).toBe(5);
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe("stress testing", () => {
    it("should handle rapid successive queries", async () => {
      const provider = new PerformanceTestProvider("StressTestProvider", 1, 50, 1);
      const coordinator = new MetadataCoordinator([provider]);

      // Fire 50 queries rapidly
      const queries = Array.from({ length: 50 }, (_, i) => ({ title: `Stress Test ${i}` }));

      const startTime = Date.now();
      const results = await Promise.all(queries.map((query) => coordinator.query(query)));
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(results.every((r) => r.totalRecords === 1)).toBe(true);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should handle mixed query types under load", async () => {
      const providers = [
        new PerformanceTestProvider("Provider1", 3, 100, 2),
        new PerformanceTestProvider("Provider2", 2, 150, 1),
        new PerformanceTestProvider("Provider3", 1, 200, 3),
      ];

      const coordinator = new MetadataCoordinator(providers);

      // Mix of different query types
      const mixedQueries = [
        { title: "Book 1" },
        { authors: ["Author 1"] },
        { isbn: "9780123456789" },
        { title: "Book 2", authors: ["Author 2"] },
        { title: "Book 3", language: "en" },
        { subjects: ["Fiction"] },
        { yearRange: [2020, 2023] as [number, number] },
        { title: "Book 4", publisher: "Test Publisher" },
      ];

      const startTime = Date.now();
      const results = await Promise.all(mixedQueries.map((query) => coordinator.query(query)));
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(8);
      expect(totalTime).toBeLessThan(3000);

      // All queries should return some results
      const totalRecords = results.reduce((sum, r) => sum + r.totalRecords, 0);
      expect(totalRecords).toBeGreaterThan(0);
    });

    it("should maintain performance with provider failures", async () => {
      const providers = [
        new PerformanceTestProvider("ReliableProvider", 3, 100, 1, 0),
        new PerformanceTestProvider("UnreliableProvider1", 2, 150, 1, 0.5),
        new PerformanceTestProvider("UnreliableProvider2", 1, 200, 1, 0.7),
      ];

      const coordinator = new MetadataCoordinator(providers);

      // Run many queries to test performance under failure conditions
      const queries = Array.from({ length: 30 }, (_, i) => ({ title: `Failure Test ${i}` }));

      const startTime = Date.now();
      const results = await Promise.all(queries.map((query) => coordinator.query(query)));
      const totalTime = Date.now() - startTime;

      // Should complete in reasonable time despite failures
      expect(totalTime).toBeLessThan(10000);

      // Should have some successful results from reliable provider
      const successfulResults = results.filter((r) => r.totalRecords > 0);
      expect(successfulResults.length).toBeGreaterThan(20);
    });

    it("should handle timeout scenarios efficiently", async () => {
      const providers = [
        new PerformanceTestProvider("FastProvider", 3, 50, 1),
        new PerformanceTestProvider("SlowProvider1", 2, 2000, 1), // Will timeout
        new PerformanceTestProvider("SlowProvider2", 1, 3000, 1), // Will timeout
      ];

      const coordinator = new MetadataCoordinator(providers, {
        providerTimeout: 500,
        globalTimeout: 1000,
        continueOnFailure: true,
      });

      const queries = Array.from({ length: 20 }, (_, i) => ({ title: `Timeout Test ${i}` }));

      const startTime = Date.now();
      const results = await Promise.all(queries.map((query) => coordinator.query(query)));
      const totalTime = Date.now() - startTime;

      // Should complete quickly due to timeouts
      expect(totalTime).toBeLessThan(5000);

      // Should have results from fast provider
      const successfulResults = results.filter((r) => r.totalRecords > 0);
      expect(successfulResults.length).toBe(20);

      // Should have timeouts from slow providers
      const timeoutResults = results.filter((r) => r.failedProviders > 0);
      expect(timeoutResults.length).toBe(20);
    });
  });

  describe("resource utilization", () => {
    it("should not create excessive promises or memory leaks", async () => {
      const provider = new PerformanceTestProvider("ResourceTestProvider", 1, 10, 1);
      const coordinator = new MetadataCoordinator([provider]);

      // Track promise creation (basic check)
      let promiseCount = 0;
      const originalPromise = global.Promise;

      // Mock Promise constructor to count creations
      global.Promise = class extends originalPromise {
        constructor(executor: any) {
          super(executor);
          promiseCount++;
        }
      } as any;

      const initialPromiseCount = promiseCount;

      // Run multiple queries
      const queries = Array.from({ length: 10 }, (_, i) => ({ title: `Resource Test ${i}` }));
      await Promise.all(queries.map((query) => coordinator.query(query)));

      const finalPromiseCount = promiseCount;

      // Restore original Promise
      global.Promise = originalPromise;

      // Should not create excessive promises
      // Note: The actual promise count depends on implementation details
      // like async operations in providers and coordinator
      const promiseIncrease = finalPromiseCount - initialPromiseCount;
      expect(promiseIncrease).toBeLessThan(250); // Reasonable limit
    });

    it("should handle garbage collection efficiently", async () => {
      const provider = new PerformanceTestProvider("GCTestProvider", 1, 50, 10);
      const coordinator = new MetadataCoordinator([provider]);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Run many queries to generate garbage
      for (let i = 0; i < 20; i++) {
        await coordinator.query({ title: `GC Test ${i}` });
      }

      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });

    it("should handle CPU-intensive operations efficiently", async () => {
      // Create provider that returns complex data requiring processing
      const complexProvider = new PerformanceTestProvider("ComplexProvider", 1, 0, 100);

      // Override to return complex data
      complexProvider.searchMultiCriteria = async () => {
        return Array.from({ length: 100 }, (_, i) => ({
          id: `complex-${i}`,
          source: "ComplexProvider",
          confidence: 0.8,
          timestamp: new Date(),
          title: `Complex Book ${i}`,
          authors: Array.from({ length: 5 }, (_, j) => `Author ${i}-${j}`),
          subjects: Array.from({ length: 20 }, (_, j) => `Subject ${i}-${j}`),
          description: `Complex description ${i} `.repeat(100),
          isbn: Array.from({ length: 3 }, (_, j) => `978000${i}${j}000`),
          series: { name: `Series ${i}`, volume: i + 1, totalVolumes: 100 },
        }));
      };

      const coordinator = new MetadataCoordinator([complexProvider]);
      const previewGenerator = new PreviewGenerator();

      const startTime = Date.now();
      const result = await coordinator.query({ title: "CPU Test" });
      const preview = previewGenerator.generatePreview(result.aggregatedRecords);
      const totalTime = Date.now() - startTime;

      expect(result.totalRecords).toBe(100);
      expect(preview.sourceCount).toBe(1);
      expect(totalTime).toBeLessThan(3000); // Should handle complex data efficiently
    });
  });
});
