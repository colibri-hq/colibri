/**
 * Reconciliation coordinator for SDK metadata providers
 *
 * This module provides a high-level API for reconciling metadata from
 * multiple provider sources into a single, coherent metadata record.
 */

import type { MetadataRecord } from "../providers/provider.js";
import type {
  ContentDescriptionInput,
  IdentifierInput,
  MetadataSource,
  PhysicalDescriptionInput,
  PublicationInfoInput,
  ReconciledContentDescription,
  ReconciledField,
  ReconciledIdentifiers,
  ReconciledPhysicalDescription,
  ReconciledPublicationInfo,
  ReconciledSeries,
  ReconciledSubjects,
  SeriesInput,
  SubjectInput,
} from "./types.js";
import { ContentReconciler } from "./content.js";
import { IdentifierReconciler } from "./identifiers.js";
import { PhysicalReconciler } from "./physical.js";
import { PublicationReconciler } from "./publication.js";
import { SeriesReconciler } from "./series.js";
import { SubjectReconciler } from "./subjects.js";

/**
 * Configuration for the reconciliation coordinator
 */
export interface ReconciliationConfig {
  /** Enable publisher reconciliation */
  reconcilePublishers: boolean;
  /** Enable subject/genre reconciliation */
  reconcileSubjects: boolean;
  /** Enable series reconciliation */
  reconcileSeries: boolean;
  /** Enable date reconciliation */
  reconcileDates: boolean;
  /** Enable identifier reconciliation */
  reconcileIdentifiers: boolean;
  /** Enable physical description reconciliation */
  reconcilePhysical: boolean;
  /** Enable content description reconciliation */
  reconcileContent: boolean;
  /** Minimum confidence threshold for accepting reconciled values */
  minConfidenceThreshold: number;
  /** Prefer completeness over confidence */
  preferCompleteness: boolean;
}

/**
 * Complete reconciled metadata result
 */
export interface ReconciledMetadata {
  /** Publication information (publisher, date, place) */
  publication: ReconciledPublicationInfo;
  /** Subjects and genres */
  subjects: ReconciledSubjects;
  /** Identifiers (ISBN, OCLC, etc.) */
  identifiers: ReconciledIdentifiers;
  /** Physical description (dimensions, format, language) */
  physical: ReconciledPhysicalDescription;
  /** Content description (description, ToC, reviews) */
  content: ReconciledContentDescription;
  /** Series information */
  series: ReconciledSeries;
  /** Overall confidence in the reconciliation */
  overallConfidence: number;
  /** Statistics about the reconciliation process */
  stats: {
    totalSources: number;
    fieldsReconciled: number;
    conflictsDetected: number;
    conflictsResolved: number;
    processingTimeMs: number;
  };
}

/**
 * Options for reconciliation
 */
export interface ReconciliationOptions {
  /** Configuration overrides */
  config?: Partial<ReconciliationConfig>;
  /** Additional context for reconciliation */
  context?: {
    /** Expected language for content */
    expectedLanguage?: string;
    /** Expected publication year range */
    expectedYearRange?: [number, number];
    /** User preferences */
    preferences?: {
      /** Prefer certain publishers */
      preferredPublishers?: string[];
      /** Preferred classification scheme */
      preferredClassification?: "dewey" | "lcc" | "bisac";
    };
  };
}

/**
 * Default configuration
 */
export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  reconcilePublishers: true,
  reconcileSubjects: true,
  reconcileSeries: true,
  reconcileDates: true,
  reconcileIdentifiers: true,
  reconcilePhysical: true,
  reconcileContent: true,
  minConfidenceThreshold: 0.5,
  preferCompleteness: false,
};

