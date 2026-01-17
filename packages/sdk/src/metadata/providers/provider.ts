/**
 * Rate limiting configuration for metadata providers
 */
export interface RateLimitConfig {
  /** Maximum requests per time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Delay between requests in milliseconds */
  requestDelay?: number;
}

/**
 * Timeout configuration for metadata providers
 */
export interface TimeoutConfig {
  /** Request timeout in milliseconds */
  requestTimeout: number;
  /** Total operation timeout in milliseconds */
  operationTimeout: number;
}

/**
 * Metadata types that providers can support
 */
export enum MetadataType {
  TITLE = "title",
  AUTHORS = "authors",
  ISBN = "isbn",
  PUBLICATION_DATE = "publicationDate",
  SUBJECTS = "subjects",
  DESCRIPTION = "description",
  LANGUAGE = "language",
  PUBLISHER = "publisher",
  SERIES = "series",
  EDITION = "edition",
  PAGE_COUNT = "pageCount",
  PHYSICAL_DIMENSIONS = "physicalDimensions",
  COVER_IMAGE = "coverImage",
}

/**
 * Query interface for title-based searches
 */
export interface TitleQuery {
  title: string;
  fuzzy?: boolean;
  exactMatch?: boolean;
}

/**
 * Query interface for creator-based searches
 */
export interface CreatorQuery {
  name: string;
  role?: "author" | "editor" | "translator" | "illustrator";
  fuzzy?: boolean;
}

/**
 * Query interface for multi-criteria searches
 */
export interface MultiCriteriaQuery {
  title?: string;
  authors?: string[];
  isbn?: string;
  language?: string;
  subjects?: string[];
  publisher?: string;
  yearRange?: [number, number];
  fuzzy?: boolean;
}

/**
 * Metadata record returned by providers
 */
export interface MetadataRecord {
  id: string;
  source: string;
  confidence: number;
  timestamp: Date;

  // Core metadata fields
  title?: string | undefined;
  authors?: string[] | undefined;
  isbn?: string[] | undefined;
  publicationDate?: Date | undefined;
  subjects?: string[] | undefined;
  description?: string | undefined;
  language?: string | undefined;
  publisher?: string | undefined;
  series?: { name: string; volume?: number } | undefined;
  edition?: string | undefined;
  pageCount?: number | undefined;
  physicalDimensions?:
    | { width?: number; height?: number; depth?: number; unit: "mm" | "cm" | "in" }
    | undefined;
  coverImage?: { url: string; width?: number; height?: number } | undefined;

  // Provider-specific data
  providerData?: Record<string, unknown>;
}

/**
 * Base interface for all metadata providers
 */
export interface MetadataProvider {
  /** Unique name identifying this provider */
  readonly name: string;

  /** Priority for this provider (higher = more preferred) */
  readonly priority: number;

  /** Rate limiting configuration */
  readonly rateLimit: RateLimitConfig;

  /** Timeout configuration */
  readonly timeout: TimeoutConfig;

  /**
   * Search for metadata by title
   */
  searchByTitle(query: TitleQuery): Promise<MetadataRecord[]>;

  /**
   * Search for metadata by ISBN
   */
  searchByISBN(isbn: string): Promise<MetadataRecord[]>;

  /**
   * Search for metadata by creator/author
   */
  searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]>;

  /**
   * Search using multiple criteria
   */
  searchMultiCriteria(query: MultiCriteriaQuery): Promise<MetadataRecord[]>;

  /**
   * Get reliability score for a specific metadata type
   * @param dataType The type of metadata
   * @returns Score from 0.0 to 1.0
   */
  getReliabilityScore(dataType: MetadataType): number;

  /**
   * Check if provider supports a specific metadata type
   */
  supportsDataType(dataType: MetadataType): boolean;

  /**
   * Initialize the provider (setup connections, auth, etc.)
   */
  initialize?(): Promise<void>;

  /**
   * Cleanup resources when provider is no longer needed
   */
  cleanup?(): Promise<void>;
}

/**
 * Abstract base class for metadata providers with common functionality
 */
export abstract class BaseMetadataProvider implements MetadataProvider {
  abstract readonly name: string;
  abstract readonly priority: number;

  readonly rateLimit: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    requestDelay: 100,
  };

  readonly timeout: TimeoutConfig = {
    requestTimeout: 10000, // 10 seconds
    operationTimeout: 30000, // 30 seconds
  };

  abstract searchByTitle(query: TitleQuery): Promise<MetadataRecord[]>;
  abstract searchByISBN(isbn: string): Promise<MetadataRecord[]>;
  abstract searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]>;
  abstract searchMultiCriteria(query: MultiCriteriaQuery): Promise<MetadataRecord[]>;

  /**
   * Default reliability scores - subclasses should override
   */
  getReliabilityScore(dataType: MetadataType): number {
    // Default scores - providers should override with their specific strengths
    const defaultScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.8,
      [MetadataType.AUTHORS]: 0.7,
      [MetadataType.ISBN]: 0.9,
      [MetadataType.PUBLICATION_DATE]: 0.6,
      [MetadataType.SUBJECTS]: 0.5,
      [MetadataType.DESCRIPTION]: 0.4,
      [MetadataType.LANGUAGE]: 0.7,
      [MetadataType.PUBLISHER]: 0.6,
      [MetadataType.SERIES]: 0.5,
      [MetadataType.EDITION]: 0.5,
      [MetadataType.PAGE_COUNT]: 0.6,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.3,
      [MetadataType.COVER_IMAGE]: 0.4,
    };

    return defaultScores[dataType] ?? 0.5;
  }

  /**
   * Default implementation - providers should override
   */
  supportsDataType(dataType: MetadataType): boolean {
    // Most providers support basic metadata
    const basicTypes = [
      MetadataType.TITLE,
      MetadataType.AUTHORS,
      MetadataType.ISBN,
      MetadataType.PUBLICATION_DATE,
      MetadataType.SUBJECTS,
      MetadataType.DESCRIPTION,
      MetadataType.LANGUAGE,
    ];

    return basicTypes.includes(dataType);
  }

  /**
   * Helper method to create a metadata record
   */
  protected createMetadataRecord(
    id: string,
    data: Partial<Omit<MetadataRecord, "id" | "source" | "timestamp">>,
    confidence: number = 0.8,
  ): MetadataRecord {
    return { id, source: this.name, confidence, timestamp: new Date(), ...data };
  }
}
