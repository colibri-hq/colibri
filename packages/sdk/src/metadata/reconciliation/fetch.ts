import type {
  MetadataProvider,
  MetadataRecord,
  MultiCriteriaQuery,
} from "../providers/provider.js";
import { MetadataType } from "../providers/provider.js";

/**
 * Configuration for the MetadataCoordinator
 */
export interface CoordinatorConfig {
  /** Maximum time to wait for all providers to respond (ms) */
  globalTimeout: number;
  /** Maximum time to wait for a single provider (ms) */
  providerTimeout: number;
  /** Maximum number of concurrent provider queries */
  maxConcurrency: number;
  /** Minimum confidence threshold for results */
  minConfidence: number;
  /** Whether to continue if some providers fail */
  continueOnFailure: boolean;
}

/**
 * Result from a single provider query
 */
export interface ProviderResult {
  provider: string;
  records: MetadataRecord[];
  success: boolean;
  error?: Error;
  duration: number;
}

/**
 * Aggregated results from all providers
 */
export interface CoordinatorResult {
  query: MultiCriteriaQuery;
  providerResults: ProviderResult[];
  totalRecords: number;
  successfulProviders: number;
  failedProviders: number;
  totalDuration: number;
  aggregatedRecords: MetadataRecord[];
}

/**
 * Query execution strategy
 */
export interface QueryStrategy {
  primary: MultiCriteriaQuery;
  fallbacks: MultiCriteriaQuery[];
  providers?: string[]; // Specific providers to use, if not all
}

/**
 * MetadataCoordinator orchestrates queries across multiple metadata providers
 * and aggregates the results with timeout management and error handling.
 */
export class MetadataCoordinator {
  private config: CoordinatorConfig;
  private providers: MetadataProvider[];

  constructor(providers: MetadataProvider[], config: Partial<CoordinatorConfig> = {}) {
    this.providers = providers.sort((a, b) => b.priority - a.priority);
    this.config = {
      globalTimeout: 30000, // 30 seconds
      providerTimeout: 10000, // 10 seconds per provider
      maxConcurrency: 5,
      minConfidence: 0.1,
      continueOnFailure: true,
      ...config,
    };
  }

  /**
   * Execute a multi-criteria query across all providers
   */
  async query(query: MultiCriteriaQuery): Promise<CoordinatorResult> {
    const startTime = Date.now();

    // Create provider query promises with timeout
    const providerPromises = this.providers.map((provider) => this.queryProvider(provider, query));

    // Execute queries with global timeout and concurrency control
    const results = await this.executeWithTimeout(providerPromises, this.config.globalTimeout);

    // Aggregate results
    const aggregatedRecords = this.aggregateRecords(results);

    return {
      query,
      providerResults: results,
      totalRecords: aggregatedRecords.length,
      successfulProviders: results.filter((r) => r.success).length,
      failedProviders: results.filter((r) => !r.success).length,
      totalDuration: Date.now() - startTime,
      aggregatedRecords,
    };
  }

  /**
   * Execute a query strategy with fallback queries
   */
  async queryWithStrategy(strategy: QueryStrategy): Promise<CoordinatorResult> {
    // Try primary query first
    let result = await this.query(strategy.primary);

    // If no results and we have fallbacks, try them
    if (result.totalRecords === 0 && strategy.fallbacks.length > 0) {
      for (const fallbackQuery of strategy.fallbacks) {
        const fallbackResult = await this.query(fallbackQuery);

        if (fallbackResult.totalRecords > 0) {
          // Merge results, keeping track of which was the successful query
          result = {
            ...fallbackResult,
            query: strategy.primary, // Keep original query for reference
            providerResults: [...result.providerResults, ...fallbackResult.providerResults],
            totalDuration: result.totalDuration + fallbackResult.totalDuration,
          };
          break;
        }
      }
    }

    return result;
  }

