/**
 * British National Bibliography (BNB) metadata provider
 *
 * The British Library's bibliographic data service provides high-quality
 * metadata for UK publications via a Linked Data SPARQL endpoint.
 *
 * API Details:
 * - SPARQL endpoint: https://bnb.data.bl.uk/sparql
 * - Protocol: SPARQL 1.1
 * - Rate limit: 60 requests/minute (polite limit)
 * - No authentication required
 *
 * Strengths:
 * - UK legal deposit library: all UK publications
 * - High-quality, authoritative metadata
 * - Linked Data format with rich relationships
 * - Dewey Decimal Classification
 *
 * Data returned:
 * - Title, author, ISBN
 * - Publisher, publication date
 * - DDC classification
 * - British Library identifiers
 * - Language (primarily English publications)
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
 * SPARQL query result types
 */
interface SparqlBinding {
  type: "uri" | "literal";
  value: string;
  "xml:lang"?: string;
  datatype?: string;
}

interface SparqlResult {
  [key: string]: SparqlBinding;
}

interface SparqlResponse {
  head: {
    vars: string[];
  };
  results: {
    bindings: SparqlResult[];
  };
}

/**
 * British National Bibliography metadata provider
 */
export class BNBMetadataProvider extends RetryableMetadataProvider {
  readonly name = "BNB";
  readonly priority = 75; // High priority for UK books

