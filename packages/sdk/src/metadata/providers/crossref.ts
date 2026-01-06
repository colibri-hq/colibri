/**
 * Crossref metadata provider
 *
 * Crossref is a DOI registration agency providing metadata for scholarly
 * publications including academic books, book chapters, and monographs.
 *
 * API Details:
 * - Endpoint: https://api.crossref.org
 * - Protocol: REST JSON
 * - Rate limit: "Polite pool" - requires mailto parameter, higher limits
 * - No authentication required (but mailto recommended)
 *
 * Strengths:
 * - DOI resolution (authoritative source)
 * - Academic and scholarly publications
 * - Citation data and references
 * - Publisher information
 * - Funding information for research publications
 *
 * Data returned:
 * - Title, authors (including ORCID)
 * - DOI, ISBN
 * - Publisher, publication date
 * - Subjects, references
 * - Abstract (when available)
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
import { cleanIsbn } from "../utils/normalization.js";

/**
 * Crossref API response types
 */
interface CrossrefAuthor {
  given?: string;
  family?: string;
  name?: string;
  ORCID?: string;
  sequence?: string;
  affiliation?: Array<{ name: string }>;
}

interface CrossrefWork {
  DOI: string;
  type: string;
  title?: string[];
  subtitle?: string[];
  author?: CrossrefAuthor[];
  editor?: CrossrefAuthor[];
  publisher?: string;
  "published-print"?: { "date-parts": number[][] };
  "published-online"?: { "date-parts": number[][] };
  created?: { "date-parts": number[][] };
  ISBN?: string[];
  ISSN?: string[];
  abstract?: string;
  subject?: string[];
  "container-title"?: string[];
  language?: string;
  "page-count"?: number;
  "references-count"?: number;
  "is-referenced-by-count"?: number;
  funder?: Array<{ name: string; DOI?: string }>;
  license?: Array<{ URL: string; "content-version"?: string }>;
}

interface CrossrefResponse {
  status: string;
  "message-type": string;
  message: {
    items?: CrossrefWork[];
    "total-results"?: number;
    // Single work response
    DOI?: string;
    title?: string[];
    author?: CrossrefAuthor[];
    publisher?: string;
  };
}

/**
 * Crossref metadata provider for academic books and publications
 */
export class CrossrefMetadataProvider extends RetryableMetadataProvider {
  readonly name = "Crossref";
  readonly priority = 70; // Good for academic content