/**
 * ReconciliationCoordinator orchestrates metadata reconciliation across providers
 *
 * It converts MetadataRecord[] from providers into reconciliation inputs,
 * orchestrates all domain-specific reconcilers, and produces a complete
 * ReconciledMetadata result.
 *
 * @example
 * ```typescript
 * const coordinator = new ReconciliationCoordinator();
 *
 * // Get records from multiple providers
 * const records = await Promise.all([
 *   openLibraryProvider.searchByISBN('9780451524935'),
 *   wikidataProvider.searchByISBN('9780451524935'),
 * ]);
 *
 * // Reconcile into single metadata object
 * const result = await coordinator.reconcile(records.flat());
 *
 * console.log(result.publication.publisher.value.name); // "Penguin Random House"
 * console.log(result.subjects.subjects.value); // ["fiction", "dystopia", "science fiction"]
 * ```
 */
export class ReconciliationCoordinator {
  private config: ReconciliationConfig;

  // Cached reconciler instances (stateless, can be reused)
  private readonly publicationReconciler = new PublicationReconciler();
  private readonly subjectReconciler = new SubjectReconciler();
  private readonly identifierReconciler = new IdentifierReconciler();
  private readonly physicalReconciler = new PhysicalReconciler();
  private readonly contentReconciler = new ContentReconciler();
  private readonly seriesReconciler = new SeriesReconciler();

  constructor(config: Partial<ReconciliationConfig> = {}) {
    this.config = { ...DEFAULT_RECONCILIATION_CONFIG, ...config };
  }

