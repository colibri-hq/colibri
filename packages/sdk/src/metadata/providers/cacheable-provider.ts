import { ConfigurableMetadataProvider } from "./configurable-provider.js";
import { globalMetadataCache, MetadataRecordCache } from "../cache.js";
import {
  globalPerformanceMonitor,
  type PerformanceMonitor,
} from "../performance.js";
import type { MetadataConfigManager } from "../config.js";
import type {
  CreatorQuery,
  MetadataRecord,
  MultiCriteriaQuery,
  TitleQuery,
} from "./provider.js";

/**
 * Base class for metadata providers with caching and performance monitoring
 */
export abstract class CacheableMetadataProvider extends ConfigurableMetadataProvider {
  protected cache: MetadataRecordCache;
  protected performanceMonitor: PerformanceMonitor;

  constructor(
    configManager?: MetadataConfigManager,
    cache: MetadataRecordCache = globalMetadataCache,
    performanceMonitor: PerformanceMonitor = globalPerformanceMonitor,
  ) {
    super(configManager);
    this.cache = cache;
    this.performanceMonitor = performanceMonitor;
  }

  /**
   * Search by title with caching
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    const cacheKey = this.generateTitleCacheKey(query);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Execute actual search
    const results = await this.executeSearchByTitle(query);

    // Cache the results
    const cacheTtl = this.getCacheTtl("title");
    this.cache.set(cacheKey, results, cacheTtl);

    return results;
  }

  /**
   * Search by ISBN with caching
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    const cacheKey = this.generateISBNCacheKey(isbn);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Execute actual search
    const results = await this.executeSearchByISBN(isbn);

    // Cache the results
    const cacheTtl = this.getCacheTtl("isbn");
    this.cache.set(cacheKey, results, cacheTtl);

    return results;
  }

  /**
   * Search by creator with caching
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    const cacheKey = this.generateCreatorCacheKey(query);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Execute actual search
    const results = await this.executeSearchByCreator(query);

    // Cache the results
    const cacheTtl = this.getCacheTtl("creator");
    this.cache.set(cacheKey, results, cacheTtl);

    return results;
  }

  /**
   * Search by multiple criteria with caching
   */
  async searchMultiCriteria(
    query: MultiCriteriaQuery,
  ): Promise<MetadataRecord[]> {
    // Check cache first
    const cached = this.cache.getCachedQuery(this.name, query);
    if (cached) {
      return cached;
    }

    // Execute actual search
    const results = await this.executeSearchMultiCriteria(query);

    // Cache the results
    const cacheTtl = this.getCacheTtl("multi-criteria");
    this.cache.cacheQuery(this.name, query, results, cacheTtl);

    return results;
  }

  /**
   * Get cache statistics for this provider
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Get performance statistics for this provider
   */
  getPerformanceStats() {
    return this.performanceMonitor.getOperationStats(
      "searchMultiCriteria",
      this.name,
    );
  }

  /**
   * Clear cache entries for this provider
   */
  clearCache(): void {
    // This is a simplified implementation - in a real scenario you'd want
    // to clear only entries related to this provider
    this.cache.clear();
  }

  /**
   * Warm up the cache with common queries
   */
  async warmupCache(commonQueries: MultiCriteriaQuery[]): Promise<void> {
    const warmupPromises = commonQueries.map(async (query) => {
      try {
        await this.searchMultiCriteria(query);
      } catch (error) {
        // Ignore errors during warmup
        console.warn(`Cache warmup failed for query:`, query, error);
      }
    });

    await Promise.allSettled(warmupPromises);
  }

  /**
   * Override cleanup to also cleanup cache and performance monitoring
   */
  async cleanup(): Promise<void> {
    // Clear any provider-specific cache entries
    // Note: This is a simplified implementation
    this.clearCache();

    await super.cleanup();
  }

  /**
   * Abstract methods that subclasses must implement for actual search logic
   */
  protected abstract executeSearchByTitle(
    query: TitleQuery,
  ): Promise<MetadataRecord[]>;

  protected abstract executeSearchByISBN(
    isbn: string,
  ): Promise<MetadataRecord[]>;

  protected abstract executeSearchByCreator(
    query: CreatorQuery,
  ): Promise<MetadataRecord[]>;

