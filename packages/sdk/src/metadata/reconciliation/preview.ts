import type { MetadataRecord } from "../providers/provider.js";
import type {
  Conflict,
  CoverImage,
  Description,
  DuplicateMatch,
  Edition,
  EditionSelection,
  Identifier,
  LibraryEntry,
  LibraryPreview,
  LibraryQuality,
  MetadataSource,
  PhysicalDescription,
  PublicationDate,
  Publisher,
  ReconciledField,
  RelatedWork,
  Series,
  SeriesRelationship,
  Subject,
  Work,
} from "./types.js";
import { ConflictDisplayFormatter, type FormattedConflictSummary } from "./conflict-format.js";
import { ConflictDetector, type ConflictSummary } from "./conflicts.js";
import { DuplicateDetector } from "./duplicates.js";
import { EditionSelector } from "./editions.js";
import { CORE_FIELDS, getFieldNameByIndex, METADATA_FIELDS } from "./fields.js";
import { type FieldQuality, QualityAssessor, type SourceAttribution } from "./quality.js";
import { RecommendationGenerator } from "./recommendations.js";
import { SeriesAnalyzer } from "./series-analysis.js";

/**
 * Consolidated metadata preview with source attribution and confidence scoring
 */
export interface MetadataPreview {
  /** Unique identifier for this preview */
  id: string;
  /** Timestamp when preview was generated */
  timestamp: Date;
  /** Overall confidence score for the preview */
  overallConfidence: number;
  /** Number of sources that contributed to this preview */
  sourceCount: number;
  /** List of all sources used */
  sources: MetadataSource[];

  // Core metadata fields with reconciliation info
  title: PreviewField<string>;
  authors: PreviewField<string[]>;
  isbn: PreviewField<string[]>;
  publicationDate: PreviewField<PublicationDate>;
  subjects: PreviewField<Subject[]>;
  description: PreviewField<Description>;
  language: PreviewField<string>;
  publisher: PreviewField<Publisher>;
  series: PreviewField<Series[]>;
  identifiers: PreviewField<Identifier[]>;
  physicalDescription: PreviewField<PhysicalDescription>;
  coverImage: PreviewField<CoverImage>;

  // Work and edition information
  work: PreviewField<Work>;
  edition: PreviewField<Edition>;
  relatedWorks: PreviewField<RelatedWork[]>;

  // Summary information
  summary: PreviewSummary;
}

/**
 * Preview field with source attribution and confidence information
 */
export interface PreviewField<T> {
  /** The reconciled value */
  value: T | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Sources that contributed to this field */
  sources: SourceAttribution[];
  /** Conflicts detected during reconciliation */
  conflicts: Conflict[];
  /** Human-readable reasoning for the reconciliation */
  reasoning: string;
  /** Whether this field has high confidence */
  isHighConfidence: boolean;
  /** Whether this field has conflicts */
  hasConflicts: boolean;
  /** Quality assessment of the field */
  quality: FieldQuality;
}

// Re-export types from quality-assessor for backwards compatibility
export type { SourceAttribution, FieldQuality, QualityFactor } from "./quality.js";

/**
 * Summary of the preview
 */
export interface PreviewSummary {
  /** Total number of fields with data */
  fieldsWithData: number;
  /** Total number of possible fields */
  totalFields: number;
  /** Completeness percentage */
  completeness: number;
  /** Number of high-confidence fields */
  highConfidenceFields: number;
  /** Number of fields with conflicts */
  conflictedFields: number;
  /** Most reliable source */
  mostReliableSource: MetadataSource;
  /** Least reliable source */
  leastReliableSource: MetadataSource;
  /** Overall quality assessment */
  overallQuality: FieldQuality;
  /** Key strengths of the metadata */
  strengths: string[];
  /** Key weaknesses or gaps */
  weaknesses: string[];
}

/**
 * Configuration for preview generation
 */
