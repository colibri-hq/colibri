/**
 * Metadata providers barrel export
 *
 * This module exports all metadata provider implementations and
 * provider infrastructure components.
 */

// Provider base infrastructure
export type {
  MetadataProvider,
  RateLimitConfig,
  TimeoutConfig,
  MetadataRecord,
  TitleQuery,
  CreatorQuery,
  MultiCriteriaQuery,
} from "./provider.js";
export { BaseMetadataProvider, MetadataType } from "./provider.js";
export {
  RetryableMetadataProvider,
  type RetryConfig,
  DEFAULT_RETRY_CONFIG,
} from "./retryable-provider.js";
export { CacheableMetadataProvider, memoizeAsync, BatchProcessor } from "./cacheable-provider.js";
export { ConfigurableMetadataProvider } from "./configurable-provider.js";

// External metadata providers
export { OpenLibraryMetadataProvider } from "./open-library.js";
export { WikiDataMetadataProvider } from "./wikidata.js";
export { LibraryOfCongressMetadataProvider } from "./library-of-congress.js";
export { ISNIMetadataProvider } from "./isni.js";
export { ViafMetadataProvider } from "./viaf.js";
export { GoogleBooksMetadataProvider } from "./google-books.js";
export { InternetArchiveMetadataProvider } from "./internet-archive.js";
export { ISBNdbMetadataProvider } from "./isbndb.js";
export { AmazonPaapiMetadataProvider } from "./amazon.js";
export { DNBMetadataProvider } from "./dnb.js";
export { BNBMetadataProvider } from "./bnb.js";
export { CrossrefMetadataProvider } from "./crossref.js";
export { SpringerNatureMetadataProvider } from "./springer.js";
export { DOABMetadataProvider } from "./doab.js";

// Embedded metadata provider
export type { EmbeddedProviderConfig } from "./embedded-provider.js";
export {
  EmbeddedMetadataProvider,
  globalEmbeddedProvider,
  extractMetadataRecord,
  DEFAULT_EMBEDDED_PROVIDER_CONFIG,
} from "./embedded-provider.js";

// Embedded metadata conversion
export type { EmbeddedMetadataConfig } from "./embedded-metadata-converter.js";
export {
  EmbeddedMetadataConverter,
  globalEmbeddedMetadataConverter,
  convertEmbeddedMetadata,
  createSearchQueryFromEmbedded,
  DEFAULT_EMBEDDED_CONFIG,
} from "./embedded-metadata-converter.js";

// Cover image fetching
export type { CoverResult, CoverSource, CoverFetchOptions, QualityAssessment } from "./covers.js";
export {
  fetchCover,
  fetchCoverSizes,
  assessCoverQuality,
  isPlaceholderImage,
  CoverFetchError,
} from "./covers.js";

// Open Library utilities
export {
  calculateAggregatedConfidence,
  DEFAULT_CONFIDENCE_CONFIG,
} from "./open-library/confidence.js";
export type {
  ConfidenceConfig,
  ConfidenceFactors,
  ConfidenceResult,
  ConfidenceTier,
} from "./open-library/types.js";
export {
  normalizeAuthorName,
  parseNameComponents,
  areNamesEquivalent,
} from "./open-library/name-utils.js";