  protected abstract executeSearchMultiCriteria(
    query: MultiCriteriaQuery,
  ): Promise<MetadataRecord[]>;

  /**
   * Get cache TTL for different operation types
   */
  protected getCacheTtl(operationType: string): number {
    const config = this.getProviderConfig();
    const defaultTtl = 300000; // 5 minutes

    // Check for operation-specific TTL configuration
    const operationTtl = config?.options?.[
      `${operationType}CacheTtl`
    ] as number;
    if (operationTtl) {
      return operationTtl;
    }

    // Check for general cache TTL
    const generalTtl = config?.options?.cacheTtl as number;
    if (generalTtl) {
      return generalTtl;
    }

    return defaultTtl;
  }

  /**
   * Generate cache key for title queries
   */
  protected generateTitleCacheKey(query: TitleQuery): string {
    return `${this.name}:title:${query.title}:${query.fuzzy ? "fuzzy" : "exact"}:${query.exactMatch ? "exact" : "partial"}`;
  }

  /**
   * Generate cache key for ISBN queries
   */
  protected generateISBNCacheKey(isbn: string): string {
    return `${this.name}:isbn:${isbn}`;
  }

  /**
   * Generate cache key for creator queries
   */
  protected generateCreatorCacheKey(query: CreatorQuery): string {
    return `${this.name}:creator:${query.name}:${query.role || "any"}:${query.fuzzy ? "fuzzy" : "exact"}`;
  }

  /**
   * Check if caching is enabled for this provider
   */
  protected isCachingEnabled(): boolean {
    const config = this.getProviderConfig();
    return config?.options?.enableCaching !== false; // Default to enabled
  }
}

/**
 * Utility function to create a memoized version of any async function
 */
export function memoizeAsync<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyGenerator: (...args: TArgs) => string,
  ttl: number = 300000, // 5 minutes default
): (...args: TArgs) => Promise<TResult> {
  const cache = new Map<string, { data: TResult; timestamp: number }>();

  return async (...args: TArgs): Promise<TResult> => {
    const key = keyGenerator(...args);
    const now = Date.now();

    // Check cache
    const cached = cache.get(key);
    if (cached && now - cached.timestamp < ttl) {
      return cached.data;
    }

    // Execute function
    const result = await fn(...args);

    // Cache result
    cache.set(key, { data: result, timestamp: now });

    // Cleanup old entries periodically
    if (cache.size > 1000) {
      const cutoff = now - ttl;
      for (const [k, v] of cache.entries()) {
        if (v.timestamp < cutoff) {
          cache.delete(k);
        }
      }
    }

    return result;
  };
}

/**
 * Batch processing utility for multiple queries
 */
export class BatchProcessor<TQuery, TResult> {
  private batchSize: number;
  private batchDelay: number;
  private pendingQueries: Array<{
    query: TQuery;
    resolve: (result: TResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private batchTimer: NodeJS.Timeout | undefined;

  constructor(
    private processor: (queries: TQuery[]) => Promise<TResult[]>,
    batchSize: number = 10,
    batchDelay: number = 100,
  ) {
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
  }

  /**
   * Add a query to the batch
   */
  async process(query: TQuery): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      this.pendingQueries.push({ query, resolve, reject });

      // Process immediately if batch is full
      if (this.pendingQueries.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimer) {
        // Set timer to process batch after delay
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.batchDelay);
      }
    });
  }

  /**
   * Flush any pending queries
   */
  async flush(): Promise<void> {
    if (this.pendingQueries.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Destroy the batch processor
   */
  destroy(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Reject any pending queries
    this.pendingQueries.forEach((item) => {
      item.reject(new Error("Batch processor destroyed"));
    });
    this.pendingQueries = [];
  }

  /**
   * Process the current batch
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    if (this.pendingQueries.length === 0) {
      return;
    }

    const batch = this.pendingQueries.splice(0, this.batchSize);
    const queries = batch.map((item) => item.query);

    try {
      const results = await this.processor(queries);

      // Resolve each query with its corresponding result
      batch.forEach((item, index) => {
        if (index < results.length) {
          item.resolve(results[index]);
        } else {
          item.reject(new Error("No result returned for query"));
        }
      });
    } catch (error) {
      // Reject all queries in the batch
      batch.forEach((item) => {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }
}
