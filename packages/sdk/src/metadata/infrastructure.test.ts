import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BaseMetadataProvider,
  type CreatorQuery,
  type MetadataRecord,
  MetadataType,
  type MultiCriteriaQuery,
  type TitleQuery,
} from "./providers/provider.js";
import { MetadataProviderRegistry } from "./registry.js";
import { RateLimiter } from "./rate-limiter.js";
import { TimeoutError, TimeoutManager } from "./timeout-manager.js";
import { sleep } from "@colibri-hq/shared";

// Mock provider for testing
class MockMetadataProvider extends BaseMetadataProvider {
  readonly name = "mock-provider";
  readonly priority = 100;

  constructor(
    private mockResults: MetadataRecord[] = [],
    private shouldThrow: boolean = false,
    private delay: number = 0,
  ) {
    super();
  }

  async searchByTitle(_query: TitleQuery): Promise<MetadataRecord[]> {
    if (this.delay > 0) {
      await sleep(this.delay);
    }
    if (this.shouldThrow) {
      throw new Error("Mock provider error");
    }
    return this.mockResults;
  }

  async searchByISBN(_isbn: string): Promise<MetadataRecord[]> {
    if (this.delay > 0) {
      await sleep(this.delay);
    }
    if (this.shouldThrow) {
      throw new Error("Mock provider error");
    }
    return this.mockResults;
  }

  async searchByCreator(_query: CreatorQuery): Promise<MetadataRecord[]> {
    if (this.delay > 0) {
      await sleep(this.delay);
    }
    if (this.shouldThrow) {
      throw new Error("Mock provider error");
    }
    return this.mockResults;
  }

  async searchMultiCriteria(
    _query: MultiCriteriaQuery,
  ): Promise<MetadataRecord[]> {
    if (this.delay > 0) {
      await sleep(this.delay);
    }
    if (this.shouldThrow) {
      throw new Error("Mock provider error");
    }
    return this.mockResults;
  }

  getReliabilityScore(dataType: MetadataType): number {
    // Custom reliability scores for testing
    const scores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.9,
      [MetadataType.AUTHORS]: 0.8,
      [MetadataType.ISBN]: 0.95,
      [MetadataType.PUBLICATION_DATE]: 0.7,
      [MetadataType.SUBJECTS]: 0.6,
      [MetadataType.DESCRIPTION]: 0.5,
      [MetadataType.LANGUAGE]: 0.8,
      [MetadataType.PUBLISHER]: 0.7,
      [MetadataType.SERIES]: 0.6,
      [MetadataType.EDITION]: 0.6,
      [MetadataType.PAGE_COUNT]: 0.7,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.4,
      [MetadataType.COVER_IMAGE]: 0.5,
    };
    return scores[dataType] ?? 0.5;
  }

  supportsDataType(dataType: MetadataType): boolean {
    // Support most data types for testing
    return dataType !== MetadataType.PHYSICAL_DIMENSIONS;
  }
}

