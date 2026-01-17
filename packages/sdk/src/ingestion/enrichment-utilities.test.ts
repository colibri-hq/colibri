import { sleep } from "@colibri-hq/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtractedMetadata } from "./types.js";
import { TimeoutError } from "../metadata/timeout-manager.js";
import {
  createEnrichmentSummary,
  executeProviderQueries,
  executeProviderQueriesBatched,
  filterByConfidence,
  mergeEnrichmentResults,
  type ProviderEnrichmentResult,
  withTimeout,
  withTimeoutError,
} from "./enrichment-utilities.js";

describe("enrichment-utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("withTimeout", () => {
    it("should resolve when promise completes before timeout", async () => {
      const result = await withTimeout(Promise.resolve("success"), 1000);

      expect(result).toBe("success");
    });

    it("should return null when promise times out", async () => {
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve("too-late"), 200);
      });

      const result = await withTimeout(slowPromise, 50);
      expect(result).toBeNull();
    });

    it("should call onTimeout callback when timing out", async () => {
      const onTimeout = vi.fn();
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve("too-late"), 200);
      });

      await withTimeout(slowPromise, 50, onTimeout);
      expect(onTimeout).toHaveBeenCalled();
    });

    it("should handle promise rejection", async () => {
      await expect(withTimeout(Promise.reject(new Error("failed")), 1000)).rejects.toThrow(
        "failed",
      );
    });
  });

  describe("withTimeoutError", () => {
    it("should resolve when promise completes before timeout", async () => {
      const result = await withTimeoutError(Promise.resolve("success"), 1000);

      expect(result).toBe("success");
    });

    it("should throw TimeoutError when promise times out", async () => {
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve("too-late"), 200);
      });

      await expect(withTimeoutError(slowPromise, 50, "Custom timeout message")).rejects.toThrow(
        TimeoutError,
      );
    });

    it("should include timeout duration in error", async () => {
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve("too-late"), 200);
      });

      try {
        await withTimeoutError(slowPromise, 50);
        expect.fail("Should have thrown TimeoutError");
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as TimeoutError).timeoutMs).toBe(50);
      }
    });
  });

  describe("executeProviderQueries", () => {
    it("should execute all queries in parallel", async () => {
      const queries = [
        { provider: "provider1", query: async () => ({ title: "Title from provider 1" }) },
        { provider: "provider2", query: async () => ({ title: "Title from provider 2" }) },
      ];

      const results = await executeProviderQueries(queries);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].provider).toBe("provider1");
      expect(results[1].success).toBe(true);
      expect(results[1].provider).toBe("provider2");
    });

    it("should handle provider failures without failing entire operation", async () => {
      const queries = [
        { provider: "provider1", query: async () => ({ title: "Success" }) },
        {
          provider: "provider2",
          query: async () => {
            throw new Error("Provider 2 failed");
          },
        },
        { provider: "provider3", query: async () => ({ title: "Also success" }) },
      ];

      const results = await executeProviderQueries(queries);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error?.message).toBe("Provider 2 failed");
      expect(results[2].success).toBe(true);
    });

    it("should handle provider timeouts", async () => {
      const queries = [
        { provider: "fast-provider", query: async () => ({ title: "Fast" }) },
        {
          provider: "slow-provider",
          query: async () => {
            await sleep(500);

            return { title: "Too slow" };
          },
          timeout: 100,
        },
      ];

      const results = await executeProviderQueries(queries);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeInstanceOf(TimeoutError);
    });

    it("should track duration for each provider", async () => {
      const queries = [
        {
          provider: "provider1",
          query: async () => {
            await sleep(50);

            return { title: "Success" };
          },
        },
      ];

      const results = await executeProviderQueries(queries);

      expect(results[0].duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe("executeProviderQueriesBatched", () => {
    it("should execute queries in batches", async () => {
      const executionOrder: string[] = [];

      const queries = [
        {
          provider: "provider1",
          query: async () => {
            executionOrder.push("provider1-start");
            await sleep(10);
            executionOrder.push("provider1-end");

            return { title: "Provider 1" };
          },
        },
        {
          provider: "provider2",
          query: async () => {
            executionOrder.push("provider2-start");
            await sleep(10);
            executionOrder.push("provider2-end");

            return { title: "Provider 2" };
          },
        },
        {
          provider: "provider3",
          query: async () => {
            executionOrder.push("provider3-start");
            await sleep(10);
            executionOrder.push("provider3-end");

            return { title: "Provider 3" };
          },
        },
      ];

      const results = await executeProviderQueriesBatched(queries, 2);

      expect(results).toHaveLength(3);
      // First two should start together, third starts after
      expect(executionOrder.slice(0, 2)).toContain("provider1-start");
      expect(executionOrder.slice(0, 2)).toContain("provider2-start");
    });
  });

  describe("mergeEnrichmentResults", () => {
    it("should merge results from multiple providers", () => {
      const results: ProviderEnrichmentResult[] = [
        {
          provider: "provider1",
          success: true,
          metadata: { title: "Book Title", language: "en" },
          confidence: 0.8,
          duration: 100,
        },
        {
          provider: "provider2",
          success: true,
          metadata: { synopsis: "A great book", numberOfPages: 300 },
          confidence: 0.7,
          duration: 150,
        },
      ];

      const merged = mergeEnrichmentResults(results);

      expect(merged.enriched.title).toBe("Book Title");
      expect(merged.enriched.synopsis).toBe("A great book");
      expect(merged.enriched.language).toBe("en");
      expect(merged.enriched.numberOfPages).toBe(300);
      expect(merged.sources).toEqual(["provider1", "provider2"]);
    });

    it("should prioritize higher confidence values", () => {
      const results: ProviderEnrichmentResult[] = [
        {
          provider: "provider1",
          success: true,
          metadata: { title: "Low Confidence Title" },
          confidence: 0.5,
          duration: 100,
        },
        {
          provider: "provider2",
          success: true,
          metadata: { title: "High Confidence Title" },
          confidence: 0.9,
          duration: 150,
        },
      ];

      const merged = mergeEnrichmentResults(results);

      expect(merged.enriched.title).toBe("High Confidence Title");
      expect(merged.confidence.title).toBe(0.9);
    });

    it("should merge and deduplicate contributors", () => {
      const results: ProviderEnrichmentResult[] = [
        {
          provider: "provider1",
          success: true,
          metadata: {
            contributors: [
              { name: "John Doe", roles: ["author"] },
              { name: "Jane Smith", roles: ["editor"] },
            ],
          },
          confidence: 0.8,
          duration: 100,
        },
        {
          provider: "provider2",
          success: true,
          metadata: {
            contributors: [
              { name: "John Doe", roles: ["author"] }, // Duplicate
              { name: "Bob Johnson", roles: ["illustrator"] },
            ],
          },
          confidence: 0.7,
          duration: 150,
        },
      ];

      const merged = mergeEnrichmentResults(results);

      expect(merged.enriched.contributors).toHaveLength(3);
      expect(merged.enriched.contributors?.map((c) => c.name)).toContain("John Doe");
      expect(merged.enriched.contributors?.map((c) => c.name)).toContain("Jane Smith");
      expect(merged.enriched.contributors?.map((c) => c.name)).toContain("Bob Johnson");
    });

    it("should merge and deduplicate subjects", () => {
      const results: ProviderEnrichmentResult[] = [
        {
          provider: "provider1",
          success: true,
          metadata: { subjects: ["Fiction", "Mystery"] },
          confidence: 0.8,
          duration: 100,
        },
        {
          provider: "provider2",
          success: true,
          metadata: {
            subjects: ["Mystery", "Thriller"], // Mystery is duplicate
          },
          confidence: 0.7,
          duration: 150,
        },
      ];

      const merged = mergeEnrichmentResults(results);

      expect(merged.enriched.subjects).toHaveLength(3);
      expect(merged.enriched.subjects).toContain("Fiction");
      expect(merged.enriched.subjects).toContain("Mystery");
      expect(merged.enriched.subjects).toContain("Thriller");
    });

    it("should merge and deduplicate identifiers", () => {
      const results: ProviderEnrichmentResult[] = [
        {
          provider: "provider1",
          success: true,
          metadata: {
            identifiers: [
              { type: "isbn", value: "1234567890" },
              { type: "asin", value: "B001234567" },
            ],
          },
          confidence: 0.8,
          duration: 100,
        },
        {
          provider: "provider2",
          success: true,
          metadata: {
            identifiers: [
              { type: "isbn", value: "1234567890" }, // Duplicate
              { type: "goodreads", value: "gr123456" },
            ],
          },
          confidence: 0.7,
          duration: 150,
        },
      ];

      const merged = mergeEnrichmentResults(results);

      expect(merged.enriched.identifiers).toHaveLength(3);
    });

    it("should ignore failed providers", () => {
      const results: ProviderEnrichmentResult[] = [
        {
          provider: "provider1",
          success: true,
          metadata: { title: "Success" },
          confidence: 0.8,
          duration: 100,
        },
        { provider: "provider2", success: false, error: new Error("Failed"), duration: 50 },
      ];

      const merged = mergeEnrichmentResults(results);

      expect(merged.enriched.title).toBe("Success");
      expect(merged.sources).toEqual(["provider1"]);
    });

    it("should return empty result when all providers fail", () => {
      const results: ProviderEnrichmentResult[] = [
        { provider: "provider1", success: false, error: new Error("Failed"), duration: 50 },
        { provider: "provider2", success: false, error: new Error("Also failed"), duration: 50 },
      ];

      const merged = mergeEnrichmentResults(results);

      expect(merged.enriched).toEqual({});
      expect(merged.sources).toEqual([]);
      expect(merged.confidence).toEqual({});
    });
  });

  describe("filterByConfidence", () => {
    it("should filter out fields below confidence threshold", () => {
      const enrichment = {
        enriched: {
          title: "Book Title",
          synopsis: "Low confidence synopsis",
          language: "en",
        } as Partial<ExtractedMetadata>,
        sources: ["provider1"],
        confidence: { title: 0.9, synopsis: 0.3, language: 0.7 },
      };

      const filtered = filterByConfidence(enrichment, 0.5);

      expect(filtered.enriched.title).toBe("Book Title");
      expect(filtered.enriched.synopsis).toBeUndefined();
      expect(filtered.enriched.language).toBe("en");
    });

    it("should keep all fields when confidence is above threshold", () => {
      const enrichment = {
        enriched: { title: "Book Title", language: "en" } as Partial<ExtractedMetadata>,
        sources: ["provider1"],
        confidence: { title: 0.9, language: 0.8 },
      };

      const filtered = filterByConfidence(enrichment, 0.5);

      expect(Object.keys(filtered.enriched)).toHaveLength(2);
    });
  });

  describe("createEnrichmentSummary", () => {
    it("should create comprehensive summary", () => {
      const results: ProviderEnrichmentResult[] = [
        {
          provider: "provider1",
          success: true,
          metadata: { title: "Title" },
          confidence: 0.8,
          duration: 100,
        },
        { provider: "provider2", success: false, error: new Error("Network error"), duration: 50 },
        {
          provider: "provider3",
          success: false,
          error: new TimeoutError("Timeout", 5000),
          duration: 5000,
        },
      ];

      const enrichment = {
        enriched: { title: "Title", language: "en" } as Partial<ExtractedMetadata>,
        sources: ["provider1"],
        confidence: { title: 0.8, language: 0.6 },
      };

      const summary = createEnrichmentSummary(results, enrichment);

      expect(summary.totalProviders).toBe(3);
      expect(summary.successfulProviders).toBe(1);
      expect(summary.failedProviders).toBe(2);
      expect(summary.timeoutProviders).toBe(1);
      expect(summary.fieldsEnriched).toBe(2);
      expect(summary.averageConfidence).toBe(0.7);
      expect(summary.totalDuration).toBe(5150);
      expect(summary.errors).toHaveLength(2);
      expect(summary.errors[0].provider).toBe("provider2");
      expect(summary.errors[0].error).toBe("Network error");
    });

    it("should handle all successful providers", () => {
      const results: ProviderEnrichmentResult[] = [
        {
          provider: "provider1",
          success: true,
          metadata: { title: "Title" },
          confidence: 0.8,
          duration: 100,
        },
        {
          provider: "provider2",
          success: true,
          metadata: { language: "en" },
          confidence: 0.7,
          duration: 120,
        },
      ];

      const enrichment = mergeEnrichmentResults(results);
      const summary = createEnrichmentSummary(results, enrichment);

      expect(summary.successfulProviders).toBe(2);
      expect(summary.failedProviders).toBe(0);
      expect(summary.timeoutProviders).toBe(0);
      expect(summary.errors).toHaveLength(0);
    });
  });
});
