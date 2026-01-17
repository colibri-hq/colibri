import { createHash, createHmac } from "node:crypto";
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
 * Regional endpoints for Amazon Product Advertising API
 */
const PAAPI_ENDPOINTS = {
  us: "webservices.amazon.com",
  uk: "webservices.amazon.co.uk",
  de: "webservices.amazon.de",
  fr: "webservices.amazon.fr",
  jp: "webservices.amazon.co.jp",
  ca: "webservices.amazon.ca",
  it: "webservices.amazon.it",
  es: "webservices.amazon.es",
  au: "webservices.amazon.com.au",
} as const;

type AmazonRegion = keyof typeof PAAPI_ENDPOINTS;

/**
 * Amazon PAAPI request interface
 */
interface PaapiRequest {
  PartnerTag: string;
  PartnerType: string;
  Resources: string[];
  SearchIndex?: string;
  Keywords?: string;
  ItemIds?: string[];
  ItemIdType?: string;
}

/**
 * Amazon PAAPI response interfaces
 */
interface PaapiItemInfo {
  Title?: { DisplayValue?: string };
  ByLineInfo?: { Contributors?: Array<{ Name?: string; Role?: string }> };
  ContentInfo?: {
    Languages?: { DisplayValues?: Array<{ DisplayValue?: string }> };
    PagesCount?: { DisplayValue?: number };
  };
  ProductInfo?: { ReleaseDate?: { DisplayValue?: string } };
  Classifications?: { Binding?: { DisplayValue?: string } };
}

interface PaapiItem {
  ASIN?: string;
  ItemInfo?: PaapiItemInfo;
  Images?: {
    Primary?: {
      Large?: { URL?: string; Width?: number; Height?: number };
      Medium?: { URL?: string; Width?: number; Height?: number };
    };
  };
}

interface PaapiSearchResponse {
  SearchResult?: { Items?: PaapiItem[] };
  ItemsResult?: { Items?: PaapiItem[] };
  Errors?: Array<{ Code?: string; Message?: string }>;
}

/**
 * Amazon Product Advertising API (PAAPI) metadata provider
 *
 * This provider integrates with Amazon's PAAPI to fetch book metadata.
 * It provides excellent coverage for retail-focused data including:
 * - High-quality cover images
 * - Customer ratings and reviews
 * - Retail-specific metadata (binding, edition info)
 * - Publication dates and publisher information
 *
 * Configuration Requirements:
 * - Amazon Partner Tag (Associate ID)
 * - AWS Access Key ID
 * - AWS Secret Access Key
 * - Region selection
 *
 * All credentials should be configured via instance settings.
 */
export class AmazonPaapiMetadataProvider extends RetryableMetadataProvider {
  readonly name = "Amazon";
  readonly priority = 90; // Highest priority - best retail data and cover images

