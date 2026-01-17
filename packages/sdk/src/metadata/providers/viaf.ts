/**
 * VIAF (Virtual International Authority File) metadata provider
 *
 * VIAF aggregates authority records from national libraries worldwide,
 * providing a unified view of author/creator identifiers across different
 * bibliographic systems.
 *
 * API Details:
 * - SRU endpoint: https://viaf.org/viaf/search
 * - Protocol: SRU (Search/Retrieve via URL)
 * - Rate limit: ~10 requests/second (polite limit)
 * - No authentication required
 *
 * Strengths:
 * - Cross-links author identities across ~50+ national libraries
 * - Links to LC, BNF, DNB, NLA and other authority files
 * - ISNI integration
 * - Multiple name forms (alternate names, transliterations)
 *
 * Data returned:
 * - Author/creator names and variants
 * - Birth/death dates
 * - Linked identifiers (ISNI, LC NAF, etc.)
 * - Associated works
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

type Fetch = typeof globalThis.fetch;

/**
 * VIAF SRU response types (simplified for JSON format)
 */
interface VIAFSearchResponse {
  searchRetrieveResponse?: {
    numberOfRecords?: string;
    records?: Array<{ record: { recordData: VIAFRecord } }>;
  };
}

interface VIAFRecord {
  viafID?: string;
  nameType?: string;
  mainHeadings?: { data?: VIAFHeading[] };
  birthDate?: string;
  deathDate?: string;
  titles?: { work?: VIAFWork[] };
  sources?: { source?: Array<{ "@nsid"?: string; "#text"?: string }> };
  xLinks?: { xLink?: Array<{ "@type"?: string; "#text"?: string }> };
}

interface VIAFHeading {
  text?: string;
  sources?: { s?: string | string[] };
}

interface VIAFWork {
  title?: string;
  sources?: { s?: string | string[] };
}

/**
 * VIAF Metadata Provider
 *
 * VIAF is primarily focused on identifying creators/authors rather than
 * books themselves. This provider specializes in author/creator information
 * and can find books through creator searches.
 */