export interface PreviewConfig {
  /** Minimum confidence threshold for high confidence */
  highConfidenceThreshold: number;
  /** Minimum quality score for good quality */
  goodQualityThreshold: number;
  /** Whether to include detailed reasoning */
  includeDetailedReasoning: boolean;
  /** Whether to include quality suggestions */
  includeQualitySuggestions: boolean;
  /** Maximum number of sources to show per field */
  maxSourcesPerField: number;
  /** Whether to enable conflict detection */
  enableConflictDetection: boolean;
  /** Whether to include conflict display formatting */
  includeConflictDisplay: boolean;
}

/**
 * Enhanced metadata preview with conflict detection and resolution display
 */
export interface EnhancedMetadataPreview extends MetadataPreview {
  /** Detailed conflict analysis */
  conflictAnalysis: ConflictSummary;
  /** Formatted conflict display */
  conflictDisplay: FormattedConflictSummary;
  /** Conflict detection metadata */
  conflictDetectionMetadata: {
    detectedAt: Date;
    detectorVersion: string;
    totalConflictsDetected: number;
    autoResolvableCount: number;
    manualReviewCount: number;
  };
}

/**
 * PreviewGenerator creates consolidated metadata previews from reconciled data
 * with detailed source attribution and confidence scoring.
 */
export class PreviewGenerator {
  private config: PreviewConfig;
  private readonly conflictDetector: ConflictDetector;
  private readonly conflictDisplayFormatter: ConflictDisplayFormatter;
  private duplicateDetector: DuplicateDetector;
  private editionSelector: EditionSelector;
  private seriesAnalyzer: SeriesAnalyzer;
  private qualityAssessor: QualityAssessor;
  private recommendationGenerator: RecommendationGenerator;

  constructor(config: Partial<PreviewConfig> = {}) {
    this.config = {
      highConfidenceThreshold: 0.8,
      goodQualityThreshold: 0.7,
      includeDetailedReasoning: true,
      includeQualitySuggestions: true,
      maxSourcesPerField: 5,
      enableConflictDetection: true,
      includeConflictDisplay: true,
      ...config,
    };

    this.conflictDetector = new ConflictDetector();
    this.conflictDisplayFormatter = new ConflictDisplayFormatter();
    this.duplicateDetector = new DuplicateDetector();
    this.editionSelector = new EditionSelector();
    this.seriesAnalyzer = new SeriesAnalyzer();
    this.qualityAssessor = new QualityAssessor({
      highConfidenceThreshold: this.config.highConfidenceThreshold,
      goodQualityThreshold: this.config.goodQualityThreshold,
      includeQualitySuggestions: this.config.includeQualitySuggestions,
    });
    this.recommendationGenerator = new RecommendationGenerator();
  }