  // Polite rate limiting for public SPARQL endpoint
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 30, // Conservative for SPARQL
    windowMs: 60000, // 1 minute
    requestDelay: 1000, // 1 second between queries
  };

  readonly timeout: TimeoutConfig = {
    requestTimeout: 20000, // 20 seconds (SPARQL can be slow)
    operationTimeout: 60000, // 60 seconds
  };

  private readonly sparqlEndpoint = "https://bnb.data.bl.uk/sparql";

  constructor(
    private readonly fetch: typeof globalThis.fetch = globalThis.fetch,
  ) {
    super();
  }

  /**
   * Search by title
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    const escapedTitle = this.escapeSparql(query.title);
    const filter = query.exactMatch
      ? `?book dct:title "${escapedTitle}"@en .`
      : `?book dct:title ?t . FILTER(CONTAINS(LCASE(?t), LCASE("${escapedTitle}")))`;

    const sparqlQuery = this.buildBookQuery(filter, "title");
    const response = await this.executeSparqlQuery(
      sparqlQuery,
      `title search for "${query.title}"`,
    );

    return this.processSparqlResults(response, "title");
  }

  /**
   * Search by ISBN
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    const cleanedIsbn = cleanIsbn(isbn);
    const filter = `?book bibo:isbn "${cleanedIsbn}" .`;

    const sparqlQuery = this.buildBookQuery(filter, "isbn");
    const response = await this.executeSparqlQuery(
      sparqlQuery,
      `ISBN search for "${isbn}"`,
    );

    return this.processSparqlResults(response, "isbn");
  }

  /**
   * Search by creator/author
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    const escapedName = this.escapeSparql(query.name);
    const filter = query.fuzzy
      ? `?book dct:creator ?c . ?c rdfs:label ?name . FILTER(CONTAINS(LCASE(?name), LCASE("${escapedName}")))`
      : `?book dct:creator ?c . ?c rdfs:label "${escapedName}"@en .`;

    const sparqlQuery = this.buildBookQuery(filter, "creator");
    const response = await this.executeSparqlQuery(
      sparqlQuery,
      `creator search for "${query.name}"`,
    );

    return this.processSparqlResults(response, "creator");
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

    const filters: string[] = [];

    if (query.title) {
      const escapedTitle = this.escapeSparql(query.title);
      filters.push(
        `?book dct:title ?t . FILTER(CONTAINS(LCASE(?t), LCASE("${escapedTitle}")))`,
      );
    }

    if (query.authors && query.authors.length > 0) {
      const escapedAuthor = this.escapeSparql(query.authors[0]);
      filters.push(
        `?book dct:creator ?c . ?c rdfs:label ?name . FILTER(CONTAINS(LCASE(?name), LCASE("${escapedAuthor}")))`,
      );
    }

    if (query.publisher) {
      const escapedPublisher = this.escapeSparql(query.publisher);
      filters.push(
        `?book dct:publisher ?p . ?p rdfs:label ?pname . FILTER(CONTAINS(LCASE(?pname), LCASE("${escapedPublisher}")))`,
      );
    }

    if (filters.length === 0) {
      return [];
    }

    const filter = filters.join("\n        ");
    const sparqlQuery = this.buildBookQuery(filter, "multi");
    const response = await this.executeSparqlQuery(
      sparqlQuery,
      "multi-criteria search",
    );

    return this.processSparqlResults(response, "multi");
  }

  /**
   * Get reliability scores for BNB data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    const bnbScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.95,
      [MetadataType.AUTHORS]: 0.92,
      [MetadataType.ISBN]: 0.98,
      [MetadataType.PUBLICATION_DATE]: 0.88,
      [MetadataType.SUBJECTS]: 0.85, // DDC classification
      [MetadataType.DESCRIPTION]: 0.5, // Limited descriptions
      [MetadataType.LANGUAGE]: 0.95,
      [MetadataType.PUBLISHER]: 0.9,
      [MetadataType.SERIES]: 0.75,
      [MetadataType.EDITION]: 0.8,
      [MetadataType.PAGE_COUNT]: 0.85,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.6,
      [MetadataType.COVER_IMAGE]: 0.0, // BNB doesn't provide covers
    };

    return bnbScores[dataType] ?? 0.7;
  }

  /**
   * Check if BNB supports a specific metadata type
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
   * Execute SPARQL query
   */
  private async executeSparqlQuery(
    query: string,
    operationName: string,
  ): Promise<SparqlResponse> {
    const result = await this.executeWithRetry(async () => {
      const params = new URLSearchParams({
        query: query,
        format: "application/sparql-results+json",
      });

      const response = await this.fetch(
        `${this.sparqlEndpoint}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/sparql-results+json",
            "User-Agent": this.userAgent,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `BNB SPARQL query failed: ${response.status} ${response.statusText}`,
        );
      }

      return (await response.json()) as SparqlResponse;
    }, operationName);

    if (Array.isArray(result)) {
      return { head: { vars: [] }, results: { bindings: [] } };
    }

    return result;
  }

  /**
   * Build SPARQL query for book search
   */
  private buildBookQuery(
    filter: string,
    _searchType: string,
    limit: number = 10,
  ): string {
    // Use exact matching for performance (similar to WikiData optimization)
    return `
      PREFIX bibo: <http://purl.org/ontology/bibo/>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX schema: <http://schema.org/>
      PREFIX bnb: <http://bnb.data.bl.uk/id/resource/>
      PREFIX blterms: <http://www.bl.uk/schemas/bibliographic/blterms#>

      SELECT DISTINCT ?book ?title ?author ?isbn ?publisher ?date ?language ?ddc ?pages ?blId
      WHERE {
        ?book a bibo:Book .
        ${filter}

        OPTIONAL { ?book dct:title ?title }
        OPTIONAL {
          ?book dct:creator ?creatorUri .
          ?creatorUri rdfs:label ?author .
        }
        OPTIONAL { ?book bibo:isbn ?isbn }
        OPTIONAL {
          ?book dct:publisher ?pubUri .
          ?pubUri rdfs:label ?publisher .
        }
        OPTIONAL { ?book dct:created ?date }
        OPTIONAL { ?book dct:language ?langUri }
        OPTIONAL { ?book blterms:ddc ?ddc }
        OPTIONAL { ?book bibo:numPages ?pages }
        OPTIONAL { ?book blterms:bnb ?blId }

        BIND(STR(COALESCE(?langUri, "")) AS ?language)
      }
      LIMIT ${limit}
    `;
  }

  /**
   * Process SPARQL results into MetadataRecords
   */
  private processSparqlResults(
    response: SparqlResponse,
    searchType: string,
  ): MetadataRecord[] {
    const bindings = response.results.bindings;
    if (!bindings || bindings.length === 0) {
      return [];
    }

    // Group by book URI to handle multiple values
    const booksMap = new Map<
      string,
      {
        title?: string;
        authors: Set<string>;
        isbns: Set<string>;
        publisher?: string;
        date?: string;
        language?: string;
        ddc?: string;
        pages?: number;
        blId?: string;
      }
    >();

    for (const binding of bindings) {
      const bookUri = binding.book?.value;
      if (!bookUri) continue;

      let book = booksMap.get(bookUri);
      if (!book) {
        book = { authors: new Set(), isbns: new Set() };
        booksMap.set(bookUri, book);
      }

      if (binding.title?.value) book.title = binding.title.value;
      if (binding.author?.value) book.authors.add(binding.author.value);
      if (binding.isbn?.value) book.isbns.add(binding.isbn.value);
      if (binding.publisher?.value) book.publisher = binding.publisher.value;
      if (binding.date?.value) book.date = binding.date.value;
      if (binding.language?.value) book.language = binding.language.value;
      if (binding.ddc?.value) book.ddc = binding.ddc.value;
      if (binding.pages?.value) book.pages = parseInt(binding.pages.value);
      if (binding.blId?.value) book.blId = binding.blId.value;
    }

    // Convert to MetadataRecords
    const records: MetadataRecord[] = [];
    for (const [bookUri, book] of booksMap) {
      if (!book.title) continue;

      const id = this.extractIdFromUri(bookUri);
      const authors = Array.from(book.authors);
      const isbns = Array.from(book.isbns);

      records.push(
        this.createMetadataRecord(
          `bnb-${id}`,
          {
            title: book.title,
            authors: authors.length > 0 ? authors : [],
            isbn: isbns.length > 0 ? isbns : [],
            publisher: book.publisher,
            publicationDate: this.parseDate(book.date),
            language: this.normalizeLanguage(book.language),
            pageCount: book.pages,
            providerData: {
              bookUri,
              blId: book.blId,
              ddcClassification: book.ddc,
            },
          },
          this.calculateConfidence(searchType, book.title, authors, isbns),
        ),
      );
    }

    return records;
  }

  /**
   * Extract ID from URI
   */
  private extractIdFromUri(uri: string): string {
    const match = uri.match(/\/([^/]+)$/);
    return match ? match[1] : uri.replace(/[^a-zA-Z0-9]/g, "");
  }

  /**
   * Normalize language code/URI to ISO 639-1
   */
  private normalizeLanguage(lang?: string): string | undefined {
    if (!lang) return undefined;

    // Extract language code from URI if needed
    const match = lang.match(/\/([a-z]{2,3})(?:\/|$)/i);
    const code = match ? match[1].toLowerCase() : lang.toLowerCase();

    // Map ISO 639-2/B to ISO 639-1
    const languageMap: Record<string, string> = {
      eng: "en",
      fre: "fr",
      fra: "fr",
      ger: "de",
      deu: "de",
      spa: "es",
      ita: "it",
      por: "pt",
      rus: "ru",
      jpn: "ja",
      chi: "zh",
      zho: "zh",
      wel: "cy",
      cym: "cy",
      gla: "gd",
      gle: "ga",
    };

    if (code.length === 2) return code;
    return languageMap[code] || code;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    searchType: string,
    title: string,
    authors: string[],
    isbns: string[],
  ): number {
    let confidence = 0.7; // Base confidence

    if (searchType === "isbn") {
      confidence = 0.9;
    }

    if (isbns.length > 0) confidence += 0.05;
    if (authors.length > 0) confidence += 0.05;
    if (title.length > 10) confidence += 0.02;

    return Math.min(0.95, confidence);
  }

  /**
   * Escape special characters for SPARQL
   */
  private escapeSparql(value: string): string {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
  }
}
