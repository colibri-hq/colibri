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
 * WikiData SPARQL query response interfaces
 */
interface WikiDataBinding {
  type: "uri" | "literal";
  value: string;
  "xml:lang"?: string;
  datatype?: string;
}

interface WikiDataResult {
  [key: string]: WikiDataBinding;
}

interface WikiDataResponse {
  head: { vars: string[] };
  results: { bindings: WikiDataResult[] };
}

/**
 * WikiData metadata provider using SPARQL queries with exact matching optimization
 *
 * This provider uses exact matching instead of fuzzy matching for optimal performance:
 *
 * Performance Benefits of Exact Matching:
 * - Significantly faster query execution (typically 2-5x faster than CONTAINS() queries)
 * - Reduced server load on WikiData's public SPARQL endpoint
 * - More predictable query performance and timeout behavior
 * - Better cache utilization on WikiData's infrastructure
 *
 * SPARQL Query Optimization Strategies:
 * 1. Exact Label Matching: Uses direct rdfs:label matching (?book rdfs:label "Title"@en)
 *    instead of CONTAINS(LCASE(?title), LCASE("search")) for performance
 * 2. Early Type Filtering: Filters by literary work classification (wdt:P31 wd:Q7725634)
 *    early in the query to reduce the working set
 * 3. Optimal Query Pattern Order: Places the most selective patterns first to enable
 *    efficient query planning by the SPARQL engine
 * 4. Result Limiting: Uses LIMIT clauses to prevent large result sets and timeouts
 * 5. Language Filtering: Filters by English language early to reduce processing overhead
 * 6. Optional Property Grouping: Groups OPTIONAL clauses efficiently to minimize joins
 *
 * Trade-offs:
 * - Exact matching may miss some results that fuzzy matching would find
 * - Users need to provide more precise search terms
 * - Better suited for known titles/authors rather than exploratory searches
 *
 * The performance benefits significantly outweigh the trade-offs for a metadata provider
 * that needs to be reliable and responsive, especially when integrated with other
 * providers that can handle fuzzy matching scenarios.
 */
export class WikiDataMetadataProvider extends RetryableMetadataProvider {
  readonly name = "WikiData";
  readonly priority = 85; // Higher priority than OpenLibrary due to data quality