describe("MetadataProvider Infrastructure", () => {
  describe("BaseMetadataProvider", () => {
    it("should create metadata records correctly", () => {
      const provider = new MockMetadataProvider();
      const record = (provider as any).createMetadataRecord(
        "test-id",
        {
          title: "Test Book",
          authors: ["Test Author"],
        },
        0.9,
      );

      expect(record.id).toBe("test-id");
      expect(record.source).toBe("mock-provider");
      expect(record.confidence).toBe(0.9);
      expect(record.title).toBe("Test Book");
      expect(record.authors).toEqual(["Test Author"]);
      expect(record.timestamp).toBeInstanceOf(Date);
    });

    it("should have default reliability scores", () => {
      const provider = new MockMetadataProvider();
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.9);
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.95);
    });

    it("should support basic data types", () => {
      const provider = new MockMetadataProvider();
      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PHYSICAL_DIMENSIONS)).toBe(
        false,
      );
    });
  });

  describe("MetadataProviderRegistry", () => {
    let registry: MetadataProviderRegistry;
    let mockProvider: MockMetadataProvider;
    let mockConfigManager: any;

    beforeEach(() => {
      // Create a mock config manager that always returns enabled
      mockConfigManager = {
        isProviderEnabled: vi.fn().mockReturnValue(true),
        getEffectivePriority: vi
          .fn()
          .mockImplementation(
            (_name: string, defaultPriority: number) => defaultPriority,
          ),
        getEffectiveRateLimit: vi.fn().mockReturnValue({
          maxRequests: 100,
          windowMs: 60000,
          requestDelay: 100,
        }),
        getEffectiveTimeout: vi
          .fn()
          .mockReturnValue({ requestTimeout: 10000, operationTimeout: 30000 }),
      };
      registry = new MetadataProviderRegistry(mockConfigManager);
      mockProvider = new MockMetadataProvider();
    });

    afterEach(async () => {
      await registry.cleanup();
    });

    it("should register and retrieve providers", () => {
      registry.register(mockProvider);

      const retrieved = registry.getProvider("mock-provider");
      expect(retrieved).toBe(mockProvider);
    });

    it("should prevent duplicate provider registration", () => {
      registry.register(mockProvider);

      expect(() => {
        registry.register(mockProvider);
      }).toThrow("Provider with name 'mock-provider' is already registered");
    });

    it("should enable and disable providers", () => {
      // Register provider (enablement is controlled by ConfigManager)
      registry.register(mockProvider);

      // Disable via ConfigManager
      mockConfigManager.isProviderEnabled.mockReturnValue(false);
      expect(registry.getProvider("mock-provider")).toBeUndefined();

      // Enable via ConfigManager
      mockConfigManager.isProviderEnabled.mockReturnValue(true);
      expect(registry.getProvider("mock-provider")).toBe(mockProvider);
    });

    it("should sort providers by priority", () => {
      const lowPriorityProvider = new MockMetadataProvider();
      (lowPriorityProvider as any).priority = 50;
      (lowPriorityProvider as any).name = "low-priority";

      const highPriorityProvider = new MockMetadataProvider();
      (highPriorityProvider as any).priority = 200;
      (highPriorityProvider as any).name = "high-priority";

      registry.register(lowPriorityProvider);
      registry.register(mockProvider); // priority 100
      registry.register(highPriorityProvider);

      const providers = registry.getEnabledProviders();
      expect(providers[0]).toBe(highPriorityProvider);
      expect(providers[1]).toBe(mockProvider);
      expect(providers[2]).toBe(lowPriorityProvider);
    });

    it("should get providers for specific data types", () => {
      const specialProvider = new MockMetadataProvider();
      (specialProvider as any).name = "special-provider";
      (specialProvider as any).priority = 150;

      // Override to only support ISBN
      (specialProvider as any).supportsDataType = (dataType: MetadataType) =>
        dataType === MetadataType.ISBN;
      (specialProvider as any).getReliabilityScore = (
        dataType: MetadataType,
      ) => (dataType === MetadataType.ISBN ? 0.99 : 0.1);

      registry.register(mockProvider);
      registry.register(specialProvider);

      const isbnProviders = registry.getProvidersForDataType(MetadataType.ISBN);
      expect(isbnProviders[0]).toBe(specialProvider); // Higher reliability score
      expect(isbnProviders[1]).toBe(mockProvider);

      const titleProviders = registry.getProvidersForDataType(
        MetadataType.TITLE,
      );
      expect(titleProviders).toHaveLength(1);
      expect(titleProviders[0]).toBe(mockProvider);
    });

    it("should provide provider statistics", () => {
      registry.register(mockProvider);

      const stats = registry.getProviderStats();
      expect(stats).toHaveLength(1);
      expect(stats[0].name).toBe("mock-provider");
      expect(stats[0].enabled).toBe(true);
      expect(stats[0].priority).toBe(100);
      expect(stats[0].supportedDataTypes).toContain(MetadataType.TITLE);
      expect(stats[0].reliabilityScores[MetadataType.TITLE]).toBe(0.9);
    });
  });

  describe("RateLimiter", () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 1000,
        requestDelay: 50,
      });
    });

    it("should allow requests within limit", () => {
      expect(rateLimiter.isAllowed("test-key")).toBe(true);
      expect(rateLimiter.isAllowed("test-key")).toBe(true);
      expect(rateLimiter.isAllowed("test-key")).toBe(true);
      expect(rateLimiter.isAllowed("test-key")).toBe(false);
    });

    it("should track remaining requests", () => {
      expect(rateLimiter.getRemainingRequests("test-key")).toBe(3);

      rateLimiter.isAllowed("test-key");
      expect(rateLimiter.getRemainingRequests("test-key")).toBe(2);

      rateLimiter.isAllowed("test-key");
      expect(rateLimiter.getRemainingRequests("test-key")).toBe(1);
    });

    it("should reset after time window", async () => {
      // Use up all requests
      rateLimiter.isAllowed("test-key");
      rateLimiter.isAllowed("test-key");
      rateLimiter.isAllowed("test-key");
      expect(rateLimiter.isAllowed("test-key")).toBe(false);

      // Wait for window to reset
      await sleep(1100);
      expect(rateLimiter.isAllowed("test-key")).toBe(true);
    });

    it("should handle different keys separately", () => {
      rateLimiter.isAllowed("key1");
      rateLimiter.isAllowed("key1");
      rateLimiter.isAllowed("key1");

      expect(rateLimiter.isAllowed("key1")).toBe(false);
      expect(rateLimiter.isAllowed("key2")).toBe(true);
    });
  });

  describe("TimeoutManager", () => {
    let timeoutManager: TimeoutManager;

    beforeEach(() => {
      timeoutManager = new TimeoutManager({
        requestTimeout: 100,
        operationTimeout: 200,
      });
    });

    afterEach(() => {
      timeoutManager.clearAllTimeouts();
    });

    it("should resolve promises within timeout", async () => {
      const promise = Promise.resolve("success");
      const result = await timeoutManager.withTimeout(promise, 100);
      expect(result).toBe("success");
    });

    it("should reject promises that exceed timeout", async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve("late"), 200),
      );

      await expect(timeoutManager.withTimeout(promise, 100)).rejects.toThrow(
        TimeoutError,
      );
    });

    it("should handle request timeouts", async () => {
      const slowPromise = new Promise((resolve) =>
        setTimeout(() => resolve("slow"), 200),
      );

      await expect(
        timeoutManager.withRequestTimeout(slowPromise),
      ).rejects.toThrow("Request timed out after 100ms");
    });

    it("should handle operation timeouts", async () => {
      const slowPromise = new Promise((resolve) =>
        setTimeout(() => resolve("slow"), 300),
      );

      await expect(
        timeoutManager.withOperationTimeout(slowPromise),
      ).rejects.toThrow("Operation timed out after 200ms");
    });

    it("should create abort controllers with timeout", async () => {
      const controller = timeoutManager.createAbortController(50);

      await sleep(60);
      expect(controller.signal.aborted).toBe(true);
    });

    it("should execute multiple promises with individual timeouts", async () => {
      const fastPromise = Promise.resolve("fast");
      const slowPromise = sleep(150);

      const results = await timeoutManager.executeWithTimeouts([
        { promise: fastPromise, timeout: 100, name: "fast" },
        { promise: slowPromise, timeout: 100, name: "slow" },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe("fast");
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeInstanceOf(TimeoutError);
    });
  });

  describe("Integration", () => {
    let registry: MetadataProviderRegistry;
    let provider: MockMetadataProvider;
    let mockConfigManager: any;

    beforeEach(() => {
      // Create a mock config manager that always returns enabled
      mockConfigManager = {
        isProviderEnabled: vi.fn().mockReturnValue(true),
        getEffectivePriority: vi
          .fn()
          .mockImplementation(
            (_name: string, defaultPriority: number) => defaultPriority,
          ),
        getEffectiveRateLimit: vi.fn().mockReturnValue({
          maxRequests: 100,
          windowMs: 60000,
          requestDelay: 100,
        }),
        getEffectiveTimeout: vi
          .fn()
          .mockReturnValue({ requestTimeout: 10000, operationTimeout: 30000 }),
      };
      registry = new MetadataProviderRegistry(mockConfigManager);
      provider = new MockMetadataProvider([
        {
          id: "test-1",
          source: "mock-provider",
          confidence: 0.9,
          timestamp: new Date(),
          title: "Test Book",
          authors: ["Test Author"],
        },
      ]);
    });

    afterEach(async () => {
      await registry.cleanup();
    });

    it("should integrate all components", async () => {
      registry.register(provider);
      await registry.initialize();

      const providers = registry.getEnabledProviders();
      expect(providers).toHaveLength(1);

      const results = await provider.searchByTitle({ title: "Test Book" });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Test Book");
    });
  });
});