  /**
   * Generate a comprehensive metadata preview from raw metadata records
   */
  generatePreview(
    rawMetadata: MetadataRecord[],
    reconciledData?: Partial<{
      title: ReconciledField<string>;
      authors: ReconciledField<string[]>;
      isbn: ReconciledField<string[]>;
      publicationDate: ReconciledField<PublicationDate>;
      subjects: ReconciledField<Subject[]>;
      description: ReconciledField<Description>;
      language: ReconciledField<string>;
      publisher: ReconciledField<Publisher>;
      series: ReconciledField<Series[]>;
      identifiers: ReconciledField<Identifier[]>;
      physicalDescription: ReconciledField<PhysicalDescription>;
      coverImage: ReconciledField<CoverImage>;
      work: ReconciledField<Work>;
      edition: ReconciledField<Edition>;
      relatedWorks: ReconciledField<RelatedWork[]>;
    }>,
  ): MetadataPreview {
    const sources = this.extractSources(rawMetadata);
    const previewId = this.generatePreviewId(rawMetadata);

    // Create preview fields from reconciled data or raw metadata
    const title = this.createPreviewField(
      reconciledData?.title ?? this.createFallbackField<string>("title", rawMetadata, sources),
      "title",
      rawMetadata,
    );

    const authors = this.createPreviewField(
      reconciledData?.authors ??
        this.createFallbackField<string[]>("authors", rawMetadata, sources),
      "authors",
      rawMetadata,
    );

    const isbn = this.createPreviewField(
      reconciledData?.isbn ?? this.createFallbackField<string[]>("isbn", rawMetadata, sources),
      "isbn",
      rawMetadata,
    );

    const publicationDate = this.createPreviewField(
      reconciledData?.publicationDate ??
        this.createFallbackField<PublicationDate>("publicationDate", rawMetadata, sources),
      "publicationDate",
      rawMetadata,
    );

    const subjects = this.createPreviewField(
      reconciledData?.subjects ??
        this.createFallbackField<Subject[]>("subjects", rawMetadata, sources),
      "subjects",
      rawMetadata,
    );

    const description = this.createPreviewField(
      reconciledData?.description ??
        this.createFallbackField<Description>("description", rawMetadata, sources),
      "description",
      rawMetadata,
    );

    const language = this.createPreviewField(
      reconciledData?.language ??
        this.createFallbackField<string>("language", rawMetadata, sources),
      "language",
      rawMetadata,
    );

    const publisher = this.createPreviewField(
      reconciledData?.publisher ??
        this.createFallbackField<Publisher>("publisher", rawMetadata, sources),
      "publisher",
      rawMetadata,
    );

    const series = this.createPreviewField(
      reconciledData?.series ?? this.createFallbackField<Series[]>("series", rawMetadata, sources),
      "series",
      rawMetadata,
    );

    const identifiers = this.createPreviewField(
      reconciledData?.identifiers ??
        this.createFallbackField<Identifier[]>("identifiers", rawMetadata, sources),
      "identifiers",
      rawMetadata,
    );

    const physicalDescription = this.createPreviewField(
      reconciledData?.physicalDescription ??
        this.createFallbackField<PhysicalDescription>("physicalDescription", rawMetadata, sources),
      "physicalDescription",
      rawMetadata,
    );

    const coverImage = this.createPreviewField(
      reconciledData?.coverImage ??
        this.createFallbackField<CoverImage>("coverImage", rawMetadata, sources),
      "coverImage",
      rawMetadata,
    );

    const work = this.createPreviewField(
      reconciledData?.work ?? this.createFallbackField<Work>("work", rawMetadata, sources),
      "work",
      rawMetadata,
    );

    const edition = this.createPreviewField(
      reconciledData?.edition ?? this.createFallbackField<Edition>("edition", rawMetadata, sources),
      "edition",
      rawMetadata,
    );

    const relatedWorks = this.createPreviewField(
      reconciledData?.relatedWorks ??
        this.createFallbackField<RelatedWork[]>("relatedWorks", rawMetadata, sources),
      "relatedWorks",
      rawMetadata,
    );

    // Calculate overall confidence
    const allFields = [
      title,
      authors,
      isbn,
      publicationDate,
      subjects,
      description,
      language,
      publisher,
      series,
      identifiers,
      physicalDescription,
      coverImage,
      work,
      edition,
      relatedWorks,
    ];

    const overallConfidence = this.calculateOverallConfidence(allFields);

    // Generate summary
    const summary = this.generateSummary(allFields, sources);

    return {
      id: previewId,
      timestamp: new Date(),
      overallConfidence,
      sourceCount: sources.length,
      sources,
      title,
      authors,
      isbn,
      publicationDate,
      subjects,
      description,
      language,
      publisher,
      series,
      identifiers,
      physicalDescription,
      coverImage,
      work,
      edition,
      relatedWorks,
      summary,
    };
  }

