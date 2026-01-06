import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WikiDataMetadataProvider } from "./wikidata.js";
import { OpenLibraryMetadataProvider } from "./open-library.js";

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

describe("WikiData Error Handling Pattern Consistency", () => {
  let wikidataProvider: WikiDataMetadataProvider;
  let openLibraryProvider: OpenLibraryMetadataProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    wikidataProvider = new WikiDataMetadataProvider(mockFetch);
    openLibraryProvider = new OpenLibraryMetadataProvider(mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Error Handling Pattern Consistency", () => {
    it("should use the same rate limiting integration pattern", () => {
      // Both providers should use the same rate limiting configuration structure
      expect(wikidataProvider.rateLimit).toHaveProperty("maxRequests");
      expect(wikidataProvider.rateLimit).toHaveProperty("windowMs");
      expect(wikidataProvider.rateLimit).toHaveProperty("requestDelay");

      expect(openLibraryProvider.rateLimit).toHaveProperty("maxRequests");
      expect(openLibraryProvider.rateLimit).toHaveProperty("windowMs");
      expect(openLibraryProvider.rateLimit).toHaveProperty("requestDelay");

      // Both should use the same timeout configuration structure
      expect(wikidataProvider.timeout).toHaveProperty("requestTimeout");
      expect(wikidataProvider.timeout).toHaveProperty("operationTimeout");

      expect(openLibraryProvider.timeout).toHaveProperty("requestTimeout");
      expect(openLibraryProvider.timeout).toHaveProperty("operationTimeout");
    });

    it("should use the same timeout management integration", () => {
      // Both providers should use the same timeout configuration pattern
      expect(typeof wikidataProvider.timeout.requestTimeout).toBe("number");
      expect(typeof wikidataProvider.timeout.operationTimeout).toBe("number");
      expect(wikidataProvider.timeout.requestTimeout).toBeGreaterThan(0);
      expect(wikidataProvider.timeout.operationTimeout).toBeGreaterThan(
        wikidataProvider.timeout.requestTimeout,
      );

      expect(typeof openLibraryProvider.timeout.requestTimeout).toBe("number");
      expect(typeof openLibraryProvider.timeout.operationTimeout).toBe(
        "number",
      );
      expect(openLibraryProvider.timeout.requestTimeout).toBeGreaterThan(0);
      expect(openLibraryProvider.timeout.operationTimeout).toBeGreaterThan(
        openLibraryProvider.timeout.requestTimeout,
      );
    });

    it("should handle network errors consistently", async () => {
      // Test that both providers handle network errors the same way
      mockFetch.mockRejectedValue(new Error("network error"));

      // Run with timer advancement for retry delays
      const wikidataPromise = wikidataProvider.searchByTitle({
        title: "Test Book",
      });
      await vi.runAllTimersAsync();
      const wikidataResult = await wikidataPromise;

      const openLibraryPromise = openLibraryProvider.searchByTitle({
        title: "Test Book",
      });
      await vi.runAllTimersAsync();
      const openLibraryResult = await openLibraryPromise;

      // Both should return empty arrays on network failure after retries
      expect(wikidataResult).toEqual([]);
      expect(openLibraryResult).toEqual([]);
    });

    it("should handle retryable errors consistently", async () => {
      const retryableErrors = [
        "timeout error",
        "connection refused",
        "ECONNRESET",
        "ENOTFOUND",
        "ETIMEDOUT",
        "500 Internal Server Error",
        "502 Bad Gateway",
        "503 Service Unavailable",
        "504 Gateway Timeout",
      ];

      for (const errorMsg of retryableErrors) {
        mockFetch.mockRejectedValue(new Error(errorMsg));
        const wikidataPromise = wikidataProvider.searchByTitle({
          title: "Test",
        });
        await vi.runAllTimersAsync();
        const wikidataResult = await wikidataPromise;
        expect(wikidataResult).toEqual([]);

        const openLibraryPromise = openLibraryProvider.searchByTitle({
          title: "Test",
        });
        await vi.runAllTimersAsync();
        const openLibraryResult = await openLibraryPromise;
        expect(openLibraryResult).toEqual([]);

        mockFetch.mockClear();
      }
    });

    it("should handle non-retryable errors consistently", async () => {
      const nonRetryableErrors = [
        "400 Bad Request",
        "401 Unauthorized",
        "403 Forbidden",
        "404 Not Found",
        "422 Unprocessable Entity",
      ];

      for (const errorMsg of nonRetryableErrors) {
        mockFetch.mockRejectedValueOnce(new Error(errorMsg));
        const wikidataResult = await wikidataProvider.searchByTitle({
          title: "Test",
        });
        expect(wikidataResult).toEqual([]);

        mockFetch.mockRejectedValueOnce(new Error(errorMsg));
        const openLibraryResult = await openLibraryProvider.searchByTitle({
          title: "Test",
        });
        expect(openLibraryResult).toEqual([]);
      }
    });

    it("should log errors consistently", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      mockFetch.mockRejectedValue(new Error("persistent network error"));

      // Run with timer advancement for retry delays
      const wikidataPromise = wikidataProvider.searchByTitle({ title: "Test" });
      await vi.runAllTimersAsync();
      await wikidataPromise;

      const openLibraryPromise = openLibraryProvider.searchByTitle({
        title: "Test",
      });
      await vi.runAllTimersAsync();
      await openLibraryPromise;

      // Both should log final failure messages
      const wikidataLogs = consoleSpy.mock.calls.filter(
        (call) =>
          call[0]?.includes("WikiData") && call[0]?.includes("failed after"),
      );
      const openLibraryLogs = consoleSpy.mock.calls.filter(
        (call) =>
          call[0]?.includes("OpenLibrary") && call[0]?.includes("failed after"),
      );

      expect(wikidataLogs.length).toBeGreaterThan(0);
      expect(openLibraryLogs.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    }, 15000);
  });

  describe("Rate Limiting Integration Consistency", () => {
    it("should use the same global rate limiter registry pattern", () => {
      // Both providers should have similar rate limit configurations
      expect(wikidataProvider.name).toBe("WikiData");
      expect(openLibraryProvider.name).toBe("OpenLibrary");

      // Both should have rate limit configs with the same structure
      expect(wikidataProvider.rateLimit).toMatchObject({
        maxRequests: expect.any(Number),
        windowMs: expect.any(Number),
        requestDelay: expect.any(Number),
      });

      expect(openLibraryProvider.rateLimit).toMatchObject({
        maxRequests: expect.any(Number),
        windowMs: expect.any(Number),
        requestDelay: expect.any(Number),
      });
    });

    it("should integrate with timeout manager consistently", () => {
      // Both should have timeout configs with the same structure
      expect(wikidataProvider.timeout).toMatchObject({
        requestTimeout: expect.any(Number),
        operationTimeout: expect.any(Number),
      });

      expect(openLibraryProvider.timeout).toMatchObject({
        requestTimeout: expect.any(Number),
        operationTimeout: expect.any(Number),
      });

      // Operation timeout should be longer than request timeout for both
      expect(wikidataProvider.timeout.operationTimeout).toBeGreaterThan(
        wikidataProvider.timeout.requestTimeout,
      );
      expect(openLibraryProvider.timeout.operationTimeout).toBeGreaterThan(
        openLibraryProvider.timeout.requestTimeout,
      );
    });
  });
});
