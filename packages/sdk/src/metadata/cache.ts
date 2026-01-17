import type { MetadataRecord, MultiCriteriaQuery } from "./providers/provider.js";

/**
 * Cache entry for metadata records
 */
export interface CacheEntry<T = any> {
  /** The cached data */
  data: T;
  /** Timestamp when the entry was created */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Number of times this entry has been accessed */
  accessCount: number;
  /** Last access timestamp */
  lastAccessed: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of entries in cache */
  size: number;
  /** Maximum cache size */
  maxSize: number;
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Cache hit ratio (0-1) */
  hitRatio: number;
  /** Number of entries evicted */
  evictions: number;
  /** Memory usage estimate in bytes */
  memoryUsage: number;
}

/**
 * Cache eviction strategies
 */
export enum EvictionStrategy {
  /** Least Recently Used */
  LRU = "lru",
  /** Least Frequently Used */
  LFU = "lfu",
  /** First In, First Out */
  FIFO = "fifo",
  /** Time-based expiration only */
  TTL_ONLY = "ttl-only",
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum number of entries */
  maxSize: number;
  /** Default TTL in milliseconds */
  defaultTtl: number;
  /** Eviction strategy */
  evictionStrategy: EvictionStrategy;
  /** Whether to enable cache statistics */
  enableStats: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,
  defaultTtl: 300000, // 5 minutes
  evictionStrategy: EvictionStrategy.LRU,
  enableStats: true,
  cleanupInterval: 60000, // 1 minute
};

/**
 * Generic cache implementation with TTL and eviction strategies
 */
export class MetadataCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private stats = { hits: 0, misses: 0, evictions: 0 };
  private cleanupTimer: NodeJS.Timeout | undefined;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * Get an item from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.data;
  }

  /**
   * Set an item in the cache
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl ?? this.config.defaultTtl;

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: entryTtl,
      accessCount: 1,
      lastAccessed: now,
    };

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictEntries(1);
    }

    this.cache.set(key, entry);
  }

  /**
   * Check if a key exists in the cache (without updating access stats)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Delete an item from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRatio = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRatio,
      evictions: this.stats.evictions,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * Check if a cache entry has expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict entries based on the configured strategy
   */
  private evictEntries(count: number): void {
    const entries = Array.from(this.cache.entries());

    switch (this.config.evictionStrategy) {
      case EvictionStrategy.LRU:
        entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        break;
      case EvictionStrategy.LFU:
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        break;
      case EvictionStrategy.FIFO:
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        break;
      case EvictionStrategy.TTL_ONLY:
        // Only evict expired entries
        const expiredEntries = entries.filter(([, entry]) => this.isExpired(entry));
        for (let i = 0; i < Math.min(count, expiredEntries.length); i++) {
          this.cache.delete(expiredEntries[i][0]);
          this.stats.evictions++;
        }
        return;
    }

    // Evict the oldest/least used entries
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
      this.stats.evictions++;
    }
  }

  /**
   * Estimate memory usage of the cache
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key size + JSON size of data + entry overhead
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry.data).length * 2;
      totalSize += 64; // Estimated overhead for entry metadata
    }

    return totalSize;
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.config.cleanupInterval);
      // Don't keep the process alive just for cache cleanup
      this.cleanupTimer.unref();
    }
  }
}

/**
 * Specialized cache for metadata records
 */
export class MetadataRecordCache extends MetadataCache<MetadataRecord[]> {
  /**
   * Generate a cache key for a query
   */
  static generateQueryKey(providerName: string, query: MultiCriteriaQuery): string {
    const queryParts = [
      providerName,
      query.title || "",
      query.authors?.join(",") || "",
      query.isbn || "",
      query.language || "",
      query.subjects?.join(",") || "",
      query.publisher || "",
      query.yearRange?.join("-") || "",
      query.fuzzy ? "fuzzy" : "exact",
    ];

    return queryParts.join("|");
  }

  /**
   * Cache metadata records for a specific query
   */
  cacheQuery(
    providerName: string,
    query: MultiCriteriaQuery,
    records: MetadataRecord[],
    ttl?: number,
  ): void {
    const key = MetadataRecordCache.generateQueryKey(providerName, query);
    this.set(key, records, ttl);
  }

  /**
   * Get cached metadata records for a query
   */
  getCachedQuery(providerName: string, query: MultiCriteriaQuery): MetadataRecord[] | undefined {
    const key = MetadataRecordCache.generateQueryKey(providerName, query);
    return this.get(key);
  }

  /**
   * Check if a query is cached
   */
  hasQuery(providerName: string, query: MultiCriteriaQuery): boolean {
    const key = MetadataRecordCache.generateQueryKey(providerName, query);
    return this.has(key);
  }
}

/**
 * Cache for memoizing function results
 */
export class MemoizationCache<TArgs extends any[], TResult> {
  private cache: MetadataCache<TResult>;

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new MetadataCache<TResult>(config);
  }

  /**
   * Memoize a function call
   */
  memoize(
    fn: (...args: TArgs) => TResult | Promise<TResult>,
    keyGenerator?: (...args: TArgs) => string,
  ) {
    return async (...args: TArgs): Promise<TResult> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

      // Check cache first
      const cached = this.cache.get(key);
      if (cached !== undefined) {
        return cached;
      }

      // Execute function and cache result
      const result = await fn(...args);
      this.cache.set(key, result);

      return result;
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Clear the memoization cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Destroy the cache
   */
  destroy(): void {
    this.cache.destroy();
  }
}

/**
 * Global metadata record cache instance
 */
export const globalMetadataCache = new MetadataRecordCache();
