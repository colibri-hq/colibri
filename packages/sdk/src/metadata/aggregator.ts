/**
 * MetadataAggregator - Coordinates queries across multiple metadata providers
 *
 * This module provides functionality to:
 * - Query multiple providers in parallel with timeout handling
 * - Merge duplicate results based on ISBN/title matching
 * - Calculate consensus confidence when multiple providers agree
 * - Track timing and errors per provider
 *
 * @module metadata/aggregator
 */

import type { ConfidenceFactors } from "./providers/open-library/types.js";
import type {
  MetadataProvider,
  MetadataRecord,
  MultiCriteriaQuery,
  TitleQuery,
} from "./providers/provider.js";
import { normalizeISBN, normalizeTitle } from "./cache-keys.js";
import { calculateAggregatedConfidence } from "./providers/open-library/confidence.js";

/**
 * Configuration options for the MetadataAggregator
 */
export interface AggregatorOptions {
  /** Overall timeout in milliseconds (default: 30000ms = 30s) */
  timeout?: number;
  /** Minimum providers that must respond successfully (default: 1) */
  minProviders?: number;
  /** Whether to deduplicate results by ISBN (default: true) */
  deduplicateByIsbn?: boolean;
  /** Whether to calculate consensus confidence (default: true) */
  calculateConsensus?: boolean;
  /** @deprecated Logging is no longer supported. Use timing/errors from results instead. */
  enableLogging?: boolean;
}

/**
 * Result from aggregating metadata across multiple providers
 */
export interface AggregatedResult {
  /** Deduplicated and merged results with provider attribution */
  results: Array<MetadataRecord & { provider: string }>;
  /** Raw results grouped by provider */
  providerResults: Map<string, MetadataRecord[]>;
  /** Execution time per provider in milliseconds */
  timing: Map<string, number>;
  /** Errors encountered per provider */
  errors: Map<string, Error>;
  /** Consensus information if calculated */
  consensus?:
    | {
        /** Overall confidence score (0-1) */
        confidence: number;
        /** Agreement score between providers (0-1) */
        agreementScore: number;
        /** Detailed confidence factors */
        factors?: ConfidenceFactors | undefined;
      }
    | undefined;
}

/**
 * Result from a single provider query
 */
interface ProviderResult {
  provider: string;
  records: MetadataRecord[];
  timing: number;
  error?: Error;
}

/**
 * Default aggregator configuration
 */
const DEFAULT_OPTIONS: Required<AggregatorOptions> = {
  timeout: 30000,
  minProviders: 1,
  deduplicateByIsbn: true,
  calculateConsensus: true,
  enableLogging: false,
};

/**
 * MetadataAggregator coordinates queries across multiple metadata providers,
 * merging results and calculating consensus confidence scores.
 */
export class MetadataAggregator {
  private readonly providers: MetadataProvider[];
  private readonly options: Required<AggregatorOptions>;