  /**
   * Generate an enhanced metadata preview with conflict detection and resolution display
   */
  generateEnhancedPreview(
    rawMetadata: MetadataRecord[],
    reconciledData?: Partial<{
      title: ReconciledField<string>;
      authors: ReconciledField<string[]>;
      isbn: ReconciledField<string[]>;
      publicationDate: ReconciledField<PublicationDate>;
      subjects: ReconciledField<Subject[]>;
      description: ReconciledField<Description>;
      language: ReconciledField<string>;
      publisher: ReconciledField<Publisher>;
      series: ReconciledField<Series[]>;
      identifiers: ReconciledField<Identifier[]>;
      physicalDescription: ReconciledField<PhysicalDescription>;
      coverImage: ReconciledField<CoverImage>;
      work: ReconciledField<Work>;
      edition: ReconciledField<Edition>;
      relatedWorks: ReconciledField<RelatedWork[]>;
    }>,
  ): EnhancedMetadataPreview {
    // Generate the base preview
    const basePreview = this.generatePreview(rawMetadata, reconciledData);

    // Perform conflict detection if enabled
    let conflictAnalysis: ConflictSummary;
    let conflictDisplay: FormattedConflictSummary;
    let conflictDetectionMetadata;

    if (this.config.enableConflictDetection) {
      // Prepare reconciled fields for conflict analysis
      const reconciledFields = this.extractReconciledFields(basePreview, reconciledData);

      // Prepare raw metadata grouped by field
      const rawMetadataByField = this.groupRawMetadataByField(rawMetadata);

      // Detect conflicts
      conflictAnalysis = this.conflictDetector.analyzeAllConflicts(
        reconciledFields,
        rawMetadataByField,
      );

      // Format conflicts for display if enabled
      if (this.config.includeConflictDisplay) {
        conflictDisplay = this.conflictDisplayFormatter.formatConflictSummary(conflictAnalysis);
      } else {
        conflictDisplay = this.createEmptyConflictDisplay();
      }

      conflictDetectionMetadata = {
        detectedAt: new Date(),
        detectorVersion: "1.0.0",
        totalConflictsDetected: conflictAnalysis.totalConflicts,
        autoResolvableCount: conflictAnalysis.autoResolvableConflicts.length,
        manualReviewCount: conflictAnalysis.manualConflicts.length,
      };
    } else {
      // Create empty conflict analysis when disabled
      conflictAnalysis = this.createEmptyConflictAnalysis();
      conflictDisplay = this.createEmptyConflictDisplay();
      conflictDetectionMetadata = {
        detectedAt: new Date(),
        detectorVersion: "1.0.0",
        totalConflictsDetected: 0,
        autoResolvableCount: 0,
        manualReviewCount: 0,
      };
    }

    return { ...basePreview, conflictAnalysis, conflictDisplay, conflictDetectionMetadata };
  }

  /**
   * Generate a comprehensive conflict report for display
   */
  generateConflictReport(enhancedPreview: EnhancedMetadataPreview): string {
    if (!this.config.includeConflictDisplay) {
      return "Conflict display is disabled. Enable it in configuration to see detailed conflict information.";
    }

    return this.conflictDisplayFormatter.generateConflictReport(enhancedPreview.conflictAnalysis);
  }

