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

type Fetch = typeof globalThis.fetch;

/**
 * Internet Archive API response interfaces
 */
interface IASearchResponse {
  response: {
    numFound: number;
    docs: IADocument[];
  };
}

interface IADocument {
  identifier: string;
  title?: string;
  creator?: string | string[];
  date?: string;
  publisher?: string | string[];
  subject?: string | string[];
  description?: string | string[];
  language?: string | string[];
  isbn?: string | string[];
  imagecount?: number;
  mediatype?: string;
  // Additional fields
  year?: string;
  volume?: string;
  edition?: string;
  // Provider-specific metadata
  downloads?: number;
  item_size?: number;
  avg_rating?: number;
  num_reviews?: number;
}

/**
 * Internet Archive Metadata Provider
 *
 * The Internet Archive provides access to millions of digitized books,
 * particularly strong for historical and rare books. Uses the Advanced
 * Search API with full-text search capability.
 */
export class InternetArchiveMetadataProvider extends RetryableMetadataProvider {
  readonly name = "InternetArchive";
  readonly priority = 70; // Good priority for historical/rare books
  // Internet Archive rate limiting - be polite to their service
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 60, // Conservative limit
    windowMs: 60000, // 1 minute
    requestDelay: 1000, // 1 second between requests (polite)
  };
  readonly timeout: TimeoutConfig = {
    requestTimeout: 15000, // 15 seconds (can be slow)
    operationTimeout: 45000, // 45 seconds total
  };
  protected readonly userAgent =
    "colibri-metadata-discovery/1.0 (https://github.com/colibri-hq/colibri)";
  readonly #fetch: Fetch;
  private readonly baseUrl = "https://archive.org";

  constructor(fetch: Fetch = globalThis.fetch) {
    super();
    this.#fetch = fetch;
  }

  /**
   * Get reliability scores for Internet Archive data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    // Internet Archive has good reliability but less curated than some sources
    const iaScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.85, // Good title information
      [MetadataType.AUTHORS]: 0.8, // Good author information
      [MetadataType.ISBN]: 0.75, // Decent ISBN data but not always present
      [MetadataType.PUBLICATION_DATE]: 0.8, // Good date information
      [MetadataType.SUBJECTS]: 0.75, // Decent subject classification
      [MetadataType.DESCRIPTION]: 0.7, // Variable quality descriptions
      [MetadataType.LANGUAGE]: 0.8, // Good language information
      [MetadataType.PUBLISHER]: 0.75, // Decent publisher data
      [MetadataType.SERIES]: 0.6, // Limited series information
      [MetadataType.EDITION]: 0.7, // Decent edition information
      [MetadataType.PAGE_COUNT]: 0.7, // Can infer from image count
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.4, // Limited physical data
      [MetadataType.COVER_IMAGE]: 0.8, // Good cover images available
    };

    return iaScores[dataType] ?? 0.6;
  }

  /**
   * Check if Internet Archive supports a specific metadata type
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
      MetadataType.COVER_IMAGE,
    ];

    return supportedTypes.includes(dataType);
  }

  /**
   * Search for metadata by title
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      const searchQuery = `title:(${query.title}) AND mediatype:texts`;
      const results = await this.#searchInternetArchive(searchQuery);

      // Deduplicate results (same book may have multiple scans)
      const deduped = this.#deduplicateResults(results);

      return deduped.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-title-${Date.now()}-${index}`,
          this.#mapIADocumentToMetadata(result),
          this.#calculateConfidence(result, "title"),
        ),
      );
    }, `title search for "${query.title}"`);
  }

  /**
   * Search for metadata by ISBN
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      // Clean ISBN using shared utility
      const cleanedIsbn = cleanIsbn(isbn);

      // Search using both identifier and isbn fields
      const searchQuery = `(identifier:isbn_${cleanedIsbn} OR isbn:${cleanedIsbn}) AND mediatype:texts`;
      const results = await this.#searchInternetArchive(searchQuery);

      // Deduplicate results
      const deduped = this.#deduplicateResults(results);

      return deduped.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-isbn-${cleanedIsbn}-${index}`,
          this.#mapIADocumentToMetadata(result),
          this.#calculateConfidence(result, "isbn"),
        ),
      );
    }, `ISBN search for "${isbn}"`);
  }

  /**
   * Search for metadata by creator
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      const searchQuery = `creator:(${query.name}) AND mediatype:texts`;
      const results = await this.#searchInternetArchive(searchQuery);

      // Deduplicate results
      const deduped = this.#deduplicateResults(results);

      return deduped.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-creator-${Date.now()}-${index}`,
          this.#mapIADocumentToMetadata(result),
          this.#calculateConfidence(result, "creator"),
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
        searchParts.push(`title:(${query.title})`);
      }

      if (query.authors && query.authors.length > 0) {
        // Use first author for search
        searchParts.push(`creator:(${query.authors[0]})`);
      }

      if (query.isbn) {
        const cleanedIsbn = cleanIsbn(query.isbn);
        searchParts.push(
          `(identifier:isbn_${cleanedIsbn} OR isbn:${cleanedIsbn})`,
        );
      }

      if (query.subjects && query.subjects.length > 0) {
        // Use first subject
        searchParts.push(`subject:(${query.subjects[0]})`);
      }

      if (query.publisher) {
        searchParts.push(`publisher:(${query.publisher})`);
      }

      if (query.yearRange) {
        // Internet Archive supports date range queries
        searchParts.push(
          `date:[${query.yearRange[0]}-01-01 TO ${query.yearRange[1]}-12-31]`,
        );
      }

      // Always filter to books/texts
      searchParts.push("mediatype:texts");

      // Combine search parts with AND
      const searchQuery = searchParts.join(" AND ");

      if (searchParts.length <= 1) {
        return []; // No valid search criteria beyond mediatype filter
      }

      const results = await this.#searchInternetArchive(searchQuery);

      // Deduplicate results
      const deduped = this.#deduplicateResults(results);

      return deduped.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-multi-${Date.now()}-${index}`,
          this.#mapIADocumentToMetadata(result),
          this.#calculateConfidence(result, "multi", query),
        ),
      );
    }, `multi-criteria search`);
  }

  /**
   * Perform Internet Archive advanced search
   */
  async #searchInternetArchive(query: string): Promise<IADocument[]> {
    const params = new URLSearchParams({
      q: query,
      output: "json",
      rows: "10",
      "fl[]": [
        "identifier",
        "title",
        "creator",
        "date",
        "publisher",
        "subject",
        "description",
        "language",
        "isbn",
        "imagecount",
        "mediatype",
        "year",
        "volume",
        "edition",
        "downloads",
        "item_size",
        "avg_rating",
        "num_reviews",
      ].join(","),
    });

    const url = `${this.baseUrl}/advancedsearch.php?${params.toString()}`;

    const response = await this.#fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": this.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Internet Archive API error: ${response.status} ${response.statusText}`,
        {
          cause: {
            status: response.status,
            statusText: response.statusText,
          },
        },
      );
    }

    const data = (await response.json()) as IASearchResponse;

    return data.response?.docs || [];
  }

  /**
   * Deduplicate Internet Archive results
   * Same book may have multiple scans - prefer items with more metadata
   */
  #deduplicateResults(docs: IADocument[]): IADocument[] {
    // Group by title and creator
    const groups = new Map<string, IADocument[]>();

    for (const doc of docs) {
      const title = this.#normalizeForDedup(doc.title || "");
      const creator = this.#normalizeForDedup(
        Array.isArray(doc.creator) ? doc.creator[0] : doc.creator || "",
      );
      const key = `${title}-${creator}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(doc);
    }

    // For each group, select the best item
    const deduped: IADocument[] = [];
    for (const group of groups.values()) {
      if (group.length === 1) {
        deduped.push(group[0]);
      } else {
        // Prefer items with:
        // 1. More metadata fields filled
        // 2. Cover images (imagecount > 0)
        // 3. Higher download count (popularity indicator)
        const best = group.reduce((best, current) => {
          const bestScore = this.#calculateItemScore(best);
          const currentScore = this.#calculateItemScore(current);
          return currentScore > bestScore ? current : best;
        });
        deduped.push(best);
      }
    }

    return deduped;
  }

  /**
   * Calculate a score for an item to help with deduplication
   */
  #calculateItemScore(doc: IADocument): number {
    let score = 0;

    // Count filled metadata fields (higher is better)
    const fields = [
      "title",
      "creator",
      "date",
      "publisher",
      "subject",
      "description",
      "language",
      "isbn",
    ];
    for (const field of fields) {
      const value = doc[field as keyof IADocument];
      if (
        value !== undefined &&
        value !== null &&
        (typeof value !== "string" || value.trim() !== "") &&
        (!Array.isArray(value) || value.length > 0)
      ) {
        score += 10;
      }
    }

    // Boost for cover images
    if (doc.imagecount && doc.imagecount > 0) {
      score += 20;
    }

    // Boost for popularity (downloads)
    if (doc.downloads) {
      score += Math.min(30, Math.log10(doc.downloads) * 5);
    }

    return score;
  }

  /**
   * Normalize text for deduplication
   */
  #normalizeForDedup(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Map Internet Archive document to MetadataRecord format
   */
  #mapIADocumentToMetadata(
    doc: IADocument,
  ): Partial<
    Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">
  > {
    const metadata: Partial<
      Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">
    > = {};

    // Title
    if (doc.title) {
      metadata.title = doc.title;
    }

    // Authors - normalize to array
    if (doc.creator) {
      metadata.authors = Array.isArray(doc.creator)
        ? doc.creator
        : [doc.creator];
    }

    // ISBN - normalize to array
    if (doc.isbn) {
      metadata.isbn = Array.isArray(doc.isbn) ? doc.isbn : [doc.isbn];
    }

    // Publication date - often just a year
    if (doc.date || doc.year) {
      const dateStr = doc.date || doc.year || "";
      try {
        // Try to parse full date
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          metadata.publicationDate = parsedDate;
        } else {
          // Fall back to just year
          const yearMatch = dateStr.match(/\d{4}/);
          if (yearMatch) {
            metadata.publicationDate = new Date(parseInt(yearMatch[0]), 0, 1);
          }
        }
      } catch {
        // Ignore invalid dates
      }
    }

    // Subjects - normalize to array
    if (doc.subject) {
      metadata.subjects = Array.isArray(doc.subject)
        ? doc.subject
        : [doc.subject];
    }

    // Description - normalize to string
    if (doc.description) {
      metadata.description = Array.isArray(doc.description)
        ? doc.description[0]
        : doc.description;
    }

    // Language - convert ISO 639-2 to 639-1
    if (doc.language) {
      const lang = Array.isArray(doc.language) ? doc.language[0] : doc.language;
      metadata.language = this.#convertLanguageCode(lang);
    }

    // Publisher - normalize to string
    if (doc.publisher) {
      metadata.publisher = Array.isArray(doc.publisher)
        ? doc.publisher[0]
        : doc.publisher;
    }

    // Edition
    if (doc.edition) {
      metadata.edition = doc.edition;
    }

    // Page count - infer from image count if available
    if (doc.imagecount && doc.imagecount > 0) {
      // Image count is usually close to page count for scanned books
      metadata.pageCount = doc.imagecount;
    }

    // Cover image
    if (doc.identifier) {
      metadata.coverImage = {
        url: `${this.baseUrl}/services/img/${doc.identifier}`,
      };
    }

    // Store Internet Archive specific data
    metadata.providerData = {
      identifier: doc.identifier,
      iaUrl: `${this.baseUrl}/details/${doc.identifier}`,
      downloadUrl: `${this.baseUrl}/download/${doc.identifier}`,
      downloads: doc.downloads,
      itemSize: doc.item_size,
      averageRating: doc.avg_rating,
      numReviews: doc.num_reviews,
      imageCount: doc.imagecount,
      volume: doc.volume,
    };

    return metadata;
  }

  /**
   * Convert ISO 639-2 language code to ISO 639-1
   */
  #convertLanguageCode(code: string): string {
    // Common language code conversions
    const languageMap: Record<string, string> = {
      eng: "en",
      ger: "de",
      deu: "de",
      fra: "fr",
      fre: "fr",
      spa: "es",
      ita: "it",
      por: "pt",
      rus: "ru",
      jpn: "ja",
      chi: "zh",
      zho: "zh",
      ara: "ar",
      hin: "hi",
      kor: "ko",
      dut: "nl",
      nld: "nl",
      pol: "pl",
      swe: "sv",
      dan: "da",
      nor: "no",
      fin: "fi",
    };

    const normalized = code.toLowerCase().trim();

    // If already 2-letter code, return as is
    if (normalized.length === 2) {
      return normalized;
    }

    // Convert 3-letter code to 2-letter
    return languageMap[normalized] || normalized;
  }

  /**
   * Calculate confidence score based on search type and result quality
   */
  #calculateConfidence(
    doc: IADocument,
    searchType: "title" | "isbn" | "creator" | "multi",
    query?: MultiCriteriaQuery,
  ): number {
    let baseConfidence = 0.65;

    // Adjust base confidence by search type
    switch (searchType) {
      case "isbn":
        baseConfidence = 0.85; // ISBN searches are reliable but IA has some gaps
        break;
      case "title":
        baseConfidence = 0.7;
        break;
      case "creator":
        baseConfidence = 0.65;
        break;
      case "multi":
        baseConfidence = 0.75; // Multi-criteria can be more precise
        break;
    }

    // Boost confidence based on data completeness
    let completenessBoost = 0;
    let fieldCount = 0;
    let filledFields = 0;

    const checkField = (field: any) => {
      fieldCount++;
      if (
        field &&
        (typeof field !== "object" ||
          (Array.isArray(field) && field.length > 0))
      ) {
        filledFields++;
      }
    };

    checkField(doc.title);
    checkField(doc.creator);
    checkField(doc.isbn);
    checkField(doc.date || doc.year);
    checkField(doc.subject);
    checkField(doc.publisher);
    checkField(doc.language);
    checkField(doc.description);

    if (fieldCount > 0) {
      completenessBoost = (filledFields / fieldCount) * 0.15; // Up to 15% boost
    }

    // Boost confidence for items with cover images
    let coverBoost = 0;
    if (doc.imagecount && doc.imagecount > 0) {
      coverBoost = 0.05;
    }

    // Boost confidence for popular/well-documented items
    let popularityBoost = 0;
    if (doc.downloads && doc.downloads > 100) {
      popularityBoost += 0.05;
    }
    if (doc.num_reviews && doc.num_reviews > 5) {
      popularityBoost += 0.03;
    }

    // For multi-criteria searches, boost confidence if multiple criteria match
    let criteriaMatchBoost = 0;
    if (searchType === "multi" && query) {
      let matchedCriteria = 0;
      let totalCriteria = 0;

      if (query.title) {
        totalCriteria++;
        if (
          doc.title &&
          doc.title.toLowerCase().includes(query.title.toLowerCase())
        ) {
          matchedCriteria++;
        }
      }

      if (query.authors && query.authors.length > 0) {
        totalCriteria++;
        const creators = Array.isArray(doc.creator)
          ? doc.creator
          : doc.creator
            ? [doc.creator]
            : [];
        if (
          creators.some((creator) =>
            query.authors!.some((queryAuthor) =>
              creator.toLowerCase().includes(queryAuthor.toLowerCase()),
            ),
          )
        ) {
          matchedCriteria++;
        }
      }

      if (query.isbn) {
        totalCriteria++;
        const isbns = Array.isArray(doc.isbn)
          ? doc.isbn
          : doc.isbn
            ? [doc.isbn]
            : [];
        if (isbns.some((i) => i.includes(cleanIsbn(query.isbn!)))) {
          matchedCriteria++;
        }
      }

      if (totalCriteria > 0) {
        criteriaMatchBoost = (matchedCriteria / totalCriteria) * 0.1; // Up to 10% boost
      }
    }

    // Calculate final confidence, capped at 0.88
    const finalConfidence = Math.min(
      0.88,
      baseConfidence +
        completenessBoost +
        coverBoost +
        popularityBoost +
        criteriaMatchBoost,
    );

    return Math.round(finalConfidence * 100) / 100; // Round to 2 decimal places
  }
}
