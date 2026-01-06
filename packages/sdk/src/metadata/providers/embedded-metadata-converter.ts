import type { Metadata as EbookMetadata } from "../../ebooks/metadata.js";
import type { MetadataRecord } from "./provider.js";
import { MetadataType } from "./provider.js";

/**
 * Configuration for embedded metadata conversion
 */
export interface EmbeddedMetadataConfig {
  /** Base confidence score for embedded metadata (0.0 to 1.0) */
  baseConfidence: number;
  /** Confidence boost for specific metadata types */
  confidenceBoosts: Partial<Record<MetadataType, number>>;
  /** Source identifier for embedded metadata records */
  sourceId: string;
}

/**
 * Default configuration for embedded metadata conversion
 */
export const DEFAULT_EMBEDDED_CONFIG: EmbeddedMetadataConfig = {
  baseConfidence: 0.85, // High confidence for embedded metadata
  confidenceBoosts: {
    [MetadataType.TITLE]: 0.1, // Title from file is very reliable
    [MetadataType.AUTHORS]: 0.05, // Authors from file are reliable
    [MetadataType.ISBN]: 0.1, // ISBN from file is very reliable
    [MetadataType.LANGUAGE]: 0.05, // Language from file is reliable
    [MetadataType.PAGE_COUNT]: 0.1, // Page count from file is accurate
  },
  sourceId: "embedded",
};

/**
 * Converts embedded ebook metadata to MetadataRecord format
 */
export class EmbeddedMetadataConverter {
  constructor(
    private config: EmbeddedMetadataConfig = DEFAULT_EMBEDDED_CONFIG,
  ) {}

  /**
   * Convert embedded metadata to MetadataRecord with high confidence scores
   */
  convertToMetadataRecord(
    embeddedMetadata: EbookMetadata,
    fileFormat: "epub" | "mobi" | "pdf",
    filePath?: string,
  ): MetadataRecord {
    const recordId = this.generateRecordId(
      embeddedMetadata,
      fileFormat,
      filePath,
    );
    const timestamp = new Date();

    // Extract and convert metadata fields
    const record: MetadataRecord = {
      id: recordId,
      source: this.config.sourceId,
      confidence: this.calculateOverallConfidence(embeddedMetadata),
      timestamp,
      providerData: {
        fileFormat,
        filePath,
        extractionMethod: "embedded",
        originalMetadata: embeddedMetadata,
      },
    };

    // Convert title
    if (embeddedMetadata.title) {
      record.title = embeddedMetadata.title;
    }

    // Convert authors from contributors
    if (embeddedMetadata.contributors?.length) {
      const authors = embeddedMetadata.contributors
        .filter((contributor) => contributor.roles.includes("aut"))
        .map((contributor) => contributor.name);

      if (authors.length > 0) {
        record.authors = authors;
      }
    }

    // Convert identifiers (focusing on ISBN)
    if (embeddedMetadata.identifiers?.length) {
      const isbns = embeddedMetadata.identifiers
        .filter((identifier) => identifier.type === "isbn")
        .map((identifier) => identifier.value);

      if (isbns.length > 0) {
        record.isbn = isbns;
      }
    }

    // Convert publication date
    if (embeddedMetadata.datePublished) {
      record.publicationDate = embeddedMetadata.datePublished;
    }

    // Convert language
    if (embeddedMetadata.language) {
      record.language = embeddedMetadata.language;
    }

    // Convert subjects from tags
    if (embeddedMetadata.tags?.length) {
      record.subjects = embeddedMetadata.tags;
    }

    // Convert description from synopsis
    if (embeddedMetadata.synopsis) {
      record.description = embeddedMetadata.synopsis;
    }

    // Convert page count
    if (embeddedMetadata.numberOfPages) {
      record.pageCount = embeddedMetadata.numberOfPages;
    }

    // Add cover image if available
    if (embeddedMetadata.cover) {
      // Convert Blob to URL for MetadataRecord format
      const coverUrl = URL.createObjectURL(embeddedMetadata.cover);
      record.coverImage = {
        url: coverUrl,
        // Note: We don't have width/height from the Blob directly
      };
    }

    return record;
  }