  /**
   * Generate a library preview from reconciled metadata
   * This creates a final library entry preview with duplicate detection and edition selection
   */
  generateLibraryPreview(
    rawMetadata: MetadataRecord[],
    reconciledData?: Partial<{
      title: ReconciledField<string>;
      authors: ReconciledField<string[]>;
      isbn: ReconciledField<string[]>;
      publicationDate: ReconciledField<PublicationDate>;
      subjects: ReconciledField<Subject[]>;
      description: ReconciledField<Description>;
      language: ReconciledField<string>;
      publisher: ReconciledField<Publisher>;
      series: ReconciledField<Series[]>;
      identifiers: ReconciledField<Identifier[]>;
      physicalDescription: ReconciledField<PhysicalDescription>;
      coverImage: ReconciledField<CoverImage>;
      work: ReconciledField<Work>;
      edition: ReconciledField<Edition>;
      relatedWorks: ReconciledField<RelatedWork[]>;
    }>,
    existingLibrary: LibraryEntry[] = [],
  ): LibraryPreview {
    // Generate the base metadata preview first
    const metadataPreview = this.generatePreview(rawMetadata, reconciledData);

    // Create the proposed library entry
    const proposedEntry = this.createLibraryEntry(metadataPreview);

    // Detect duplicates against existing library (delegate to DuplicateDetector)
    const duplicates = this.duplicateDetector.detectDuplicates(proposedEntry, existingLibrary);

    // Perform edition selection (delegate to EditionSelector)
    const editionSelection = this.editionSelector.selectBestEdition(metadataPreview, rawMetadata);

    // Detect series relationships (delegate to SeriesAnalyzer)
    const seriesRelationships = this.seriesAnalyzer.detectSeriesRelationships(
      metadataPreview,
      existingLibrary,
    );

    // Generate recommendations
    const recommendations = this.generateLibraryRecommendations(
      proposedEntry,
      duplicates,
      editionSelection,
      seriesRelationships,
      metadataPreview,
    );

    // Assess library quality
    const quality = this.assessLibraryQuality(proposedEntry, metadataPreview);

    return {
      entry: proposedEntry,
      confidence: metadataPreview.overallConfidence,
      sources: metadataPreview.sources,
      duplicates,
      editionSelection,
      seriesRelationships,
      recommendations,
      quality,
    };
  }

  /**
   * Detect duplicate entries in the existing library
   * @deprecated Use DuplicateDetector directly for more control
   */
  detectDuplicates(proposedEntry: LibraryEntry, existingLibrary: LibraryEntry[]): DuplicateMatch[] {
    return this.duplicateDetector.detectDuplicates(proposedEntry, existingLibrary);
  }

  /**
   * Get access to the conflict detector for external use
   */
  getConflictDetector(): ConflictDetector {
    return this.conflictDetector;
  }

  /**
   * Get access to the conflict display formatter for external use
   */
  getConflictDisplayFormatter(): ConflictDisplayFormatter {
    return this.conflictDisplayFormatter;
  }

  /**
   * Get current configuration
   */
  getConfig(): PreviewConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PreviewConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Detect conflicts in a specific field (for external use)
   */
  detectFieldConflicts<T>(
    field: ReconciledField<T>,
    fieldName: string,
    rawValues: Array<{ value: T; source: MetadataSource }>,
  ): any[] {
    if (!this.config.enableConflictDetection) {
      return [];
    }

    return this.conflictDetector.detectFieldConflicts(field, fieldName, rawValues);
  }

  /**
   * Extract metadata sources from raw records
   */
  private extractSources(rawMetadata: MetadataRecord[]): MetadataSource[] {
    const sourceMap = new Map<string, MetadataSource>();

    for (const record of rawMetadata) {
      if (!sourceMap.has(record.source)) {
        sourceMap.set(record.source, {
          name: record.source,
          reliability: record.confidence, // Use record confidence as source reliability
          timestamp: record.timestamp,
        });
      }
    }

    return Array.from(sourceMap.values());
  }

  /**
   * Generate a unique preview ID
   */
  private generatePreviewId(rawMetadata: MetadataRecord[]): string {
    const sourceNames = rawMetadata
      .map((r) => r.source)
      .sort()
      .join("-");
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `preview-${timestamp}-${this.hashString(sourceNames)}-${random}`;
  }

