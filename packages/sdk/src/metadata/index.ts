import type { LoosePartial } from "@colibri-hq/shared";
import type { BookMetadata, BookMetadataProvider } from "./types.js";

export { ViafMetadataProvider } from "./providers/viaf.js";
export { OpenLibraryMetadataProvider } from "./providers/open-library.js";
export { ISNIMetadataProvider } from "./providers/isni.js";
export { WikiDataMetadataProvider } from "./providers/wikidata.js";
export { LibraryOfCongressMetadataProvider } from "./providers/library-of-congress.js";
export { GoogleBooksMetadataProvider } from "./providers/google-books.js";
export { InternetArchiveMetadataProvider } from "./providers/internet-archive.js";
export { ISBNdbMetadataProvider } from "./providers/isbndb.js";
export { AmazonPaapiMetadataProvider } from "./providers/amazon.js";
export { DNBMetadataProvider } from "./providers/dnb.js";
export { BNBMetadataProvider } from "./providers/bnb.js";
export { CrossrefMetadataProvider } from "./providers/crossref.js";
export { SpringerNatureMetadataProvider } from "./providers/springer.js";
export { DOABMetadataProvider } from "./providers/doab.js";
export type * from "./types.js";

// New metadata provider infrastructure
export type {
  MetadataProvider as NewMetadataProvider,
  RateLimitConfig,
  TimeoutConfig,
  MetadataRecord,
  TitleQuery,
  CreatorQuery,
  MultiCriteriaQuery,
} from "./providers/provider.js";
export { BaseMetadataProvider, MetadataType } from "./providers/provider.js";
export {
  RetryableMetadataProvider,
  type RetryConfig,
  DEFAULT_RETRY_CONFIG,
} from "./providers/retryable-provider.js";
export { MetadataProviderRegistry, globalProviderRegistry } from "./registry.js";
export { RateLimiter, RateLimiterRegistry, globalRateLimiterRegistry } from "./rate-limiter.js";
export {
  TimeoutManager,
  TimeoutManagerRegistry,
  globalTimeoutManagerRegistry,
  TimeoutError,
} from "./timeout-manager.js";

// Configuration system
export type { ProviderConfig, MetadataSystemConfig } from "./config.js";
export { MetadataConfigManager, globalConfigManager, DEFAULT_METADATA_CONFIG } from "./config.js";
export { ConfigurableMetadataProvider } from "./providers/configurable-provider.js";

// Caching and performance optimization
export type { CacheEntry, CacheStats, CacheConfig } from "./cache.js";
export type { PerformanceMetrics, PerformanceStats, PerformanceConfig } from "./performance.js";
export {
  MetadataCache,
  MetadataRecordCache,
  MemoizationCache,
  globalMetadataCache,
  EvictionStrategy,
  DEFAULT_CACHE_CONFIG,
} from "./cache.js";
export {
  PerformanceMonitor,
  globalPerformanceMonitor,
  timed,
  DEFAULT_PERFORMANCE_CONFIG,
} from "./performance.js";
export {
  CacheableMetadataProvider,
  memoizeAsync,
  BatchProcessor,
} from "./providers/cacheable-provider.js";

// Multi-provider aggregation
export type { AggregatorOptions, AggregatedResult } from "./aggregator.js";
export { MetadataAggregator } from "./aggregator.js";

// Entity reconciliation system
export * from "./reconciliation/index.js";

// Embedded metadata conversion
export type { EmbeddedMetadataConfig } from "./providers/embedded-metadata-converter.js";
export {
  EmbeddedMetadataConverter,
  globalEmbeddedMetadataConverter,
  convertEmbeddedMetadata,
  createSearchQueryFromEmbedded,
  DEFAULT_EMBEDDED_CONFIG,
} from "./providers/embedded-metadata-converter.js";

// Embedded metadata provider
export type { EmbeddedProviderConfig } from "./providers/embedded-provider.js";
export {
  EmbeddedMetadataProvider,
  globalEmbeddedProvider,
  extractMetadataRecord,
  DEFAULT_EMBEDDED_PROVIDER_CONFIG,
} from "./providers/embedded-provider.js";

// Cover image fetching
export type {
  CoverResult,
  CoverSource,
  CoverFetchOptions,
  QualityAssessment,
} from "./providers/covers.js";
export {
  fetchCover,
  fetchCoverSizes,
  assessCoverQuality,
  isPlaceholderImage,
  CoverFetchError,
} from "./providers/covers.js";

// Provider selection strategies
export type { ProviderStrategy, StrategyOptions } from "./strategy.js";
export {
  selectProviders,
  sortByPriority,
  sortBySpeed,
  filterByDataTypeSupport,
  filterByLanguageSupport,
  filterByReliability,
  registerProviderLanguageSupport,
  getProviderLanguageSupport,
} from "./strategy.js";

// Provider initialization and registration
export {
  initializeMetadataProviders,
  reinitializeProvider,
  getProviderInitializationStatus,
  cleanupMetadataProviders,
  getAvailableProviderNames,
  providerRequiresCredentials,
} from "./initialize-providers.js";

// Shared utilities for normalization, date parsing, and MARC parsing
export * from "./utils/index.js";

export async function* discoverBookMetadata(
  providers: BookMetadataProvider[],
  properties: LoosePartial<BookMetadata>,
) {
  for (const provider of providers) {
    try {
      const results = await provider.searchBook(properties);

      for (const result of results) {
        yield result;
      }
    } catch (cause) {
      if (!(cause instanceof Error)) {
        cause = new Error(`Unknown Error: ${cause}`, { cause });
      }

      throw new Error(
        `Error searching book metadata with provider ${provider.constructor.name}: ${(cause as Error).message}`,
        { cause },
      );
    }
  }
}