  // WikiData SPARQL endpoint rate limiting - be respectful
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 60, // Conservative rate limit
    windowMs: 60000, // 1 minute
    requestDelay: 1000, // 1 second between requests
  };

  readonly timeout: TimeoutConfig = {
    requestTimeout: 20000, // 20 seconds for SPARQL queries
    operationTimeout: 60000, // 60 seconds total
  };

  private readonly sparqlEndpoint = "https://query.wikidata.org/sparql";

  constructor(private readonly fetch: typeof globalThis.fetch = globalThis.fetch) {
    super();
  }

  /**
   * Search for metadata by title
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    const sparqlQuery = this.buildTitleSearchQuery(query.title, query.exactMatch);
    const response = await this.executeQuery(sparqlQuery, `title search for "${query.title}"`);

    return this.processSearchResults(response, "title");
  }

  /**
   * Search for metadata by ISBN
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    const cleanedIsbn = cleanIsbn(isbn);
    const sparqlQuery = this.buildISBNSearchQuery(cleanedIsbn);
    const response = await this.executeQuery(sparqlQuery, `ISBN search for "${isbn}"`);

    return this.processSearchResults(response, "isbn");
  }

  /**
   * Search for metadata by creator/author
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    const sparqlQuery = this.buildAuthorSearchQuery(query.name);
    const response = await this.executeQuery(sparqlQuery, `author search for "${query.name}"`);

    return this.processSearchResults(response, "author");
  }

  /**
   * Search using multiple criteria
   */
  async searchMultiCriteria(query: MultiCriteriaQuery): Promise<MetadataRecord[]> {
    // For multi-criteria, prioritize ISBN > title > author
    if (query.isbn) {
      return await this.searchByISBN(query.isbn);
    }

    if (query.title) {
      return await this.searchByTitle({ title: query.title, exactMatch: !query.fuzzy });
    }

    if (query.authors && query.authors.length > 0) {
      return await this.searchByCreator({ name: query.authors[0], fuzzy: query.fuzzy ?? false });
    }

    return [];
  }

  /**
   * Get reliability scores for WikiData data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    // WikiData has excellent reliability for structured data
    const wikidataScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.92,
      [MetadataType.AUTHORS]: 0.95,
      [MetadataType.ISBN]: 0.98,
      [MetadataType.PUBLICATION_DATE]: 0.9,
      [MetadataType.SUBJECTS]: 0.85,
      [MetadataType.DESCRIPTION]: 0.75,
      [MetadataType.LANGUAGE]: 0.95,
      [MetadataType.PUBLISHER]: 0.88,
      [MetadataType.SERIES]: 0.8,
      [MetadataType.EDITION]: 0.7,
      [MetadataType.PAGE_COUNT]: 0.85,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.6,
      [MetadataType.COVER_IMAGE]: 0.3, // WikiData doesn't typically have cover images
    };

    return wikidataScores[dataType] ?? 0.7;
  }

  /**
   * Check if WikiData supports a specific metadata type
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
    ];

    return supportedTypes.includes(dataType);
  }

  /**
   * Execute SPARQL query with retry logic
   */
  private async executeQuery(query: string, operationName: string): Promise<WikiDataResponse> {
    const result = await this.executeWithRetry(async () => {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.sparqlEndpoint}?query=${encodedQuery}&format=json`;

      const response = await this.fetch(url, {
        method: "GET",
        headers: { Accept: "application/sparql-results+json", "User-Agent": this.userAgent },
      });

      if (!response.ok) {
        throw new Error(`WikiData SPARQL query failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as WikiDataResponse;
    }, operationName);

    // If executeWithRetry returned empty array (failure case), return empty response structure
    if (Array.isArray(result) && result.length === 0) {
      return { head: { vars: [] }, results: { bindings: [] } };
    }

    return result as WikiDataResponse;
  }

  /**
   * Build SPARQL query for title search using exact matching for optimal performance
   *
   * Performance optimizations:
   * - Uses exact label matching (?book rdfs:label "Title"@en) instead of CONTAINS() for better query performance
   * - Filters by literary work classification (wdt:P31 wd:Q7725634) early in the query for efficient execution
   * - Places exact label match first in the query pattern for optimal query planning
   * - Limits results to prevent timeouts on large result sets
   */
  private buildTitleSearchQuery(title: string, _exactMatch?: boolean): string {
    // Escape quotes in the title to prevent SPARQL injection
    const escapedTitle = title.replace(/"/g, '\\"');

    return `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>

      SELECT DISTINCT ?book ?title ?author ?authorLabel ?isbn ?publishDate ?publisher ?publisherLabel WHERE {
        ?book rdfs:label "${escapedTitle}"@en .
        ?book wdt:P31 wd:Q7725634 .
        ?book rdfs:label ?title .
        FILTER(LANG(?title) = "en")

        OPTIONAL { ?book wdt:P50 ?author . }
        OPTIONAL { ?book wdt:P957 ?isbn . }
        OPTIONAL { ?book wdt:P577 ?publishDate . }
        OPTIONAL { ?book wdt:P123 ?publisher . }

        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
      }
      LIMIT 10
    `;
  }

  /**
   * Build SPARQL query for ISBN search
   */
  private buildISBNSearchQuery(isbn: string): string {
    return `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>

      SELECT DISTINCT ?book ?title ?author ?authorLabel ?isbn ?publishDate ?publisher ?publisherLabel WHERE {
        ?book wdt:P31 wd:Q7725634 .
        ?book wdt:P957 ?isbn .
        FILTER(?isbn = "${isbn}")

        ?book rdfs:label ?title .
        FILTER(LANG(?title) = "en")

        OPTIONAL { ?book wdt:P50 ?author . }
        OPTIONAL { ?book wdt:P577 ?publishDate . }
        OPTIONAL { ?book wdt:P123 ?publisher . }

        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
      }
      LIMIT 5
    `;
  }

  /**
   * Build SPARQL query for author search using exact matching for optimal performance
   *
   * Performance optimizations:
   * - Uses exact author name matching (?author rdfs:label "Author"@en) instead of CONTAINS() for better performance
   * - Filters by literary work classification (wdt:P31 wd:Q7725634) early in the query
   * - Places exact author match first in the query pattern for optimal query planning
   * - Limits results to prevent timeouts on large result sets
   */
  private buildAuthorSearchQuery(authorName: string): string {
    const escapedAuthor = authorName.replace(/"/g, '\\"');

    return `
      PREFIX wd: <http://www.wikidata.org/entity/>
      PREFIX wdt: <http://www.wikidata.org/prop/direct/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX wikibase: <http://wikiba.se/ontology#>
      PREFIX bd: <http://www.bigdata.com/rdf#>

      SELECT DISTINCT ?book ?title ?author ?authorLabel ?isbn ?publishDate ?publisher ?publisherLabel WHERE {
        ?book wdt:P31 wd:Q7725634 .
        ?book wdt:P50 ?author .
        ?author rdfs:label "${escapedAuthor}"@en .

        ?book rdfs:label ?title .
        FILTER(LANG(?title) = "en")

        OPTIONAL { ?book wdt:P957 ?isbn . }
        OPTIONAL { ?book wdt:P577 ?publishDate . }
        OPTIONAL { ?book wdt:P123 ?publisher . }

        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
      }
      LIMIT 10
    `;
  }

  /**
   * Process SPARQL query results into MetadataRecord objects
   */
  private processSearchResults(response: WikiDataResponse, searchType: string): MetadataRecord[] {
    if (!response.results.bindings.length) {
      return [];
    }

    // Group results by book URI to handle multiple authors/ISBNs per book
    const bookGroups = new Map<string, WikiDataResult[]>();

    for (const binding of response.results.bindings) {
      const bookUri = binding.book?.value;
      if (!bookUri) continue;

      if (!bookGroups.has(bookUri)) {
        bookGroups.set(bookUri, []);
      }
      bookGroups.get(bookUri)!.push(binding);
    }

    const records: MetadataRecord[] = [];

    for (const [bookUri, bindings] of bookGroups) {
      const record = this.createMetadataRecordFromBindings(bookUri, bindings, searchType);
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  /**
   * Create MetadataRecord from WikiData SPARQL bindings
   */
  private createMetadataRecordFromBindings(
    bookUri: string,
    bindings: WikiDataResult[],
    searchType: string,
  ): MetadataRecord | null {
    const firstBinding = bindings[0];
    if (!firstBinding.title?.value) return null;

    // Extract unique authors
    const authors = [...new Set(bindings.map((b) => b.authorLabel?.value).filter(Boolean))];

    // Extract unique ISBNs
    const isbns = [...new Set(bindings.map((b) => b.isbn?.value).filter(Boolean))];

    // Parse publication date
    let publicationDate: Date | undefined;
    if (firstBinding.publishDate?.value) {
      const dateStr = firstBinding.publishDate.value;
      // Handle various date formats from WikiData
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parsed = new Date(dateStr);
        // Only accept valid dates
        if (!isNaN(parsed.getTime())) {
          publicationDate = parsed;
        }
      } else if (dateStr.match(/^\d{4}$/)) {
        // Year-only format - must be exactly 4 digits
        const year = parseInt(dateStr);
        if (!isNaN(year) && year > 0 && year < 3000) {
          publicationDate = new Date(year, 0, 1);
        }
      }
    }

    // Parse page count
    let pageCount: number | undefined;
    if (firstBinding.pages?.value) {
      const pages = parseInt(firstBinding.pages.value);
      if (!isNaN(pages) && pages > 0) {
        pageCount = pages;
      }
    }

    // Extract WikiData entity ID for provider data
    const wikidataId = bookUri.split("/").pop();

    const record = this.createMetadataRecord(
      `wikidata-${wikidataId}-${Date.now()}`,
      {
        title: firstBinding.title.value,
        authors: authors.length > 0 ? authors : undefined,
        isbn: isbns.length > 0 ? isbns : undefined,
        publicationDate,
        publisher: firstBinding.publisherLabel?.value,
        language: this.mapLanguageCode(firstBinding.languageLabel?.value),
        pageCount,
        description: firstBinding.description?.value,
        providerData: { wikidataUri: bookUri, wikidataId, searchType },
      } as Partial<Omit<MetadataRecord, "id" | "source" | "timestamp">>,
      this.calculateConfidence(firstBinding, searchType, authors.length, isbns.length),
    );

    return record;
  }

  /**
   * Map WikiData language labels to ISO language codes (case-insensitive)
   */
  private mapLanguageCode(languageLabel?: string): string | undefined {
    if (!languageLabel) return undefined;

    // Normalize to lowercase for case-insensitive matching
    const normalizedLabel = languageLabel.toLowerCase();

    const languageMap: Record<string, string> = {
      english: "en",
      german: "de",
      french: "fr",
      spanish: "es",
      italian: "it",
      portuguese: "pt",
      dutch: "nl",
      russian: "ru",
      japanese: "ja",
      chinese: "zh",
      korean: "ko",
      arabic: "ar",
    };

    return languageMap[normalizedLabel] || normalizedLabel.substring(0, 2);
  }

  /**
   * Calculate confidence score based on data completeness and search type
   */
  private calculateConfidence(
    binding: WikiDataResult,
    searchType: string,
    authorCount: number,
    isbnCount: number,
  ): number {
    let baseConfidence = 0.75; // WikiData generally has good quality data

    // Boost confidence based on search type
    switch (searchType) {
      case "isbn":
        baseConfidence = 0.9; // ISBN searches are very reliable
        break;
      case "title":
        baseConfidence = 0.75;
        break;
      case "author":
        baseConfidence = 0.7;
        break;
    }

    // Boost for data completeness
    let completenessBoost = 0;
    if (binding.title?.value) completenessBoost += 0.02;
    if (authorCount > 0) completenessBoost += 0.03;
    if (isbnCount > 0) completenessBoost += 0.05;
    if (binding.publishDate?.value) completenessBoost += 0.03;
    if (binding.publisherLabel?.value) completenessBoost += 0.02;
    if (binding.languageLabel?.value) completenessBoost += 0.02;
    if (binding.pages?.value) completenessBoost += 0.02;
    if (binding.description?.value) completenessBoost += 0.01;

    // WikiData quality bonus
    const wikidataBonus = 0.05; // WikiData is curated and structured

    const finalConfidence = Math.min(0.92, baseConfidence + completenessBoost + wikidataBonus);
    return Math.round(finalConfidence * 100) / 100;
  }
}