  /**
   * Simple hash function for generating IDs
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Create a fallback reconciled field from raw metadata when reconciled data is not available
   */
  private createFallbackField<T>(
    fieldName: string,
    rawMetadata: MetadataRecord[],
    sources: MetadataSource[],
  ): ReconciledField<T> {
    // Extract values for this field from raw metadata
    const values: Array<{ value: T; source: MetadataSource }> = [];

    for (const record of rawMetadata) {
      const value = (record as any)[fieldName];
      if (value !== undefined && value !== null) {
        const source = sources.find((s) => s.name === record.source);
        if (source) {
          values.push({ value, source });
        }
      }
    }

    if (values.length === 0) {
      return {
        value: null as T,
        confidence: 0.1,
        sources: [],
        reasoning: `No ${fieldName} data available from any source`,
      };
    }

    // Use the value from the most reliable source
    const sortedValues = values.sort((a, b) => b.source.reliability - a.source.reliability);
    const primaryValue = sortedValues[0];

    return {
      value: primaryValue.value,
      confidence: primaryValue.source.reliability,
      sources: values.map((v) => v.source),
      reasoning: `Using ${fieldName} from most reliable source: ${primaryValue.source.name}`,
    };
  }

  /**
   * Create a preview field from a reconciled field
   */
  private createPreviewField<T>(
    reconciledField: ReconciledField<T>,
    fieldName: string,
    rawMetadata: MetadataRecord[],
  ): PreviewField<T> {
    const sourceAttributions = this.createSourceAttributions(
      reconciledField,
      fieldName,
      rawMetadata,
    );
    const quality = this.assessFieldQuality(reconciledField, sourceAttributions);
    const isHighConfidence = reconciledField.confidence >= this.config.highConfidenceThreshold;
    const hasConflicts = (reconciledField.conflicts?.length || 0) > 0;

    return {
      value: reconciledField.value,
      confidence: reconciledField.confidence,
      sources: sourceAttributions,
      conflicts: reconciledField.conflicts || [],
      reasoning:
        reconciledField.reasoning ||
        `Reconciled ${fieldName} from ${sourceAttributions.length} sources`,
      isHighConfidence,
      hasConflicts,
      quality,
    };
  }

  /**
   * Create source attributions for a field
   */
  private createSourceAttributions<T>(
    reconciledField: ReconciledField<T>,
    fieldName: string,
    rawMetadata: MetadataRecord[],
  ): SourceAttribution[] {
    const attributions: SourceAttribution[] = [];
    const fieldSources = reconciledField.sources || [];

    // Find the primary source (highest reliability)
    const primarySource = fieldSources.reduce(
      (prev, current) => (current.reliability > prev.reliability ? current : prev),
      fieldSources[0],
    );

    for (const source of fieldSources) {
      // Find the original value from this source
      const originalRecord = rawMetadata.find((r) => r.source === source.name);
      const originalValue = originalRecord ? (originalRecord as any)[fieldName] : null;

      // Calculate weight based on source reliability
      const totalReliability = fieldSources.reduce((sum, s) => sum + s.reliability, 0);
      const weight = totalReliability > 0 ? source.reliability / totalReliability : 0;

      attributions.push({
        source,
        originalValue,
        weight,
        isPrimary: source === primarySource,
        fieldReliability: source.reliability,
      });
    }

    // Sort by weight (highest first) and limit to max sources
    return attributions
      .sort((a, b) => b.weight - a.weight)
      .slice(0, this.config.maxSourcesPerField);
  }

  /**
   * Assess the quality of a field
   */
  private assessFieldQuality<T>(
    reconciledField: ReconciledField<T>,
    sourceAttributions: SourceAttribution[],
  ): FieldQuality {
    return this.qualityAssessor.assessFieldQuality(reconciledField, sourceAttributions);
  }

