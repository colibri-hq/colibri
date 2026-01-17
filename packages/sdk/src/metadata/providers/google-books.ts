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
 * Google Books API response interfaces
 */
interface GoogleBooksVolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: Array<{ type: "ISBN_10" | "ISBN_13" | "OTHER"; identifier: string }>;
  pageCount?: number;
  categories?: string[];
  language?: string;
  imageLinks?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
  maturityRating?: "NOT_MATURE" | "MATURE";
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksVolume[];
}

/**
 * Google Books API metadata provider
 *
 * Provides access to Google's extensive book database (~40M volumes)
 * with excellent cover image quality.
 *
 * API Details:
 * - Base URL: https://www.googleapis.com/books/v1/volumes
 * - Rate limit: 1000 requests/day without key, higher with key
 * - Optional API key for increased rate limits
 *
 * Coverage:
 * - ~40 million volumes
 * - High-quality cover images
 * - Comprehensive metadata including descriptions
 * - Multiple ISBN formats (ISBN-10, ISBN-13)
 */
export class GoogleBooksMetadataProvider extends RetryableMetadataProvider {
  readonly name = "GoogleBooks";
  readonly priority = 85; // Equal to WikiData/LoC due to high quality

  // Rate limiting configuration
  readonly rateLimit: RateLimitConfig;
  readonly timeout: TimeoutConfig = {
    requestTimeout: 10000, // 10 seconds
    operationTimeout: 30000, // 30 seconds
  };

  private readonly baseUrl = "https://www.googleapis.com/books/v1/volumes";
  private readonly apiKey: string | undefined;

  public constructor(
    private readonly fetch: typeof globalThis.fetch = globalThis.fetch,
    apiKey?: string,
  ) {
    super();
    this.apiKey = apiKey;

    // Adjust rate limit based on whether we have an API key
    this.rateLimit = apiKey
      ? {
          maxRequests: 100, // Higher limit with API key
          windowMs: 60000, // 1 minute
          requestDelay: 200, // 200ms between requests
        }
      : {
          maxRequests: 10, // Conservative without API key
          windowMs: 60000, // 1 minute
          requestDelay: 1000, // 1 second between requests
        };
  }

  /**
   * Search for metadata by title
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    const searchQuery = `intitle:${this.#escapeQuery(query.title)}`;
    const response = await this.executeRequest(searchQuery, `title search for "${query.title}"`);

    return this.#processSearchResults(response, "title");
  }

  /**
   * Search for metadata by ISBN
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    const cleanedIsbn = this.cleanIsbn(isbn);
    const searchQuery = `isbn:${cleanedIsbn}`;
    const response = await this.executeRequest(searchQuery, `ISBN search for "${isbn}"`);

    return this.#processSearchResults(response, "isbn");
  }

  /**
   * Search for metadata by creator/author
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    const searchQuery = `inauthor:${this.#escapeQuery(query.name)}`;
    const response = await this.executeRequest(searchQuery, `author search for "${query.name}"`);

    return this.#processSearchResults(response, "author");
  }

  /**
   * Search using multiple criteria
   */
  async searchMultiCriteria(query: MultiCriteriaQuery): Promise<MetadataRecord[]> {
    const queryParts: string[] = [];

    // ISBN has highest priority
    if (query.isbn) {
      return await this.searchByISBN(query.isbn);
    }

    // Build combined query
    if (query.title) {
      queryParts.push(`intitle:${this.#escapeQuery(query.title)}`);
    }

    if (query.authors && query.authors.length > 0) {
      queryParts.push(`inauthor:${this.#escapeQuery(query.authors[0])}`);
    }

    if (query.publisher) {
      queryParts.push(`inpublisher:${this.#escapeQuery(query.publisher)}`);
    }

    if (queryParts.length === 0) {
      return [];
    }

    const searchQuery = queryParts.join("+");
    const response = await this.executeRequest(searchQuery, `multi-criteria search`);

    return this.#processSearchResults(response, "multi", query);
  }

