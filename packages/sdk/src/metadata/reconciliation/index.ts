/**
 * Entity reconciliation system for metadata
 *
 * This module provides comprehensive reconciliation capabilities:
 * - Domain-specific reconcilers (date, publisher, subject, etc.)
 * - Multi-provider coordination
 * - Conflict detection and resolution
 * - Preview generation
 */

// Export types
export type {
  MetadataSource,
  ReconciledField,
  Conflict,
  PublicationDate,
  Publisher,
  PublicationPlace,
  PublicationInfo,
  PublicationInfoInput,
  ReconciledPublicationInfo,
  Subject,
  SubjectInput,
  ReconciledSubjects,
  Identifier,
  IdentifierInput,
  ReconciledIdentifiers,
  PhysicalDimensions,
  FormatInfo,
  LanguageInfo,
  PhysicalDescription,
  PhysicalDescriptionInput,
  ReconciledPhysicalDescription,
  Description,
  TableOfContents,
  TableOfContentsEntry,
  Review,
  Rating,
  CoverImage,
  ContentDescription,
  ContentDescriptionInput,
  ReconciledContentDescription,
  Series,
  Work,
  Edition,
  RelatedWork,
  Collection,
  CollectionContent,
  SeriesInput,
  WorkEditionInput,
  CollectionInput,
  ReconciledSeries,
  ReconciledWorkEdition,
  ReconciledCollection,
  LibraryEntry,
  LibraryPreview,
  DuplicateMatch,
  DuplicateMatchField,
  EditionSelection,
  EditionAlternative,
  SeriesRelationship,
  LibraryRecommendation,
  RecommendationAction,
  LibraryQuality,
} from "./types.js";

// Export field constants
export {
  METADATA_FIELDS,
  CORE_FIELDS,
  DUPLICATE_FIELD_WEIGHTS,
  isCoreField,
  getFieldWeight,
  getDuplicateFieldWeight,
  getFieldNameByIndex,
  type MetadataFieldName,
} from "./fields.js";

// Export reconcilers
export { DateReconciler } from "./dates.js";
export { PublisherReconciler } from "./publishers.js";
export { PlaceReconciler } from "./places.js";
export { PublicationReconciler } from "./publication.js";
export { SubjectReconciler } from "./subjects.js";
export { IdentifierReconciler } from "./identifiers.js";
export { PhysicalReconciler } from "./physical.js";
export { ContentReconciler } from "./content.js";
export { SeriesReconciler } from "./series.js";
export { WorkReconciler } from "./works.js";
export type { WorkReconciliationConfig, WorkCluster, EditionComparison } from "./works.js";

// Export metadata coordinator and query strategy
export { MetadataCoordinator } from "./fetch.js";
export type {
  CoordinatorConfig,
  ProviderResult,
  CoordinatorResult,
  QueryStrategy as CoordinatorQueryStrategy,
} from "./fetch.js";

export { QueryStrategyBuilder } from "./query-strategy.js";
export type {
  RelaxationRule,
  QueryStrategyConfig,
  QueryStrategy,
  QualityAssessment,
} from "./query-strategy.js";

// Export similarity utilities
export {
  levenshteinDistance,
  calculateStringSimilarity,
  calculateArraySimilarity,
  calculateIsbnSimilarity,
  calculateDateSimilarity,
  calculatePublisherSimilarity,
  calculateSeriesSimilarity,
} from "./similarity.js";

// Export duplicate detection
export { DuplicateDetector, detectDuplicates, DEFAULT_DUPLICATE_CONFIG } from "./duplicates.js";
export type { DuplicateDetectorConfig } from "./duplicates.js";

// Export edition selection
export { EditionSelector, DEFAULT_EDITION_SELECTOR_CONFIG } from "./editions.js";
export type { EditionSelectorConfig } from "./editions.js";

// Export series analysis
export { SeriesAnalyzer, DEFAULT_SERIES_ANALYZER_CONFIG } from "./series-analysis.js";
export type { SeriesAnalyzerConfig } from "./series-analysis.js";

// Export preview generator
export { PreviewGenerator } from "./preview.js";
export type {
  MetadataPreview,
  PreviewField,
  SourceAttribution,
  FieldQuality,
  QualityFactor,
  PreviewSummary,
  PreviewConfig,
  EnhancedMetadataPreview,
} from "./preview.js";

// Export quality assessor
export { QualityAssessor, DEFAULT_QUALITY_ASSESSOR_CONFIG } from "./quality.js";
export type { QualityAssessorConfig, LibraryQualityAssessment } from "./quality.js";

// Export recommendation generator
export {
  RecommendationGenerator,
  DEFAULT_RECOMMENDATION_GENERATOR_CONFIG,
} from "./recommendations.js";
export type { RecommendationGeneratorConfig } from "./recommendations.js";

// Export conflict detection and display
export { ConflictDetector } from "./conflicts.js";
export type {
  ConflictDetectionConfig,
  ConflictType,
  ConflictSeverity,
  DetailedConflict,
  ConflictImpact,
  ConflictDetectionMetadata,
  ConflictSummary,
} from "./conflicts.js";

export { ConflictDisplayFormatter } from "./conflict-format.js";
export type {
  ConflictDisplayConfig,
  FormattedConflict,
  ConflictValueDisplay,
  SourceDisplay,
  FormattedConflictSummary,
} from "./conflict-format.js";

// Export SDK coordinator wrapper
export {
  ReconciliationCoordinator,
  reconcileMetadata,
  DEFAULT_RECONCILIATION_CONFIG,
  type ReconciliationConfig,
  type ReconciliationOptions,
  type ReconciledMetadata,
} from "./reconcile.js";
