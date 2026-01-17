/**
 * Springer Nature metadata provider
 *
 * Springer Nature is one of the world's leading academic publishers,
 * providing metadata for scientific books, journals, and book chapters.
 *
 * API Details:
 * - Endpoint: https://api.springernature.com/meta/v2
 * - Protocol: REST JSON
 * - Rate limit: 5 requests/second with API key
 * - Authentication: API key required
 *
 * Strengths:
 * - Scientific and academic books
 * - DOI resolution and linking
 * - Open access indicators
 * - Abstracts and keywords
 * - High-quality publisher metadata
 *
 * Data returned:
 * - Title, authors (with affiliations)
 * - DOI, ISBN
 * - Publisher, publication date
 * - Abstract, keywords
 * - Open access status
 * - Subject classification
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
 * Springer Nature API response types
 */
interface SpringerCreator {
  creator: string;
  ORCID?: string;
  affiliation?: string;
}

interface SpringerRecord {
  identifier: string;
  url: string;
  title: string;
  creators?: SpringerCreator[];
  publicationName?: string;
  openaccess?: string;
  publicationDate?: string;
  publicationType?: string;
  isbn?: string;
  issn?: string;
  doi?: string;
  publisher?: string;
  abstract?: string;
  subjects?: Array<{ term: string }>;
  keyword?: string[];
  language?: string;
  printIsbn?: string;
  electronicIsbn?: string;
  volume?: string;
  number?: string;
  genre?: string[];
}

interface SpringerResponse {
  apiMessage?: string;
  result?: Array<{ total: string; start: string; pageLength: string; recordsDisplayed: string }>;
  records?: SpringerRecord[];
}

/**
 * Springer Nature metadata provider for scientific and academic books
 */
export class SpringerNatureMetadataProvider extends RetryableMetadataProvider {
  readonly name = "SpringerNature";
  readonly priority = 75; // Good for academic content