  // Amazon PAAPI rate limiting - 1 request/second, scales with sales
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 60,
    windowMs: 60000, // 1 minute
    requestDelay: 1000, // 1 second between requests
  };

  readonly timeout: TimeoutConfig = {
    requestTimeout: 10000, // 10 seconds for API requests
    operationTimeout: 30000, // 30 seconds total
  };

  private readonly region: AmazonRegion;
  private readonly accessKey?: string | undefined;
  private readonly secretKey?: string | undefined;
  private readonly partnerTag?: string | undefined;

  /**
   * Resources to request from Amazon PAAPI
   */
  private readonly requestResources = [
    "ItemInfo.Title",
    "ItemInfo.ByLineInfo",
    "ItemInfo.ContentInfo",
    "ItemInfo.ProductInfo",
    "ItemInfo.Classifications",
    "Images.Primary.Large",
    "Images.Primary.Medium",
  ];

  constructor(
    config: {
      region?: AmazonRegion;
      accessKey?: string | undefined;
      secretKey?: string | undefined;
      partnerTag?: string | undefined;
    } = {},
    private readonly fetch: typeof globalThis.fetch = globalThis.fetch,
  ) {
    super();
    this.region = config.region || "us";
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.partnerTag = config.partnerTag;
  }

  /**
   * Search for metadata by title
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    if (!this.isConfigured()) {
      console.warn(
        `Amazon PAAPI provider is not configured. Please set access key, secret key, and partner tag via settings.`,
      );
      return [];
    }

    return this.executeWithRetry(async () => {
      const request: PaapiRequest = {
        PartnerTag: this.partnerTag!,
        PartnerType: "Associates",
        Keywords: query.title,
        SearchIndex: "Books",
        Resources: this.requestResources,
      };

      const response = await this.executeSearchItems(request);
      const items = response.SearchResult?.Items || [];

      return items
        .map((item) => this.createMetadataRecordFromItem(item, "title", query.title))
        .filter((record): record is MetadataRecord => record !== null);
    }, `title search for "${query.title}"`);
  }

  /**
   * Search for metadata by ISBN
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    if (!this.isConfigured()) {
      console.warn(
        `Amazon PAAPI provider is not configured. Please set access key, secret key, and partner tag via settings.`,
      );
      return [];
    }

    return this.executeWithRetry(async () => {
      const cleanIsbn = this.cleanIsbn(isbn);

      const request: PaapiRequest = {
        PartnerTag: this.partnerTag!,
        PartnerType: "Associates",
        ItemIds: [cleanIsbn],
        ItemIdType: "ISBN",
        Resources: this.requestResources,
      };

      const response = await this.executeGetItems(request);
      const items = response.ItemsResult?.Items || [];

      return items
        .map((item) => this.createMetadataRecordFromItem(item, "isbn", isbn))
        .filter((record): record is MetadataRecord => record !== null);
    }, `ISBN search for "${isbn}"`);
  }

  /**
   * Search for metadata by creator/author
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    if (!this.isConfigured()) {
      console.warn(
        `Amazon PAAPI provider is not configured. Please set access key, secret key, and partner tag via settings.`,
      );
      return [];
    }

    return this.executeWithRetry(async () => {
      // Combine author name with "author:" prefix for better results
      const keywords = `author:${query.name}`;

      const request: PaapiRequest = {
        PartnerTag: this.partnerTag!,
        PartnerType: "Associates",
        Keywords: keywords,
        SearchIndex: "Books",
        Resources: this.requestResources,
      };

      const response = await this.executeSearchItems(request);
      const items = response.SearchResult?.Items || [];

      return items
        .map((item) => this.createMetadataRecordFromItem(item, "creator", query.name))
        .filter((record): record is MetadataRecord => record !== null);
    }, `creator search for "${query.name}"`);
  }

  /**
   * Search using multiple criteria
   */
  async searchMultiCriteria(query: MultiCriteriaQuery): Promise<MetadataRecord[]> {
    // Strategy 1: ISBN search (most reliable)
    if (query.isbn) {
      return await this.searchByISBN(query.isbn);
    }

    // Strategy 2: Title + Author search
    if (query.title && query.authors && query.authors.length > 0) {
      if (!this.isConfigured()) {
        console.warn(
          `Amazon PAAPI provider is not configured. Please set access key, secret key, and partner tag via settings.`,
        );
        return [];
      }

      return this.executeWithRetry(async () => {
        const keywords = `${query.title} ${query.authors![0]}`;

        const request: PaapiRequest = {
          PartnerTag: this.partnerTag!,
          PartnerType: "Associates",
          Keywords: keywords,
          SearchIndex: "Books",
          Resources: this.requestResources,
        };

        const response = await this.executeSearchItems(request);
        const items = response.SearchResult?.Items || [];

        return items
          .map((item) => this.createMetadataRecordFromItem(item, "multi", keywords))
          .filter((record): record is MetadataRecord => record !== null);
      }, `multi-criteria search`);
    }

    // Strategy 3: Title search
    if (query.title) {
      return await this.searchByTitle({ title: query.title, exactMatch: !query.fuzzy });
    }

    // Strategy 4: Author search
    if (query.authors && query.authors.length > 0) {
      return await this.searchByCreator({ name: query.authors[0], fuzzy: query.fuzzy ?? false });
    }

    return [];
  }

  /**
   * Get reliability scores for Amazon data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    // Amazon has excellent reliability for retail-focused metadata
    const amazonScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.95,
      [MetadataType.AUTHORS]: 0.92,
      [MetadataType.ISBN]: 0.98, // ASIN/ISBN mapping is very reliable
      [MetadataType.PUBLICATION_DATE]: 0.9,
      [MetadataType.SUBJECTS]: 0.7, // Amazon doesn't provide this
      [MetadataType.DESCRIPTION]: 0.85, // Could be added if needed
      [MetadataType.LANGUAGE]: 0.9,
      [MetadataType.PUBLISHER]: 0.85, // Could be added if needed
      [MetadataType.SERIES]: 0.8, // Could be added if needed
      [MetadataType.EDITION]: 0.85, // Binding info
      [MetadataType.PAGE_COUNT]: 0.92,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.7, // Could be added if needed
      [MetadataType.COVER_IMAGE]: 0.98, // Amazon has excellent cover images
    };

    return amazonScores[dataType] ?? 0.7;
  }

  /**
   * Check if Amazon supports a specific metadata type
   */
  supportsDataType(dataType: MetadataType): boolean {
    const supportedTypes = [
      MetadataType.TITLE,
      MetadataType.AUTHORS,
      MetadataType.ISBN,
      MetadataType.PUBLICATION_DATE,
      MetadataType.LANGUAGE,
      MetadataType.PAGE_COUNT,
      MetadataType.COVER_IMAGE,
      MetadataType.EDITION,
    ];

    return supportedTypes.includes(dataType);
  }

  /**
   * Override isRetryableError to add Amazon-specific error detection
   */
  protected override isRetryableError(error: Error): boolean {
    // Check base class errors first
    if (super.isRetryableError(error)) {
      return true;
    }

    // Amazon throttling errors
    const message = error.message.toLowerCase();
    if (message.includes("throttl") || message.includes("toomanyrequests")) {
      return true;
    }

    return false;
  }

  /**
   * Check if provider is properly configured
   */
  private isConfigured(): boolean {
    return !!(this.accessKey && this.secretKey && this.partnerTag);
  }

  /**
   * Execute SearchItems API call
   */
  private async executeSearchItems(request: PaapiRequest): Promise<PaapiSearchResponse> {
    const endpoint = PAAPI_ENDPOINTS[this.region];
    const path = "/paapi5/searchitems";
    const url = `https://${endpoint}${path}`;

    const response = await this.executeSignedRequest(url, path, request);
    return response;
  }

  /**
   * Execute GetItems API call
   */
  private async executeGetItems(request: PaapiRequest): Promise<PaapiSearchResponse> {
    const endpoint = PAAPI_ENDPOINTS[this.region];
    const path = "/paapi5/getitems";
    const url = `https://${endpoint}${path}`;

    const response = await this.executeSignedRequest(url, path, request);
    return response;
  }

  /**
   * Execute a signed API request using AWS Signature V4
   */
  private async executeSignedRequest(
    url: string,
    path: string,
    request: PaapiRequest,
  ): Promise<PaapiSearchResponse> {
    const endpoint = PAAPI_ENDPOINTS[this.region];
    const requestBody = JSON.stringify(request);

    // Generate timestamp
    const now = new Date();
    const amzDate = this.formatAmzDate(now);
    const dateStamp = this.formatDateStamp(now);

    // Create canonical request
    const canonicalHeaders = [
      `content-type:application/json; charset=utf-8`,
      `host:${endpoint}`,
      `x-amz-date:${amzDate}`,
      `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${path.includes("searchitems") ? "SearchItems" : "GetItems"}`,
    ].join("\n");

    const signedHeaders = "content-type;host;x-amz-date;x-amz-target";

    const payloadHash = createHash("sha256").update(requestBody).digest("hex");

    const canonicalRequest = [
      "POST",
      path,
      "", // query string (empty for POST)
      canonicalHeaders,
      "", // blank line
      signedHeaders,
      payloadHash,
    ].join("\n");

    // Create string to sign
    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${this.region}/ProductAdvertisingAPI/aws4_request`;
    const canonicalRequestHash = createHash("sha256").update(canonicalRequest).digest("hex");

    const stringToSign = [algorithm, amzDate, credentialScope, canonicalRequestHash].join("\n");

    // Calculate signature
    const signature = this.calculateSignature(this.secretKey!, dateStamp, stringToSign);

    // Create authorization header
    const authorization = `${algorithm} Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Make the request
    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Host: endpoint,
        "X-Amz-Date": amzDate,
        "X-Amz-Target": `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${path.includes("searchitems") ? "SearchItems" : "GetItems"}`,
        Authorization: authorization,
        "User-Agent": this.userAgent,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Amazon PAAPI request failed: ${response.status} ${response.statusText} - ${errorText}`,
        { cause: { status: response.status, body: errorText } },
      );
    }

    const data = (await response.json()) as PaapiSearchResponse;

    // Check for API errors
    if (data.Errors && data.Errors.length > 0) {
      const error = data.Errors[0];
      throw new Error(`Amazon PAAPI error: ${error.Code} - ${error.Message}`, {
        cause: data.Errors,
      });
    }

    return data;
  }

  /**
   * Format date for X-Amz-Date header (ISO 8601 format: YYYYMMDDTHHMMSSZ)
   */
  private formatAmzDate(date: Date): string {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  }

  /**
   * Format date stamp for credential scope (YYYYMMDD)
   */
  private formatDateStamp(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
  }

  /**
   * Calculate AWS Signature V4 signature
   */
  private calculateSignature(secretKey: string, dateStamp: string, stringToSign: string): string {
    const kDate = createHmac("sha256", `AWS4${secretKey}`).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(this.region).digest();
    const kService = createHmac("sha256", kRegion).update("ProductAdvertisingAPI").digest();
    const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
    const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    return signature;
  }

  /**
   * Create MetadataRecord from Amazon PAAPI item
   */
  private createMetadataRecordFromItem(
    item: PaapiItem,
    searchType: string,
    searchTerm: string,
  ): MetadataRecord | null {
    if (!item.ASIN || !item.ItemInfo?.Title?.DisplayValue) {
      return null;
    }

    const itemInfo = item.ItemInfo;

    // Extract authors
    const authors = itemInfo.ByLineInfo?.Contributors?.filter((c) => c.Role === "Author").map(
      (c) => c.Name!,
    );

    // Extract publication date
    let publicationDate: Date | undefined;
    if (itemInfo.ProductInfo?.ReleaseDate?.DisplayValue) {
      const parsed = new Date(itemInfo.ProductInfo.ReleaseDate.DisplayValue);
      if (!isNaN(parsed.getTime())) {
        publicationDate = parsed;
      }
    }

    // Extract page count
    let pageCount: number | undefined;
    if (itemInfo.ContentInfo?.PagesCount?.DisplayValue) {
      pageCount = itemInfo.ContentInfo.PagesCount.DisplayValue;
    }

    // Extract language
    const language = itemInfo.ContentInfo?.Languages?.DisplayValues?.[0]?.DisplayValue;

    // Extract cover image (prefer Large, fallback to Medium)
    let coverImage: { url: string; width?: number; height?: number } | undefined;
    if (item.Images?.Primary?.Large?.URL) {
      const large = item.Images.Primary.Large;
      const imageUrl = large.URL;
      if (imageUrl) {
        coverImage = {
          url: imageUrl,
          ...(large.Width !== undefined && { width: large.Width }),
          ...(large.Height !== undefined && { height: large.Height }),
        };
      }
    } else if (item.Images?.Primary?.Medium?.URL) {
      const medium = item.Images.Primary.Medium;
      const imageUrl = medium.URL;
      if (imageUrl) {
        coverImage = {
          url: imageUrl,
          ...(medium.Width !== undefined && { width: medium.Width }),
          ...(medium.Height !== undefined && { height: medium.Height }),
        };
      }
    }

    // Extract binding/format
    const binding = itemInfo.Classifications?.Binding?.DisplayValue;

    const metadata: Partial<Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">> = {
      providerData: {
        asin: item.ASIN,
        region: this.region,
        binding: binding ?? undefined,
        searchType,
        searchTerm,
      },
    };

    if (itemInfo.Title?.DisplayValue) {
      metadata.title = itemInfo.Title.DisplayValue;
    }
    if (authors && authors.length > 0) {
      metadata.authors = authors;
    }
    if (publicationDate !== undefined) {
      metadata.publicationDate = publicationDate;
    }
    const mappedLanguage = this.mapLanguageCode(language);
    if (mappedLanguage !== undefined) {
      metadata.language = mappedLanguage;
    }
    if (pageCount !== undefined) {
      metadata.pageCount = pageCount;
    }
    if (coverImage !== undefined) {
      metadata.coverImage = coverImage;
    }
    if (binding !== undefined) {
      metadata.edition = binding;
    }

    const record = this.createMetadataRecord(
      `amazon-${item.ASIN}-${Date.now()}`,
      metadata,
      this.calculateConfidence(item, searchType),
    );

    return record;
  }

  /**
   * Map Amazon language to ISO code
   */
  private mapLanguageCode(language?: string): string | undefined {
    if (!language) return undefined;

    const normalizedLanguage = language.toLowerCase();

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

    return languageMap[normalizedLanguage] || normalizedLanguage.substring(0, 2);
  }

  /**
   * Calculate confidence score based on data completeness and search type
   */
  private calculateConfidence(item: PaapiItem, searchType: string): number {
    let baseConfidence = 0.8; // Amazon data is generally high quality

    // Adjust base confidence by search type
    switch (searchType) {
      case "isbn":
        baseConfidence = 0.95; // ISBN/ASIN matches are very reliable
        break;
      case "title":
        baseConfidence = 0.8;
        break;
      case "creator":
        baseConfidence = 0.75;
        break;
      case "multi":
        baseConfidence = 0.85;
        break;
    }

    // Boost for data completeness
    let completenessBoost = 0;
    if (item.ItemInfo?.Title?.DisplayValue) completenessBoost += 0.02;
    if (item.ItemInfo?.ByLineInfo?.Contributors && item.ItemInfo.ByLineInfo.Contributors.length > 0)
      completenessBoost += 0.03;
    if (item.ItemInfo?.ProductInfo?.ReleaseDate?.DisplayValue) completenessBoost += 0.02;
    if (item.ItemInfo?.ContentInfo?.PagesCount?.DisplayValue) completenessBoost += 0.02;
    if (item.ItemInfo?.ContentInfo?.Languages?.DisplayValues) completenessBoost += 0.01;
    if (item.Images?.Primary?.Large || item.Images?.Primary?.Medium) completenessBoost += 0.03;

    const finalConfidence = Math.min(0.98, baseConfidence + completenessBoost);
    return Math.round(finalConfidence * 100) / 100;
  }
}