  /**
   * Create a new MetadataAggregator
   *
   * @param providers - Array of metadata providers to query
   * @param options - Configuration options
   */
  constructor(providers: MetadataProvider[], options: AggregatorOptions = {}) {
    if (providers.length === 0) {
      throw new Error("MetadataAggregator requires at least one provider");
    }

    this.providers = providers;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Search for metadata by ISBN across all providers
   *
   * @param isbn - The ISBN to search for
   * @returns Aggregated results from all providers
   */
  async searchByISBN(isbn: string): Promise<AggregatedResult> {
    const providerPromises = this.providers.map((provider) =>
      this.executeProviderQuery(
        provider,
        () => provider.searchByISBN(isbn),
        `searchByISBN(${isbn})`,
      ),
    );

    const results = await this.awaitProviderResults(providerPromises);
    return this.aggregateResults(results);
  }

  /**
   * Search for metadata by title across all providers
   *
   * @param query - The title query
   * @returns Aggregated results from all providers
   */
  async searchByTitle(query: TitleQuery): Promise<AggregatedResult> {
    const providerPromises = this.providers.map((provider) =>
      this.executeProviderQuery(
        provider,
        () => provider.searchByTitle(query),
        `searchByTitle(${query.title})`,
      ),
    );

    const results = await this.awaitProviderResults(providerPromises);
    return this.aggregateResults(results);
  }

  /**
   * Search for metadata using multiple criteria across all providers
   *
   * @param query - The multi-criteria query
   * @returns Aggregated results from all providers
   */
  async searchMultiCriteria(query: MultiCriteriaQuery): Promise<AggregatedResult> {
    const providerPromises = this.providers.map((provider) =>
      this.executeProviderQuery(
        provider,
        () => provider.searchMultiCriteria(query),
        `searchMultiCriteria`,
      ),
    );

    const results = await this.awaitProviderResults(providerPromises);
    return this.aggregateResults(results);
  }

  /**
   * Get the list of providers being used
   */
  getProviders(): MetadataProvider[] {
    return [...this.providers];
  }

  /**
   * Get aggregator configuration
   */
  getOptions(): Required<AggregatorOptions> {
    return { ...this.options };
  }

  /**
   * Execute a query against a single provider with timing and error handling
   */
  private async executeProviderQuery(
    provider: MetadataProvider,
    queryFn: () => Promise<MetadataRecord[]>,
    _operationName: string,
  ): Promise<ProviderResult> {
    const startTime = performance.now();
    const providerName = provider.name;

    try {
      const records = await queryFn();
      const timing = performance.now() - startTime;

      return { provider: providerName, records, timing };
    } catch (error) {
      const timing = performance.now() - startTime;

      return {
        provider: providerName,
        records: [],
        timing,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Wait for all provider queries to complete with timeout handling
   */
  private async awaitProviderResults(
    promises: Promise<ProviderResult>[],
  ): Promise<ProviderResult[]> {
    // Use Promise.allSettled to ensure all providers complete (or timeout)
    const settledResults = await Promise.allSettled(promises);

    const results = settledResults.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        // Promise was rejected
        const provider = this.providers[index];
        return {
          provider: provider.name,
          records: [],
          timing: 0,
          error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        };
      }
    });

    // Check if minimum provider requirement is met
    const successfulProviders = results.filter((r) => !r.error).length;
    if (successfulProviders < this.options.minProviders) {
      throw new Error(
        `Only ${successfulProviders} provider(s) responded successfully, minimum ${this.options.minProviders} required`,
      );
    }

    return results;
  }

  /**
   * Aggregate and merge results from multiple providers
   */
  private aggregateResults(providerResults: ProviderResult[]): AggregatedResult {
    // Build maps for result structure
    const providerResultsMap = new Map<string, MetadataRecord[]>();
    const timingMap = new Map<string, number>();
    const errorsMap = new Map<string, Error>();

    for (const result of providerResults) {
      providerResultsMap.set(result.provider, result.records);
      timingMap.set(result.provider, result.timing);
      if (result.error) {
        errorsMap.set(result.provider, result.error);
      }
    }

    // Collect all successful records with provider attribution
    const allRecords: Array<MetadataRecord & { provider: string }> = [];
    for (const result of providerResults) {
      if (!result.error && result.records.length > 0) {
        for (const record of result.records) {
          allRecords.push({ ...record, provider: result.provider });
        }
      }
    }

    // Deduplicate results if enabled
    const deduplicatedResults = this.options.deduplicateByIsbn
      ? this.deduplicateByISBN(allRecords)
      : allRecords;

    // Calculate consensus if enabled
    let consensus: AggregatedResult["consensus"] | undefined;
    if (this.options.calculateConsensus && deduplicatedResults.length > 0) {
      consensus = this.calculateConsensus(deduplicatedResults);
    }

    return {
      results: deduplicatedResults,
      providerResults: providerResultsMap,
      timing: timingMap,
      errors: errorsMap,
      consensus,
    };
  }

  /**
   * Deduplicate results based on ISBN matching
   *
   * Groups results by normalized ISBN and merges duplicates, preferring
   * results from higher-priority providers.
   */
  private deduplicateByISBN(
    records: Array<MetadataRecord & { provider: string }>,
  ): Array<MetadataRecord & { provider: string }> {
    // Group records by normalized ISBN
    const isbnGroups = new Map<string, Array<MetadataRecord & { provider: string }>>();
    const nonIsbnRecords: Array<MetadataRecord & { provider: string }> = [];

    for (const record of records) {
      if (record.isbn && record.isbn.length > 0) {
        // Use the first ISBN for grouping
        const normalizedIsbn = normalizeISBN(record.isbn[0], true);
        if (normalizedIsbn) {
          const existing = isbnGroups.get(normalizedIsbn) ?? [];
          existing.push(record);
          isbnGroups.set(normalizedIsbn, existing);
          continue;
        }
      }

      // If no ISBN or normalization failed, try title-based matching
      if (record.title) {
        const normalizedTitle = normalizeTitle(record.title);

        // Check if we already have a record with this title
        let foundMatch = false;
        for (const existing of nonIsbnRecords) {
          if (existing.title && normalizeTitle(existing.title) === normalizedTitle) {
            foundMatch = true;
            break;
          }
        }

        if (!foundMatch) {
          nonIsbnRecords.push(record);
        }
      } else {
        // No ISBN and no title - keep the record
        nonIsbnRecords.push(record);
      }
    }

    // Merge ISBN groups, preferring higher-priority providers
    const mergedResults: Array<MetadataRecord & { provider: string }> = [];

    for (const group of isbnGroups.values()) {
      if (group.length === 1) {
        mergedResults.push(group[0]);
      } else {
        // Multiple records with same ISBN - merge them
        const merged = this.mergeRecords(group);
        mergedResults.push(merged);
      }
    }

    // Add non-ISBN records
    mergedResults.push(...nonIsbnRecords);

    return mergedResults;
  }

  /**
   * Merge multiple records into a single record, preferring higher-confidence data
   */
  private mergeRecords(
    records: Array<MetadataRecord & { provider: string }>,
  ): MetadataRecord & { provider: string } {
    // Sort by confidence (highest first)
    const sorted = [...records].sort((a, b) => b.confidence - a.confidence);
    const primary = sorted[0];

    // Merge array fields (ISBN, authors, subjects) by combining unique values
    const allIsbns = new Set<string>();
    const allAuthors = new Set<string>();
    const allSubjects = new Set<string>();

    for (const record of sorted) {
      if (record.isbn) {
        for (const isbn of record.isbn) {
          const normalized = normalizeISBN(isbn, true);
          if (normalized) allIsbns.add(normalized);
        }
      }
      if (record.authors) {
        for (const author of record.authors) {
          allAuthors.add(author);
        }
      }
      if (record.subjects) {
        for (const subject of record.subjects) {
          allSubjects.add(subject);
        }
      }
    }

    // Start with primary record, but we'll override array fields
    const merged: MetadataRecord & { provider: string } = {
      ...primary,
      provider: sorted.map((r) => r.provider).join(", "),
      // Override with merged array fields
      isbn: allIsbns.size > 0 ? Array.from(allIsbns) : primary.isbn,
      authors: allAuthors.size > 0 ? Array.from(allAuthors) : primary.authors,
      subjects: allSubjects.size > 0 ? Array.from(allSubjects) : primary.subjects,
    };

    // For scalar fields, prefer the first non-empty value from highest-confidence records
    for (const record of sorted) {
      if (!merged.title && record.title) merged.title = record.title;
      if (!merged.description && record.description) merged.description = record.description;
      if (!merged.publisher && record.publisher) merged.publisher = record.publisher;
      if (!merged.publicationDate && record.publicationDate)
        merged.publicationDate = record.publicationDate;
      if (!merged.language && record.language) merged.language = record.language;
      if (!merged.edition && record.edition) merged.edition = record.edition;
      if (!merged.pageCount && record.pageCount) merged.pageCount = record.pageCount;
      if (!merged.series && record.series) merged.series = record.series;
      if (!merged.coverImage && record.coverImage) merged.coverImage = record.coverImage;
      if (!merged.physicalDimensions && record.physicalDimensions)
        merged.physicalDimensions = record.physicalDimensions;
    }

    return merged;
  }

  /**
   * Calculate consensus confidence from multiple provider results
   */
  private calculateConsensus(
    records: Array<MetadataRecord & { provider: string }>,
  ): AggregatedResult["consensus"] {
    // Remove provider attribution for confidence calculation
    const recordsWithoutProvider = records.map(({ provider, ...record }) => record);

    // Use the OpenLibrary confidence calculation utilities
    const confidenceResult = calculateAggregatedConfidence(recordsWithoutProvider, {
      enableLogging: this.options.enableLogging,
    });

    return {
      confidence: confidenceResult.confidence,
      agreementScore: confidenceResult.factors.factors.agreementScore,
      factors: confidenceResult.factors,
    };
  }
}