  /**
   * Get reliability scores for Google Books data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    // Google Books has excellent reliability for most data types
    const googleBooksScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.95,
      [MetadataType.AUTHORS]: 0.92,
      [MetadataType.ISBN]: 0.95,
      [MetadataType.PUBLICATION_DATE]: 0.88,
      [MetadataType.SUBJECTS]: 0.85,
      [MetadataType.DESCRIPTION]: 0.9, // Google Books has excellent descriptions
      [MetadataType.LANGUAGE]: 0.9,
      [MetadataType.PUBLISHER]: 0.85,
      [MetadataType.SERIES]: 0.6, // Less reliable for series
      [MetadataType.EDITION]: 0.7,
      [MetadataType.PAGE_COUNT]: 0.85,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.3, // Not typically provided
      [MetadataType.COVER_IMAGE]: 0.95, // Excellent cover images
    };

    return googleBooksScores[dataType] ?? 0.75;
  }

  /**
   * Check if Google Books supports a specific metadata type
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
      MetadataType.COVER_IMAGE,
    ];

    return supportedTypes.includes(dataType);
  }

  /**
   * Execute a Google Books API request
   */
  private async executeRequest(query: string, operationName: string): Promise<GoogleBooksResponse> {
    const result = await this.executeWithRetry(async () => {
      // Build URL with query and optional API key
      const url = new URL(this.baseUrl);
      url.searchParams.set("q", query);
      url.searchParams.set("maxResults", "10");
      url.searchParams.set("printType", "books");

      if (this.apiKey) {
        url.searchParams.set("key", this.apiKey);
      }

      const response = await this.fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": this.userAgent },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `Google Books API request failed: ${response.status} ${response.statusText} - ${errorText}`,
          { cause: { status: response.status, body: errorText } },
        );
      }

      return (await response.json()) as GoogleBooksResponse;
    }, operationName);

    // If executeWithRetry returned empty array (failure case), return empty response structure
    if (Array.isArray(result) && result.length === 0) {
      return { kind: "books#volumes", totalItems: 0, items: [] };
    }

    return result as GoogleBooksResponse;
  }

  /**
   * Escape special characters in search queries
   */
  #escapeQuery(query: string): string {
    // Google Books uses quotes for exact phrase matching
    // Remove problematic characters and wrap in quotes for better results
    return `"${query.replace(/["\[\]]/g, "")}"`;
  }

  /**
   * Process Google Books API search results into MetadataRecord objects
   */
  #processSearchResults(
    response: GoogleBooksResponse,
    searchType: string,
    query?: MultiCriteriaQuery,
  ): MetadataRecord[] {
    if (!response.items || response.items.length === 0) {
      return [];
    }

    return response.items
      .map((item) => this.#createMetadataRecordFromVolume(item, searchType, query))
      .filter((record): record is MetadataRecord => record !== null);
  }

  /**
   * Create MetadataRecord from Google Books volume
   */
  #createMetadataRecordFromVolume(
    volume: GoogleBooksVolume,
    searchType: string,
    query?: MultiCriteriaQuery,
  ): MetadataRecord | null {
    const info = volume.volumeInfo;
    if (!info.title) return null;

    // Extract ISBNs
    const isbns = info.industryIdentifiers
      ?.filter((id) => id.type === "ISBN_10" || id.type === "ISBN_13")
      .map((id) => id.identifier);

    // Parse publication date
    let publicationDate: Date | undefined;
    if (info.publishedDate) {
      try {
        // Google Books returns dates in various formats: YYYY, YYYY-MM, YYYY-MM-DD
        const dateStr = info.publishedDate;
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          publicationDate = new Date(dateStr);
        } else if (dateStr.match(/^\d{4}-\d{2}$/)) {
          publicationDate = new Date(`${dateStr}-01`);
        } else if (dateStr.match(/^\d{4}$/)) {
          publicationDate = new Date(parseInt(dateStr), 0, 1);
        }
      } catch {
        // Ignore invalid dates
      }
    }

    // Extract best quality cover image
    const coverImage = this.#extractCoverImage(info.imageLinks);

    // Build full title (include subtitle if present)
    const fullTitle = info.subtitle ? `${info.title}: ${info.subtitle}` : info.title;

    return this.createMetadataRecord(
      `google-books-${volume.id}`,
      {
        title: fullTitle,
        authors: info.authors && info.authors.length > 0 ? info.authors : undefined,
        isbn: isbns && isbns.length > 0 ? isbns : undefined,
        publicationDate,
        publisher: info.publisher,
        language: info.language,
        pageCount: info.pageCount,
        description: info.description,
        subjects: info.categories,
        coverImage,
        providerData: { googleBooksId: volume.id, maturityRating: info.maturityRating, searchType },
      },
      this.#calculateConfidence(info, searchType, query),
    );
  }

  /**
   * Extract the best quality cover image URL
   */
  #extractCoverImage(
    imageLinks?: GoogleBooksVolumeInfo["imageLinks"],
  ): MetadataRecord["coverImage"] | undefined {
    if (!imageLinks) return undefined;

    // Priority: extraLarge > large > medium > small > thumbnail
    const url =
      imageLinks.extraLarge ||
      imageLinks.large ||
      imageLinks.medium ||
      imageLinks.small ||
      imageLinks.thumbnail;

    if (!url) return undefined;

    // Convert to HTTPS and add zoom parameter for larger images
    let enhancedUrl = url.replace("http://", "https://");

    // Add zoom=1 parameter if not already present for larger images
    if (!enhancedUrl.includes("zoom=")) {
      const separator = enhancedUrl.includes("?") ? "&" : "?";
      enhancedUrl = `${enhancedUrl}${separator}zoom=1`;
    }

    return {
      url: enhancedUrl,
      // Google Books doesn't provide dimensions, but we know they're reasonable quality
    };
  }

  /**
   * Calculate confidence score based on data completeness and search type
   */
  #calculateConfidence(
    info: GoogleBooksVolumeInfo,
    searchType: string,
    query?: MultiCriteriaQuery,
  ): number {
    let baseConfidence = 0.7;

    // Adjust base confidence by search type
    switch (searchType) {
      case "isbn":
        baseConfidence = 0.9; // ISBN searches are very reliable
        break;
      case "title":
        baseConfidence = 0.75;
        break;
      case "author":
        baseConfidence = 0.6;
        break;
      case "multi":
        baseConfidence = 0.75;
        break;
    }

    // Boost confidence based on data completeness
    let completenessBoost = 0;
    if (info.title) completenessBoost += 0.01;
    if (info.authors && info.authors.length > 0) completenessBoost += 0.02;
    if (info.industryIdentifiers && info.industryIdentifiers.length > 0) completenessBoost += 0.03;
    if (info.publishedDate) completenessBoost += 0.02;
    if (info.publisher) completenessBoost += 0.01;
    if (info.description) completenessBoost += 0.02;
    if (info.pageCount) completenessBoost += 0.01;
    if (info.categories && info.categories.length > 0) completenessBoost += 0.01;
    if (info.imageLinks) completenessBoost += 0.02;

    // For multi-criteria searches, boost if multiple criteria match
    let criteriaMatchBoost = 0;
    if (searchType === "multi" && query) {
      let matchedCriteria = 0;
      let totalCriteria = 0;

      if (query.title) {
        totalCriteria++;
        if (
          info.title.toLowerCase().includes(query.title.toLowerCase()) ||
          info.subtitle?.toLowerCase().includes(query.title.toLowerCase())
        ) {
          matchedCriteria++;
        }
      }

      if (query.authors && query.authors.length > 0) {
        totalCriteria++;
        if (
          info.authors &&
          info.authors.some((author) =>
            query.authors!.some((queryAuthor) =>
              author.toLowerCase().includes(queryAuthor.toLowerCase()),
            ),
          )
        ) {
          matchedCriteria++;
        }
      }

      if (query.publisher) {
        totalCriteria++;
        if (
          info.publisher &&
          info.publisher.toLowerCase().includes(query.publisher.toLowerCase())
        ) {
          matchedCriteria++;
        }
      }

      if (totalCriteria > 0) {
        criteriaMatchBoost = (matchedCriteria / totalCriteria) * 0.1;
      }
    }

    // Calculate final confidence (cap at 0.95 to allow for uncertainty)
    const finalConfidence = Math.min(0.95, baseConfidence + completenessBoost + criteriaMatchBoost);

    return Math.round(finalConfidence * 100) / 100;
  }
}