export class VIAFMetadataProvider extends RetryableMetadataProvider {
  readonly name = "VIAF";
  readonly priority = 75; // Good priority for creator information
  // VIAF rate limiting - be respectful to the service
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 50, // Conservative limit
    windowMs: 60000, // 1 minute
    requestDelay: 200, // 200ms between requests
  };
  readonly timeout: TimeoutConfig = {
    requestTimeout: 15000, // 15 seconds
    operationTimeout: 45000, // 45 seconds total
  };
  readonly #fetch: Fetch;
  private readonly sruEndpoint = "https://viaf.org/viaf/search";

  constructor(fetch: Fetch = globalThis.fetch) {
    super();
    this.#fetch = fetch;
  }

  /**
   * Get reliability scores for VIAF data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    // VIAF is excellent for creator information, limited for book metadata
    const viafScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.5, // Limited - only associated works
      [MetadataType.AUTHORS]: 0.95, // Excellent for authors/creators
      [MetadataType.ISBN]: 0.1, // Very limited ISBN data
      [MetadataType.PUBLICATION_DATE]: 0.3, // Some date information
      [MetadataType.SUBJECTS]: 0.4, // Limited subject data
      [MetadataType.DESCRIPTION]: 0.1, // Minimal descriptions
      [MetadataType.LANGUAGE]: 0.3, // Limited language information
      [MetadataType.PUBLISHER]: 0.1, // No publisher data
      [MetadataType.SERIES]: 0.1, // No series information
      [MetadataType.EDITION]: 0.1, // No edition information
      [MetadataType.PAGE_COUNT]: 0.0, // No page count data
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.0, // No physical data
      [MetadataType.COVER_IMAGE]: 0.0, // No cover images
    };

    return viafScores[dataType] ?? 0.2;
  }

  /**
   * Check if VIAF supports a specific metadata type
   */
  supportsDataType(dataType: MetadataType): boolean {
    const supportedTypes = [
      MetadataType.AUTHORS, // Primary strength
      MetadataType.TITLE, // Limited - associated works
      MetadataType.PUBLICATION_DATE, // Birth/death dates for authors
    ];

    return supportedTypes.includes(dataType);
  }

  /**
   * Search for metadata by title (limited in VIAF)
   *
   * VIAF is not primarily a book database, so title searches
   * find associated works linked to creators.
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      const cqlQuery = query.exactMatch
        ? `local.uniformTitleWorks = "${this.escapeCQL(query.title)}"`
        : `local.uniformTitleWorks all "${this.escapeCQL(query.title)}"`;

      const results = await this.#searchVIAF(cqlQuery);

      return results.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-title-${result.viafID || Date.now()}-${index}`,
          this.#mapVIAFRecordToMetadata(result),
          this.#calculateConfidence(result, "title"),
        ),
      );
    }, `title search for "${query.title}"`);
  }

  /**
   * Search for metadata by ISBN (very limited in VIAF)
   *
   * VIAF doesn't store ISBNs directly. This is a stub that returns
   * empty results - use other providers for ISBN lookups.
   */
  async searchByISBN(_isbn: string): Promise<MetadataRecord[]> {
    // VIAF doesn't support ISBN searches
    // Return empty array immediately without making a request
    return [];
  }

  /**
   * Search for metadata by creator (VIAF's primary strength)
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      let cqlQuery: string;

      if (query.fuzzy) {
        // Fuzzy search using personal names
        cqlQuery = `local.personalNames all "${this.escapeCQL(query.name)}"`;
      } else {
        // Exact search
        cqlQuery = `local.personalNames = "${this.escapeCQL(query.name)}"`;
      }

      const results = await this.#searchVIAF(cqlQuery);

      return results.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-creator-${result.viafID || Date.now()}-${index}`,
          this.#mapVIAFRecordToMetadata(result),
          this.#calculateConfidence(result, "creator"),
        ),
      );
    }, `creator search for "${query.name}"`);
  }

  /**
   * Search using multiple criteria
   */
  async searchMultiCriteria(query: MultiCriteriaQuery): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      const cqlParts: string[] = [];

      // Build CQL query from criteria
      if (query.authors && query.authors.length > 0) {
        // Use first author for search (VIAF's strength)
        const authorQuery = query.fuzzy
          ? `local.personalNames all "${this.escapeCQL(query.authors[0])}"`
          : `local.personalNames = "${this.escapeCQL(query.authors[0])}"`;
        cqlParts.push(authorQuery);
      }

      if (query.title) {
        const titleQuery = query.fuzzy
          ? `local.uniformTitleWorks all "${this.escapeCQL(query.title)}"`
          : `local.uniformTitleWorks = "${this.escapeCQL(query.title)}"`;
        cqlParts.push(titleQuery);
      }

      if (cqlParts.length === 0) {
        return []; // No valid search criteria for VIAF
      }

      // Combine with AND
      const cqlQuery = cqlParts.join(" and ");
      const results = await this.#searchVIAF(cqlQuery);

      return results.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-multi-${result.viafID || Date.now()}-${index}`,
          this.#mapVIAFRecordToMetadata(result),
          this.#calculateConfidence(result, "multi", query),
        ),
      );
    }, "multi-criteria search");
  }

  /**
   * Perform VIAF SRU search
   */
  async #searchVIAF(cqlQuery: string): Promise<VIAFRecord[]> {
    const params = new URLSearchParams({
      query: cqlQuery,
      maximumRecords: "10",
      startRecord: "1",
      sortKeys: "holdingscount",
      httpAccept: "application/json",
    });

    const url = `${this.sruEndpoint}?${params.toString()}`;

    const response = await this.#fetch(url, {
      headers: { Accept: "application/json", "User-Agent": this.userAgent },
    });

    if (!response.ok) {
      throw new Error(`VIAF API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as VIAFSearchResponse;

    const records = data.searchRetrieveResponse?.records;
    if (!records || records.length === 0) {
      return [];
    }

    return records.map((r) => r.record.recordData);
  }

  /**
   * Escape CQL special characters
   */
  private escapeCQL(value: string): string {
    // Escape double quotes and backslashes for CQL
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  /**
   * Map VIAF record to MetadataRecord format
   */
  #mapVIAFRecordToMetadata(
    result: VIAFRecord,
  ): Partial<Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">> {
    const metadata: Partial<Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">> =
      {};

    // Extract main name heading
    const mainHeading = result.mainHeadings?.data?.[0];
    if (mainHeading?.text) {
      metadata.authors = [mainHeading.text];
    }

    // Extract birth/death dates as publication date context
    if (result.birthDate || result.deathDate) {
      // Parse birth year for ordering purposes
      const birthYear = result.birthDate?.match(/(\d{4})/)?.[1];
      if (birthYear) {
        // Use birth year as a rough date reference
        metadata.publicationDate = new Date(parseInt(birthYear), 0, 1);
      }
    }

    // Extract associated works as titles
    if (result.titles?.work && result.titles.work.length > 0) {
      const firstWork = result.titles.work[0];
      if (firstWork.title) {
        metadata.title = firstWork.title;
      }
    }

    // Extract external identifiers
    const identifiers: Record<string, string> = {};

    if (result.viafID) {
      identifiers.viaf = result.viafID;
    }

    // Extract linked identifiers from sources
    if (result.sources?.source) {
      for (const source of result.sources.source) {
        if (source["@nsid"] && source["#text"]) {
          identifiers[source["@nsid"].toLowerCase()] = source["#text"];
        }
      }
    }

    // Extract ISNI and other cross-links
    if (result.xLinks?.xLink) {
      for (const link of result.xLinks.xLink) {
        if (link["@type"] === "ISNI" && link["#text"]) {
          identifiers.isni = link["#text"];
        }
      }
    }

    // Store VIAF-specific data
    metadata.providerData = {
      viafID: result.viafID,
      nameType: result.nameType,
      birthDate: result.birthDate,
      deathDate: result.deathDate,
      identifiers,
      nameVariants: this.#extractNameVariants(result),
      associatedWorks: this.#extractAssociatedWorks(result),
    };

    return metadata;
  }

  /**
   * Extract name variants from VIAF record
   */
  #extractNameVariants(result: VIAFRecord): string[] {
    const variants: string[] = [];

    if (result.mainHeadings?.data) {
      for (const heading of result.mainHeadings.data) {
        if (heading.text && !variants.includes(heading.text)) {
          variants.push(heading.text);
        }
      }
    }

    return variants;
  }

  /**
   * Extract associated works from VIAF record
   */
  #extractAssociatedWorks(result: VIAFRecord): string[] {
    const works: string[] = [];

    if (result.titles?.work) {
      for (const work of result.titles.work) {
        if (work.title && !works.includes(work.title)) {
          works.push(work.title);
        }
      }
    }

    return works;
  }

  /**
   * Calculate confidence score based on search type and result quality
   */
  #calculateConfidence(
    result: VIAFRecord,
    searchType: "title" | "creator" | "multi",
    _query?: MultiCriteriaQuery,
  ): number {
    let baseConfidence = 0.6;

    // Adjust base confidence by search type
    switch (searchType) {
      case "creator":
        baseConfidence = 0.85; // VIAF's primary strength
        break;
      case "title":
        baseConfidence = 0.4; // Limited title support
        break;
      case "multi":
        baseConfidence = 0.6; // Multi-criteria can vary
        break;
    }

    // Boost confidence based on data completeness
    let completenessBoost = 0;

    if (result.viafID) completenessBoost += 0.05;
    if (result.mainHeadings?.data?.length) completenessBoost += 0.05;
    if (result.birthDate || result.deathDate) completenessBoost += 0.03;
    if (result.titles?.work?.length) completenessBoost += 0.02;
    if (result.sources?.source?.length) completenessBoost += 0.03;
    if (result.xLinks?.xLink?.length) completenessBoost += 0.02;

    // Calculate final confidence, capped at 0.95
    const finalConfidence = Math.min(0.95, baseConfidence + completenessBoost);

    return Math.round(finalConfidence * 100) / 100; // Round to 2 decimal places
  }
}

// Legacy exports for backwards compatibility (deprecated)
export { VIAFMetadataProvider as ViafMetadataProvider };
