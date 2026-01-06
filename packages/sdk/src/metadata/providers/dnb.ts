/**
 * Deutsche Nationalbibliothek (DNB) metadata provider
 *
 * The German National Library provides high-quality bibliographic data for
 * German-language publications and publications published in Germany.
 *
 * API Details:
 * - Base URL: https://services.dnb.de/sru
 * - Protocol: SRU (Search/Retrieve via URL) 1.1
 * - Rate limit: 100 requests/minute (polite limit)
 * - No authentication required
 *
 * Strengths:
 * - Legal deposit library: all German publications
 * - High-quality, authoritative metadata
 * - GND (Gemeinsame Normdatei) authority file integration
 * - DDC (Dewey Decimal Classification) support
 *
 * Data returned:
 * - Title, author, ISBN
 * - Publisher, publication date
 * - DDC classification
 * - GND authority IDs for creators
 * - Language (primarily German publications)
 */

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

/**
 * DNB metadata provider using SRU protocol
 */
export class DNBMetadataProvider extends RetryableMetadataProvider {
  readonly name = "DNB";
  readonly priority = 80; // High priority for German books

  // Polite rate limiting for public API
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 60, // Conservative rate limit
    windowMs: 60000, // 1 minute
    requestDelay: 500, // 500ms between requests
  };

  readonly timeout: TimeoutConfig = {
    requestTimeout: 15000, // 15 seconds
    operationTimeout: 45000, // 45 seconds
  };
  protected readonly userAgent =
    "Colibri-Metadata-Discovery/1.0 (https://github.com/colibri-hq/colibri)";
  private readonly baseUrl = "https://services.dnb.de/sru";

  constructor(
    private readonly fetch: typeof globalThis.fetch = globalThis.fetch,
  ) {
    super();
  }

  /**
   * Search by title
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    const cqlQuery = query.exactMatch
      ? `tit="${query.title}"`
      : `tit=${query.title}`;

    return this.executeSruQuery(cqlQuery, `title search for "${query.title}"`);
  }

  /**
   * Search by ISBN
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    const cleanedIsbn = cleanIsbn(isbn);
    const cqlQuery = `num=${cleanedIsbn}`;

    const results = await this.executeSruQuery(
      cqlQuery,
      `ISBN search for "${isbn}"`,
    );

    // Update confidence for ISBN search
    return results.map((record) => ({
      ...record,
      confidence: Math.max(record.confidence, 0.9),
    }));
  }

  /**
   * Search by creator/author
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    const cqlQuery = query.fuzzy
      ? `atr any ${query.name}`
      : `atr="${query.name}"`;

    return this.executeSruQuery(cqlQuery, `creator search for "${query.name}"`);
  }

  /**
   * Search using multiple criteria
   */
  async searchMultiCriteria(
    query: MultiCriteriaQuery,
  ): Promise<MetadataRecord[]> {
    // Prioritize ISBN search
    if (query.isbn) {
      return this.searchByISBN(query.isbn);
    }

    const parts: string[] = [];

    if (query.title) {
      parts.push(`tit=${query.title}`);
    }

    if (query.authors && query.authors.length > 0) {
      parts.push(`atr=${query.authors[0]}`);
    }

    if (query.publisher) {
      parts.push(`vlg=${query.publisher}`);
    }

    if (query.yearRange) {
      parts.push(`jhr=${query.yearRange[0]}`);
    }

    if (parts.length === 0) {
      return [];
    }

    const cqlQuery = parts.join(" and ");

    return this.executeSruQuery(cqlQuery, "multi-criteria search");
  }

  /**
   * Get reliability scores for DNB data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    const dnbScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.95, // Excellent for German books
      [MetadataType.AUTHORS]: 0.95, // GND authority files
      [MetadataType.ISBN]: 0.98, // Very reliable
      [MetadataType.PUBLICATION_DATE]: 0.92,
      [MetadataType.SUBJECTS]: 0.9, // DDC classification
      [MetadataType.DESCRIPTION]: 0.6, // Less common
      [MetadataType.LANGUAGE]: 0.95,
      [MetadataType.PUBLISHER]: 0.92,
      [MetadataType.SERIES]: 0.8,
      [MetadataType.EDITION]: 0.85,
      [MetadataType.PAGE_COUNT]: 0.9,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.7,
      [MetadataType.COVER_IMAGE]: 0.0, // DNB doesn't provide covers
    };

    return dnbScores[dataType] ?? 0.7;
  }

  /**
   * Check if DNB supports a specific metadata type
   */
  supportsDataType(dataType: MetadataType): boolean {
    const supportedTypes = [
      MetadataType.TITLE,
      MetadataType.AUTHORS,
      MetadataType.ISBN,
      MetadataType.PUBLICATION_DATE,
      MetadataType.SUBJECTS,
      MetadataType.LANGUAGE,
      MetadataType.PUBLISHER,
      MetadataType.SERIES,
      MetadataType.EDITION,
      MetadataType.PAGE_COUNT,
    ];

    return supportedTypes.includes(dataType);
  }

  /**
   * Build SRU query URL
   */
  private buildQueryUrl(query: string, maxRecords: number = 10): string {
    const params = new URLSearchParams({
      version: "1.1",
      operation: "searchRetrieve",
      query: query,
      recordSchema: "MARC21-xml",
      maximumRecords: maxRecords.toString(),
    });
    return `${this.baseUrl}/dnb?${params.toString()}`;
  }

  /**
   * Execute SRU search query
   */
  private async executeSruQuery(
    query: string,
    operationName: string,
    maxRecords: number = 10,
  ): Promise<MetadataRecord[]> {
    const result = await this.executeWithRetry(async () => {
      const url = this.buildQueryUrl(query, maxRecords);

      const response = await this.fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/xml, text/xml",
          "User-Agent": this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error(
          `DNB API error: ${response.status} ${response.statusText}`,
        );
      }

      const xmlText = await response.text();
      return this.parseSruResponse(xmlText);
    }, operationName);

    return Array.isArray(result) ? result : [];
  }

  /**
   * Parse SRU XML response into metadata records
   */
  private parseSruResponse(xmlText: string): MetadataRecord[] {
    try {
      // Check if there are any results
      const recordCount = extractSruRecordCount(xmlText);
      if (recordCount === 0) {
        return [];
      }

      // Parse MARC records using shared utility
      const marcRecords = parseMarcXmlRecords(xmlText);

      return marcRecords
        .map((record, index) =>
          this.#mapMarcRecordToMetadata(
            record,
            `${this.name}-${Date.now()}-${index}`,
          ),
        )
        .filter((r): r is MetadataRecord => r !== null);
    } catch (error) {
      console.warn("Failed to parse DNB SRU response:", error);
      return [];
    }
  }

  /**
   * Map a parsed MARC record to MetadataRecord format
   */
  #mapMarcRecordToMetadata(
    record: MarcRecord,
    id: string,
  ): MetadataRecord | null {
    // Use the shared extraction utility
    const bibData = extractBibliographicData(record);

    if (!bibData.title) {
      return null;
    }

    // Build the metadata object
    const metadata: Partial<
      Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">
    > = {};

    // Combine title and subtitle
    metadata.title = bibData.subtitle
      ? `${bibData.title}: ${bibData.subtitle}`
      : bibData.title;

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

    // Store DNB specific data
    metadata.providerData = {
      controlNumber: bibData.controlNumber,
      gndIds: bibData.gndIds,
      ddcClassification: bibData.deweyNumber,
      lccn: bibData.lccn,
    };

    // Calculate confidence
    const confidence = this.#calculateConfidence(bibData);

    return this.createMetadataRecord(id, metadata, confidence);
  }

  /**
   * Parse series position string to extract volume number
   */
  #parseSeriesVolume(position: string | undefined): number | undefined {
    if (!position) return undefined;
    // Try to extract a number from strings like "1", "Band 2", "Volume 3", "v. 5"
    const match = position.match(/\d+/);
    return match ? parseInt(match[0], 10) : undefined;
  }

  /**
   * Calculate confidence score based on data completeness
   */
  #calculateConfidence(bibData: MarcBibliographicData): number {
    let confidence = 0.75; // Base confidence for DNB

    // Boost for ISBN presence
    if (bibData.isbns.length > 0) {
      confidence += 0.1;
    }

    // Boost for author presence
    if (bibData.authors.length > 0) {
      confidence += 0.05;
    }

    // Boost for publisher presence
    if (bibData.publisher) {
      confidence += 0.02;
    }

    // Boost for subjects/classification
    if (bibData.subjects.length > 0) {
      confidence += 0.02;
    }

    // Boost for GND IDs (authoritative data)
    if (bibData.gndIds && bibData.gndIds.length > 0) {
      confidence += 0.03;
    }

    return Math.min(0.97, confidence);
  }
}