  /**
   * Create a query-optimized version of embedded metadata for external provider searches
   */
  createSearchQuery(embeddedMetadata: EbookMetadata): {
    title?: string;
    authors?: string[];
    isbn?: string;
    language?: string;
    subjects?: string[];
    yearRange?: [number, number];
  } {
    const query: ReturnType<EmbeddedMetadataConverter["createSearchQuery"]> =
      {};

    // Extract title
    if (embeddedMetadata.title) {
      query.title = embeddedMetadata.title;
    }

    // Extract authors
    if (embeddedMetadata.contributors?.length) {
      const authors = embeddedMetadata.contributors
        .filter((contributor) => contributor.roles.includes("aut"))
        .map((contributor) => contributor.name);

      if (authors.length > 0) {
        query.authors = authors;
      }
    }

    // Extract ISBN (prefer first one for search)
    if (embeddedMetadata.identifiers?.length) {
      const isbn = embeddedMetadata.identifiers.find(
        (identifier) => identifier.type === "isbn",
      )?.value;

      if (isbn) {
        query.isbn = isbn;
      }
    }

    // Extract language
    if (embeddedMetadata.language) {
      query.language = embeddedMetadata.language;
    }

    // Extract subjects (limit to most relevant ones)
    if (embeddedMetadata.tags?.length) {
      query.subjects = embeddedMetadata.tags.slice(0, 5); // Limit to first 5 for better search performance
    }

    // Extract publication year range
    if (embeddedMetadata.datePublished) {
      const year = embeddedMetadata.datePublished.getFullYear();
      query.yearRange = [year, year]; // Exact year match
    }

    return query;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EmbeddedMetadataConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): EmbeddedMetadataConfig {
    return { ...this.config };
  }

  /**
   * Calculate overall confidence score for the embedded metadata
   */
  private calculateOverallConfidence(embeddedMetadata: EbookMetadata): number {
    let totalConfidence = this.config.baseConfidence;

    // Apply confidence boosts for available metadata types
    const availableTypes = this.getAvailableMetadataTypes(embeddedMetadata);

    for (const metadataType of availableTypes) {
      const boost = this.config.confidenceBoosts[metadataType];
      if (boost) {
        totalConfidence += boost;
      }
    }

    // Normalize confidence to stay within 0.0-1.0 range
    return Math.min(totalConfidence, 1.0);
  }

  /**
   * Determine which metadata types are available in the embedded metadata
   */
  private getAvailableMetadataTypes(
    embeddedMetadata: EbookMetadata,
  ): MetadataType[] {
    const types: MetadataType[] = [];

    if (embeddedMetadata.title) {
      types.push(MetadataType.TITLE);
    }

    if (embeddedMetadata.contributors?.some((c) => c.roles.includes("aut"))) {
      types.push(MetadataType.AUTHORS);
    }

    if (embeddedMetadata.identifiers?.some((id) => id.type === "isbn")) {
      types.push(MetadataType.ISBN);
    }

    if (embeddedMetadata.datePublished) {
      types.push(MetadataType.PUBLICATION_DATE);
    }

    if (embeddedMetadata.tags?.length) {
      types.push(MetadataType.SUBJECTS);
    }

    if (embeddedMetadata.synopsis) {
      types.push(MetadataType.DESCRIPTION);
    }

    if (embeddedMetadata.language) {
      types.push(MetadataType.LANGUAGE);
    }

    if (embeddedMetadata.numberOfPages) {
      types.push(MetadataType.PAGE_COUNT);
    }

    if (embeddedMetadata.cover) {
      types.push(MetadataType.COVER_IMAGE);
    }

    return types;
  }

  /**
   * Generate a unique record ID for the embedded metadata
   */
  private generateRecordId(
    embeddedMetadata: EbookMetadata,
    fileFormat: string,
    filePath?: string,
  ): string {
    // Use ISBN if available for consistent ID
    const isbn = embeddedMetadata.identifiers?.find(
      (id) => id.type === "isbn",
    )?.value;
    if (isbn) {
      return `embedded-${isbn}-${fileFormat}`;
    }

    // Fall back to title-based ID
    if (embeddedMetadata.title) {
      const titleHash = this.simpleHash(embeddedMetadata.title);
      return `embedded-${titleHash}-${fileFormat}`;
    }

    // Fall back to file path-based ID
    if (filePath) {
      const pathHash = this.simpleHash(filePath);
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
export const globalEmbeddedMetadataConverter = new EmbeddedMetadataConverter();

/**
 * Convenience function to convert embedded metadata to MetadataRecord
 */
export function convertEmbeddedMetadata(
  embeddedMetadata: EbookMetadata,
  fileFormat: "epub" | "mobi" | "pdf",
  filePath?: string,
  config?: Partial<EmbeddedMetadataConfig>,
): MetadataRecord {
  const converter = config
    ? new EmbeddedMetadataConverter({ ...DEFAULT_EMBEDDED_CONFIG, ...config })
    : globalEmbeddedMetadataConverter;

  return converter.convertToMetadataRecord(
    embeddedMetadata,
    fileFormat,
    filePath,
  );
}

/**
 * Convenience function to create search query from embedded metadata
 */
export function createSearchQueryFromEmbedded(
  embeddedMetadata: EbookMetadata,
  config?: Partial<EmbeddedMetadataConfig>,
): ReturnType<EmbeddedMetadataConverter["createSearchQuery"]> {
  const converter = config
    ? new EmbeddedMetadataConverter({ ...DEFAULT_EMBEDDED_CONFIG, ...config })
    : globalEmbeddedMetadataConverter;

  return converter.createSearchQuery(embeddedMetadata);
}