  // API rate limits with key
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 5, // 5 per second
    windowMs: 1000,
    requestDelay: 200, // Stagger requests
  };

  readonly timeout: TimeoutConfig = {
    requestTimeout: 15000, // 15 seconds
    operationTimeout: 45000, // 45 seconds
  };
  protected readonly userAgent =
    "Colibri-Metadata-Discovery/1.0 (https://github.com/colibri-hq/colibri)";
  private readonly baseUrl = "https://api.springernature.com/meta/v2";

  constructor(
    private readonly apiKey: string,
    private readonly fetch: typeof globalThis.fetch = globalThis.fetch,
  ) {
    super();
  }

  /**
   * Search by title
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    const params: Record<string, string> = { q: `title:"${query.title}"`, type: "Book" };

    if (!query.exactMatch) {
      params.q = `title:${query.title}`;
    }

    const response = await this.executeRequest(params, `title search for "${query.title}"`);

    if (!response?.records) {
      return [];
    }

    return this.processRecords(response.records, "title");
  }

  /**
   * Search by ISBN
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    const cleanedIsbn = cleanIsbn(isbn);

    const params: Record<string, string> = { q: `isbn:${cleanedIsbn}` };

    const response = await this.executeRequest(params, `ISBN search for "${isbn}"`);

    if (!response?.records) {
      return [];
    }

    return this.processRecords(response.records, "isbn");
  }

  /**
   * Search by DOI
   */
  async searchByDOI(doi: string): Promise<MetadataRecord[]> {
    // Normalize DOI
    const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, "").trim();

    const params: Record<string, string> = { q: `doi:${cleanDoi}` };

    const response = await this.executeRequest(params, `DOI search for "${doi}"`);

    if (!response?.records) {
      return [];
    }

    return this.processRecords(response.records, "doi");
  }

  /**
   * Search by creator/author
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    const params: Record<string, string> = { q: `name:${query.name}`, type: "Book" };

    const response = await this.executeRequest(params, `author search for "${query.name}"`);

    if (!response?.records) {
      return [];
    }

    return this.processRecords(response.records, "author");
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
      queryParts.push(`title:${query.title}`);
    }

    if (query.authors && query.authors.length > 0) {
      queryParts.push(`name:${query.authors.join(" ")}`);
    }

    if (query.publisher) {
      queryParts.push(`pub:${query.publisher}`);
    }

    if (queryParts.length === 0) {
      return [];
    }

    const params: Record<string, string> = { q: queryParts.join(" AND "), type: "Book" };

    const response = await this.executeRequest(params, "multi-criteria search");

    if (!response?.records) {
      return [];
    }

    return this.processRecords(response.records, "multi");
  }

  /**
   * Get reliability scores for Springer data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    const springerScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.95,
      [MetadataType.AUTHORS]: 0.92,
      [MetadataType.ISBN]: 0.98,
      [MetadataType.PUBLICATION_DATE]: 0.9,
      [MetadataType.SUBJECTS]: 0.85,
      [MetadataType.DESCRIPTION]: 0.9, // Good abstracts
      [MetadataType.LANGUAGE]: 0.85,
      [MetadataType.PUBLISHER]: 0.98, // Own publications
      [MetadataType.SERIES]: 0.8,
      [MetadataType.EDITION]: 0.7,
      [MetadataType.PAGE_COUNT]: 0.7,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.0,
      [MetadataType.COVER_IMAGE]: 0.0, // Not provided via API
    };

    return springerScores[dataType] ?? 0.7;
  }

  /**
   * Check if Springer supports a specific metadata type
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
   * Execute API request
   */
  private async executeRequest(
    params: Record<string, string>,
    operationName: string,
  ): Promise<SpringerResponse | null> {
    const result = await this.executeWithRetry(async () => {
      const queryParams = new URLSearchParams({
        ...params,
        api_key: this.apiKey,
        p: "10", // Page size
        s: "1", // Start index
      });

      const url = `${this.baseUrl}/json?${queryParams.toString()}`;

      const response = await this.fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": this.userAgent },
      });

      if (!response.ok) {
        throw new Error(`Springer API request failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as SpringerResponse;
    }, operationName);

    if (Array.isArray(result)) {
      return null;
    }

    return result;
  }

  /**
   * Process Springer records into MetadataRecords
   */
  private processRecords(records: SpringerRecord[], searchType: string): MetadataRecord[] {
    const metadataRecords: MetadataRecord[] = [];

    for (const record of records) {
      // Filter for books
      const bookTypes = ["Book", "BookChapter", "ReferenceWorkEntry"];
      if (record.publicationType && !bookTypes.includes(record.publicationType)) {
        continue;
      }

      const title = record.title;
      if (!title) continue;

      const authors = this.extractAuthors(record.creators);
      const isbns = this.extractISBNs(record);
      const publicationDate = this.parseDate(record.publicationDate);

      metadataRecords.push(
        this.createMetadataRecord(
          `springer-${record.identifier.replace(/[^a-zA-Z0-9]/g, "-")}`,
          {
            title,
            authors: authors.length > 0 ? authors : undefined,
            isbn: isbns.length > 0 ? isbns : undefined,
            publisher: record.publisher,
            publicationDate,
            description: record.abstract,
            subjects: this.extractSubjects(record),
            language: record.language,
            providerData: {
              doi: record.doi,
              identifier: record.identifier,
              url: record.url,
              openAccess: record.openaccess === "true",
              publicationType: record.publicationType,
              publicationName: record.publicationName,
              genre: record.genre,
              volume: record.volume,
              number: record.number,
            },
          },
          this.calculateConfidence(searchType, record, isbns),
        ),
      );
    }

    return metadataRecords;
  }

  /**
   * Extract author names from Springer creator format
   */
  private extractAuthors(creators?: SpringerCreator[]): string[] {
    if (!creators) return [];
    return creators.map((c) => c.creator).filter((name) => name.length > 0);
  }

  /**
   * Extract all ISBNs from record
   */
  private extractISBNs(record: SpringerRecord): string[] {
    const isbns: string[] = [];
    if (record.isbn) isbns.push(record.isbn);
    if (record.printIsbn && !isbns.includes(record.printIsbn)) {
      isbns.push(record.printIsbn);
    }
    if (record.electronicIsbn && !isbns.includes(record.electronicIsbn)) {
      isbns.push(record.electronicIsbn);
    }
    return isbns;
  }

  /**
   * Extract subjects from various fields
   */
  private extractSubjects(record: SpringerRecord): string[] | undefined {
    const subjects: Set<string> = new Set();

    if (record.subjects) {
      for (const subject of record.subjects) {
        if (subject.term) subjects.add(subject.term);
      }
    }

    if (record.keyword) {
      for (const keyword of record.keyword) {
        subjects.add(keyword);
      }
    }

    return subjects.size > 0 ? Array.from(subjects) : undefined;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(searchType: string, record: SpringerRecord, isbns: string[]): number {
    let confidence = 0.75; // Base confidence for Springer

    // ISBN/DOI searches are most reliable
    if (searchType === "isbn" || searchType === "doi") {
      confidence = 0.92;
    }

    // Boost for complete metadata
    if (isbns.length > 0) confidence += 0.03;
    if (record.creators && record.creators.length > 0) confidence += 0.02;
    if (record.publisher) confidence += 0.02;
    if (record.abstract) confidence += 0.02;

    return Math.min(0.98, confidence);
  }
}