  /**
   * Get providers that support a specific metadata type
   */
  getProvidersForDataType(dataType: MetadataType): MetadataProvider[] {
    return this.providers.filter((provider) => provider.supportsDataType(dataType));
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): Array<{
    name: string;
    priority: number;
    supportedTypes: MetadataType[];
    reliabilityScores: Record<MetadataType, number>;
  }> {
    return this.providers.map((provider) => ({
      name: provider.name,
      priority: provider.priority,
      supportedTypes: Object.values(MetadataType).filter((type) => provider.supportsDataType(type)),
      reliabilityScores: Object.values(MetadataType).reduce(
        (scores, type) => {
          scores[type] = provider.getReliabilityScore(type);
          return scores;
        },
        {} as Record<MetadataType, number>,
      ),
    }));
  }

  /**
   * Update coordinator configuration
   */
  updateConfig(config: Partial<CoordinatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add a provider to the coordinator
   */
  addProvider(provider: MetadataProvider): void {
    if (!this.providers.find((p) => p.name === provider.name)) {
      this.providers.push(provider);
      this.providers.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * Remove a provider from the coordinator
   */
  removeProvider(providerName: string): boolean {
    const index = this.providers.findIndex((p) => p.name === providerName);
    if (index >= 0) {
      this.providers.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get current configuration
   */
  getConfig(): CoordinatorConfig {
    return { ...this.config };
  }

  /**
   * Get list of registered providers
   */
  getProviders(): MetadataProvider[] {
    return [...this.providers];
  }

  /**
   * Query a single provider with timeout and error handling
   */
  private async queryProvider(
    provider: MetadataProvider,
    query: MultiCriteriaQuery,
  ): Promise<ProviderResult> {
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(`Provider ${provider.name} timed out after ${this.config.providerTimeout}ms`),
          );
        }, this.config.providerTimeout);
      });

      // Execute query with timeout
      const records = await Promise.race([provider.searchMultiCriteria(query), timeoutPromise]);

      // Filter by minimum confidence
      const filteredRecords = records.filter(
        (record) => record.confidence >= this.config.minConfidence,
      );

      return {
        provider: provider.name,
        records: filteredRecords,
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        provider: provider.name,
        records: [],
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute provider queries with global timeout and concurrency control
   */
  private async executeWithTimeout(
    promises: Promise<ProviderResult>[],
    timeout: number,
  ): Promise<ProviderResult[]> {
    // Create global timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Global timeout of ${timeout}ms exceeded`));
      }, timeout);
    });

    try {
      // Execute all promises with global timeout
      const results = await Promise.race([Promise.allSettled(promises), timeoutPromise]);

      // Convert PromiseSettledResult to ProviderResult
      return results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          // Create error result for rejected promises
          return {
            provider: this.providers[index]?.name || `provider-${index}`,
            records: [],
            success: false,
            error: result.reason,
            duration: 0,
          };
        }
      });
    } catch (error) {
      // Global timeout exceeded - return partial results
      if (!this.config.continueOnFailure) {
        throw error;
      }

      // Return empty results for all providers
      return this.providers.map((provider) => ({
        provider: provider.name,
        records: [],
        success: false,
        error: error as Error,
        duration: 0,
      }));
    }
  }

  /**
   * Aggregate and deduplicate records from multiple providers
   */
  private aggregateRecords(results: ProviderResult[]): MetadataRecord[] {
    const allRecords: MetadataRecord[] = [];

    // Collect all successful records
    for (const result of results) {
      if (result.success) {
        allRecords.push(...result.records);
      }
    }

    // Simple deduplication by ID and source
    const seen = new Set<string>();
    const deduplicated: MetadataRecord[] = [];

    for (const record of allRecords) {
      const key = `${record.source}:${record.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(record);
      }
    }

    // Sort by confidence (highest first)
    return deduplicated.sort((a, b) => b.confidence - a.confidence);
  }
}
