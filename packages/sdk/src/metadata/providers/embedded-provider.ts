/**
 * Embedded Metadata Provider
 *
 * Treats metadata extracted directly from ebook files (EPUB, MOBI, PDF) as a
 * first-class metadata provider that can participate in the aggregation and
 * reconciliation pipeline alongside external providers like OpenLibrary, WikiData, etc.
 *
 * This provider wraps the ebook metadata extraction system and provides:
 * - Confidence scoring based on metadata completeness and source
 * - ISBN normalization consistent with cache-keys.ts
 * - Author name handling using open-library/name-utils.ts
 * - Integration with the MetadataProvider interface
 */

import type { Metadata as EbookMetadata } from "../../ebooks/metadata.js";
import type {
  CreatorQuery,
  MetadataProvider,
  MetadataRecord,
  MultiCriteriaQuery,
  RateLimitConfig,
  TimeoutConfig,
  TitleQuery,
} from "./provider.js";
import { detectType, loadMetadata } from "../../ebooks/index.js";
import { normalizeISBN } from "../cache-keys.js";
import { normalizeAuthorName } from "./open-library/name-utils.js";
import { BaseMetadataProvider, MetadataType } from "./provider.js";

/**
 * Configuration for the Embedded Metadata Provider
 */
export interface EmbeddedProviderConfig {
  /** Base confidence score for embedded metadata (0.0 to 1.0) */
  baseConfidence: number;
  /** Confidence adjustments based on file format */
  formatConfidence: { epub: number; mobi: number; pdf: number };
  /** Confidence boost for having specific metadata fields */
  fieldConfidence: Partial<Record<MetadataType, number>>;
  /** Whether to normalize ISBNs to ISBN-13 */
  normalizeIsbn13: boolean;
  /** Whether to normalize author names */
  normalizeAuthorNames: boolean;
}

/**
 * Default configuration for embedded metadata provider
 */
export const DEFAULT_EMBEDDED_PROVIDER_CONFIG: EmbeddedProviderConfig = {
  baseConfidence: 0.85, // High confidence for directly embedded metadata
  formatConfidence: {
    epub: 0.05, // EPUB has well-structured metadata
    mobi: 0.03, // MOBI metadata is reliable but less structured
    pdf: -0.1, // PDF metadata is often incomplete or auto-generated
  },
  fieldConfidence: {
    [MetadataType.TITLE]: 0.1, // Title from file is very reliable
    [MetadataType.AUTHORS]: 0.05, // Authors from file are reliable
    [MetadataType.ISBN]: 0.1, // ISBN from file is very reliable (if present)
    [MetadataType.LANGUAGE]: 0.05, // Language from file is reliable
    [MetadataType.PAGE_COUNT]: 0.1, // Page count from actual file is accurate
    [MetadataType.PUBLICATION_DATE]: 0.02, // Date might be file creation, not publication
    [MetadataType.PUBLISHER]: 0.03, // Publisher info can be reliable
    [MetadataType.DESCRIPTION]: 0.02, // Synopsis might be auto-generated
  },
  normalizeIsbn13: true,
  normalizeAuthorNames: true,
};

/**
 * Embedded Metadata Provider
 *
 * Provides metadata extracted directly from ebook files as a MetadataProvider.
 * This allows embedded metadata to participate in the aggregation and reconciliation
 * pipeline alongside external metadata providers.
 */
export class EmbeddedMetadataProvider extends BaseMetadataProvider implements MetadataProvider {
  readonly name = "embedded";
  readonly priority = 100; // Highest priority - embedded metadata is authoritative

  readonly rateLimit: RateLimitConfig = {
    maxRequests: 1000, // Local operations, no rate limiting needed
    windowMs: 1000,
    requestDelay: 0,
  };

  readonly timeout: TimeoutConfig = {
    requestTimeout: 30000, // 30 seconds for file parsing
    operationTimeout: 60000, // 1 minute total
  };

  private config: EmbeddedProviderConfig;

  constructor(config?: Partial<EmbeddedProviderConfig>) {
    super();
    this.config = { ...DEFAULT_EMBEDDED_PROVIDER_CONFIG, ...config };
  }

  /**
   * Extract metadata from an ebook file
   *
   * @param file - The ebook file to extract metadata from
   * @returns MetadataRecord with extracted metadata and confidence score
   */
  async extractFromFile(file: File): Promise<MetadataRecord> {
    // Detect format
    const format = await detectType(file);

    // Extract metadata
    const ebookMetadata = await loadMetadata(file);

    // Convert to MetadataRecord
    return this.convertToMetadataRecord(ebookMetadata, format, file.name);
  }

  /**
   * Search by title - not applicable for embedded provider
   * (Embedded provider works with files, not queries)
   */
  async searchByTitle(_query: TitleQuery): Promise<MetadataRecord[]> {
    return [];
  }

