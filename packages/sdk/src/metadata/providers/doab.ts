/**
 * DOAB (Directory of Open Access Books) metadata provider
 *
 * DOAB is a discovery service for open access academic books,
 * aggregating metadata from publishers and repositories worldwide.
 *
 * API Details:
 * - Endpoint: https://directory.doabooks.org/rest/search
 * - Protocol: REST JSON
 * - Rate limit: Polite usage (no strict limit documented)
 * - No authentication required
 *
 * Strengths:
 * - Open access academic books only
 * - Links to free full-text versions
 * - Publisher and repository metadata
 * - Subject classifications
 * - Multiple language support
 *
 * Data returned:
 * - Title, authors
 * - ISBN, DOI
 * - Publisher, publication date
 * - Subjects/keywords
 * - Open access links
 * - Language
 */

import { cleanIsbn } from "../utils/normalization.js";
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

/**
 * DOAB API response types
 */
interface _DOABMetadataValue {
  value: string;
  language?: string;
  authority?: string;
  confidence?: number;
}

interface DOABItem {
  uuid: string;
  name: string;
  handle: string;
  type: string;
  metadata: Array<{ key: string; value: string; language?: string }>;
  bitstreams?: Array<{ name: string; format: string; sizeBytes: number; retrieveLink: string }>;
}

interface DOABSearchResponse {
  items?: DOABItem[];
  total?: number;
  offset?: number;
  limit?: number;
}

/**
 * DOAB metadata provider for open access academic books
 */
export class DOABMetadataProvider extends RetryableMetadataProvider {
  readonly name = "DOAB";
  readonly priority = 65; // Good for open access content