  // Polite pool rate limiting
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 50, // Per second with mailto (polite pool)
    windowMs: 1000,
    requestDelay: 100, // Small delay between requests
  };

  readonly timeout: TimeoutConfig = {
    requestTimeout: 15000, // 15 seconds
    operationTimeout: 45000, // 45 seconds
  };
  protected readonly userAgent =
    "Colibri-Metadata-Discovery/1.0 (https://github.com/colibri-hq/colibri; mailto:metadata@colibri.dev)";
  private readonly baseUrl = "https://api.crossref.org";
  private readonly mailto: string = "metadata@colibri.dev"; // For polite pool access

  constructor(
    private readonly fetch: typeof globalThis.fetch = globalThis.fetch,
    mailto?: string,
  ) {
    super();
    if (mailto) {
      this.mailto = mailto;
    }
  }

  /**
   * Search by title
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    const params: Record<string, string> = {
      "query.title": query.title,
      filter: "type:book,type:monograph,type:edited-book,type:reference-book",
      rows: "10",
    };

    const response = await this.executeRequest(
      "/works",
      params,
      `title search for "${query.title}"`,
    );

    if (!response?.message?.items) {
      return [];
    }

    return this.processWorks(response.message.items, "title");
  }

  /**
   * Search by ISBN
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    const cleanedIsbn = cleanIsbn(isbn);

    const params: Record<string, string> = {
      filter: `isbn:${cleanedIsbn}`,
      rows: "10",
    };

    const response = await this.executeRequest(
      "/works",
      params,
      `ISBN search for "${isbn}"`,
    );

    if (!response?.message?.items) {
      return [];
    }

    return this.processWorks(response.message.items, "isbn");
  }

  /**
   * Search by DOI (direct resolution)
   */
  async searchByDOI(doi: string): Promise<MetadataRecord[]> {
    // Normalize DOI
    const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, "").trim();

    const response = await this.executeWithRetry(async () => {
      const url = `${this.baseUrl}/works/${encodeURIComponent(cleanDoi)}?mailto=${this.mailto}`;

      const fetchResponse = await this.fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": this.userAgent,
        },
      });

      if (!fetchResponse.ok) {
        throw new Error(
          `Crossref DOI lookup failed: ${fetchResponse.status} ${fetchResponse.statusText}`,
        );
      }

      return (await fetchResponse.json()) as CrossrefResponse;
    }, `DOI lookup for "${doi}"`);

    if (Array.isArray(response)) {
      return [];
    }

    // For single work response, message is the work itself
    const work = response.message as unknown as CrossrefWork;
    if (!work.DOI) {
      return [];
    }

    return this.processWorks([work], "doi");
  }

  /**
   * Search by creator/author
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    const params: Record<string, string> = {
      "query.author": query.name,
      filter: "type:book,type:monograph,type:edited-book,type:reference-book",
      rows: "10",
    };

    const response = await this.executeRequest(
      "/works",
      params,
      `author search for "${query.name}"`,
    );

    if (!response?.message?.items) {
      return [];
    }

    return this.processWorks(response.message.items, "author");
  }

  /**
   * Search using multiple criteria
   */
  async searchMultiCriteria(
    query: MultiCriteriaQuery,
  ): Promise<MetadataRecord[]> {
    // Prioritize ISBN
    if (query.isbn) {
      return this.searchByISBN(query.isbn);
    }

    // Build combined query
    const params: Record<string, string> = {
      filter: "type:book,type:monograph,type:edited-book,type:reference-book",
      rows: "10",
    };

    if (query.title) {
      params["query.title"] = query.title;
    }

    if (query.authors && query.authors.length > 0) {
      params["query.author"] = query.authors.join(" ");
    }

    if (query.publisher) {
      params["query.publisher-name"] = query.publisher;
    }

    if (Object.keys(params).length <= 2) {
      // Only filter and rows, no search criteria
      return [];
    }

    const response = await this.executeRequest(
      "/works",
      params,
      "multi-criteria search",
    );

    if (!response?.message?.items) {
      return [];
    }

    return this.processWorks(response.message.items, "multi");
  }

  /**
   * Get reliability scores for Crossref data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    const crossrefScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.92,
      [MetadataType.AUTHORS]: 0.9, // Often includes ORCID
      [MetadataType.ISBN]: 0.95,
      [MetadataType.PUBLICATION_DATE]: 0.88,
      [MetadataType.SUBJECTS]: 0.8,
      [MetadataType.DESCRIPTION]: 0.85, // Abstracts
      [MetadataType.LANGUAGE]: 0.7,
      [MetadataType.PUBLISHER]: 0.95,
      [MetadataType.SERIES]: 0.7,
      [MetadataType.EDITION]: 0.6,
      [MetadataType.PAGE_COUNT]: 0.8,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.0,
      [MetadataType.COVER_IMAGE]: 0.0, // Crossref doesn't provide covers
    };

    return crossrefScores[dataType] ?? 0.7;
  }

  /**
   * Check if Crossref supports a specific metadata type
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
      MetadataType.PAGE_COUNT,
    ];

    return supportedTypes.includes(dataType);
  }

  /**
   * Execute API request
   */
  private async executeRequest(
    endpoint: string,
    params: Record<string, string>,
    operationName: string,
  ): Promise<CrossrefResponse | null> {
    const result = await this.executeWithRetry(async () => {
      const queryParams = new URLSearchParams({
        ...params,
        mailto: this.mailto,
      });

      const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;

      const response = await this.fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Crossref API request failed: ${response.status} ${response.statusText}`,
        );
      }

      return (await response.json()) as CrossrefResponse;
    }, operationName);

    if (Array.isArray(result)) {
      return null;
    }

    return result;
  }

  /**
   * Process Crossref works into MetadataRecords
   */
  private processWorks(
    works: CrossrefWork[],
    searchType: string,
  ): MetadataRecord[] {
    const records: MetadataRecord[] = [];

    for (const work of works) {
      // Filter for book-related types
      const bookTypes = [
        "book",
        "monograph",
        "book-chapter",
        "edited-book",
        "reference-book",
      ];
      if (!bookTypes.includes(work.type)) {
        continue;
      }

      const title = this.buildTitle(work.title, work.subtitle);
      if (!title) continue;

      const authors = this.extractAuthors(work.author);
      const publicationDate = this.extractDate(work);
      const isbns = work.ISBN || [];

      records.push(
        this.createMetadataRecord(
          `crossref-${work.DOI.replace(/[^a-zA-Z0-9]/g, "-")}`,
          {
            title,
            authors: authors.length > 0 ? authors : undefined,
            isbn: isbns.length > 0 ? isbns : undefined,
            publisher: work.publisher,
            publicationDate,
            description: this.cleanAbstract(work.abstract),
            subjects: work.subject,
            language: work.language,
            pageCount: work["page-count"],
            providerData: {
              doi: work.DOI,
              type: work.type,
              containerTitle: work["container-title"]?.[0],
              referencesCount: work["references-count"],
              citedByCount: work["is-referenced-by-count"],
              funders: work.funder?.map((f) => f.name),
              license: work.license?.[0]?.URL,
            },
          },
          this.calculateConfidence(searchType, work, isbns),
        ),
      );
    }

    return records;
  }

  /**
   * Build title from title and subtitle arrays
   */
  private buildTitle(
    title?: string[],
    subtitle?: string[],
  ): string | undefined {
    if (!title || title.length === 0) return undefined;

    let fullTitle = title[0];
    if (subtitle && subtitle.length > 0) {
      fullTitle += `: ${subtitle[0]}`;
    }

    return fullTitle;
  }

  /**
   * Extract author names from Crossref author format
   */
  private extractAuthors(authors?: CrossrefAuthor[]): string[] {
    if (!authors) return [];

    return authors
      .map((author) => {
        if (author.name) return author.name;
        if (author.family && author.given) {
          return `${author.family}, ${author.given}`;
        }
        return author.family || author.given || "";
      })
      .filter((name) => name.length > 0);
  }

  /**
   * Extract publication date from various Crossref date fields
   */
  private extractDate(work: CrossrefWork): Date | undefined {
    const dateParts =
      work["published-print"]?.["date-parts"]?.[0] ||
      work["published-online"]?.["date-parts"]?.[0] ||
      work.created?.["date-parts"]?.[0];

    if (!dateParts || dateParts.length === 0) return undefined;

    const [year, month = 1, day = 1] = dateParts;
    if (!year) return undefined;

    return new Date(year, month - 1, day);
  }

  /**
   * Clean abstract text (remove HTML/JATS markup)
   */
  private cleanAbstract(abstract?: string): string | undefined {
    if (!abstract) return undefined;

    // Remove JATS/XML tags
    return abstract
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim();
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    searchType: string,
    work: CrossrefWork,
    isbns: string[],
  ): number {
    let confidence = 0.7; // Base confidence for Crossref

    // DOI search is very reliable
    if (searchType === "doi") {
      confidence = 0.95;
    }

    // ISBN search is reliable
    if (searchType === "isbn") {
      confidence = 0.9;
    }

    // Boost for complete metadata
    if (isbns.length > 0) confidence += 0.03;
    if (work.author && work.author.length > 0) confidence += 0.03;
    if (work.publisher) confidence += 0.02;
    if (work.abstract) confidence += 0.02;

    return Math.min(0.98, confidence);
  }
}