  /**
   * Search by ISBN - not applicable for embedded provider
   * (Embedded provider works with files, not queries)
   */
  async searchByISBN(_isbn: string): Promise<MetadataRecord[]> {
    return [];
  }

  /**
   * Search by creator - not applicable for embedded provider
   * (Embedded provider works with files, not queries)
   */
  async searchByCreator(_query: CreatorQuery): Promise<MetadataRecord[]> {
    return [];
  }

  /**
   * Search using multiple criteria - not applicable for embedded provider
   * (Embedded provider works with files, not queries)
   */
  async searchMultiCriteria(_query: MultiCriteriaQuery): Promise<MetadataRecord[]> {
    return [];
  }

  /**
   * Get reliability score for a specific metadata type
   * Embedded metadata is highly reliable for most types
   */
  getReliabilityScore(dataType: MetadataType): number {
    const scores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.95, // Title from file is very reliable
      [MetadataType.AUTHORS]: 0.9, // Authors from file are very reliable
      [MetadataType.ISBN]: 0.95, // ISBN from file is very reliable
      [MetadataType.PUBLICATION_DATE]: 0.6, // May be file date, not publication
      [MetadataType.SUBJECTS]: 0.7, // Tags can be reliable
      [MetadataType.DESCRIPTION]: 0.7, // Synopsis usually accurate
      [MetadataType.LANGUAGE]: 0.85, // Language from file is reliable
      [MetadataType.PUBLISHER]: 0.8, // Publisher info usually accurate
      [MetadataType.SERIES]: 0.85, // Series info from file is reliable
      [MetadataType.EDITION]: 0.6, // Edition info may be incomplete
      [MetadataType.PAGE_COUNT]: 0.95, // Page count from file is accurate
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.3, // Not available in ebooks
      [MetadataType.COVER_IMAGE]: 0.9, // Cover from file is authoritative
    };

