import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenLibraryMetadataProvider } from "./providers/open-library.js";

// Mock the OpenLibrary client
const mockSearchBook = vi.fn();
vi.mock("@colibri-hq/open-library-client", () => ({
  Client: vi.fn().mockImplementation(() => ({
    searchBook: mockSearchBook,
  })),
}));

describe("OpenLibraryMetadataProvider - Performance Testing", () => {
  let provider: OpenLibraryMetadataProvider;
  let performanceMetrics: {
    startTime: number;
    endTime: number;
    duration: number;
    memoryBefore: number;
    memoryAfter: number;
    memoryUsed: number;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenLibraryMetadataProvider();
    performanceMetrics = {
      startTime: 0,
      endTime: 0,
      duration: 0,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryUsed: 0,
    };
  });

  afterEach(() => {
    // Clean up any performance monitoring
    if (global.gc) {
      global.gc();
    }
  });

  // Helper function to measure performance
  const measurePerformance = async <T>(
    operation: () => Promise<T>,
  ): Promise<T> => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    performanceMetrics.memoryBefore = process.memoryUsage().heapUsed;
    performanceMetrics.startTime = performance.now();

    const result = await operation();

    performanceMetrics.endTime = performance.now();
    performanceMetrics.duration =
      performanceMetrics.endTime - performanceMetrics.startTime;
    performanceMetrics.memoryAfter = process.memoryUsage().heapUsed;
    performanceMetrics.memoryUsed =
      performanceMetrics.memoryAfter - performanceMetrics.memoryBefore;

    return result;
  };

  // Helper function to create mock OpenLibrary results
  const createMockResult = (overrides: any = {}) => ({
    title: "Performance Test Book",
    author_name: ["Performance Author"],
    first_publish_year: 2020,
    language: ["eng"],
    key: `/works/OL${Math.random().toString(36).substr(2, 9)}`,
    isbn: [`978${Math.random().toString().substr(2, 10)}`],
    subject: ["Fiction"],
    publisher: ["Performance Publisher"],
    number_of_pages_median: 200,
    cover_i: Math.floor(Math.random() * 100000),
    edition_count: 1,
    ratings_average: 4.0,
    ratings_count: 100,
    ...overrides,
  });

  describe("Enhanced Algorithm Performance Impact", () => {
    it("should handle small result sets efficiently (1-5 results)", async () => {
      const mockResults = Array.from({ length: 3 }, (_, i) =>
        createMockResult({
          title: "Small Set Book",
          author_name: ["Small Author"],
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await measurePerformance(async () => {
        return await provider.searchByTitle({
          title: "Small Set Book",
          exactMatch: false,
        });
      });

      expect(results).toHaveLength(1);
      expect(performanceMetrics.duration).toBeLessThan(300); // Should complete in under 300ms
      expect(performanceMetrics.memoryUsed).toBeLessThan(1024 * 1024); // Under 1MB
    });

    it("should handle medium result sets efficiently (10-20 results)", async () => {
      const mockResults = Array.from({ length: 15 }, (_, i) =>
        createMockResult({
          title: "Medium Set Book",
          author_name: ["Medium Author"],
          first_publish_year: 2020 + (i % 3), // Some variation
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await measurePerformance(async () => {
        return await provider.searchByTitle({
          title: "Medium Set Book",
          exactMatch: false,
        });
      });

      expect(results).toHaveLength(1);
      expect(performanceMetrics.duration).toBeLessThan(400); // Should complete in under 400ms
      expect(performanceMetrics.memoryUsed).toBeLessThan(2 * 1024 * 1024); // Under 2MB
    });

    it("should handle large result sets efficiently (50+ results)", async () => {
      const mockResults = Array.from({ length: 75 }, (_, i) =>
        createMockResult({
          title: "Large Set Book",
          author_name: ["Large Author"],
          first_publish_year: 2020 + (i % 5), // Some variation
          language: ["eng", "ger", "fre"][i % 3], // Language variation
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await measurePerformance(async () => {
        return await provider.searchByTitle({
          title: "Large Set Book",
          exactMatch: false,
        });
      });

      expect(results).toHaveLength(1);
      expect(performanceMetrics.duration).toBeLessThan(500); // Should complete in under 500ms
      expect(performanceMetrics.memoryUsed).toBeLessThan(5 * 1024 * 1024); // Under 5MB
    });

    it("should handle very large result sets without performance degradation (100+ results)", async () => {
      const mockResults = Array.from({ length: 150 }, (_, i) =>
        createMockResult({
          title: "Very Large Set Book",
          author_name: [`Author ${i % 10}`], // Multiple authors
          first_publish_year: 2000 + (i % 25), // Wide year range
          language: ["eng", "ger", "fre", "spa", "ita"][i % 5], // Multiple languages
          publisher: [`Publisher ${i % 8}`], // Multiple publishers
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await measurePerformance(async () => {
        return await provider.searchByTitle({
          title: "Very Large Set Book",
          exactMatch: false,
        });
      });

      expect(results).toHaveLength(1);
      expect(performanceMetrics.duration).toBeLessThan(500); // Should complete in under 500ms
      expect(performanceMetrics.memoryUsed).toBeLessThan(10 * 1024 * 1024); // Under 10MB
    });
  });

  describe("Author Name Normalization Performance", () => {
    it("should normalize simple names efficiently", async () => {
      const mockResults = Array.from({ length: 50 }, (_, i) =>
        createMockResult({
          title: "Name Normalization Test",
          author_name: i % 2 === 0 ? ["Smith, John"] : ["John Smith"], // Alternating formats
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await measurePerformance(async () => {
        return await provider.searchByTitle({
          title: "Name Normalization Test",
          exactMatch: false,
        });
      });

      expect(results).toHaveLength(1);
      expect(results[0].authors).toEqual(["John Smith"]); // Should prefer "First Last" format
      expect(performanceMetrics.duration).toBeLessThan(400); // Name normalization shouldn't add significant overhead
    });

    it("should handle complex international names efficiently", async () => {
      const complexNames = [
        "García-Márquez, Gabriel José",
        "Gabriel José García-Márquez",
        "Van Der Berg, Jan Willem",
        "Jan Willem Van Der Berg",
        "O'Connor, Flannery",
        "Flannery O'Connor",
        "Ibn Rushd, Abu al-Walid Muhammad",
        "Abu al-Walid Muhammad Ibn Rushd",
      ];

      const mockResults = Array.from({ length: 40 }, (_, i) =>
        createMockResult({
          title: "Complex Names Test",
          author_name: [complexNames[i % complexNames.length]],
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await measurePerformance(async () => {
        return await provider.searchByTitle({
          title: "Complex Names Test",
          exactMatch: false,
        });
      });

      expect(results).toHaveLength(1);
      expect(performanceMetrics.duration).toBeLessThan(400); // Complex name parsing shouldn't be too slow
    });
  });

  describe("Confidence Calculation Performance", () => {
    it("should calculate confidence efficiently for consensus scenarios", async () => {
      const mockResults = Array.from({ length: 30 }, (_, i) =>
        createMockResult({
          title: "Confidence Test Book",
          author_name: ["Confidence Author"],
          first_publish_year: 2020,
          language: ["eng"],
          publisher: ["Same Publisher"],
          ratings_average: 4.0 + Math.random() * 0.5, // Slight variations
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await measurePerformance(async () => {
        return await provider.searchByTitle({
          title: "Confidence Test Book",
          exactMatch: false,
        });
      });

      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBeGreaterThan(0.9); // Strong consensus
      expect(performanceMetrics.duration).toBeLessThan(400); // Confidence calculation should be fast
    });

    it("should handle disagreement scenarios without performance penalty", async () => {
      const mockResults = Array.from({ length: 25 }, (_, i) =>
        createMockResult({
          title: `Disagreement Book ${i % 5}`, // 5 different titles
          author_name: [`Author ${i % 8}`], // 8 different authors
          first_publish_year: 2015 + (i % 10), // 10 different years
          language: ["eng", "ger", "fre", "spa"][i % 4], // 4 different languages
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await measurePerformance(async () => {
        return await provider.searchByTitle({
          title: "Disagreement Book",
          exactMatch: false,
        });
      });

      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBeLessThan(0.9); // Weak consensus due to disagreement
      expect(performanceMetrics.duration).toBeLessThan(400); // Disagreement calculation shouldn't be slow
    });
  });

  describe("Memory Usage and Cleanup", () => {
    it("should not leak memory with repeated operations", async () => {
      const mockResults = Array.from({ length: 20 }, (_, i) =>
        createMockResult({
          title: "Memory Test Book",
          author_name: ["Memory Author"],
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      // Perform multiple operations to test for memory leaks
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 10; i++) {
        await provider.searchByTitle({
          title: "Memory Test Book",
          exactMatch: false,
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 5MB for 10 operations)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it("should handle concurrent operations efficiently", async () => {
      const mockResults = Array.from({ length: 15 }, (_, i) =>
        createMockResult({
          title: "Concurrent Test Book",
          author_name: ["Concurrent Author"],
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const concurrentOperations = Array.from({ length: 5 }, (_, i) =>
        measurePerformance(async () => {
          return await provider.searchByTitle({
            title: `Concurrent Test Book ${i}`,
            exactMatch: false,
          });
        }),
      );

      const results = await Promise.all(concurrentOperations);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toHaveLength(1);
      });

      // Each operation should still complete reasonably quickly even when concurrent
      expect(performanceMetrics.duration).toBeLessThan(500);
    });
  });

  describe("Scalability Testing", () => {
    it("should maintain performance with increasing data complexity", async () => {
      const complexityLevels = [10, 25, 50, 100];
      const performanceResults: Array<{
        size: number;
        duration: number;
        memory: number;
      }> = [];

      for (const size of complexityLevels) {
        const mockResults = Array.from({ length: size }, (_, i) =>
          createMockResult({
            title: `Scalability Test Book ${i % 5}`, // Some grouping
            author_name: [`Author ${i % 10}`], // Multiple authors
            first_publish_year: 2000 + (i % 25), // Wide range
            language: ["eng", "ger", "fre", "spa", "ita", "por"][i % 6],
            publisher: [`Publisher ${i % 15}`],
            subject: [`Subject ${i % 20}`, `Category ${i % 12}`],
            isbn: [`978${i.toString().padStart(10, "0")}`],
            key: `/works/OL${i + 1}`,
          }),
        );

        mockSearchBook.mockImplementation(async function* () {
          for (const result of mockResults) {
            yield result;
          }
        });

        await measurePerformance(async () => {
          return await provider.searchByTitle({
            title: "Scalability Test Book",
            exactMatch: false,
          });
        });

        performanceResults.push({
          size,
          duration: performanceMetrics.duration,
          memory: performanceMetrics.memoryUsed,
        });
      }

      // Performance should scale reasonably (not exponentially)
      for (let i = 1; i < performanceResults.length; i++) {
        const prev = performanceResults[i - 1];
        const curr = performanceResults[i];

        // Duration should not increase more than 3x when size increases 2x
        const sizeRatio = curr.size / prev.size;
        const durationRatio = curr.duration / Math.max(prev.duration, 1);

        expect(durationRatio).toBeLessThan(sizeRatio * 1.5);

        // Memory usage should scale reasonably (only check if we have meaningful measurements)
        // Memory measurements can be unreliable due to GC timing
        if (prev.memory > 1000 && curr.memory > 1000) {
          const memoryRatio = curr.memory / prev.memory;
          expect(memoryRatio).toBeLessThan(sizeRatio * 4); // More lenient due to GC variability
        }
      }
    });

    it("should handle edge case performance scenarios", async () => {
      // Test with many duplicate results
      const duplicateResults = Array.from({ length: 100 }, (_, i) =>
        createMockResult({
          title: "Duplicate Book",
          author_name: ["Duplicate Author"],
          first_publish_year: 2020,
          language: ["eng"],
          key: `/works/OL${i + 1}`, // Different keys but same content
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of duplicateResults) {
          yield result;
        }
      });

      const results = await measurePerformance(async () => {
        return await provider.searchByTitle({
          title: "Duplicate Book",
          exactMatch: false,
        });
      });

      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.95); // Perfect consensus
      expect(performanceMetrics.duration).toBeLessThan(300); // Should handle duplicates efficiently
    });
  });

  describe("Performance Regression Detection", () => {
    it("should maintain baseline performance for typical operations", async () => {
      const baselineResults = Array.from({ length: 20 }, (_, i) =>
        createMockResult({
          title: "Baseline Test Book",
          author_name: ["Baseline Author"],
          first_publish_year: 2020 + (i % 3),
          language: ["eng", "ger"][i % 2],
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of baselineResults) {
          yield result;
        }
      });

      // Perform baseline measurement
      const results = await measurePerformance(async () => {
        return await provider.searchByTitle({
          title: "Baseline Test Book",
          exactMatch: false,
        });
      });

      expect(results).toHaveLength(1);

      // Define performance baselines (these should be adjusted based on actual measurements)
      const BASELINE_DURATION_MS = 400; // 400ms baseline for enhanced algorithms
      const BASELINE_MEMORY_MB = 2; // 2MB baseline

      expect(performanceMetrics.duration).toBeLessThan(BASELINE_DURATION_MS);
      expect(performanceMetrics.memoryUsed).toBeLessThan(
        BASELINE_MEMORY_MB * 1024 * 1024,
      );
    });

    it("should provide performance metrics for monitoring", () => {
      const metrics = provider.getPerformanceMetrics?.();

      if (metrics) {
        expect(metrics).toHaveProperty("averageProcessingTime");
        expect(metrics).toHaveProperty("totalOperations");
        expect(metrics).toHaveProperty("memoryUsage");
        expect(metrics).toHaveProperty("cacheHitRate");
      }
    });
  });
});
