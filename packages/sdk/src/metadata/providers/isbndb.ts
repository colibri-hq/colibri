import type { Database } from "../../database.js";
import { getSettingValue } from "../../settings/index.js";
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
 * ISBNdb API response interfaces
 */
interface ISBNdbBook {
  title: string;
  title_long?: string;
  isbn?: string;
  isbn10?: string;
  isbn13?: string;
  authors?: string[];
  publisher?: string;
  date_published?: string;
  synopsis?: string;
  subjects?: string[];
  pages?: number;
  language?: string;
  image?: string;
  msrp?: number;
  binding?: string;
  dimensions?: string;
  edition?: string;
}

interface ISBNdbBookResponse {
  book: ISBNdbBook;
}

interface ISBNdbSearchResponse {
  total: number;
  books: ISBNdbBook[];
}

interface ISBNdbErrorResponse {
  errorMessage?: string;
  message?: string;
}

/**
 * ISBNdb metadata provider for fast ISBN lookups
 *
 * ISBNdb provides:
 * - Fast ISBN-based lookups (their specialty)
 * - Good coverage (30M+ books)
 * - Title and author searches
 * - Physical book details (dimensions, binding)
 *
 * API Characteristics:
 * - REST API with simple JSON responses
 * - API key required (set via urn:colibri:settings:metadata:isbndb-api-key)
 * - Rate limits vary by plan (1-10 req/s)
 * - Good for ISBN lookups, decent for other searches
 *
 * Confidence Scoring:
 * - ISBN match: 0.92 (very reliable for ISBN lookups)
 * - Title match: 0.70 (decent quality)
 * - Author match: 0.65 (good but not as strong as dedicated author databases)
 */
export class ISBNdbMetadataProvider extends RetryableMetadataProvider {
  readonly name = "ISBNdb";
  readonly priority = 80; // Same as OpenLibrary