  /**
   * Calculate overall confidence across all fields
   */
  private calculateOverallConfidence(fields: PreviewField<any>[]): number {
    const fieldsWithData = fields.filter((f) => f.value !== null && f.value !== undefined);

    if (fieldsWithData.length === 0) {
      return 0.1;
    }

    // Weight core fields more heavily
    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (field.value !== null && field.value !== undefined) {
        const fieldName = getFieldNameByIndex(i);
        const weight = (CORE_FIELDS as readonly string[]).includes(fieldName) ? 2 : 1;
        weightedSum += field.confidence * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.1;
  }

  /**
   * Generate summary of the preview
   */
  private generateSummary(fields: PreviewField<any>[], sources: MetadataSource[]): PreviewSummary {
    const fieldsWithData = fields.filter((f) => f.value !== null && f.value !== undefined);
    const highConfidenceFields = fields.filter((f) => f.isHighConfidence);
    const conflictedFields = fields.filter((f) => f.hasConflicts);

    // Find most and least reliable sources
    const sortedSources = [...sources].sort((a, b) => b.reliability - a.reliability);
    const mostReliableSource = sortedSources[0];
    const leastReliableSource = sortedSources[sortedSources.length - 1];

    // Calculate overall quality
    const avgQualityScore = fields.reduce((sum, f) => sum + f.quality.score, 0) / fields.length;
    const overallQuality: FieldQuality = {
      score: avgQualityScore,
      level:
        avgQualityScore >= 0.9
          ? "excellent"
          : avgQualityScore >= this.config.goodQualityThreshold
            ? "good"
            : avgQualityScore >= 0.5
              ? "fair"
              : "poor",
      factors: [
        {
          name: "completeness",
          impact: (fieldsWithData.length / fields.length - 0.5) * 0.4,
          description: `${fieldsWithData.length}/${fields.length} fields have data`,
        },
        {
          name: "confidence",
          impact: (highConfidenceFields.length / fieldsWithData.length - 0.5) * 0.3,
          description: `${highConfidenceFields.length}/${fieldsWithData.length} fields have high confidence`,
        },
      ],
      suggestions: [],
    };

    // Generate strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (fieldsWithData.length / fields.length > 0.7) {
      strengths.push("Good data completeness");
    }
    if (highConfidenceFields.length / fieldsWithData.length > 0.6) {
      strengths.push("High confidence in most fields");
    }
    if (sources.length > 2) {
      strengths.push("Multiple sources provide good coverage");
    }

    if (fieldsWithData.length / fields.length < 0.5) {
      weaknesses.push("Many fields are missing data");
    }
    if (conflictedFields.length > 0) {
      weaknesses.push(`${conflictedFields.length} fields have conflicts`);
    }
    if (sources.length < 2) {
      weaknesses.push("Limited number of sources");
    }

    return {
      fieldsWithData: fieldsWithData.length,
      totalFields: fields.length,
      completeness: fieldsWithData.length / fields.length,
      highConfidenceFields: highConfidenceFields.length,
      conflictedFields: conflictedFields.length,
      mostReliableSource,
      leastReliableSource,
      overallQuality,
      strengths,
      weaknesses,
    };
  }

  /**
   * Extract reconciled fields from preview for conflict analysis
   */
  private extractReconciledFields(
    preview: MetadataPreview,
    reconciledData?: Partial<Record<string, ReconciledField<any>>>,
  ): Record<string, ReconciledField<any>> {
    const fields: Record<string, ReconciledField<any>> = {};

    // Convert preview fields back to reconciled fields for conflict analysis
    for (const fieldName of METADATA_FIELDS) {
      const previewField = (preview as any)[fieldName] as PreviewField<any>;

      // Use provided reconciled data if available, otherwise convert from preview field
      if (reconciledData && reconciledData[fieldName]) {
        fields[fieldName] = reconciledData[fieldName];
      } else {
        fields[fieldName] = {
          value: previewField.value,
          confidence: previewField.confidence,
          sources: previewField.sources.map((attr) => attr.source),
          conflicts: previewField.conflicts,
          reasoning: previewField.reasoning,
        };
      }
    }

    return fields;
  }

  /**
   * Group raw metadata by field for conflict analysis
   */
  private groupRawMetadataByField(
    rawMetadata: MetadataRecord[],
  ): Record<string, Array<{ value: any; source: MetadataSource }>> {
    const grouped: Record<string, Array<{ value: any; source: MetadataSource }>> = {};

    // Initialize all fields
    for (const fieldName of METADATA_FIELDS) {
      grouped[fieldName] = [];
    }

    // Group values by field
    for (const record of rawMetadata) {
      const source: MetadataSource = {
        name: record.source,
        reliability: record.confidence,
        timestamp: record.timestamp,
      };

      for (const fieldName of METADATA_FIELDS) {
        const value = (record as any)[fieldName];
        if (value !== undefined && value !== null) {
          grouped[fieldName].push({ value, source });
        }
      }
    }

    return grouped;
  }

