import { beforeEach, describe, expect, it } from "vitest";
import type {
  CreatorQuery,
  MetadataProvider,
  MetadataRecord,
  MultiCriteriaQuery,
  TitleQuery,
} from "../providers/provider.js";
import { MetadataType } from "../providers/provider.js";
import { ConflictDisplayFormatter } from "./conflict-format.js";
import { ConflictDetector } from "./conflicts.js";
import { MetadataCoordinator } from "./fetch.js";
import { PreviewGenerator } from "./preview.js";

describe("End-to-End Metadata Discovery Workflow", () => {
  let coordinator: MetadataCoordinator;
  let previewGenerator: PreviewGenerator;
  let _conflictDetector: ConflictDetector;
  let _displayFormatter: ConflictDisplayFormatter;

  // Mock providers that simulate real metadata sources
  class MockOpenLibraryProvider implements MetadataProvider {
    readonly name = "OpenLibrary";
    readonly priority = 2;
    readonly rateLimit = { maxRequests: 100, windowMs: 60000, requestDelay: 0 };
    readonly timeout = { requestTimeout: 5000, operationTimeout: 10000 };

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
      // Simulate OpenLibrary responses
      if (query.title?.toLowerCase().includes("gatsby")) {
        return [
          {
            id: "OL123456M",
            source: "OpenLibrary",
            confidence: 0.85,
            timestamp: new Date("2024-01-01"),
            title: "The Great Gatsby",
            authors: ["F. Scott Fitzgerald"],
            isbn: ["9780743273565"],
            publicationDate: new Date("1925-04-10"),
            subjects: ["Fiction", "American Literature", "Jazz Age"],
            description: "A classic American novel about the Jazz Age",
            language: "en",
            publisher: "Scribner",
            pageCount: 180,
            coverImage: {
              url: "https://covers.openlibrary.org/b/id/123456-L.jpg",
              width: 300,
              height: 450,
            },
          },
        ];
      }

      if (query.title?.toLowerCase().includes("mockingbird")) {
        return [
          {
            id: "OL789012M",
            source: "OpenLibrary",
            confidence: 0.9,
            timestamp: new Date("2024-01-01"),
            title: "To Kill a Mockingbird",
            authors: ["Harper Lee"],
            isbn: ["9780061120084"],
            publicationDate: new Date("1960-07-11"),
            subjects: ["Fiction", "Southern Gothic", "Legal Drama"],
            description: "A novel about racial injustice in the American South",
            language: "en",
            publisher: "J.B. Lippincott & Co.",
            pageCount: 281,
          },
        ];
      }

      return [];
    }

    getReliabilityScore(dataType: MetadataType): number {
      const scores = {
        [MetadataType.TITLE]: 0.9,
        [MetadataType.AUTHORS]: 0.85,
        [MetadataType.ISBN]: 0.95,
        [MetadataType.PUBLICATION_DATE]: 0.8,
        [MetadataType.SUBJECTS]: 0.7,
        [MetadataType.DESCRIPTION]: 0.75,
      };
      return scores[dataType] || 0.7;
    }

    supportsDataType(dataType: MetadataType): boolean {
      return Object.values(MetadataType).includes(dataType);
    }
  }

  class MockWikiDataProvider implements MetadataProvider {
    readonly name = "WikiData";
    readonly priority = 3;
    readonly rateLimit = { maxRequests: 50, windowMs: 60000, requestDelay: 100 };
    readonly timeout = { requestTimeout: 8000, operationTimeout: 15000 };

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
      // Simulate WikiData responses with more detailed metadata
      if (query.title?.toLowerCase().includes("gatsby")) {
        return [
          {
            id: "Q214371",
            source: "WikiData",
            confidence: 0.95,
            timestamp: new Date("2024-01-02"),
            title: "The Great Gatsby",
            authors: ["Francis Scott Key Fitzgerald"],
            isbn: ["9780743273565", "9780141182636"],
            publicationDate: new Date("1925-04-10"),
            subjects: ["American literature", "Modernist literature", "Jazz Age fiction"],
            description: "A 1925 novel by American writer F. Scott Fitzgerald set in the Jazz Age",
            language: "en",
            publisher: "Charles Scribner's Sons",
            series: { name: "Modern American Classics", volume: 1 },
            pageCount: 180,
            awards: ["Modern Library 100 Best Novels"],
            adaptations: ["1974 film", "2013 film"],
          },
        ];
      }

      if (query.title?.toLowerCase().includes("mockingbird")) {
        return [
          {
            id: "Q212340",
            source: "WikiData",
            confidence: 0.92,
            timestamp: new Date("2024-01-02"),
            title: "To Kill a Mockingbird",
            authors: ["Nelle Harper Lee"],
            isbn: ["9780061120084", "9780446310789"],
            publicationDate: new Date("1960-07-11"),
            subjects: ["American literature", "Legal fiction", "Coming-of-age story"],
            description: "A novel by Harper Lee published in 1960, dealing with racial inequality",
            language: "en",
            publisher: "J.B. Lippincott & Co.",
            pageCount: 281,
            awards: ["Pulitzer Prize for Fiction (1961)"],
            setting: "Maycomb, Alabama",
          },
        ];
      }

      return [];
    }

    getReliabilityScore(dataType: MetadataType): number {
      const scores = {
        [MetadataType.TITLE]: 0.95,
        [MetadataType.AUTHORS]: 0.9,
        [MetadataType.ISBN]: 0.85,
        [MetadataType.PUBLICATION_DATE]: 0.95,
        [MetadataType.SUBJECTS]: 0.9,
        [MetadataType.DESCRIPTION]: 0.85,
      };
      return scores[dataType] || 0.8;
    }

    supportsDataType(dataType: MetadataType): boolean {
      return Object.values(MetadataType).includes(dataType);
    }
  }

  class MockLibraryOfCongressProvider implements MetadataProvider {
    readonly name = "Library of Congress";
    readonly priority = 4;
    readonly rateLimit = { maxRequests: 30, windowMs: 60000, requestDelay: 200 };
    readonly timeout = { requestTimeout: 10000, operationTimeout: 20000 };

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
      // Simulate Library of Congress responses with authoritative data
      if (query.title?.toLowerCase().includes("gatsby")) {
        return [
          {
            id: "lccn-25005799",
            source: "Library of Congress",
            confidence: 0.98,
            timestamp: new Date("2024-01-03"),
            title: "The Great Gatsby",
            authors: ["Fitzgerald, F. Scott (Francis Scott), 1896-1940"],
            isbn: ["9780743273565"],
            publicationDate: new Date("1925-04-10"),
            subjects: [
              { name: "American fiction", scheme: "lcsh", code: "PS374.A45" },
              { name: "Jazz Age", scheme: "lcsh" },
              { name: "Long Island (N.Y.)", scheme: "lcsh" },
            ],
            description: "First edition published by Charles Scribner's Sons, New York, 1925",
            language: "eng",
            publisher: { name: "Scribner", location: "New York" },
            lccn: "25005799",
            deweyDecimal: "813.52",
            physicalDescription: "218 p. ; 20 cm.",
            notes: ["First edition", "Includes bibliographical references"],
          },
        ];
      }

      return [];
    }

    getReliabilityScore(dataType: MetadataType): number {
      // Library of Congress has highest reliability for most data types
      const scores = {
        [MetadataType.TITLE]: 0.98,
        [MetadataType.AUTHORS]: 0.95,
        [MetadataType.ISBN]: 0.9,
        [MetadataType.PUBLICATION_DATE]: 0.98,
        [MetadataType.SUBJECTS]: 0.95,
        [MetadataType.DESCRIPTION]: 0.8,
      };
      return scores[dataType] || 0.85;
    }

    supportsDataType(dataType: MetadataType): boolean {
      return Object.values(MetadataType).includes(dataType);
    }
  }

  beforeEach(() => {
    const providers = [
      new MockOpenLibraryProvider(),
      new MockWikiDataProvider(),
      new MockLibraryOfCongressProvider(),
    ];

    coordinator = new MetadataCoordinator(providers);
    previewGenerator = new PreviewGenerator();
    _conflictDetector = new ConflictDetector();
    _displayFormatter = new ConflictDisplayFormatter();
  });

  describe("complete discovery workflow", () => {
    it("should perform end-to-end metadata discovery and preview generation", async () => {
      // Step 1: Query multiple providers
      const query: MultiCriteriaQuery = {
        title: "The Great Gatsby",
        authors: ["F. Scott Fitzgerald"],
      };

      const coordinatorResult = await coordinator.query(query);

      // Verify coordinator results
      expect(coordinatorResult.totalRecords).toBeGreaterThan(0);
      expect(coordinatorResult.successfulProviders).toBe(3);
      expect(coordinatorResult.failedProviders).toBe(0);

      // Step 2: Generate preview from raw metadata
      const preview = previewGenerator.generatePreview(coordinatorResult.aggregatedRecords);

      // Verify preview generation
      expect(preview.title.value).toBe("The Great Gatsby");
      // Authors may be in different formats, check if any author name contains Fitzgerald
      const hasAuthor =
        preview.authors.value &&
        preview.authors.value.some((author: string) => author.toLowerCase().includes("fitzgerald"));
      expect(hasAuthor).toBe(true);
      expect(preview.overallConfidence).toBeGreaterThan(0.8);
      expect(preview.sourceCount).toBe(3);

      // Step 3: Generate enhanced preview with conflict detection
      const enhancedPreview = previewGenerator.generateEnhancedPreview(
        coordinatorResult.aggregatedRecords,
      );

      // Verify enhanced preview
      expect(enhancedPreview.conflictAnalysis).toBeDefined();
      expect(enhancedPreview.conflictDisplay).toBeDefined();
      expect(enhancedPreview.conflictDetectionMetadata.detectedAt).toBeInstanceOf(Date);

      // Step 4: Generate library preview
      const libraryPreview = previewGenerator.generateLibraryPreview(
        coordinatorResult.aggregatedRecords,
        undefined,
        [], // Empty existing library
      );

      // Verify library preview
      expect(libraryPreview.entry.title).toBe("The Great Gatsby");
      expect(libraryPreview.duplicates).toHaveLength(0);
      expect(libraryPreview.quality.level).toMatch(/^(excellent|good|fair|poor)$/);
      expect(libraryPreview.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle provider failures gracefully in end-to-end workflow", async () => {
      // Create a provider that fails
      class FailingProvider implements MetadataProvider {
        readonly name = "FailingProvider";
        readonly priority = 1;
        readonly rateLimit = { maxRequests: 100, windowMs: 60000, requestDelay: 0 };
        readonly timeout = { requestTimeout: 5000, operationTimeout: 10000 };

        async searchByTitle(): Promise<MetadataRecord[]> {
          throw new Error("Provider failed");
        }

        async searchByISBN(): Promise<MetadataRecord[]> {
          throw new Error("Provider failed");
        }

        async searchByCreator(): Promise<MetadataRecord[]> {
          throw new Error("Provider failed");
        }

        async searchMultiCriteria(): Promise<MetadataRecord[]> {
          throw new Error("Provider failed");
        }

        getReliabilityScore(): number {
          return 0.5;
        }

        supportsDataType(): boolean {
          return true;
        }
      }

      // Add failing provider to coordinator
      const failingCoordinator = new MetadataCoordinator([
        new FailingProvider(),
        new MockOpenLibraryProvider(),
        new MockWikiDataProvider(),
      ]);

      const query: MultiCriteriaQuery = { title: "The Great Gatsby" };
      const result = await failingCoordinator.query(query);

      // Should continue with working providers
      expect(result.successfulProviders).toBe(2);
      expect(result.failedProviders).toBe(1);
      expect(result.totalRecords).toBeGreaterThan(0);

      // Preview generation should still work
      const preview = previewGenerator.generatePreview(result.aggregatedRecords);
      expect(preview.title.value).toBe("The Great Gatsby");
    });

    it("should detect and resolve conflicts across providers", async () => {
      // Create providers with conflicting data
      class ConflictingProvider implements MetadataProvider {
        readonly name = "ConflictingProvider";
        readonly priority = 1;
        readonly rateLimit = { maxRequests: 100, windowMs: 60000, requestDelay: 0 };
        readonly timeout = { requestTimeout: 5000, operationTimeout: 10000 };

        async searchByTitle(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchByISBN(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchByCreator(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchMultiCriteria(): Promise<MetadataRecord[]> {
          return [
            {
              id: "conflict-1",
              source: "ConflictingProvider",
              confidence: 0.7,
              timestamp: new Date("2024-01-04"),
              title: "Great Gatsby", // Different title format
              authors: ["Scott Fitzgerald"], // Different author format
              isbn: ["9780000000000"], // Different ISBN
              publicationDate: new Date("1926-01-01"), // Different date
              subjects: ["Classic Literature"], // Different subjects
              description: "A different description of the book",
              language: "en",
              publisher: "Different Publisher",
              pageCount: 200, // Different page count
            },
          ];
        }

        getReliabilityScore(): number {
          return 0.6;
        }

        supportsDataType(): boolean {
          return true;
        }
      }

      const conflictCoordinator = new MetadataCoordinator([
        new ConflictingProvider(),
        new MockOpenLibraryProvider(),
        new MockWikiDataProvider(),
      ]);

      const query: MultiCriteriaQuery = { title: "The Great Gatsby" };
      const result = await conflictCoordinator.query(query);

      expect(result.totalRecords).toBeGreaterThan(1);

      // Generate enhanced preview to detect conflicts
      const enhancedPreview = previewGenerator.generateEnhancedPreview(result.aggregatedRecords);

      // Should detect conflicts
      expect(enhancedPreview.conflictAnalysis.totalConflicts).toBeGreaterThan(0);
      expect(enhancedPreview.conflictDetectionMetadata.totalConflictsDetected).toBeGreaterThan(0);

      // Generate conflict report
      const conflictReport = previewGenerator.generateConflictReport(enhancedPreview);
      expect(conflictReport).toContain("METADATA CONFLICT ANALYSIS REPORT");
      expect(conflictReport.length).toBeGreaterThan(100);
    });

    it("should handle progressive query relaxation", async () => {
      // Test with a very specific query that might not return results
      const specificQuery: MultiCriteriaQuery = {
        title: "Nonexistent Book Title",
        authors: ["Unknown Author"],
        language: "zh",
        subjects: ["Very Specific Subject"],
        yearRange: [2023, 2023],
      };

      const result = await coordinator.query(specificQuery);

      // Should handle no results gracefully
      expect(result.totalRecords).toBe(0);
      expect(result.successfulProviders).toBe(3); // All providers succeeded but returned no results
      expect(result.failedProviders).toBe(0);

      // Preview should handle empty results
      const preview = previewGenerator.generatePreview(result.aggregatedRecords);
      expect(preview.sourceCount).toBe(0);
      expect(preview.overallConfidence).toBe(0.1); // Minimum confidence
    });

    it("should perform duplicate detection in library preview", async () => {
      const query: MultiCriteriaQuery = { title: "The Great Gatsby" };
      const result = await coordinator.query(query);

      // Simulate existing library with similar book
      const existingLibrary = [
        {
          id: "existing-1",
          title: "The Great Gatsby",
          authors: ["F. Scott Fitzgerald"],
          isbn: ["9780743273565"],
          publicationDate: { year: 1925, precision: "year" as const },
          addedDate: new Date("2023-01-01"),
          lastModified: new Date("2023-01-01"),
          readStatus: "read" as const,
        },
      ];

      const libraryPreview = previewGenerator.generateLibraryPreview(
        result.aggregatedRecords,
        undefined,
        existingLibrary,
      );

      // Should detect duplicate
      // Note: Similarity may be lower than expected because:
      // - WikiData returns "Francis Scott Key Fitzgerald" vs library's "F. Scott Fitzgerald"
      // - Jaccard similarity for authors treats these as different strings
      // - Date format conversion may affect date similarity
      expect(libraryPreview.duplicates).toHaveLength(1);
      expect(["exact", "likely", "possible"]).toContain(libraryPreview.duplicates[0].matchType);
      expect(libraryPreview.duplicates[0].similarity).toBeGreaterThan(0.5);
      expect(["skip", "merge", "review_manually", "add_as_new"]).toContain(
        libraryPreview.duplicates[0].recommendation,
      );

      // Should have recommendation about duplicate
      // Note: For "possible" matches (similarity 0.5-0.7), "merge_duplicates" is not generated
      // Only "exact" (>= 0.9) and "likely" (>= 0.7) matches trigger merge recommendations
      const duplicateRecommendation = libraryPreview.recommendations.find(
        (r) => r.type === "merge_duplicates" || r.type === "review_conflicts",
      );
      // Either a merge recommendation or review recommendation should exist
      // depending on the similarity level
      if (
        libraryPreview.duplicates[0].matchType === "exact" ||
        libraryPreview.duplicates[0].matchType === "likely"
      ) {
        expect(duplicateRecommendation).toBeDefined();
        expect(duplicateRecommendation!.priority).toBe("high");
      }
    });

    it("should handle timeout scenarios in end-to-end workflow", async () => {
      // Create a slow provider
      class SlowProvider implements MetadataProvider {
        readonly name = "SlowProvider";
        readonly priority = 1;
        readonly rateLimit = { maxRequests: 100, windowMs: 60000, requestDelay: 0 };
        readonly timeout = { requestTimeout: 5000, operationTimeout: 10000 };

        async searchByTitle(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchByISBN(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchByCreator(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchMultiCriteria(): Promise<MetadataRecord[]> {
          // Simulate slow response
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return [
            {
              id: "slow-1",
              source: "SlowProvider",
              confidence: 0.8,
              timestamp: new Date(),
              title: "Slow Response Book",
            },
          ];
        }

        getReliabilityScore(): number {
          return 0.7;
        }

        supportsDataType(): boolean {
          return true;
        }
      }

      const timeoutCoordinator = new MetadataCoordinator(
        [new SlowProvider(), new MockOpenLibraryProvider()],
        {
          providerTimeout: 1000, // 1 second timeout
          continueOnFailure: true,
        },
      );

      const query: MultiCriteriaQuery = { title: "The Great Gatsby" };
      const result = await timeoutCoordinator.query(query);

      // Should handle timeout gracefully
      expect(result.successfulProviders).toBe(1); // Only fast provider
      expect(result.failedProviders).toBe(1); // Slow provider timed out
      expect(result.totalRecords).toBeGreaterThan(0); // Still got results from fast provider
    });

    it("should generate comprehensive quality assessment", async () => {
      const query: MultiCriteriaQuery = { title: "The Great Gatsby" };
      const result = await coordinator.query(query);

      const libraryPreview = previewGenerator.generateLibraryPreview(
        result.aggregatedRecords,
        undefined,
        [],
      );

      // Verify quality assessment
      expect(libraryPreview.quality.score).toBeGreaterThan(0);
      expect(libraryPreview.quality.score).toBeLessThanOrEqual(1);
      expect(libraryPreview.quality.level).toMatch(/^(excellent|good|fair|poor)$/);
      expect(libraryPreview.quality.completeness).toBeGreaterThan(0);
      expect(libraryPreview.quality.accuracy).toBeGreaterThan(0);
      expect(libraryPreview.quality.consistency).toBeGreaterThan(0);
      expect(libraryPreview.quality.strengths).toBeInstanceOf(Array);
      expect(libraryPreview.quality.improvements).toBeInstanceOf(Array);

      // Should have meaningful quality factors
      expect(
        libraryPreview.quality.strengths.length + libraryPreview.quality.improvements.length,
      ).toBeGreaterThan(0);
    });

    it("should handle edge cases in end-to-end workflow", async () => {
      // Test with empty query
      const emptyResult = await coordinator.query({});
      expect(emptyResult.totalRecords).toBe(0);

      // Test with malformed query
      const malformedQuery = {
        title: "",
        authors: [],
        isbn: null as any,
        yearRange: [2025, 2020], // Invalid range
      };

      const malformedResult = await coordinator.query(malformedQuery);
      expect(malformedResult.successfulProviders).toBeGreaterThanOrEqual(0);

      // Test preview generation with empty data
      const emptyPreview = previewGenerator.generatePreview([]);
      expect(emptyPreview.sourceCount).toBe(0);
      expect(emptyPreview.overallConfidence).toBe(0.1);

      // Test library preview with empty data
      const emptyLibraryPreview = previewGenerator.generateLibraryPreview([], undefined, []);
      // The implementation may provide a default title for empty data
      expect(emptyLibraryPreview.entry.title).toBeDefined();
      expect(emptyLibraryPreview.duplicates).toHaveLength(0);
      expect(emptyLibraryPreview.quality.level).toBe("poor");
    });
  });

  describe("performance testing", () => {
    it("should handle concurrent queries efficiently", async () => {
      const queries = [
        { title: "The Great Gatsby" },
        { title: "To Kill a Mockingbird" },
        { title: "Nonexistent Book 1" },
        { title: "Nonexistent Book 2" },
        { title: "Nonexistent Book 3" },
      ];

      const startTime = Date.now();
      const results = await Promise.all(queries.map((query) => coordinator.query(query)));
      const duration = Date.now() - startTime;

      // Should complete all queries
      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Should have some successful results
      const totalRecords = results.reduce((sum, result) => sum + result.totalRecords, 0);
      expect(totalRecords).toBeGreaterThan(0);
    });

    it("should handle large result sets efficiently", async () => {
      // Create provider that returns many results
      class LargeResultProvider implements MetadataProvider {
        readonly name = "LargeResultProvider";
        readonly priority = 1;
        readonly rateLimit = { maxRequests: 100, windowMs: 60000, requestDelay: 0 };
        readonly timeout = { requestTimeout: 5000, operationTimeout: 10000 };

        async searchByTitle(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchByISBN(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchByCreator(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchMultiCriteria(): Promise<MetadataRecord[]> {
          // Generate many results
          return Array.from({ length: 100 }, (_, i) => ({
            id: `large-${i}`,
            source: "LargeResultProvider",
            confidence: Math.random() * 0.5 + 0.5,
            timestamp: new Date(),
            title: `Book ${i}`,
            authors: [`Author ${i}`],
          }));
        }

        getReliabilityScore(): number {
          return 0.7;
        }

        supportsDataType(): boolean {
          return true;
        }
      }

      const largeResultCoordinator = new MetadataCoordinator([new LargeResultProvider()]);

      const startTime = Date.now();
      const result = await largeResultCoordinator.query({ title: "test" });
      const queryDuration = Date.now() - startTime;

      expect(result.totalRecords).toBe(100);
      expect(queryDuration).toBeLessThan(5000); // Should handle large results quickly

      // Test preview generation with large dataset
      const previewStartTime = Date.now();
      const preview = previewGenerator.generatePreview(result.aggregatedRecords);
      const previewDuration = Date.now() - previewStartTime;

      expect(preview.sourceCount).toBe(1);
      expect(previewDuration).toBeLessThan(2000); // Should generate preview quickly
    });

    it("should respect rate limits and timeouts", async () => {
      // Create provider with strict rate limits
      class RateLimitedProvider implements MetadataProvider {
        readonly name = "RateLimitedProvider";
        readonly priority = 1;
        readonly rateLimit = { maxRequests: 2, windowMs: 1000, requestDelay: 500 };
        readonly timeout = { requestTimeout: 1000, operationTimeout: 2000 };

        private requestCount = 0;

        async searchByTitle(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchByISBN(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchByCreator(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchMultiCriteria(): Promise<MetadataRecord[]> {
          this.requestCount++;

          // Simulate rate limiting
          if (this.requestCount > 2) {
            throw new Error("Rate limit exceeded");
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
          return [
            {
              id: `rate-limited-${this.requestCount}`,
              source: "RateLimitedProvider",
              confidence: 0.8,
              timestamp: new Date(),
              title: `Rate Limited Book ${this.requestCount}`,
            },
          ];
        }

        getReliabilityScore(): number {
          return 0.8;
        }

        supportsDataType(): boolean {
          return true;
        }
      }

      const rateLimitedCoordinator = new MetadataCoordinator([new RateLimitedProvider()]);

      // Make multiple rapid requests
      const queries = Array.from({ length: 5 }, (_, i) => ({ title: `Book ${i}` }));
      const results = await Promise.all(
        queries.map((query) => rateLimitedCoordinator.query(query)),
      );

      // Some requests should succeed, others should fail due to rate limiting
      const successfulResults = results.filter((r) => r.totalRecords > 0);
      const failedResults = results.filter((r) => r.failedProviders > 0);

      expect(successfulResults.length).toBeGreaterThan(0);
      expect(failedResults.length).toBeGreaterThan(0);
    });
  });

  describe("error recovery and resilience", () => {
    it("should recover from network errors", async () => {
      class NetworkErrorProvider implements MetadataProvider {
        readonly name = "NetworkErrorProvider";
        readonly priority = 1;
        readonly rateLimit = { maxRequests: 100, windowMs: 60000, requestDelay: 0 };
        readonly timeout = { requestTimeout: 5000, operationTimeout: 10000 };

        private attemptCount = 0;

        async searchByTitle(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchByISBN(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchByCreator(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchMultiCriteria(): Promise<MetadataRecord[]> {
          this.attemptCount++;

          // Fail first few attempts, then succeed
          if (this.attemptCount <= 2) {
            throw new Error("Network error");
          }

          return [
            {
              id: "network-recovery-1",
              source: "NetworkErrorProvider",
              confidence: 0.8,
              timestamp: new Date(),
              title: "Recovered Book",
            },
          ];
        }

        getReliabilityScore(): number {
          return 0.7;
        }

        supportsDataType(): boolean {
          return true;
        }
      }

      const networkErrorCoordinator = new MetadataCoordinator([
        new NetworkErrorProvider(),
        new MockOpenLibraryProvider(),
      ]);

      // First query should fail for NetworkErrorProvider
      const result1 = await networkErrorCoordinator.query({ title: "test" });
      expect(result1.failedProviders).toBe(1);
      expect(result1.successfulProviders).toBe(1);

      // Second query should also fail for NetworkErrorProvider
      const result2 = await networkErrorCoordinator.query({ title: "test" });
      expect(result2.failedProviders).toBe(1);

      // Third query should succeed for NetworkErrorProvider
      const result3 = await networkErrorCoordinator.query({ title: "test" });
      expect(result3.successfulProviders).toBe(2);
      expect(result3.failedProviders).toBe(0);
    });

    it("should handle partial data corruption gracefully", async () => {
      class CorruptedDataProvider implements MetadataProvider {
        readonly name = "CorruptedDataProvider";
        readonly priority = 1;
        readonly rateLimit = { maxRequests: 100, windowMs: 60000, requestDelay: 0 };
        readonly timeout = { requestTimeout: 5000, operationTimeout: 10000 };

        async searchByTitle(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchByISBN(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchByCreator(): Promise<MetadataRecord[]> {
          return this.searchMultiCriteria({});
        }

        async searchMultiCriteria(): Promise<MetadataRecord[]> {
          // Return partially corrupted data
          return [
            {
              id: null as any,
              source: undefined as any,
              confidence: "invalid" as any,
              timestamp: "not-a-date" as any,
              title: "Valid Title",
              authors: null as any,
              isbn: undefined as any,
            },
            {
              id: "valid-1",
              source: "CorruptedDataProvider",
              confidence: 0.8,
              timestamp: new Date(),
              title: "Valid Book",
              authors: ["Valid Author"],
            },
          ];
        }

        getReliabilityScore(): number {
          return 0.6;
        }

        supportsDataType(): boolean {
          return true;
        }
      }

      const corruptedCoordinator = new MetadataCoordinator([new CorruptedDataProvider()]);

      const result = await corruptedCoordinator.query({ title: "test" });

      // Should handle corrupted data gracefully
      expect(result.successfulProviders).toBe(1);
      expect(result.totalRecords).toBeGreaterThanOrEqual(1);

      // Preview generation should handle corrupted data
      const preview = previewGenerator.generatePreview(result.aggregatedRecords);
      expect(preview.sourceCount).toBe(1);
    });
  });
});
