import {
  type CreatorQuery,
  type MetadataRecord,
  MetadataType,
  type MultiCriteriaQuery,
  type RateLimitConfig,
  type TimeoutConfig,
  type TitleQuery,
} from "./provider.js";
import { RetryableMetadataProvider } from "./retryable-provider.js";
import {
  extractBibliographicData,
  extractSruRecordCount,
  type MarcBibliographicData,
  type MarcRecord,
  parseMarcXmlRecords,
} from "../utils/marc-parser.js";
import { cleanIsbn } from "../utils/normalization.js";

type Fetch = typeof globalThis.fetch;

/**
 * Library of Congress Metadata Provider
 *
 * The Library of Congress provides comprehensive bibliographic data through
 * their SRU (Search/Retrieve via URL) interface. This provider specializes
 * in authoritative bibliographic records with excellent cataloging standards.
 */
export class LibraryOfCongressMetadataProvider extends RetryableMetadataProvider {
  readonly name = "LibraryOfCongress";
  readonly priority = 85; // High priority for authoritative bibliographic data
  // Library of Congress SRU rate limiting - be respectful to the service
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 30, // Conservative limit for LoC SRU
    windowMs: 60000, // 1 minute
    requestDelay: 2000, // 2 seconds between requests
  };
  readonly timeout: TimeoutConfig = {
    requestTimeout: 25000, // 25 seconds for LoC SRU
    operationTimeout: 75000, // 75 seconds total
  };
  readonly #fetch: Fetch;
  private readonly sruBaseUrl = "https://lx2.loc.gov:210/lcdb";

  constructor(fetch: Fetch = globalThis.fetch) {
    super();
    this.#fetch = fetch;
  }

  /**
   * Get reliability scores for Library of Congress data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    // Library of Congress has excellent reliability for most bibliographic data
    const locScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.95, // Excellent title information
      [MetadataType.AUTHORS]: 0.95, // Excellent author information
      [MetadataType.ISBN]: 0.9, // Very good ISBN data
      [MetadataType.PUBLICATION_DATE]: 0.9, // Very good date information
      [MetadataType.SUBJECTS]: 0.95, // Excellent subject classification (LCSH)
      [MetadataType.DESCRIPTION]: 0.8, // Good descriptions
      [MetadataType.LANGUAGE]: 0.9, // Very good language information
      [MetadataType.PUBLISHER]: 0.85, // Good publisher data
      [MetadataType.SERIES]: 0.8, // Good series information
      [MetadataType.EDITION]: 0.85, // Good edition information
      [MetadataType.PAGE_COUNT]: 0.8, // Good page count data
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.75, // Good physical data
      [MetadataType.COVER_IMAGE]: 0.2, // Limited cover images
    };

    return locScores[dataType] ?? 0.7;
  }

  /**
   * Check if Library of Congress supports a specific metadata type
   */
  supportsDataType(dataType: MetadataType): boolean {
    const supportedTypes = [
      MetadataType.TITLE,
      MetadataType.AUTHORS,
      MetadataType.ISBN,
      MetadataType.PUBLICATION_DATE,
      MetadataType.SUBJECTS,
      MetadataType.DESCRIPTION,
      MetadataType.LANGUAGE,
      MetadataType.PUBLISHER,
      MetadataType.SERIES,
      MetadataType.EDITION,
      MetadataType.PAGE_COUNT,
      MetadataType.PHYSICAL_DIMENSIONS,
    ];

    return supportedTypes.includes(dataType);
  }

  /**
   * Search for metadata by title
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      const searchQuery = query.exactMatch
        ? `title="${query.title}"`
        : `title=${query.title}`;

      const results = await this.#searchLoCSRU(searchQuery);

      return results.map((result, index) =>
        this.#mapMarcRecordToMetadata(
          result,
          `${this.name}-title-${Date.now()}-${index}`,
          "title",
        ),
      );
    }, `title search for "${query.title}"`);
  }

  /**
   * Search for metadata by ISBN
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      const cleanedIsbn = cleanIsbn(isbn);

      const searchQuery = `isbn=${cleanedIsbn}`;
      const results = await this.#searchLoCSRU(searchQuery);

      return results.map((result, index) =>
        this.#mapMarcRecordToMetadata(
          result,
          `${this.name}-isbn-${cleanedIsbn}-${index}`,
          "isbn",
        ),
      );
    }, `ISBN search for "${isbn}"`);
  }

  /**
   * Search for metadata by creator
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      const searchQuery = query.fuzzy
        ? `author=${query.name}`
        : `author="${query.name}"`;

      const results = await this.#searchLoCSRU(searchQuery);

      return results.map((result, index) =>
        this.#mapMarcRecordToMetadata(
          result,
          `${this.name}-creator-${Date.now()}-${index}`,
          "creator",
        ),
      );
    }, `creator search for "${query.name}"`);
  }

  /**
   * Search using multiple criteria
   */
  async searchMultiCriteria(
    query: MultiCriteriaQuery,
  ): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      const searchParts: string[] = [];

      // Build search query from criteria
      if (query.title) {
        const titleQuery = query.fuzzy ? query.title : `"${query.title}"`;
        searchParts.push(`title=${titleQuery}`);
      }

      if (query.authors && query.authors.length > 0) {
        // Use first author for search
        const authorQuery = query.fuzzy
          ? query.authors[0]
          : `"${query.authors[0]}"`;
        searchParts.push(`author=${authorQuery}`);
      }

      if (query.isbn) {
        searchParts.push(`isbn=${cleanIsbn(query.isbn)}`);
      }

      if (query.subjects && query.subjects.length > 0) {
        // Use first subject
        searchParts.push(`subject="${query.subjects[0]}"`);
      }

      if (query.publisher) {
        const publisherQuery = query.fuzzy
          ? query.publisher
          : `"${query.publisher}"`;
        searchParts.push(`publisher=${publisherQuery}`);
      }

      if (query.yearRange) {
        // LoC supports date range queries
        searchParts.push(
          `date>=${query.yearRange[0]} and date<=${query.yearRange[1]}`,
        );
      }

      // Combine search parts with AND
      const searchQuery = searchParts.join(" and ");

      if (!searchQuery) {
        return []; // No valid search criteria
      }

      const results = await this.#searchLoCSRU(searchQuery);

      return results.map((result, index) =>
        this.#mapMarcRecordToMetadata(
          result,
          `${this.name}-multi-${Date.now()}-${index}`,
          "multi",
          query,
        ),
      );
    }, `multi-criteria search`);
  }

  /**
   * Perform Library of Congress SRU search
   */
  async #searchLoCSRU(query: string): Promise<MarcRecord[]> {
    const params = new URLSearchParams({
      version: "1.1",
      operation: "searchRetrieve",
      query: query,
      recordSchema: "marcxml",
      maximumRecords: "10",
      startRecord: "1",
    });

    const url = `${this.sruBaseUrl}?${params.toString()}`;

    const response = await this.#fetch(url, {
      headers: {
        Accept: "application/xml, text/xml",
        "User-Agent":
          "colibri-metadata-discovery/1.0 (https://github.com/colibri-hq/colibri)",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Library of Congress SRU error: ${response.status} ${response.statusText}`,
      );
    }

    const xmlText = await response.text();

    // Check if there are any results
    const recordCount = extractSruRecordCount(xmlText);
    if (recordCount === 0) {
      return [];
    }

    // Parse MARC records using shared utility
    return parseMarcXmlRecords(xmlText);
  }

  /**
   * Map a parsed MARC record to MetadataRecord format
   */
  #mapMarcRecordToMetadata(
    record: MarcRecord,
    id: string,
    searchType: "title" | "isbn" | "creator" | "multi",
    query?: MultiCriteriaQuery,
  ): MetadataRecord {
    // Use the shared extraction utility
    const bibData = extractBibliographicData(record);

    // Build the metadata object
    const metadata: Partial<
      Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">
    > = {};

    if (bibData.title) {
      metadata.title = bibData.title;
    }

    if (bibData.authors.length > 0) {
      metadata.authors = bibData.authors;
    }

    if (bibData.isbns.length > 0) {
      metadata.isbn = bibData.isbns;
    }

    if (bibData.publisher) {
      metadata.publisher = bibData.publisher;
    }

    if (bibData.publicationYear) {
      metadata.publicationDate = new Date(bibData.publicationYear, 0, 1);
    }

    if (bibData.language) {
      metadata.language = bibData.language;
    }

    if (bibData.subjects.length > 0) {
      metadata.subjects = bibData.subjects;
    }

    if (bibData.pageCount) {
      metadata.pageCount = bibData.pageCount;
    }

    if (bibData.dimensions) {
      const heightMatch = bibData.dimensions.match(/(\d+)/);
      if (heightMatch) {
        metadata.physicalDimensions = {
          height: parseInt(heightMatch[1]),
          unit: "cm" as const,
        };
      }
    }

    if (bibData.seriesName) {
      const volume = this.#parseSeriesVolume(bibData.seriesPosition);
      metadata.series = {
        name: bibData.seriesName,
        ...(volume !== undefined && { volume }),
      };
    }

    if (bibData.edition) {
      metadata.edition = bibData.edition;
    }

    if (bibData.description) {
      metadata.description = bibData.description;
    }

    // Store Library of Congress specific data
    metadata.providerData = {
      lccn: bibData.lccn,
      callNumber: bibData.lcCallNumber,
      deweyNumber: bibData.deweyNumber,
      marcLeader: record.leader,
      recordType: bibData.recordType,
      bibliographicLevel: bibData.bibliographicLevel,
      controlNumber: bibData.controlNumber,
    };

    // Calculate confidence
    const confidence = this.#calculateConfidence(bibData, searchType, query);

    return this.createMetadataRecord(id, metadata, confidence);
  }

  /**
   * Parse series position string to extract volume number
   */
  #parseSeriesVolume(position: string | undefined): number | undefined {
    if (!position) {
      return undefined;
    }

    // Try to extract a number from strings like "1", "Band 2", "Volume 3", "v. 5"
    const match = position.match(/\d+/);

    return match ? parseInt(match[0], 10) : undefined;
  }

  /**
   * Calculate confidence score based on search type and result quality
   */
  #calculateConfidence(
    bibData: MarcBibliographicData,
    searchType: "title" | "isbn" | "creator" | "multi",
    query?: MultiCriteriaQuery,
  ): number {
    let baseConfidence = 0.8;

    // Adjust base confidence by search type
    switch (searchType) {
      case "isbn":
        // ISBN searches are very reliable
        baseConfidence = 0.95;
        break;
      case "creator":
        // Creator searches are very reliable in LoC
        baseConfidence = 0.9;
        break;
      case "title":
        baseConfidence = 0.85;
        break;
      case "multi":
        // Multi-criteria can be very precise
        baseConfidence = 0.9;
        break;
    }

    // Boost confidence based on data completeness
    const fieldsPresent = [
      bibData.title,
      bibData.authors.length > 0,
      bibData.isbns.length > 0,
      bibData.publisher,
      bibData.publicationYear,
      bibData.subjects.length > 0,
      bibData.pageCount,
    ].filter(Boolean).length;

    // Up to 10% boost
    const completenessBoost = (fieldsPresent / 7) * 0.1;

    // Boost confidence for Library of Congress records (high authority)
    // 10% boost for LoC authority
    const authorityBoost = 0.1;

    // Boost confidence based on record type and bibliographic level
    let recordQualityBoost = 0;
    if (bibData.recordType === "a" && bibData.bibliographicLevel === "m") {
      // 5% boost for book records
      recordQualityBoost += 0.05;
    }

    // For multi-criteria searches, boost confidence if multiple criteria likely match
    let criteriaMatchBoost = 0;
    if (searchType === "multi" && query) {
      const criteriaCount = [
        query.title,
        query.authors?.length,
        query.isbn,
        query.subjects?.length,
        query.publisher,
      ].filter(Boolean).length;

      if (criteriaCount >= 3) {
        // 5% boost for multiple criteria
        criteriaMatchBoost = 0.05;
      }
    }

    // Calculate final confidence, capped at 0.99
    const finalConfidence = Math.min(
      0.99,
      baseConfidence +
        completenessBoost +
        authorityBoost +
        recordQualityBoost +
        criteriaMatchBoost,
    );

    // Round to 2 decimal places
    return Math.round(finalConfidence * 100) / 100;
  }
}
