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
 * ISNI API response interfaces
 */
interface ISNISearchResponse {
  responseHeader: {
    status: number;
    QTime: number;
  };
  response: {
    numFound: number;
    start: number;
    docs: ISNIRecord[];
  };
}

interface ISNIRecord {
  ISN: string;
  nameType: string;
  forename?: string;
  surname?: string;
  marcDate?: string;
  creationClass?: string;
  creationRole?: string;
  source?: string;
  externalInformation?: Array<{
    URI: string;
    information: string;
  }>;
  otherIdentifierOfWork?: Array<{
    type: string;
    value: string;
  }>;
  titleOfWork?: string[];
  languageOfWork?: string[];
  formOfWork?: string[];
  subjectOfWork?: string[];
}

/**
 * ISNI Metadata Provider
 *
 * ISNI (International Standard Name Identifier) is primarily focused on
 * identifying creators/authors rather than books themselves. This provider
 * specializes in author/creator information and can find books through
 * creator searches.
 */
export class ISNIMetadataProvider extends RetryableMetadataProvider {
  readonly name = "ISNI";
  readonly priority = 70; // Good priority for creator information
  // ISNI API rate limiting - be respectful to the service
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 50, // Conservative limit
    windowMs: 60000, // 1 minute
    requestDelay: 500, // 500ms between requests
  };
  readonly timeout: TimeoutConfig = {
    requestTimeout: 20000, // 20 seconds for ISNI
    operationTimeout: 60000, // 60 seconds total
  };
  readonly #fetch: Fetch;
  private readonly baseUrl = "https://isni.oclc.org/sru/";

  constructor(fetch: Fetch = globalThis.fetch) {
    super();
    this.#fetch = fetch;
  }

  /**
   * Get reliability scores for ISNI data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    // ISNI is excellent for creator information, limited for other metadata
    const isniScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.6, // Limited title information
      [MetadataType.AUTHORS]: 0.95, // Excellent for authors/creators
      [MetadataType.ISBN]: 0.3, // Very limited ISBN data
      [MetadataType.PUBLICATION_DATE]: 0.4, // Some date information
      [MetadataType.SUBJECTS]: 0.7, // Good subject classification
      [MetadataType.DESCRIPTION]: 0.2, // Minimal descriptions
      [MetadataType.LANGUAGE]: 0.6, // Some language information
      [MetadataType.PUBLISHER]: 0.3, // Limited publisher data
      [MetadataType.SERIES]: 0.2, // Minimal series information
      [MetadataType.EDITION]: 0.2, // No edition information
      [MetadataType.PAGE_COUNT]: 0.1, // No page count data
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.05, // No physical data
      [MetadataType.COVER_IMAGE]: 0.05, // No cover images
    };

    return isniScores[dataType] ?? 0.3;
  }

  /**
   * Check if ISNI supports a specific metadata type
   */
  supportsDataType(dataType: MetadataType): boolean {
    const supportedTypes = [
      MetadataType.AUTHORS, // Primary strength
      MetadataType.TITLE, // Limited support
      MetadataType.SUBJECTS, // Good support
      MetadataType.LANGUAGE, // Some support
      MetadataType.PUBLICATION_DATE, // Limited support
    ];

    return supportedTypes.includes(dataType);
  }

  /**
   * Search for metadata by title (limited in ISNI)
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      // ISNI searches work titles, not book titles specifically
      const searchQuery = query.exactMatch ? `"${query.title}"` : query.title;

      const results = await this.#searchISNI(`local.title="${searchQuery}"`);

      return results.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-title-${Date.now()}-${index}`,
          this.#mapISNIRecordToMetadata(result),
          this.#calculateConfidence(result, "title"),
        ),
      );
    }, `title search for "${query.title}"`);
  }

  /**
   * Search for metadata by ISBN (very limited in ISNI)
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      // Clean ISBN using shared utility
      const cleanedIsbn = cleanIsbn(isbn);

      // ISNI has very limited ISBN data, search by identifier
      const results = await this.#searchISNI(
        `local.otherIdentifierOfWork="${cleanedIsbn}"`,
      );

      return results.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-isbn-${cleanedIsbn}-${index}`,
          this.#mapISNIRecordToMetadata(result),
          this.#calculateConfidence(result, "isbn"),
        ),
      );
    }, `ISBN search for "${isbn}"`);
  }

  /**
   * Search for metadata by creator (ISNI's primary strength)
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      let searchQuery: string;

      if (query.fuzzy) {
        // Fuzzy search using personal name
        searchQuery = `local.personalName="${query.name}"`;
      } else {
        // Try to split name into forename and surname for exact search
        const nameParts = query.name.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          const forename = nameParts.slice(0, -1).join(" ");
          const surname = nameParts[nameParts.length - 1];
          searchQuery = `local.forename="${forename}" AND local.surname="${surname}"`;
        } else {
          searchQuery = `local.personalName="${query.name}"`;
        }
      }

      // Add role filter if specified
      if (query.role) {
        const roleMap: Record<string, string> = {
          author: "aut",
          editor: "edt",
          translator: "trl",
          illustrator: "ill",
        };
        const roleCode = roleMap[query.role];
        if (roleCode) {
          searchQuery += ` AND local.creationRole="${roleCode}"`;
        }
      }

      const results = await this.#searchISNI(searchQuery);

      return results.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-creator-${Date.now()}-${index}`,
          this.#mapISNIRecordToMetadata(result),
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
        const titleQuery = query.fuzzy ? query.title : `"${query.title}"`;
        searchParts.push(`local.title=${titleQuery}`);
      }

      if (query.authors && query.authors.length > 0) {
        // Use first author for search
        const authorQuery = query.fuzzy
          ? query.authors[0]
          : `"${query.authors[0]}"`;
        searchParts.push(`local.personalName=${authorQuery}`);
      }

      if (query.subjects && query.subjects.length > 0) {
        // Use first subject
        searchParts.push(`local.subjectOfWork="${query.subjects[0]}"`);
      }

      if (query.language) {
        searchParts.push(`local.languageOfWork="${query.language}"`);
      }

      // Combine search parts
      const searchQuery = searchParts.join(" AND ");

      if (!searchQuery) {
        return []; // No valid search criteria for ISNI
      }

      const results = await this.#searchISNI(searchQuery);

      return results.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-multi-${Date.now()}-${index}`,
          this.#mapISNIRecordToMetadata(result),
          this.#calculateConfidence(result, "multi", query),
        ),
      );
    }, `multi-criteria search`);
  }

  /**
   * Perform ISNI SRU search
   */
  async #searchISNI(query: string): Promise<ISNIRecord[]> {
    const params = new URLSearchParams({
      query: query,
      operation: "searchRetrieve",
      recordSchema: "isni-b",
      maximumRecords: "10",
      startRecord: "1",
    });

    const url = `${this.baseUrl}?${params.toString()}`;

    const response = await this.#fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "colibri-metadata-discovery/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(
        `ISNI API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as ISNISearchResponse;

    return data.response?.docs || [];
  }

  /**
   * Map ISNI record to MetadataRecord format
   */
  #mapISNIRecordToMetadata(
    result: ISNIRecord,
  ): Partial<
    Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">
  > {
    const metadata: Partial<
      Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">
    > = {};

    // Author information (ISNI's strength)
    if (result.forename && result.surname) {
      metadata.authors = [`${result.forename} ${result.surname}`];
    } else if (result.forename || result.surname) {
      metadata.authors = [result.forename || result.surname || ""];
    }

    // Title information (limited)
    if (result.titleOfWork && result.titleOfWork.length > 0) {
      metadata.title = result.titleOfWork[0];
    }

    // Language information
    if (result.languageOfWork && result.languageOfWork.length > 0) {
      metadata.language = result.languageOfWork[0];
    }

    // Subject information
    if (result.subjectOfWork && result.subjectOfWork.length > 0) {
      metadata.subjects = result.subjectOfWork;
    }

    // Publication date (from marcDate if available)
    if (result.marcDate) {
      try {
        // MARC dates can be in various formats, try to parse
        const year = result.marcDate.match(/(\d{4})/)?.[1];
        if (year) {
          metadata.publicationDate = new Date(parseInt(year), 0, 1);
        }
      } catch {
        // Ignore date parsing errors
      }
    }

    // Store ISNI-specific data
    metadata.providerData = {
      isni: result.ISN,
      nameType: result.nameType,
      creationClass: result.creationClass,
      creationRole: result.creationRole,
      source: result.source,
      externalInformation: result.externalInformation,
      otherIdentifiers: result.otherIdentifierOfWork,
      formOfWork: result.formOfWork,
    };

    return metadata;
  }

  /**
   * Calculate confidence score based on search type and result quality
   */
  #calculateConfidence(
    result: ISNIRecord,
    searchType: "title" | "isbn" | "creator" | "multi",
    _query?: MultiCriteriaQuery,
  ): number {
    let baseConfidence = 0.6;

    // Adjust base confidence by search type
    switch (searchType) {
      case "creator":
        baseConfidence = 0.9; // ISNI's primary strength
        break;
      case "title":
        baseConfidence = 0.5; // Limited title support
        break;
      case "isbn":
        baseConfidence = 0.3; // Very limited ISBN support
        break;
      case "multi":
        baseConfidence = 0.7; // Multi-criteria can be more precise
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

    checkField(result.forename);
    checkField(result.surname);
    checkField(result.titleOfWork);
    checkField(result.languageOfWork);
    checkField(result.subjectOfWork);
    checkField(result.marcDate);
    checkField(result.creationClass);
    checkField(result.creationRole);

    if (fieldCount > 0) {
      completenessBoost = (filledFields / fieldCount) * 0.2; // Up to 20% boost
    }

    // Boost confidence for verified ISNI records
    let verificationBoost = 0;
    if (result.ISN && result.ISN.length > 0) {
      verificationBoost += 0.1; // 10% boost for having ISNI
    }
    if (result.source && result.source.includes("verified")) {
      verificationBoost += 0.05; // 5% boost for verified sources
    }

    // For creator searches, boost confidence if name matches well
    let nameMatchBoost = 0;
    if (searchType === "creator" && result.forename && result.surname) {
      nameMatchBoost = 0.1; // 10% boost for complete name data
    }

    // Calculate final confidence, capped at 0.99 to allow for meaningful differences
    const finalConfidence = Math.min(
      0.99,
      baseConfidence + completenessBoost + verificationBoost + nameMatchBoost,
    );

    return Math.round(finalConfidence * 100) / 100; // Round to 2 decimal places
  }
}
