/**
 * Utilities for metadata enrichment with robust error handling and timeout management
 */

import type { EnrichmentResult, ExtractedMetadata } from "./types.js";
import { TimeoutError } from "../metadata/timeout-manager.js";

/**
 * Result of a single provider enrichment attempt
 */
export interface ProviderEnrichmentResult {
  /** Provider name */
  provider: string;
  /** Whether the enrichment succeeded */
  success: boolean;
  /** Enriched metadata if successful */
  metadata?: Partial<ExtractedMetadata>;
  /** Error if failed */
  error?: Error;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Duration in milliseconds */
  duration: number;
  /** Whether the result came from cache */
  fromCache?: boolean;
}

/**
 * Options for enrichment operation
 */
export interface EnrichmentOptions {
  /** Overall timeout for entire enrichment operation (ms) */
  overallTimeout?: number;
  /** Per-provider timeout (ms) */
  providerTimeout?: number;
  /** Continue on provider failures */
  continueOnError?: boolean;
  /** Specific providers to use (if not specified, uses all enabled) */
  providers?: string[];
  /** Maximum number of providers to query in parallel */
  maxParallel?: number;
  /** Minimum confidence threshold to include results (0-1) */
  minConfidence?: number;
}

/**
 * Default enrichment options
 */
export const DEFAULT_ENRICHMENT_OPTIONS: Required<EnrichmentOptions> = {
  overallTimeout: 30_000, // 30 seconds
  providerTimeout: 10_000, // 10 seconds per provider
  continueOnError: true,
  providers: [],
  maxParallel: 3,
  minConfidence: 0.5,
};

/**
 * Wrap a promise with a timeout that returns null on timeout
 * instead of throwing an error
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout?: () => void,
): Promise<T | null> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => {
      onTimeout?.();
      resolve(null);
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Wrap a promise with a timeout that throws TimeoutError on timeout
 */
export async function withTimeoutError<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage?: string,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(errorMessage || `Operation timed out after ${ms}ms`, ms));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Execute multiple provider queries with individual timeouts and error handling
 */
export async function executeProviderQueries<T>(
  queries: Array<{ provider: string; query: () => Promise<T>; timeout?: number }>,
  defaultTimeout: number = 10000,
): Promise<ProviderEnrichmentResult[]> {
  const startTime = Date.now();

  // Execute all queries in parallel with Promise.allSettled
  const settledResults = await Promise.allSettled(
    queries.map(async ({ provider, query, timeout }) => {
      const queryStart = Date.now();
      const effectiveTimeout = timeout || defaultTimeout;

      try {
        // Wrap the query with timeout
        const result = await withTimeoutError(
          query(),
          effectiveTimeout,
          `Provider ${provider} timed out after ${effectiveTimeout}ms`,
        );

        return {
          provider,
          success: true,
          metadata: result,
          duration: Date.now() - queryStart,
        } as ProviderEnrichmentResult;
      } catch (error) {
        return {
          provider,
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          duration: Date.now() - queryStart,
        } as ProviderEnrichmentResult;
      }
    }),
  );

  // Extract results from settled promises
  return settledResults.map((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      // This should rarely happen since we catch errors in the query execution
      return {
        provider: "unknown",
        success: false,
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        duration: Date.now() - startTime,
      };
    }
  });
}

/**
 * Execute provider queries in batches to limit parallelism
 */