  /**
   * Create empty conflict analysis when conflict detection is disabled
   */
  private createEmptyConflictAnalysis(): ConflictSummary {
    return {
      totalConflicts: 0,
      bySeverity: { critical: [], major: [], minor: [], informational: [] },
      byType: {
        value_mismatch: [],
        format_difference: [],
        precision_difference: [],
        completeness_difference: [],
        quality_difference: [],
        temporal_difference: [],
        source_disagreement: [],
        normalization_conflict: [],
      },
      byField: {},
      overallScore: 0,
      problematicFields: [],
      recommendations: ["Conflict detection is disabled"],
      autoResolvableConflicts: [],
      manualConflicts: [],
    };
  }

  /**
   * Create empty conflict display when display formatting is disabled
   */
  private createEmptyConflictDisplay(): FormattedConflictSummary {
    return {
      overallSummary: "Conflict display formatting is disabled",
      severityBreakdown: "",
      typeBreakdown: "",
      fieldBreakdown: "",
      recommendations: ["Enable conflict display formatting to see detailed information"],
      quickStats: { total: 0, critical: 0, autoResolvable: 0, manualReview: 0 },
    };
  }

  /**
   * Create a library entry from metadata preview
   */
  private createLibraryEntry(preview: MetadataPreview): LibraryEntry {
    const now = new Date();

    return {
      id: `entry-${this.generatePreviewId([])}`, // Generate unique ID
      title: preview.title.value || "Unknown Title",
      authors: preview.authors.value || [],
      isbn: preview.isbn.value || undefined,
      publicationDate: preview.publicationDate.value || undefined,
      publisher: preview.publisher.value || undefined,
      series: preview.series.value || undefined,
      work: preview.work.value || undefined,
      edition: preview.edition.value || undefined,
      identifiers: preview.identifiers.value || undefined,
      subjects: preview.subjects.value || undefined,
      description: preview.description.value || undefined,
      language: preview.language.value || undefined,
      physicalDescription: preview.physicalDescription.value || undefined,
      coverImage: preview.coverImage.value || undefined,
      addedDate: now,
      lastModified: now,
      readStatus: "unread",
    };
  }

  /**
   * Generate library recommendations
   */
  private generateLibraryRecommendations(
    proposedEntry: LibraryEntry,
    duplicates: DuplicateMatch[],
    editionSelection: EditionSelection,
    seriesRelationships: SeriesRelationship[],
    preview: MetadataPreview,
  ): import("./types.js").LibraryRecommendation[] {
    return this.recommendationGenerator.generateRecommendations(
      proposedEntry,
      duplicates,
      editionSelection,
      seriesRelationships,
      preview,
    );
  }

  /**
   * Assess the quality of the library entry
   */
  private assessLibraryQuality(entry: LibraryEntry, preview: MetadataPreview): LibraryQuality {
    // Collect quality scores from preview fields
    const qualityScores = [
      preview.title.quality.score,
      preview.authors.quality.score,
      preview.isbn.quality.score,
      preview.publicationDate.quality.score,
      preview.subjects.quality.score,
      preview.description.quality.score,
      preview.language.quality.score,
      preview.publisher.quality.score,
      preview.series.quality.score,
      preview.identifiers.quality.score,
      preview.physicalDescription.quality.score,
      preview.coverImage.quality.score,
      preview.work.quality.score,
      preview.edition.quality.score,
    ].filter((score) => !isNaN(score) && isFinite(score));

    return this.qualityAssessor.assessLibraryQuality(
      entry,
      qualityScores,
      preview.overallConfidence,
    );
  }
}