    return scores[dataType] ?? 0.7;
  }

  /**
   * Check if provider supports a specific metadata type
   */
  supportsDataType(dataType: MetadataType): boolean {
    // Embedded metadata supports all types except physical dimensions
    return dataType !== MetadataType.PHYSICAL_DIMENSIONS;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EmbeddedProviderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): EmbeddedProviderConfig {
    return { ...this.config };
  }

  /**
   * Convert ebook metadata to MetadataRecord format
   */
  private convertToMetadataRecord(
    ebookMetadata: EbookMetadata,
    fileFormat: "epub" | "mobi" | "pdf",
    fileName?: string,
  ): MetadataRecord {
    const recordId = this.generateRecordId(ebookMetadata, fileFormat, fileName);
    const confidence = this.calculateConfidence(ebookMetadata, fileFormat);

    const record: MetadataRecord = {
      id: recordId,
      source: this.name,
      confidence,
      timestamp: new Date(),
      providerData: {
        fileFormat,
        fileName,
        extractionMethod: "embedded",
        originalMetadata: ebookMetadata,
      },
    };

    // Extract title
    if (ebookMetadata.title) {
      record.title = ebookMetadata.title;
    }

    // Extract authors with normalization
    if (ebookMetadata.contributors?.length) {
      const authors = ebookMetadata.contributors
        .filter((contributor) => contributor.roles.includes("aut"))
        .map((contributor) => contributor.name);

      if (authors.length > 0) {
        record.authors = this.config.normalizeAuthorNames
          ? authors.map((name) => normalizeAuthorName(name))
          : authors;
      }
    }

    // Extract publishers
    if (ebookMetadata.contributors?.length) {
      const publishers = ebookMetadata.contributors
        .filter(
          (contributor) => contributor.roles.includes("bkp") || contributor.roles.includes("pbl"),
        )
        .map((contributor) => contributor.name);

      if (publishers.length > 0) {
        record.publisher = publishers[0]; // Take first publisher
      }
    }

    // Extract and normalize ISBNs
    if (ebookMetadata.identifiers?.length) {
      const isbns: string[] = [];

      for (const identifier of ebookMetadata.identifiers) {
        if (identifier.type === "isbn") {
          if (this.config.normalizeIsbn13) {
            const normalized = normalizeISBN(identifier.value, true);
            if (normalized) {
              isbns.push(normalized);
            }
            // Skip if normalization fails (invalid ISBN)
          } else {
            isbns.push(identifier.value);
          }
        }
      }

      if (isbns.length > 0) {
        record.isbn = isbns;
      }
    }

    // Extract publication date
    if (ebookMetadata.datePublished) {
      record.publicationDate = ebookMetadata.datePublished;
    }

    // Extract language
    if (ebookMetadata.language) {
      record.language = ebookMetadata.language;
    }

    // Extract subjects from tags
    if (ebookMetadata.tags?.length) {
      record.subjects = ebookMetadata.tags;
    }

    // Extract description from synopsis
    if (ebookMetadata.synopsis) {
      record.description = ebookMetadata.synopsis;
    }

    // Extract page count
    if (ebookMetadata.numberOfPages) {
      record.pageCount = ebookMetadata.numberOfPages;
    }

    // Extract series information
    if (ebookMetadata.series) {
      record.series = {
        name: ebookMetadata.series.name,
        ...(ebookMetadata.series.position !== undefined && {
          volume: ebookMetadata.series.position,
        }),
      };
    }

    // Add cover image if available
    if (ebookMetadata.cover) {
      // Convert Blob to URL for MetadataRecord format
      const coverUrl = URL.createObjectURL(ebookMetadata.cover);
      record.coverImage = {
        url: coverUrl,
        // Note: We don't have width/height from the Blob directly
      };
    }

    return record;
  }

  /**
   * Calculate confidence score for the embedded metadata
   *
   * Confidence is based on:
   * - Base confidence level
   * - File format (EPUB > MOBI > PDF)
   * - Completeness of metadata
   * - Presence of key identifiers (ISBN)
   */
  private calculateConfidence(
    ebookMetadata: EbookMetadata,
    fileFormat: "epub" | "mobi" | "pdf",
  ): number {
    let confidence = this.config.baseConfidence;

    // Adjust for file format
    confidence += this.config.formatConfidence[fileFormat];

    // Boost for having specific metadata types
    const availableTypes = this.getAvailableMetadataTypes(ebookMetadata);
    for (const metadataType of availableTypes) {
      const boost = this.config.fieldConfidence[metadataType];
      if (boost) {
        confidence += boost;
      }
    }

    // Penalty if title is missing (very suspicious)
    if (!ebookMetadata.title) {
      confidence -= 0.2;
    }

    // Penalty if authors are missing
    const hasAuthors = ebookMetadata.contributors?.some((c) => c.roles.includes("aut"));
    if (!hasAuthors) {
      confidence -= 0.15;
    }

    // Normalize to 0.0-1.0 range
    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Determine which metadata types are available in the embedded metadata
   */
  private getAvailableMetadataTypes(ebookMetadata: EbookMetadata): MetadataType[] {
    const types: MetadataType[] = [];

    if (ebookMetadata.title) {
      types.push(MetadataType.TITLE);
    }

    if (ebookMetadata.contributors?.some((c) => c.roles.includes("aut"))) {
      types.push(MetadataType.AUTHORS);
    }

    if (ebookMetadata.contributors?.some((c) => c.roles.includes("bkp"))) {
      types.push(MetadataType.PUBLISHER);
    }

    if (ebookMetadata.identifiers?.some((id) => id.type === "isbn")) {
      types.push(MetadataType.ISBN);
    }

    if (ebookMetadata.datePublished) {
      types.push(MetadataType.PUBLICATION_DATE);
    }

    if (ebookMetadata.tags?.length) {
      types.push(MetadataType.SUBJECTS);
    }

    if (ebookMetadata.synopsis) {
      types.push(MetadataType.DESCRIPTION);
    }

    if (ebookMetadata.language) {
      types.push(MetadataType.LANGUAGE);
    }

    if (ebookMetadata.numberOfPages) {
      types.push(MetadataType.PAGE_COUNT);
    }

    if (ebookMetadata.cover) {
      types.push(MetadataType.COVER_IMAGE);
    }

    if (ebookMetadata.series) {
      types.push(MetadataType.SERIES);
    }

    return types;
  }

  /**
   * Generate a unique record ID for the embedded metadata
   */
  private generateRecordId(
    ebookMetadata: EbookMetadata,
    fileFormat: string,
    fileName?: string,
  ): string {
    // Use ISBN if available for consistent ID
    const isbn = ebookMetadata.identifiers?.find((id) => id.type === "isbn")?.value;
    if (isbn) {
      const normalizedIsbn = this.config.normalizeIsbn13
        ? (normalizeISBN(isbn, true) ?? isbn)
        : isbn;
      return `embedded-${normalizedIsbn}-${fileFormat}`;
    }

    // Fall back to title-based ID
    if (ebookMetadata.title) {
      const titleHash = this.simpleHash(ebookMetadata.title);
      return `embedded-${titleHash}-${fileFormat}`;
    }

    // Fall back to file name-based ID
    if (fileName) {
      const pathHash = this.simpleHash(fileName);
      return `embedded-${pathHash}-${fileFormat}`;
    }

    // Final fallback to timestamp-based ID
    return `embedded-${Date.now()}-${fileFormat}`;
  }

  /**
   * Simple hash function for generating consistent IDs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Global instance for convenience
 */
export const globalEmbeddedProvider = new EmbeddedMetadataProvider();

/**
 * Convenience function to extract metadata from a file as a MetadataRecord
 */
export async function extractMetadataRecord(
  file: File,
  config?: Partial<EmbeddedProviderConfig>,
): Promise<MetadataRecord> {
  const provider = config ? new EmbeddedMetadataProvider(config) : globalEmbeddedProvider;

  return provider.extractFromFile(file);
}