  // Polite rate limiting
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 30, // Per 30 seconds
    windowMs: 30000,
    requestDelay: 200, // 200ms between requests (similar to other providers)
  };

  readonly timeout: TimeoutConfig = {
    requestTimeout: 20000, // 20 seconds
    operationTimeout: 60000, // 60 seconds
  };

  private readonly baseUrl = "https://directory.doabooks.org/rest";

  constructor(private readonly fetch: typeof globalThis.fetch = globalThis.fetch) {
    super();
  }

  /**
   * Search by title
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    const searchQuery = query.exactMatch ? `dc.title:"${query.title}"` : `dc.title:${query.title}`;

    const response = await this.executeSearch(searchQuery, `title search for "${query.title}"`);

    if (!response?.items) {
      return [];
    }

    return this.processItems(response.items, "title");
  }

  /**
   * Search by ISBN
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    const cleanedIsbn = cleanIsbn(isbn);

    const response = await this.executeSearch(
      `dc.identifier.isbn:${cleanedIsbn}`,
      `ISBN search for "${isbn}"`,
    );

    if (!response?.items) {
      return [];
    }

    return this.processItems(response.items, "isbn");
  }

  /**
   * Search by DOI
   */
  async searchByDOI(doi: string): Promise<MetadataRecord[]> {
    const normalizedDoi = this.normalizeDoi(doi);

    const response = await this.executeSearch(
      `dc.identifier.doi:${normalizedDoi}`,
      `DOI search for "${doi}"`,
    );

    if (!response?.items) {
      return [];
    }

    return this.processItems(response.items, "doi");
  }

  /**
   * Search by creator/author
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    const searchQuery = query.fuzzy
      ? `dc.contributor.author:${query.name}`
      : `dc.contributor.author:"${query.name}"`;

    const response = await this.executeSearch(searchQuery, `author search for "${query.name}"`);

    if (!response?.items) {
      return [];
    }

    return this.processItems(response.items, "author");
  }

  /**
   * Search using multiple criteria
   */
  async searchMultiCriteria(query: MultiCriteriaQuery): Promise<MetadataRecord[]> {
    // Prioritize ISBN
    if (query.isbn) {
      return this.searchByISBN(query.isbn);
    }

    // Build combined query
    const queryParts: string[] = [];

    if (query.title) {
      queryParts.push(`dc.title:${query.title}`);
    }

    if (query.authors && query.authors.length > 0) {
      queryParts.push(`dc.contributor.author:${query.authors.join(" ")}`);
    }

    if (query.publisher) {
      queryParts.push(`dc.publisher:${query.publisher}`);
    }

    if (queryParts.length === 0) {
      return [];
    }

    const response = await this.executeSearch(queryParts.join(" AND "), "multi-criteria search");

    if (!response?.items) {
      return [];
    }

    return this.processItems(response.items, "multi");
  }

  /**
   * Get reliability scores for DOAB data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    const doabScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.9,
      [MetadataType.AUTHORS]: 0.85,
      [MetadataType.ISBN]: 0.95,
      [MetadataType.PUBLICATION_DATE]: 0.85,
      [MetadataType.SUBJECTS]: 0.8,
      [MetadataType.DESCRIPTION]: 0.85,
      [MetadataType.LANGUAGE]: 0.9,
      [MetadataType.PUBLISHER]: 0.9,
      [MetadataType.SERIES]: 0.6,
      [MetadataType.EDITION]: 0.5,
      [MetadataType.PAGE_COUNT]: 0.4,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.0,
      [MetadataType.COVER_IMAGE]: 0.0, // Not provided
    };

    return doabScores[dataType] ?? 0.7;
  }

  /**
   * Check if DOAB supports a specific metadata type
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
    ];

    return supportedTypes.includes(dataType);
  }

  /**
   * Execute search request
   */
  private async executeSearch(
    query: string,
    operationName: string,
  ): Promise<DOABSearchResponse | null> {
    const result = await this.executeWithRetry(async () => {
      const params = new URLSearchParams({
        query: query,
        expand: "metadata,bitstreams",
        limit: "10",
      });

      const url = `${this.baseUrl}/search?${params.toString()}`;

      const response = await this.fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": this.userAgent },
      });

      if (!response.ok) {
        throw new Error(`DOAB API request failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as DOABSearchResponse;
    }, operationName);

    if (Array.isArray(result)) {
      return null;
    }

    return result;
  }

  /**
   * Process DOAB items into MetadataRecords
   */
  private processItems(items: DOABItem[], searchType: string): MetadataRecord[] {
    const records: MetadataRecord[] = [];

    for (const item of items) {
      const metadata = this.extractMetadata(item.metadata);

      const title = metadata.title;
      if (!title) continue;

      const authors = metadata.authors;
      const isbns = metadata.isbns;

      records.push(
        this.createMetadataRecord(
          `doab-${item.uuid}`,
          {
            title,
            authors: authors.length > 0 ? authors : undefined,
            isbn: isbns.length > 0 ? isbns : undefined,
            publisher: metadata.publisher,
            publicationDate: this.parseDate(metadata.publicationDate),
            description: metadata.description,
            subjects: metadata.subjects.length > 0 ? metadata.subjects : undefined,
            language: metadata.language,
            providerData: {
              uuid: item.uuid,
              handle: item.handle,
              doi: metadata.doi,
              openAccessUrl: this.getOpenAccessUrl(item),
              bitstreams: item.bitstreams?.map((b) => ({
                name: b.name,
                format: b.format,
                url: b.retrieveLink,
              })),
              license: metadata.license,
              repository: metadata.repository,
            },
          },
          this.calculateConfidence(searchType, metadata, isbns),
        ),
      );
    }

    return records;
  }

  /**
   * Extract metadata from DOAB item metadata array
   */
  private extractMetadata(metadata: Array<{ key: string; value: string; language?: string }>) {
    const result = {
      title: undefined as string | undefined,
      authors: [] as string[],
      isbns: [] as string[],
      publisher: undefined as string | undefined,
      publicationDate: undefined as string | undefined,
      description: undefined as string | undefined,
      subjects: [] as string[],
      language: undefined as string | undefined,
      doi: undefined as string | undefined,
      license: undefined as string | undefined,
      repository: undefined as string | undefined,
    };

    for (const field of metadata) {
      switch (field.key) {
        case "dc.title":
          result.title = field.value;
          break;
        case "dc.contributor.author":
        case "dc.creator":
          if (field.value) result.authors.push(field.value);
          break;
        case "dc.identifier.isbn":
          if (field.value) result.isbns.push(cleanIsbn(field.value));
          break;
        case "dc.publisher":
        case "publisher.name":
          result.publisher = field.value;
          break;
        case "dc.date.issued":
        case "dc.date":
          result.publicationDate = field.value;
          break;
        case "dc.description.abstract":
        case "dc.description":
          result.description = field.value;
          break;
        case "dc.subject":
        case "dc.subject.classification":
          if (field.value) result.subjects.push(field.value);
          break;
        case "dc.language":
        case "dc.language.iso":
          result.language = this.normalizeLanguageCode(field.value);
          break;
        case "dc.identifier.doi":
          result.doi = field.value;
          break;
        case "dc.rights":
        case "dc.rights.uri":
          result.license = field.value;
          break;
        case "oapen.relation.isPublishedBy":
          result.repository = field.value;
          break;
      }
    }

    return result;
  }

  /**
   * Get primary open access URL from item
   */
  private getOpenAccessUrl(item: DOABItem): string | undefined {
    if (item.bitstreams && item.bitstreams.length > 0) {
      // Prefer PDF
      const pdf = item.bitstreams.find(
        (b) => b.format?.toLowerCase().includes("pdf") || b.name?.toLowerCase().endsWith(".pdf"),
      );
      if (pdf) return pdf.retrieveLink;

      // Fall back to first bitstream
      return item.bitstreams[0].retrieveLink;
    }

    // Use handle as fallback
    if (item.handle) {
      return `https://directory.doabooks.org/handle/${item.handle}`;
    }

    return undefined;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    searchType: string,
    metadata: ReturnType<typeof this.extractMetadata>,
    isbns: string[],
  ): number {
    let confidence = 0.7; // Base confidence

    // ISBN/DOI searches are most reliable
    if (searchType === "isbn" || searchType === "doi") {
      confidence = 0.9;
    }

    // Boost for complete metadata
    if (isbns.length > 0) confidence += 0.03;
    if (metadata.authors.length > 0) confidence += 0.02;
    if (metadata.publisher) confidence += 0.02;
    if (metadata.description) confidence += 0.02;

    return Math.min(0.95, confidence);
  }
}
