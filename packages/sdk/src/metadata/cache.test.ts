import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EvictionStrategy,
  MemoizationCache,
  MetadataCache,
  MetadataRecordCache,
} from "./cache.js";
import type {
  MetadataRecord,
  MultiCriteriaQuery,
} from "./providers/provider.js";
import { sleep } from "@colibri-hq/shared";

describe("MetadataCache", () => {
  let cache: MetadataCache<string>;

  beforeEach(() => {
    cache = new MetadataCache<string>({
      maxSize: 3,
      defaultTtl: 1000,
      cleanupInterval: 0, // Disable automatic cleanup for tests
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe("basic operations", () => {
    it("should store and retrieve values", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return undefined for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should check if key exists", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should delete values", () => {
      cache.set("key1", "value1");
      expect(cache.delete("key1")).toBe(true);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.delete("nonexistent")).toBe(false);
    });

    it("should clear all values", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.clear();
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
    });
  });

  describe("TTL functionality", () => {
    it("should expire entries after TTL", async () => {
      cache.set("key1", "value1", 100); // 100ms TTL
      expect(cache.get("key1")).toBe("value1");

      // Wait for expiration
      await sleep(150);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should use default TTL when not specified", async () => {
      cache.set("key1", "value1"); // Uses default TTL of 1000ms
      expect(cache.get("key1")).toBe("value1");

      // Should still be valid after 500ms
      await sleep(500);
      expect(cache.get("key1")).toBe("value1");
    });

    it("should cleanup expired entries", async () => {
      cache.set("key1", "value1", 100);
      cache.set("key2", "value2", 1000);

      await sleep(150);

      const removedCount = cache.cleanup();
      expect(removedCount).toBe(1);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBe("value2");
    });
  });

  describe("eviction strategies", () => {
    it("should evict LRU entries when cache is full", async () => {
      const lruCache = new MetadataCache<string>({
        maxSize: 2,
        evictionStrategy: EvictionStrategy.LRU,
        cleanupInterval: 0,
      });

      lruCache.set("key1", "value1");
      await sleep(10);
      lruCache.set("key2", "value2");
      await sleep(10);

      // Access key1 to make it more recently used
      lruCache.get("key1");
      await sleep(10);

      // Add key3, should evict key2 (least recently used)
      lruCache.set("key3", "value3");

      expect(lruCache.get("key1")).toBe("value1");
      expect(lruCache.get("key2")).toBeUndefined();
      expect(lruCache.get("key3")).toBe("value3");

      lruCache.destroy();
    });

    it("should evict FIFO entries when cache is full", () => {
      const fifoCache = new MetadataCache<string>({
        maxSize: 2,
        evictionStrategy: EvictionStrategy.FIFO,
        cleanupInterval: 0,
      });

      fifoCache.set("key1", "value1");
      fifoCache.set("key2", "value2");

      // Add key3, should evict key1 (first in)
      fifoCache.set("key3", "value3");

      expect(fifoCache.get("key1")).toBeUndefined();
      expect(fifoCache.get("key2")).toBe("value2");
      expect(fifoCache.get("key3")).toBe("value3");

      fifoCache.destroy();
    });
  });

  describe("statistics", () => {
    it("should track cache statistics", () => {
      cache.set("key1", "value1");
      cache.get("key1"); // Hit
      cache.get("nonexistent"); // Miss

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRatio).toBe(0.5);
    });

    it("should estimate memory usage", () => {
      cache.set("key1", "value1");
      cache.set("key2", "longer-value-string");

      const stats = cache.getStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });
});

describe("MetadataRecordCache", () => {
  let cache: MetadataRecordCache;
  let mockRecords: MetadataRecord[];

  beforeEach(() => {
    cache = new MetadataRecordCache({
      maxSize: 10,
      cleanupInterval: 0,
    });

    mockRecords = [
      {
        id: "1",
        source: "test-provider",
        confidence: 0.9,
        timestamp: new Date(),
        title: "Test Book",
      },
    ];
  });

  afterEach(() => {
    cache.destroy();
  });

  describe("query caching", () => {
    it("should cache and retrieve query results", () => {
      const query: MultiCriteriaQuery = {
        title: "Test Book",
        authors: ["Test Author"],
      };

      cache.cacheQuery("test-provider", query, mockRecords);
      const cached = cache.getCachedQuery("test-provider", query);

      expect(cached).toEqual(mockRecords);
    });

    it("should check if query is cached", () => {
      const query: MultiCriteriaQuery = {
        title: "Test Book",
      };

      expect(cache.hasQuery("test-provider", query)).toBe(false);

      cache.cacheQuery("test-provider", query, mockRecords);
      expect(cache.hasQuery("test-provider", query)).toBe(true);
    });

    it("should generate consistent cache keys", () => {
      const query1: MultiCriteriaQuery = {
        title: "Test Book",
        authors: ["Author 1", "Author 2"],
      };

      const query2: MultiCriteriaQuery = {
        title: "Test Book",
        authors: ["Author 1", "Author 2"],
      };

      const key1 = MetadataRecordCache.generateQueryKey("provider", query1);
      const key2 = MetadataRecordCache.generateQueryKey("provider", query2);

      expect(key1).toBe(key2);
    });

    it("should generate different keys for different queries", () => {
      const query1: MultiCriteriaQuery = { title: "Book 1" };
      const query2: MultiCriteriaQuery = { title: "Book 2" };

      const key1 = MetadataRecordCache.generateQueryKey("provider", query1);
      const key2 = MetadataRecordCache.generateQueryKey("provider", query2);

      expect(key1).not.toBe(key2);
    });
  });
});

describe("MemoizationCache", () => {
  let memoCache: MemoizationCache<[string, number], string>;

  beforeEach(() => {
    memoCache = new MemoizationCache({
      maxSize: 5,
      cleanupInterval: 0,
    });
  });

  afterEach(() => {
    memoCache.destroy();
  });

  describe("function memoization", () => {
    it("should memoize function results", async () => {
      let callCount = 0;
      const expensiveFunction = async (
        str: string,
        num: number,
      ): Promise<string> => {
        callCount++;
        return `${str}-${num}`;
      };

      const memoized = memoCache.memoize(expensiveFunction);

      const result1 = await memoized("test", 1);
      const result2 = await memoized("test", 1); // Should use cache
      const result3 = await memoized("test", 2); // Different args, should call function

      expect(result1).toBe("test-1");
      expect(result2).toBe("test-1");
      expect(result3).toBe("test-2");
      expect(callCount).toBe(2); // Only called twice, second call used cache
    });

    it("should use custom key generator", async () => {
      let callCount = 0;
      const fn = async (str: string, num: number): Promise<string> => {
        callCount++;
        return `${str}-${num}`;
      };

      // Custom key generator that ignores the number
      const keyGen = (str: string, _num: number) => str;
      const memoized = memoCache.memoize(fn, keyGen);

      await memoized("test", 1);
      await memoized("test", 2); // Should use cache because key is the same

      expect(callCount).toBe(1);
    });

    it("should provide cache statistics", async () => {
      const fn = async (x: string, y: number) => `${x}-${y}`;
      const memoized = memoCache.memoize(fn);

      await memoized("a", 1);
      await memoized("a", 1); // Cache hit
      await memoized("b", 2); // Cache miss

      const stats = memoCache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
    });
  });
});