  // Conservative rate limiting - respects typical free tier limits
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 60,
    windowMs: 60000, // 1 minute
    requestDelay: 1000, // 1 second between requests
  };

  readonly timeout: TimeoutConfig = {
    requestTimeout: 10000, // 10 seconds
    operationTimeout: 30000, // 30 seconds
  };
  protected readonly userAgent =
    "Colibri-Metadata-Discovery/1.0 (https://github.com/colibri-hq/colibri)";
  private readonly baseUrl = "https://api2.isbndb.com";

  constructor(
    private readonly database?: Database,
    private readonly fetch: typeof globalThis.fetch = globalThis.fetch,
  ) {
    super();
  }

  /**
   * Get reliability scores for ISBNdb data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    const isbndbScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.85,
      [MetadataType.AUTHORS]: 0.8,
      [MetadataType.ISBN]: 0.95, // ISBNdb is excellent for ISBN data
      [MetadataType.PUBLICATION_DATE]: 0.75,
      [MetadataType.SUBJECTS]: 0.7,
      [MetadataType.DESCRIPTION]: 0.65,
      [MetadataType.LANGUAGE]: 0.8,
      [MetadataType.PUBLISHER]: 0.85,
      [MetadataType.SERIES]: 0.5, // Not a strong point
      [MetadataType.EDITION]: 0.7,
      [MetadataType.PAGE_COUNT]: 0.85,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.75, // Good for physical books
      [MetadataType.COVER_IMAGE]: 0.75,
    };

    return isbndbScores[dataType] ?? 0.5;
  }

  /**
   * Check if ISBNdb supports a specific metadata type
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
      MetadataType.EDITION,
      MetadataType.PAGE_COUNT,
      MetadataType.PHYSICAL_DIMENSIONS,
      MetadataType.COVER_IMAGE,
    ];

    return supportedTypes.includes(dataType);
  }

  /**
   * Search for metadata by ISBN
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    // Clean ISBN using shared utility
    const cleanedIsbn = cleanIsbn(isbn);

    const response = await this.apiRequest<ISBNdbBookResponse>(
      `/book/${cleanedIsbn}`,
      `ISBN search for "${isbn}"`,
    );

    if (!response || !response.book) {
      return [];
    }

    return [
      this.createMetadataRecord(
        `${this.name}-isbn-${cleanedIsbn}`,
        this.mapISBNdbBookToMetadata(response.book),
        this.calculateConfidence(response.book, "isbn"),
      ),
    ];
  }

  /**
   * Search for metadata by title
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    const response = await this.apiRequest<ISBNdbSearchResponse>(
      `/books/${encodeURIComponent(query.title)}?page=1&pageSize=20`,
      `title search for "${query.title}"`,
    );

    if (!response || !response.books || response.books.length === 0) {
      return [];
    }

    // Map and filter results
    return response.books
      .map((book, index) =>
        this.createMetadataRecord(
          `${this.name}-title-${Date.now()}-${index}`,
          this.mapISBNdbBookToMetadata(book),
          this.calculateConfidence(book, "title"),
        ),
      )
      .slice(0, 10); // Limit to top 10 results
  }

  /**
   * Search for metadata by creator/author
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    // ISBNdb doesn't have a dedicated author endpoint, so we search books by author name
    const response = await this.apiRequest<ISBNdbSearchResponse>(
      `/books/${encodeURIComponent(query.name)}?page=1&pageSize=20`,
      `creator search for "${query.name}"`,
    );

    if (!response || !response.books || response.books.length === 0) {
      return [];
    }

    // Filter results to only include books where the author name matches
    const filteredBooks = response.books.filter((book) => {
      if (!book.authors || book.authors.length === 0) return false;
      return book.authors.some((author) => author.toLowerCase().includes(query.name.toLowerCase()));
    });

    return filteredBooks
      .map((book, index) =>
        this.createMetadataRecord(
          `${this.name}-creator-${Date.now()}-${index}`,
          this.mapISBNdbBookToMetadata(book),
          this.calculateConfidence(book, "creator"),
        ),
      )
      .slice(0, 10); // Limit to top 10 results
  }

  /**
   * Search using multiple criteria
   */
  async searchMultiCriteria(query: MultiCriteriaQuery): Promise<MetadataRecord[]> {
    // Strategy 1: ISBN search (most reliable)
    if (query.isbn) {
      return await this.searchByISBN(query.isbn);
    }

    // Strategy 2: Title + Author combined search
    if (query.title && query.authors && query.authors.length > 0) {
      const searchTerm = `${query.title} ${query.authors[0]}`;
      const response = await this.apiRequest<ISBNdbSearchResponse>(
        `/books/${encodeURIComponent(searchTerm)}?page=1&pageSize=20`,
        `multi-criteria search`,
      );

      if (!response || !response.books || response.books.length === 0) {
        return [];
      }

      return response.books
        .map((book, index) =>
          this.createMetadataRecord(
            `${this.name}-multi-${Date.now()}-${index}`,
            this.mapISBNdbBookToMetadata(book),
            this.calculateConfidence(book, "multi"),
          ),
        )
        .slice(0, 10);
    }

    // Strategy 3: Title search
    if (query.title) {
      return await this.searchByTitle({ title: query.title, exactMatch: false });
    }

    // Strategy 4: Author search
    if (query.authors && query.authors.length > 0) {
      return await this.searchByCreator({ name: query.authors[0], fuzzy: query.fuzzy || true });
    }

    return [];
  }

  /**
   * Get API key from settings
   */
  private async getApiKey(): Promise<string | null> {
    if (!this.database) {
      return null;
    }

    try {
      const apiKey = await getSettingValue(
        this.database,
        "urn:colibri:settings:metadata:isbndb-api-key",
      );
      return apiKey || null;
    } catch {
      return null;
    }
  }

  /**
   * Make an authenticated request to ISBNdb API
   */
  private async apiRequest<T>(endpoint: string, operationName: string): Promise<T | null> {
    const apiKey = await this.getApiKey();

    if (!apiKey) {
      return null;
    }

    return this.executeWithRetry(async () => {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await this.fetch(url, {
        method: "GET",
        headers: {
          Authorization: apiKey,
          "User-Agent": this.userAgent,
          Accept: "application/json",
        },
      });

      // Handle 404 - book not found (not an error)
      if (response.status === 404) {
        return null;
      }

      // Handle 401 - invalid API key
      if (response.status === 401) {
        throw new Error("ISBNdb API key is invalid or expired", {
          cause: { status: 401, response },
        });
      }

      // Handle 429 - rate limited
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || "60";
        throw new Error(`ISBNdb rate limit exceeded. Retry after ${retryAfter} seconds`, {
          cause: { status: 429, retryAfter, response },
        });
      }

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as ISBNdbErrorResponse;
        const errorMessage = errorBody.errorMessage || errorBody.message || response.statusText;
        throw new Error(`ISBNdb API error: ${response.status} - ${errorMessage}`, {
          cause: { status: response.status, response, errorBody },
        });
      }

      return (await response.json()) as T;
    }, operationName);
  }

  /**
   * Map ISBNdb book data to MetadataRecord format
   */
  private mapISBNdbBookToMetadata(
    book: ISBNdbBook,
  ): Partial<Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">> {
    const metadata: Partial<Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">> =
      {};

    // Title - prefer long title if available
    if (book.title_long) {
      metadata.title = book.title_long;
    } else if (book.title) {
      metadata.title = book.title;
    }

    // Authors
    if (book.authors && book.authors.length > 0) {
      metadata.authors = book.authors;
    }

    // ISBN - collect all available ISBNs
    const isbns: string[] = [];
    if (book.isbn13) isbns.push(book.isbn13);
    if (book.isbn10) isbns.push(book.isbn10);
    if (book.isbn && !isbns.includes(book.isbn)) isbns.push(book.isbn);
    if (isbns.length > 0) {
      metadata.isbn = isbns;
    }

    // Publisher
    if (book.publisher) {
      metadata.publisher = book.publisher;
    }

    // Publication date
    const publicationDate = book.date_published
      ? this.parsePublicationDate(book.date_published)
      : undefined;

    if (publicationDate) {
      metadata.publicationDate = publicationDate;
    }

    // Description/synopsis
    if (book.synopsis) {
      metadata.description = book.synopsis;
    }

    // Subjects
    if (book.subjects && book.subjects.length > 0) {
      metadata.subjects = book.subjects;
    }

    // Page count
    if (book.pages && book.pages > 0) {
      metadata.pageCount = book.pages;
    }

    // Language
    if (book.language) {
      metadata.language = book.language;
    }

    // Edition (from binding info)
    if (book.binding) {
      metadata.edition = book.binding;
    }

    // Physical dimensions
    const dimensions = book.dimensions ? this.parseDimensions(book.dimensions) : undefined;

    if (dimensions) {
      metadata.physicalDimensions = dimensions;
    }

    // Cover image
    if (book.image) {
      metadata.coverImage = { url: book.image };
    }

    // Store provider-specific data
    metadata.providerData = { msrp: book.msrp, binding: book.binding, edition: book.edition };

    return metadata;
  }

  /**
   * Parse publication date from ISBNdb format
   * Can be year only ("2020") or full date ("2020-03-15")
   */
  private parsePublicationDate(date: string): Date | undefined {
    try {
      // Try full date format first
      const fullDate = new Date(date);

      if (!isNaN(fullDate.getTime())) {
        return fullDate;
      }

      // Try year only
      const yearMatch = date.match(/(\d{4})/);

      if (yearMatch) {
        return new Date(parseInt(yearMatch[1]), 0, 1);
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Parse dimensions string to structured format
   * Format: "Height x Width x Depth" (e.g., "9.0 x 6.0 x 1.0")
   */
  private parseDimensions(dimensions: string): MetadataRecord["physicalDimensions"] | undefined {
    try {
      const parts = dimensions.split("x").map((part) => parseFloat(part.trim()));

      if (parts.length >= 2 && parts.every((part) => !isNaN(part))) {
        return {
          height: parts[0],
          width: parts[1],
          depth: parts[2],
          unit: "in", // ISBNdb typically uses inches
        };
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Calculate confidence score based on search type and result quality
   */
  private calculateConfidence(
    book: ISBNdbBook,
    searchType: "title" | "isbn" | "creator" | "multi",
  ): number {
    let baseConfidence = 0.7;

    // Adjust base confidence by search type
    switch (searchType) {
      case "isbn":
        baseConfidence = 0.92; // Very reliable for ISBN lookups
        break;
      case "title":
        baseConfidence = 0.7;
        break;
      case "creator":
        baseConfidence = 0.65;
        break;
      case "multi":
        baseConfidence = 0.75;
        break;
    }

    // Boost confidence based on data completeness
    let completenessBoost = 0;
    let fieldCount = 0;
    let filledFields = 0;

    const checkField = (field: any) => {
      fieldCount++;
      if (field && (typeof field !== "object" || (Array.isArray(field) && field.length > 0))) {
        filledFields++;
      }
    };

    checkField(book.title);
    checkField(book.authors);
    checkField(book.isbn13 || book.isbn10);
    checkField(book.date_published);
    checkField(book.subjects);
    checkField(book.publisher);
    checkField(book.language);
    checkField(book.pages);
    checkField(book.synopsis);

    if (fieldCount > 0) {
      completenessBoost = (filledFields / fieldCount) * 0.15;
    }

    // Boost confidence for books with rich metadata
    let qualityBoost = 0;
    if (book.synopsis && book.synopsis.length > 100) {
      qualityBoost += 0.03;
    }
    if (book.subjects && book.subjects.length > 2) {
      qualityBoost += 0.02;
    }
    if (book.dimensions) {
      qualityBoost += 0.02;
    }

    // Calculate final confidence
    const finalConfidence = Math.min(
      0.95, // Cap at 0.95 to allow room for consensus with other providers
      baseConfidence + completenessBoost + qualityBoost,
    );

    return Math.round(finalConfidence * 100) / 100;
  }
}