export async function executeProviderQueriesBatched<T>(
  queries: Array<{ provider: string; query: () => Promise<T>; timeout?: number }>,
  batchSize: number,
  defaultTimeout: number = 10000,
): Promise<ProviderEnrichmentResult[]> {
  const results: ProviderEnrichmentResult[] = [];

  // Split queries into batches
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await executeProviderQueries(batch, defaultTimeout);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Merge enrichment results from multiple providers
 *
 * Strategy:
 * - Prioritize results with higher confidence
 * - For conflicts, keep the most confident value
 * - Merge arrays (contributors, subjects, identifiers)
 * - Track which providers contributed to each field
 */
export function mergeEnrichmentResults(results: ProviderEnrichmentResult[]): EnrichmentResult {
  const enriched: Partial<ExtractedMetadata> = {};
  const sources: string[] = [];
  const confidence: Record<string, number> = {};

  // Filter successful results
  const successfulResults = results.filter((r) => r.success && r.metadata);

  if (successfulResults.length === 0) {
    return { enriched, sources, confidence };
  }

  // Track sources
  successfulResults.forEach((r) => {
    if (!sources.includes(r.provider)) {
      sources.push(r.provider);
    }
  });

  // Helper to merge a field with confidence tracking
  const mergeField = <K extends keyof ExtractedMetadata>(
    field: K,
    getValue: (metadata: Partial<ExtractedMetadata>) => ExtractedMetadata[K] | undefined,
  ) => {
    let bestConfidence = 0;
    let bestValue: ExtractedMetadata[K] | undefined;

    for (const result of successfulResults) {
      const value = getValue(result.metadata!);
      const conf = result.confidence || 0.5;

      if (value !== undefined && conf > bestConfidence) {
        bestConfidence = conf;
        bestValue = value;
      }
    }

    if (bestValue !== undefined) {
      enriched[field] = bestValue;
      confidence[field] = bestConfidence;
    }
  };

  // Merge scalar fields (pick highest confidence)
  mergeField("title", (m) => m.title);
  mergeField("sortingKey", (m) => m.sortingKey);
  mergeField("synopsis", (m) => m.synopsis);
  mergeField("language", (m) => m.language);
  mergeField("datePublished", (m) => m.datePublished);
  mergeField("numberOfPages", (m) => m.numberOfPages);
  mergeField("legalInformation", (m) => m.legalInformation);
  mergeField("cover", (m) => m.cover);
  mergeField("series", (m) => m.series);

  // Merge array fields (combine and deduplicate)
  const allContributors: ExtractedMetadata["contributors"] = [];
  const allSubjects: string[] = [];
  const allIdentifiers: ExtractedMetadata["identifiers"] = [];

  for (const result of successfulResults) {
    const metadata = result.metadata!;

    // Merge contributors
    if (metadata.contributors) {
      allContributors.push(...metadata.contributors);
    }

    // Merge subjects
    if (metadata.subjects) {
      allSubjects.push(...metadata.subjects);
    }

    // Merge identifiers
    if (metadata.identifiers) {
      allIdentifiers.push(...metadata.identifiers);
    }
  }

  // Deduplicate contributors by name
  if (allContributors.length > 0) {
    enriched.contributors = Array.from(
      new Map(allContributors.map((c) => [c.name.toLowerCase(), c])).values(),
    );
    confidence.contributors = 0.7; // Medium confidence for merged data
  }

  // Deduplicate subjects
  if (allSubjects.length > 0) {
    enriched.subjects = Array.from(new Set(allSubjects));
    confidence.subjects = 0.7;
  }

  // Deduplicate identifiers by type+value
  if (allIdentifiers.length > 0) {
    enriched.identifiers = Array.from(
      new Map(allIdentifiers.map((id) => [`${id.type}:${id.value}`, id])).values(),
    );
    confidence.identifiers = 0.8; // Higher confidence for identifiers
  }

  // Merge properties object (shallow merge)
  const allProperties: Record<string, unknown> = {};
  for (const result of successfulResults) {
    if (result.metadata?.properties) {
      Object.assign(allProperties, result.metadata.properties);
    }
  }
  if (Object.keys(allProperties).length > 0) {
    enriched.properties = allProperties;
    confidence.properties = 0.6;
  }

  return { enriched, sources, confidence };
}

/**
 * Filter enrichment results by confidence threshold
 */
export function filterByConfidence(
  enrichment: EnrichmentResult,
  minConfidence: number,
): EnrichmentResult {
  const filteredEnriched: Partial<ExtractedMetadata> = {};
  const filteredConfidence: Record<string, number> = {};

  for (const [field, value] of Object.entries(enrichment.enriched)) {
    const conf = enrichment.confidence[field] || 0;
    if (conf >= minConfidence) {
      (filteredEnriched as any)[field] = value;
      filteredConfidence[field] = conf;
    }
  }

  return {
    enriched: filteredEnriched,
    sources: enrichment.sources,
    confidence: filteredConfidence,
  };
}

/**
 * Create enrichment summary for logging/debugging
 */
export function createEnrichmentSummary(
  results: ProviderEnrichmentResult[],
  enrichment: EnrichmentResult,
): {
  totalProviders: number;
  successfulProviders: number;
  failedProviders: number;
  timeoutProviders: number;
  fieldsEnriched: number;
  averageConfidence: number;
  totalDuration: number;
  errors: Array<{ provider: string; error: string }>;
} {
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const timeouts = results.filter((r) => !r.success && r.error instanceof TimeoutError).length;

  const fieldsEnriched = Object.keys(enrichment.enriched).length;
  const confidenceValues = Object.values(enrichment.confidence);
  const averageConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length
      : 0;

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  const errors = results
    .filter((r) => !r.success && r.error)
    .map((r) => ({ provider: r.provider, error: r.error!.message }));

  return {
    totalProviders: results.length,
    successfulProviders: successful,
    failedProviders: failed,
    timeoutProviders: timeouts,
    fieldsEnriched,
    averageConfidence,
    totalDuration,
    errors,
  };
}