  /**
   * Reconcile metadata from multiple provider records
   *
   * This is the main entry point for the reconciliation system. It:
   * 1. Converts SDK MetadataRecord[] to reconciliation inputs
   * 2. Runs all enabled reconcilers in parallel
   * 3. Aggregates results into a complete ReconciledMetadata object
   * 4. Calculates overall confidence and statistics
   *
   * @param records - Metadata records from various providers
   * @param options - Reconciliation options
   * @returns Complete reconciled metadata with confidence scores
   */
  async reconcile(
    records: MetadataRecord[],
    options?: ReconciliationOptions,
  ): Promise<ReconciledMetadata> {
    const startTime = Date.now();

    // Merge configuration with options
    const config = { ...this.config, ...(options?.config || {}) };

    // Convert MetadataRecord[] to reconciliation inputs
    const sources = this.convertToMetadataSources(records);
    const publicationInputs = this.convertToPublicationInputs(records, sources);
    const subjectInputs = this.convertToSubjectInputs(records, sources);
    const identifierInputs = this.convertToIdentifierInputs(records, sources);
    const physicalInputs = this.convertToPhysicalInputs(records, sources);
    const contentInputs = this.convertToContentInputs(records, sources);
    const seriesInputs = this.convertToSeriesInputs(records, sources);

    // Run reconcilers in parallel (they are independent)
    const [publication, subjects, identifiers, physical, content, series] = await Promise.all([
      config.reconcilePublishers && publicationInputs.length > 0
        ? this.reconcilePublication(publicationInputs)
        : this.getEmptyPublicationInfo(),

      config.reconcileSubjects && subjectInputs.length > 0
        ? this.reconcileSubjects(subjectInputs)
        : this.getEmptySubjects(),

      config.reconcileIdentifiers && identifierInputs.length > 0
        ? this.reconcileIdentifiers(identifierInputs)
        : this.getEmptyIdentifiers(),

      config.reconcilePhysical && physicalInputs.length > 0
        ? this.reconcilePhysical(physicalInputs)
        : this.getEmptyPhysical(),

      config.reconcileContent && contentInputs.length > 0
        ? this.reconcileContent(contentInputs)
        : this.getEmptyContent(),

      config.reconcileSeries && seriesInputs.length > 0
        ? this.reconcileSeries(seriesInputs)
        : this.getEmptySeries(),
    ]);

    // Calculate overall confidence and statistics
    const overallConfidence = this.calculateOverallConfidence([
      publication.publisher.confidence,
      publication.date.confidence,
      subjects.subjects.confidence,
      identifiers.identifiers.confidence,
      physical.pageCount.confidence,
      content.description.confidence,
    ]);

    const stats = {
      totalSources: sources.length,
      fieldsReconciled: this.countReconciledFields([
        publication,
        subjects,
        identifiers,
        physical,
        content,
        series,
      ]),
      conflictsDetected: this.countConflicts([
        publication,
        subjects,
        identifiers,
        physical,
        content,
        series,
      ]),
      conflictsResolved: this.countResolvedConflicts([
        publication,
        subjects,
        identifiers,
        physical,
        content,
        series,
      ]),
      processingTimeMs: Date.now() - startTime,
    };

    return {
      publication,
      subjects,
      identifiers,
      physical,
      content,
      series,
      overallConfidence,
      stats,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ReconciliationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ReconciliationConfig {
    return { ...this.config };
  }

  /**
   * Convert SDK MetadataRecord[] to MetadataSource[]
   */
  private convertToMetadataSources(records: MetadataRecord[]): MetadataSource[] {
    return records.map((record) => ({
      name: record.source,
      reliability: record.confidence,
      timestamp: record.timestamp,
    }));
  }

  /**
   * Convert MetadataRecord[] to PublicationInfoInput[]
   */
  private convertToPublicationInputs(
    records: MetadataRecord[],
    sources: MetadataSource[],
  ): PublicationInfoInput[] {
    return records
      .map((record, index) => ({
        date: record.publicationDate?.toISOString(),
        publisher: record.publisher,
        place: undefined, // SDK MetadataRecord doesn't have place
        source: sources[index],
      }))
      .filter((input) => input.date || input.publisher);
  }

  /**
   * Convert MetadataRecord[] to SubjectInput[]
   */
  private convertToSubjectInputs(
    records: MetadataRecord[],
    sources: MetadataSource[],
  ): SubjectInput[] {
    return records
      .map((record, index) => ({ subjects: record.subjects, source: sources[index] }))
      .filter((input) => input.subjects && input.subjects.length > 0);
  }

  /**
   * Convert MetadataRecord[] to IdentifierInput[]
   */
  private convertToIdentifierInputs(
    records: MetadataRecord[],
    sources: MetadataSource[],
  ): IdentifierInput[] {
    return records.map((record, index) => ({ isbn: record.isbn, source: sources[index] }));
  }

  /**
   * Convert MetadataRecord[] to PhysicalDescriptionInput[]
   */
  private convertToPhysicalInputs(
    records: MetadataRecord[],
    sources: MetadataSource[],
  ): PhysicalDescriptionInput[] {
    return records.map((record, index) => ({
      pageCount: record.pageCount,
      dimensions: record.physicalDimensions,
      languages: record.language,
      source: sources[index],
    }));
  }

  /**
   * Convert MetadataRecord[] to ContentDescriptionInput[]
   */
  private convertToContentInputs(
    records: MetadataRecord[],
    sources: MetadataSource[],
  ): ContentDescriptionInput[] {
    return records
      .map((record, index) => ({
        descriptions: record.description ? [record.description] : undefined,
        coverImages: record.coverImage ? [record.coverImage.url] : undefined,
        source: sources[index],
      }))
      .filter((input) => input.descriptions || input.coverImages);
  }

  /**
   * Convert MetadataRecord[] to SeriesInput[]
   */
  private convertToSeriesInputs(
    records: MetadataRecord[],
    sources: MetadataSource[],
  ): SeriesInput[] {
    return records
      .map((record, index) => ({
        series: record.series ? [record.series] : undefined,
        source: sources[index],
      }))
      .filter((input) => input.series && input.series.length > 0);
  }

  /**
   * Reconcile publication information (publisher, date, place)
   */
  private async reconcilePublication(
    inputs: PublicationInfoInput[],
  ): Promise<ReconciledPublicationInfo> {
    return this.publicationReconciler.reconcilePublicationInfo(inputs);
  }

  /**
   * Reconcile subjects and genres
   */
  private async reconcileSubjects(inputs: SubjectInput[]): Promise<ReconciledSubjects> {
    return { subjects: this.subjectReconciler.reconcileSubjects(inputs) };
  }

  /**
   * Reconcile identifiers (ISBN, OCLC, etc.)
   */
  private async reconcileIdentifiers(inputs: IdentifierInput[]): Promise<ReconciledIdentifiers> {
    return { identifiers: this.identifierReconciler.reconcileIdentifiers(inputs) };
  }

  /**
   * Reconcile physical description
   */
  private async reconcilePhysical(
    inputs: PhysicalDescriptionInput[],
  ): Promise<ReconciledPhysicalDescription> {
    return this.physicalReconciler.reconcilePhysicalDescriptions(inputs);
  }

  /**
   * Reconcile content description
   */
  private async reconcileContent(
    inputs: ContentDescriptionInput[],
  ): Promise<ReconciledContentDescription> {
    return this.contentReconciler.reconcileContentDescription(inputs);
  }

  /**
   * Reconcile series information
   */
  private async reconcileSeries(inputs: SeriesInput[]): Promise<ReconciledSeries> {
    return this.seriesReconciler.reconcileSeries(inputs);
  }

  // Empty result getters (for disabled reconcilers or empty inputs)
  private getEmptyPublicationInfo(): ReconciledPublicationInfo {
    const emptyField = <T>(defaultValue: T) => ({
      value: defaultValue,
      confidence: 0,
      sources: [],
      conflicts: undefined,
      reasoning: "No data available",
    });
    return {
      date: emptyField({ precision: "unknown" as const }),
      publisher: emptyField({ name: "" }),
      place: emptyField({ name: "" }),
    };
  }

  private getEmptySubjects(): ReconciledSubjects {
    return {
      subjects: {
        value: [],
        confidence: 0,
        sources: [],
        conflicts: undefined,
        reasoning: "No data available",
      },
    };
  }

  private getEmptyIdentifiers(): ReconciledIdentifiers {
    return {
      identifiers: {
        value: [],
        confidence: 0,
        sources: [],
        conflicts: undefined,
        reasoning: "No data available",
      },
    };
  }

  private getEmptyPhysical(): ReconciledPhysicalDescription {
    const emptyField = <T>(defaultValue: T) => ({
      value: defaultValue,
      confidence: 0,
      sources: [],
      conflicts: undefined,
      reasoning: "No data available",
    });
    return {
      pageCount: emptyField(0),
      dimensions: emptyField({}),
      format: emptyField({}),
      languages: emptyField([]),
      weight: emptyField(0),
    };
  }

  private getEmptyContent(): ReconciledContentDescription {
    const emptyField = <T>(defaultValue: T) => ({
      value: defaultValue,
      confidence: 0,
      sources: [],
      conflicts: undefined,
      reasoning: "No data available",
    });
    return {
      description: emptyField({ text: "" }),
      tableOfContents: emptyField({ entries: [] }),
      reviews: emptyField([]),
      rating: emptyField({ value: 0, scale: 5 }),
      coverImage: emptyField({ url: "" }),
      excerpt: emptyField(""),
    };
  }

  private getEmptySeries(): ReconciledSeries {
    return {
      series: {
        value: [],
        confidence: 0,
        sources: [],
        conflicts: undefined,
        reasoning: "No data available",
      },
    };
  }

  /**
   * Calculate overall confidence from individual field confidences
   */
  private calculateOverallConfidence(confidences: number[]): number {
    const validConfidences = confidences.filter((c) => !isNaN(c) && c > 0);
    if (validConfidences.length === 0) return 0;

    // Weighted average with diminishing returns for more sources
    const sum = validConfidences.reduce((acc, c) => acc + c, 0);
    const avg = sum / validConfidences.length;

    // Boost confidence slightly for having multiple sources
    const sourceBonus = Math.min(0.1, validConfidences.length * 0.02);

    return Math.min(1.0, avg + sourceBonus);
  }

  /**
   * Count total reconciled fields across all result objects.
   * A field is considered "reconciled" if it has confidence > 0.
   */
  private countReconciledFields(
    results: [
      ReconciledPublicationInfo,
      ReconciledSubjects,
      ReconciledIdentifiers,
      ReconciledPhysicalDescription,
      ReconciledContentDescription,
      ReconciledSeries,
    ],
  ): number {
    const [publication, subjects, identifiers, physical, content, series] = results;

    const fields: ReconciledField<unknown>[] = [
      // Publication fields
      publication.date,
      publication.publisher,
      publication.place,
      // Subjects
      subjects.subjects,
      // Identifiers
      identifiers.identifiers,
      // Physical description
      physical.pageCount,
      physical.dimensions,
      physical.format,
      physical.languages,
      physical.weight,
      // Content description
      content.description,
      content.tableOfContents,
      content.reviews,
      content.rating,
      content.coverImage,
      content.excerpt,
      // Series
      series.series,
    ];

    return fields.filter((field) => field.confidence > 0).length;
  }

  /**
   * Count total conflicts detected across all result objects.
   * Counts individual conflicts from all ReconciledField.conflicts arrays.
   */
  private countConflicts(
    results: [
      ReconciledPublicationInfo,
      ReconciledSubjects,
      ReconciledIdentifiers,
      ReconciledPhysicalDescription,
      ReconciledContentDescription,
      ReconciledSeries,
    ],
  ): number {
    const [publication, subjects, identifiers, physical, content, series] = results;

    const fields: ReconciledField<unknown>[] = [
      publication.date,
      publication.publisher,
      publication.place,
      subjects.subjects,
      identifiers.identifiers,
      physical.pageCount,
      physical.dimensions,
      physical.format,
      physical.languages,
      physical.weight,
      content.description,
      content.tableOfContents,
      content.reviews,
      content.rating,
      content.coverImage,
      content.excerpt,
      series.series,
    ];

    return fields.reduce((total, field) => total + (field.conflicts?.length ?? 0), 0);
  }

  /**
   * Count conflicts that were resolved across all result objects.
   * A conflict is considered "resolved" if it has a non-empty resolution string.
   */
  private countResolvedConflicts(
    results: [
      ReconciledPublicationInfo,
      ReconciledSubjects,
      ReconciledIdentifiers,
      ReconciledPhysicalDescription,
      ReconciledContentDescription,
      ReconciledSeries,
    ],
  ): number {
    const [publication, subjects, identifiers, physical, content, series] = results;

    const fields: ReconciledField<unknown>[] = [
      publication.date,
      publication.publisher,
      publication.place,
      subjects.subjects,
      identifiers.identifiers,
      physical.pageCount,
      physical.dimensions,
      physical.format,
      physical.languages,
      physical.weight,
      content.description,
      content.tableOfContents,
      content.reviews,
      content.rating,
      content.coverImage,
      content.excerpt,
      series.series,
    ];

    return fields.reduce((total, field) => {
      if (!field.conflicts) return total;
      // Count conflicts that have a non-empty resolution
      const resolvedCount = field.conflicts.filter(
        (conflict) => conflict.resolution && conflict.resolution.length > 0,
      ).length;
      return total + resolvedCount;
    }, 0);
  }
}

/**
 * Convenience function for reconciling metadata with default configuration
 *
 * @example
 * ```typescript
 * const records = await fetchFromProviders(isbn);
 * const reconciled = await reconcileMetadata(records);
 * ```
 */
export async function reconcileMetadata(
  records: MetadataRecord[],
  options?: ReconciliationOptions,
): Promise<ReconciledMetadata> {
  const coordinator = new ReconciliationCoordinator(options?.config);
  return coordinator.reconcile(records, options);
}
