import type {
  BookMetadata,
  BookMetadataProvider,
  CreatorMetadata,
  CreatorMetadataProvider,
} from "../types.js";
import { type LoosePartial } from "@colibri-hq/shared";
import { Client } from "@colibri-hq/open-library-client";
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

// Import extracted utilities
import type {
  ConfidenceFactors,
  ConfidenceTier,
  NameComponents,
} from "./open-library/types.js";
import { calculateAggregatedConfidence } from "./open-library/confidence.js";
import {
  areNamesEquivalent,
  convertToFirstLastFormat,
  matchesWithInitials,
  normalizeAuthorName,
  normalizeNameForComparison,
  parseNameComponents,
} from "./open-library/name-utils.js";

type Fetch = typeof globalThis.fetch;

export class OpenLibraryMetadataProvider
  extends RetryableMetadataProvider
  implements BookMetadataProvider, CreatorMetadataProvider
{
  readonly name = "OpenLibrary";
  readonly priority = 80; // High priority for Open Library
  // Open Library specific rate limiting - be respectful
  readonly rateLimit: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    requestDelay: 200, // 200ms between requests
  };
  readonly timeout: TimeoutConfig = {
    requestTimeout: 15000, // 15 seconds for Open Library
    operationTimeout: 45000, // 45 seconds total
  };
  readonly #client: Client;

  constructor(fetch: Fetch = globalThis.fetch) {
    super();
    this.#client = new Client("colibri-metadata-discovery@example.com", {
      fetch,
    });
  }

  /**
   * Get reliability scores for Open Library data types
   */
  getReliabilityScore(dataType: MetadataType): number {
    // Open Library has strong reliability for certain data types
    const openLibraryScores: Record<MetadataType, number> = {
      [MetadataType.TITLE]: 0.95,
      [MetadataType.AUTHORS]: 0.9,
      [MetadataType.ISBN]: 0.95,
      [MetadataType.PUBLICATION_DATE]: 0.85,
      [MetadataType.SUBJECTS]: 0.8,
      [MetadataType.DESCRIPTION]: 0.7,
      [MetadataType.LANGUAGE]: 0.85,
      [MetadataType.PUBLISHER]: 0.8,
      [MetadataType.SERIES]: 0.6,
      [MetadataType.EDITION]: 0.75,
      [MetadataType.PAGE_COUNT]: 0.8,
      [MetadataType.PHYSICAL_DIMENSIONS]: 0.4,
      [MetadataType.COVER_IMAGE]: 0.85,
    };

    return openLibraryScores[dataType] ?? 0.5;
  }

  /**
   * Check if Open Library supports a specific metadata type
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
      MetadataType.COVER_IMAGE,
    ];

    return supportedTypes.includes(dataType);
  }

  /**
   * Search for metadata by title
   */
  async searchByTitle(query: TitleQuery): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      // Split the title into individual words to avoid quote wrapping
      const titleWords = query.title.split(/\s+/);
      const searchQuery = { title: titleWords };

      const rawResults = await Array.fromAsync(
        this.#client.searchBook(searchQuery),
      );

      if (rawResults.length === 0) return [];

      const mappedResults = rawResults.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-title-${Date.now()}-${index}`,
          this.#mapOpenLibraryBookToMetadata(result),
          this.#calculateConfidence(result, "title"),
        ),
      );

      // Return single aggregated result
      const aggregated = this.#aggregateResults(mappedResults, {
        title: query.title,
        fuzzy: !query.exactMatch,
      });
      return aggregated ? [aggregated] : [];
    }, `title search for "${query.title}"`);
  }

  /**
   * Search for metadata by ISBN
   */
  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      // Clean ISBN (remove hyphens, spaces)
      const cleanIsbn = this.cleanIsbn(isbn);

      const rawResults = await Array.fromAsync(
        this.#client.searchBook({ isbn: cleanIsbn }),
      );

      if (rawResults.length === 0) return [];

      const mappedResults = rawResults.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-isbn-${cleanIsbn}-${index}`,
          this.#mapOpenLibraryBookToMetadata(result),
          this.#calculateConfidence(result, "isbn"),
        ),
      );

      // Return single aggregated result
      const aggregated = this.#aggregateResults(mappedResults, {
        isbn: cleanIsbn,
      });
      return aggregated ? [aggregated] : [];
    }, `ISBN search for "${isbn}"`);
  }

  /**
   * Search for metadata by creator/author
   */
  async searchByCreator(query: CreatorQuery): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      // The issue is that the OpenLibrary client wraps string queries in quotes
      // We need to use SearchQuery object but ensure the author name doesn't get quoted
      // Split the name into individual words to avoid quote wrapping
      const authorWords = query.name.split(/\s+/);
      const searchQuery = { author: authorWords };

      const rawResults = await Array.fromAsync(
        this.#client.searchBook(searchQuery),
      );

      if (rawResults.length === 0) return [];

      const mappedResults = rawResults.map((result, index) =>
        this.createMetadataRecord(
          `${this.name}-creator-${Date.now()}-${index}`,
          this.#mapOpenLibraryBookToMetadata(result),
          this.#calculateConfidence(result, "creator"),
        ),
      );

      // Return single aggregated result
      const aggregated = this.#aggregateResults(mappedResults, {
        authors: [query.name],
        fuzzy: query.fuzzy ?? true,
      });
      return aggregated ? [aggregated] : [];
    }, `creator search for "${query.name}"`);
  }

  /**
   * Search using multiple criteria
   */
  async searchMultiCriteria(
    query: MultiCriteriaQuery,
  ): Promise<MetadataRecord[]> {
    return this.executeWithRetry(async () => {
      // Use the most appropriate single search method based on available criteria
      // This ensures we get one aggregated result instead of combining multiple search results

      // Strategy 1: ISBN search (most reliable)
      if (query.isbn) {
        return await this.searchByISBN(query.isbn);
      }

      // Strategy 2: Author search (often more reliable than title for finding the right work)
      if (query.authors && query.authors.length > 0) {
        return await this.searchByCreator({
          name: query.authors[0],
          fuzzy: query.fuzzy || true,
        });
      }

      // Strategy 3: Title search
      if (query.title) {
        return await this.searchByTitle({
          title: query.title,
          exactMatch: false,
        });
      }

      // No searchable criteria
      return [];
    }, `multi-criteria search`);
  }

  async searchBook(
    properties: Partial<BookMetadata>,
  ): Promise<LoosePartial<BookMetadata>[]> {
    const results = await Array.fromAsync(
      this.#client.searchBook(properties.title!),
    );
    this.#client.searchBook({
      publish_year: { from: 1800, to: 2023 },
    });

    return results.map(
      (result) =>
        ({
          title: result.title,
          isbn: result.isbn?.shift(),
          subjects: result.subject,
          language: result.language?.shift(),
          numberOfPages: result.number_of_pages_median,
          openlibraryId: result.key.split("/").pop(),
          description: result.first_sentence?.shift(),
          sortingKey: result.title_sort,
          datePublished: result.publish_date?.[0]
            ? new Date(result.publish_date[0])
            : undefined,
        }) satisfies LoosePartial<BookMetadata>,
    );
  }

  async searchCreator(
    name: string,
    _properties?: Partial<Omit<CreatorMetadata, "name">>,
  ): Promise<LoosePartial<CreatorMetadata>[]> {
    const results = await Array.fromAsync(this.#client.searchAuthor(name));

    return results.map(
      (result) =>
        ({
          name: result.name,
          url: result.links?.shift()?.url,
          wikipediaUrl: result.wikipedia,
          birthDate: new Date(result.birth_date),
          sortingKey: result.fuller_name,
          amazonId: result.remote_ids?.amazon,
          goodreadsId: result.remote_ids?.goodreads,
          patreonId: result.remote_ids?.patreon,
          openlibraryId: result.key.split("/").pop(),
          description:
            typeof result.bio === "string" ? result.bio : result.bio?.value,
          location: result.location,
          deathDate: new Date(result.death_date),
        }) satisfies LoosePartial<CreatorMetadata>,
    );
  }

  /**
   * Get detailed confidence analysis for a set of metadata records
   * This is the main public API for confidence factor tracking
   */
  getConfidenceAnalysis(results: MetadataRecord[]): ConfidenceFactors {
    const { factors } = calculateAggregatedConfidence(results);
    this.#logConfidenceCalculation(results, factors);
    return factors;
  }

  /**
   * Analyze confidence factors with comprehensive debugging information
   */
  analyzeConfidenceFactors(results: MetadataRecord[]): {
    summary: {
      finalConfidence: number;
      tier: ConfidenceTier;
      sourceCount: number;
      primaryFactors: string[];
      majorPenalties: string[];
    };
    detailed: ConfidenceFactors;
    recommendations: string[];
  } {
    const { factors: detailed } = calculateAggregatedConfidence(results);

    // Identify primary contributing factors
    const primaryFactors: string[] = [];
    if (detailed.consensusBoost > 0.05) primaryFactors.push("consensus");
    if (detailed.agreementBoost > 0.05) primaryFactors.push("agreement");
    if (detailed.qualityBoost > 0.05) primaryFactors.push("quality");
    if (detailed.sourceCountBoost > 0.02) primaryFactors.push("source-count");
    if (detailed.reliabilityBoost > 0.03) primaryFactors.push("reliability");

    // Identify major penalties
    const majorPenalties: string[] = [];
    if (detailed.disagreementPenalty > 0.1) majorPenalties.push("disagreement");
    if (detailed.penalties.includes("weak-consensus-cap"))
      majorPenalties.push("weak-consensus");
    if (detailed.penalties.includes("few-sources"))
      majorPenalties.push("insufficient-sources");
    if (detailed.penalties.includes("low-source-quality"))
      majorPenalties.push("low-quality");

    // Generate recommendations
    const recommendations: string[] = [];
    if (results.length < 3) {
      recommendations.push(
        "Consider gathering more metadata sources to improve confidence",
      );
    }
    if (detailed.factors.agreementScore < 0.7) {
      recommendations.push(
        "Sources show significant disagreement - verify data accuracy",
      );
    }
    if (detailed.factors.avgQuality < 0.7) {
      recommendations.push(
        "Source quality is low - consider using higher-quality metadata providers",
      );
    }
    if (detailed.disagreementPenalty > 0.15) {
      recommendations.push(
        "High disagreement penalty - manual review recommended",
      );
    }
    if (detailed.tier === "exceptional") {
      recommendations.push(
        "Excellent confidence - metadata is highly reliable",
      );
    } else if (detailed.tier === "poor") {
      recommendations.push(
        "Poor confidence - consider alternative sources or manual verification",
      );
    }

    // Always provide at least one recommendation
    if (recommendations.length === 0) {
      if (detailed.tier === "strong") {
        recommendations.push(
          "Confidence is strong - consider validating key fields",
        );
      } else if (detailed.tier === "good") {
        recommendations.push(
          "Good confidence level - metadata appears reliable",
        );
      } else if (detailed.tier === "moderate") {
        recommendations.push(
          "Moderate confidence - consider additional validation",
        );
      } else if (detailed.tier === "weak") {
        recommendations.push("Weak confidence - manual review recommended");
      } else {
        recommendations.push(
          "Review metadata quality and consider additional sources",
        );
      }
    }

    return {
      summary: {
        finalConfidence: detailed.finalConfidence,
        tier: detailed.tier,
        sourceCount: results.length,
        primaryFactors,
        majorPenalties,
      },
      detailed,
      recommendations,
    };
  }

  /**
   * Compare confidence calculations between different result sets
   */
  compareConfidenceCalculations(
    resultSets: Array<{
      name: string;
      results: MetadataRecord[];
    }>,
  ): {
    comparison: Array<{
      name: string;
      confidence: number;
      tier: ConfidenceTier;
      sourceCount: number;
      strengths: string[];
      weaknesses: string[];
    }>;
    winner: string;
    analysis: string;
  } {
    const comparison = resultSets.map(({ name, results }) => {
      const analysis = this.analyzeConfidenceFactors(results);

      const strengths: string[] = [];
      const weaknesses: string[] = [];

      // Analyze strengths
      if (
        analysis.detailed.tier === "exceptional" ||
        analysis.detailed.tier === "strong"
      ) {
        strengths.push("high-confidence");
      }
      if (results.length >= 3) {
        strengths.push("multiple-sources");
      }
      if (analysis.detailed.factors.agreementScore > 0.8) {
        strengths.push("strong-agreement");
      }
      if (analysis.detailed.factors.avgQuality > 0.8) {
        strengths.push("high-quality-sources");
      }

      // Analyze weaknesses
      if (
        analysis.detailed.tier === "poor" ||
        analysis.detailed.tier === "weak"
      ) {
        weaknesses.push("low-confidence");
      }
      if (results.length < 2) {
        weaknesses.push("single-source");
      }
      if (analysis.detailed.factors.agreementScore < 0.6) {
        weaknesses.push("poor-agreement");
      }
      if (analysis.detailed.disagreementPenalty > 0.1) {
        weaknesses.push("high-disagreement");
      }

      return {
        name,
        confidence: analysis.detailed.finalConfidence,
        tier: analysis.detailed.tier,
        sourceCount: results.length,
        strengths,
        weaknesses,
      };
    });

    // Find winner (highest confidence)
    const winner = comparison.reduce((best, current) =>
      current.confidence > best.confidence ? current : best,
    );

    // Generate analysis
    const winnerData = comparison.find((c) => c.name === winner.name)!;
    const analysis =
      `${winner.name} has the highest confidence (${winner.confidence.toFixed(3)}) ` +
      `with ${winnerData.tier} tier rating. ` +
      `Key strengths: ${winnerData.strengths.join(", ") || "none"}. ` +
      `Potential issues: ${winnerData.weaknesses.join(", ") || "none"}.`;

    return {
      comparison,
      winner: winner.name,
      analysis,
    };
  }

  /**
   * Get current confidence calculation settings for debugging and transparency
   */
  getConfidenceCalculationSettings(): {
    caps: {
      maximum: number;
      minimum: number;
      singleSourceCap: number;
    };
    boosts: {
      consensus: { max: number; perSource: number };
      agreement: { max: number };
      quality: { max: number; threshold: number };
      sourceCount: { max: number; perSource: number; threshold: number };
      reliability: { max: number; threshold: number };
      language: { max: number };
    };
    penalties: {
      disagreement: { max: number };
      lowQuality: { threshold: number };
      fewSources: { threshold: number };
    };
    tiers: {
      exceptional: { min: number; max: number };
      strong: { min: number; max: number };
      good: { min: number; max: number };
      moderate: { min: number; max: number };
      weak: { min: number; max: number };
      poor: { min: number; max: number };
    };
  } {
    return {
      caps: {
        maximum: 0.98,
        minimum: 0.3,
        singleSourceCap: 0.98,
      },
      boosts: {
        consensus: { max: 0.15, perSource: 0.03 },
        agreement: { max: 0.1 },
        quality: { max: 0.1, threshold: 0.7 },
        sourceCount: { max: 0.05, perSource: 0.01, threshold: 3 },
        reliability: { max: 0.08, threshold: 0.8 },
        language: { max: 0.3 },
      },
      penalties: {
        disagreement: { max: 0.2 },
        lowQuality: { threshold: 0.6 },
        fewSources: { threshold: 3 },
      },
      tiers: {
        exceptional: { min: 0.95, max: 1.0 },
        strong: { min: 0.9, max: 0.95 },
        good: { min: 0.7, max: 0.9 },
        moderate: { min: 0.5, max: 0.7 },
        weak: { min: 0.3, max: 0.5 },
        poor: { min: 0.0, max: 0.3 },
      },
    };
  }

  /**
   * Aggregate multiple results into a single best match with improved confidence
   */
  #aggregateResults(
    results: MetadataRecord[],
    query: MultiCriteriaQuery,
  ): MetadataRecord | null {
    if (results.length === 0) return null;

    // Group results by similarity (same work)
    const workGroups = this.#groupResultsByWork(results);

    // Find the best work group (most results + highest confidence)
    const bestGroup = workGroups.reduce((best, current) => {
      const bestScore = best.results.length * best.avgConfidence;
      const currentScore = current.results.length * current.avgConfidence;
      return currentScore > bestScore ? current : best;
    });

    // Create aggregated metadata from the best group
    return this.#createAggregatedRecord(bestGroup, query);
  }

  /**
   * Group results by work (same book, different editions/sources)
   */
  #groupResultsByWork(results: MetadataRecord[]): Array<{
    results: MetadataRecord[];
    avgConfidence: number;
    workKey?: string;
  }> {
    const groups = new Map<string, MetadataRecord[]>();

    for (const result of results) {
      // Create a key based on title and normalized primary author
      const title =
        result.title
          ?.toLowerCase()
          .replace(/[^\w\s]/g, "")
          .trim() || "";
      const author = result.authors?.[0]
        ? this.#normalizeAuthorName(result.authors[0])
        : "";

      // Always use title-author combination for grouping to handle different name formats
      // The OpenLibrary key might be different for the same work with different author formats
      const workKey: string = `${title}-${author}`;

      if (!groups.has(workKey)) {
        groups.set(workKey, []);
      }
      groups.get(workKey)!.push(result);
    }

    return Array.from(groups.entries()).map(([workKey, groupResults]) => ({
      results: groupResults,
      avgConfidence:
        groupResults.reduce((sum, r) => sum + r.confidence, 0) /
        groupResults.length,
      workKey,
    }));
  }

  /**
   * Create an aggregated record from a group of similar results
   */
  #createAggregatedRecord(
    group: { results: MetadataRecord[]; avgConfidence: number },
    query: MultiCriteriaQuery,
  ): MetadataRecord {
    const { results } = group;
    const baseResult = results[0];

    // Language preference: prioritize results matching the query language
    const languagePreference = query.language;
    const prioritizedResults = languagePreference
      ? [
          ...results.filter((r) => r.language === languagePreference),
          ...results.filter((r) => r.language !== languagePreference),
        ]
      : results;

    // Aggregate each field using consensus and language preference
    const aggregated: MetadataRecord = {
      id: `${this.name}-aggregated-${Date.now()}`,
      source: this.name,
      confidence: this.#calculateAggregatedConfidence(results),
      timestamp: new Date(),
    };

    // Add optional fields only if they have values
    const title =
      this.#aggregateField<string>(
        prioritizedResults,
        "title",
        languagePreference,
      ) || baseResult.title;
    if (title) aggregated.title = title;

    const authors =
      this.#aggregateAuthors(prioritizedResults, languagePreference) ||
      baseResult.authors;
    if (authors) aggregated.authors = authors;

    const isbn = this.#aggregateField<string[]>(
      prioritizedResults,
      "isbn",
      languagePreference,
    );
    if (isbn) aggregated.isbn = isbn;

    const language =
      this.#aggregateField<string>(
        prioritizedResults,
        "language",
        languagePreference,
      ) || languagePreference;
    if (language) aggregated.language = language;

    const subjects = this.#aggregateField<string[]>(
      prioritizedResults,
      "subjects",
      languagePreference,
    );
    if (subjects) aggregated.subjects = subjects;

    const description = this.#aggregateField<string>(
      prioritizedResults,
      "description",
      languagePreference,
    );
    if (description) aggregated.description = description;

    const publisher = this.#aggregateField<string>(
      prioritizedResults,
      "publisher",
      languagePreference,
    );
    if (publisher) aggregated.publisher = publisher;

    const publicationDate = this.#aggregateField<Date>(
      prioritizedResults,
      "publicationDate",
      languagePreference,
    );
    if (publicationDate) aggregated.publicationDate = publicationDate;

    const pageCount = this.#aggregateField<number>(
      prioritizedResults,
      "pageCount",
      languagePreference,
    );
    if (pageCount) aggregated.pageCount = pageCount;

    const series = this.#aggregateField<{ name: string; volume?: number }>(
      prioritizedResults,
      "series",
      languagePreference,
    );
    if (series) aggregated.series = series;

    const coverImage = this.#aggregateField<{
      url: string;
      width?: number;
      height?: number;
    }>(prioritizedResults, "coverImage", languagePreference);
    if (coverImage) aggregated.coverImage = coverImage;

    // Preserve provider data from the best result
    if (baseResult.providerData)
      aggregated.providerData = baseResult.providerData;

    return aggregated;
  }

  /**
   * Calculate aggregated confidence based on consensus and agreement with detailed factor tracking
   */
  #calculateAggregatedConfidence(results: MetadataRecord[]): number {
    // Use extracted confidence calculation module
    const { confidence, factors } = calculateAggregatedConfidence(results);

    // Log detailed confidence calculation for debugging
    this.#logConfidenceCalculation(results, factors);

    return confidence;
  }

  /**
   * Log detailed confidence calculation for debugging
   */
  #logConfidenceCalculation(
    results: MetadataRecord[],
    factors: ConfidenceFactors,
  ): void {
    if (
      process.env.NODE_ENV === "development" ||
      process.env.DEBUG_CONFIDENCE === "true"
    ) {
      console.log("🔍 Confidence Calculation Details:", {
        sourceCount: results.length,
        tier: factors.tier,
        finalConfidence: factors.finalConfidence,
        breakdown: {
          baseConfidence: factors.baseConfidence,
          consensusBoost: factors.consensusBoost,
          agreementBoost: factors.agreementBoost,
          qualityBoost: factors.qualityBoost,
          sourceCountBoost: factors.sourceCountBoost,
          reliabilityBoost: factors.reliabilityBoost,
          languagePreferenceBoost: factors.languagePreferenceBoost,
          disagreementPenalty: -factors.disagreementPenalty,
        },
        factors: factors.factors,
        penalties: factors.penalties,
        sources: results.map((r) => ({
          id: r.id,
          confidence: r.confidence,
          title: r.title,
          authors: r.authors,
        })),
      });
    }
  }

  /**
   * Aggregate a field value using consensus and language preference with enhanced weighting
   */
  #aggregateField<T>(
    results: MetadataRecord[],
    field: keyof MetadataRecord,
    preferredLanguage?: string,
  ): T | undefined {
    const valuesWithSources = results
      .map((r) => ({ value: r[field], source: r }))
      .filter((v) => v.value !== undefined && v.value !== null);

    if (valuesWithSources.length === 0) return undefined;
    if (valuesWithSources.length === 1) return valuesWithSources[0].value as T;

    // Group values by normalized representation for consensus analysis
    const valueGroups = this.#groupValuesByConsensus(
      valuesWithSources,
      preferredLanguage,
    );

    // Handle source disagreement with enhanced logic
    if (valueGroups.length > 1) {
      return this.#resolveSourceDisagreement(
        valueGroups,
        field,
        preferredLanguage,
      ) as T;
    }

    // Single consensus group - return the best value
    return valueGroups[0].value as T;
  }

  /**
   * Group field values by consensus with enhanced metadata tracking
   */
  #groupValuesByConsensus<T>(
    valuesWithSources: Array<{ value: any; source: MetadataRecord }>,
    preferredLanguage?: string,
  ): Array<{
    value: T;
    count: number;
    sources: MetadataRecord[];
    preferredLanguageCount: number;
    totalConfidence: number;
    reliabilityScore: number;
    agreementScore: number;
  }> {
    const valueCounts = new Map<
      string,
      {
        value: T;
        count: number;
        sources: MetadataRecord[];
        preferredLanguageCount: number;
        totalConfidence: number;
      }
    >();

    // Group values by normalized key
    for (const { value, source } of valuesWithSources) {
      const key = this.#normalizeValueForComparison(value);

      if (!valueCounts.has(key)) {
        valueCounts.set(key, {
          value: value as T,
          count: 0,
          sources: [],
          preferredLanguageCount: 0,
          totalConfidence: 0,
        });
      }

      const entry = valueCounts.get(key)!;
      entry.count++;
      entry.sources.push(source);
      entry.totalConfidence += source.confidence;

      // Track preferred language matches
      if (preferredLanguage && source.language === preferredLanguage) {
        entry.preferredLanguageCount++;
      }
    }

    // Convert to enhanced format with additional scoring
    return Array.from(valueCounts.values()).map((entry) => ({
      ...entry,
      reliabilityScore: this.#calculateSourceReliabilityBonus(entry.sources),
      agreementScore: this.#calculateAgreementLevelBonus(
        entry.sources,
        entry.count,
      ),
    }));
  }

  /**
   * Resolve source disagreement using enhanced weighting and consensus logic
   */
  #resolveSourceDisagreement<T>(
    valueGroups: Array<{
      value: T;
      count: number;
      sources: MetadataRecord[];
      preferredLanguageCount: number;
      totalConfidence: number;
      reliabilityScore: number;
      agreementScore: number;
    }>,
    _field: keyof MetadataRecord,
    preferredLanguage?: string,
  ): T {
    // Sort groups by comprehensive scoring
    const scoredGroups = valueGroups
      .map((group) => ({
        ...group,
        finalScore: this.#calculateFieldValueScore(group, preferredLanguage),
      }))
      .sort((a, b) => b.finalScore - a.finalScore);

    const topGroup = scoredGroups[0];
    const secondGroup = scoredGroups[1];

    // Apply disagreement resolution strategies
    if (this.#hasStrongConsensus(topGroup, scoredGroups)) {
      // Strong consensus: return the top choice
      return topGroup.value;
    }

    if (
      this.#hasLanguagePreferenceTieBreaker(
        topGroup,
        secondGroup,
        preferredLanguage,
      )
    ) {
      // Language preference can break the tie
      return topGroup.value;
    }

    if (this.#hasReliabilityTieBreaker(topGroup, secondGroup)) {
      // Source reliability can break the tie
      return topGroup.value;
    }

    // Fallback to highest confidence average when no clear winner
    const highestConfidenceGroup = scoredGroups.reduce((best, current) => {
      const bestAvg = best.totalConfidence / best.count;
      const currentAvg = current.totalConfidence / current.count;
      return currentAvg > bestAvg ? current : best;
    });

    return highestConfidenceGroup.value;
  }

  /**
   * Check if a group has strong consensus (significantly more sources than others)
   */
  #hasStrongConsensus(
    topGroup: { count: number; finalScore: number },
    allGroups: Array<{ count: number; finalScore: number }>,
  ): boolean {
    const totalSources = allGroups.reduce((sum, group) => sum + group.count, 0);
    const consensusRatio = topGroup.count / totalSources;

    // Strong consensus if >60% of sources agree or score is significantly higher
    return (
      consensusRatio > 0.6 || (topGroup.finalScore > 0.8 && topGroup.count >= 2)
    );
  }

  /**
   * Check if language preference can break a tie between top groups
   */
  #hasLanguagePreferenceTieBreaker(
    topGroup: {
      preferredLanguageCount: number;
      count: number;
      finalScore: number;
    },
    secondGroup: {
      preferredLanguageCount: number;
      count: number;
      finalScore: number;
    },
    preferredLanguage?: string,
  ): boolean {
    if (!preferredLanguage) return false;

    // Language preference breaks tie if scores are close but language support differs significantly
    const scoreDiff = Math.abs(topGroup.finalScore - secondGroup.finalScore);
    const languageDiff =
      topGroup.preferredLanguageCount - secondGroup.preferredLanguageCount;

    // More aggressive language preference - larger score difference tolerance
    return scoreDiff < 0.2 && languageDiff > 0;
  }

  /**
   * Check if source reliability can break a tie between top groups
   */
  #hasReliabilityTieBreaker(
    topGroup: { reliabilityScore: number; finalScore: number },
    secondGroup: { reliabilityScore: number; finalScore: number },
  ): boolean {
    const scoreDiff = Math.abs(topGroup.finalScore - secondGroup.finalScore);
    const reliabilityDiff =
      topGroup.reliabilityScore - secondGroup.reliabilityScore;

    // Reliability breaks tie if scores are close but reliability differs significantly
    return scoreDiff < 0.15 && reliabilityDiff > 0.05;
  }

  /**
   * Determine if one field value is better than another based on consensus and language preference
   */
  #isFieldValueBetter(
    candidate: {
      count: number;
      preferredLanguageCount: number;
      totalConfidence: number;
      sources: MetadataRecord[];
    },
    current: {
      count: number;
      preferredLanguageCount: number;
      totalConfidence: number;
      sources: MetadataRecord[];
    },
    preferredLanguage?: string,
  ): boolean {
    // Calculate weighted scores for both candidates
    const candidateScore = this.#calculateFieldValueScore(
      candidate,
      preferredLanguage,
    );
    const currentScore = this.#calculateFieldValueScore(
      current,
      preferredLanguage,
    );

    return candidateScore > currentScore;
  }

  /**
   * Calculate a comprehensive score for a field value based on multiple factors
   */
  #calculateFieldValueScore(
    entry: {
      count: number;
      preferredLanguageCount: number;
      totalConfidence: number;
      sources: MetadataRecord[];
    },
    preferredLanguage?: string,
  ): number {
    const { count, preferredLanguageCount, totalConfidence, sources } = entry;

    // Base score from source consensus (0-1 scale)
    // More sources agreeing = higher base score, but with diminishing returns
    const consensusScore = Math.min(1.0, count / 4.0); // Cap at 4 sources for diminishing returns

    // Average confidence of supporting sources (0-1 scale)
    const avgConfidence = totalConfidence / count;

    // Language preference bonus (0-0.3 scale) - increased weight
    let languageBonus = 0;
    if (preferredLanguage && count > 0) {
      const languageRatio = preferredLanguageCount / count;
      languageBonus = languageRatio * 0.3; // Up to 30% bonus for language preference
    }

    // Source reliability weighting (0-0.25 scale) - increased weight
    const reliabilityBonus = this.#calculateSourceReliabilityBonus(sources);

    // Agreement level bonus based on source diversity (0-0.15 scale)
    const agreementBonus = this.#calculateAgreementLevelBonus(sources, count);

    // Combine all factors with rebalanced weighting
    const finalScore =
      consensusScore * 0.35 + // 35% weight on consensus (reduced)
      avgConfidence * 0.25 + // 25% weight on confidence (reduced)
      languageBonus + // 30% weight on language preference (increased)
      reliabilityBonus + // 25% weight on source reliability (increased)
      agreementBonus; // 15% weight on agreement level (increased)

    return Math.min(1.0, finalScore); // Cap at 1.0
  }

  /**
   * Calculate bonus score based on source reliability
   */
  #calculateSourceReliabilityBonus(sources: MetadataRecord[]): number {
    if (sources.length === 0) return 0;

    // Calculate average source reliability based on provider characteristics
    let totalReliability = 0;
    for (const source of sources) {
      // Base reliability from source confidence
      let sourceReliability = source.confidence;

      // Significant boost for sources with complete metadata
      if (this.#hasCompleteMetadata(source)) {
        sourceReliability += 0.2; // Increased from 0.1
      }

      // Boost for sources with consistent data patterns
      if (this.#hasConsistentDataPatterns(source)) {
        sourceReliability += 0.1; // Increased from 0.05
      }

      totalReliability += Math.min(1.0, sourceReliability);
    }

    const avgReliability = totalReliability / sources.length;

    // Convert to bonus score (0-0.25 scale) - increased range
    return Math.max(0, (avgReliability - 0.6) * 0.25); // Lowered threshold from 0.7 to 0.6
  }

  /**
   * Calculate bonus score based on agreement level between sources
   */
  #calculateAgreementLevelBonus(
    sources: MetadataRecord[],
    consensusCount: number,
  ): number {
    if (sources.length < 2) return 0;

    // Higher bonus when more sources agree on the same value
    const agreementRatio = consensusCount / sources.length;

    // Additional bonus for diverse source types agreeing
    const sourceTypes = new Set(sources.map((s) => s.source));
    const diversityBonus = sourceTypes.size > 1 ? 0.02 : 0;

    // Convert to bonus score (0-0.1 scale)
    return agreementRatio * 0.08 + diversityBonus;
  }

  /**
   * Check if a source has complete metadata
   */
  #hasCompleteMetadata(source: MetadataRecord): boolean {
    const requiredFields = ["title", "authors", "publicationDate"];
    const optionalFields = ["isbn", "language", "publisher"];

    const hasRequired = requiredFields.every(
      (field) => source[field as keyof MetadataRecord],
    );
    const optionalCount = optionalFields.filter(
      (field) => source[field as keyof MetadataRecord],
    ).length;

    return hasRequired && optionalCount >= 2;
  }

  /**
   * Check if a source has consistent data patterns
   */
  #hasConsistentDataPatterns(source: MetadataRecord): boolean {
    // Check for consistent author name formats
    if (source.authors) {
      const hasConsistentAuthorFormat = source.authors.every(
        (author) =>
          !author.includes(",") || this.#isValidLastFirstFormat(author),
      );
      if (!hasConsistentAuthorFormat) return false;
    }

    // Check for reasonable publication date
    if (source.publicationDate) {
      const year = source.publicationDate.getFullYear();
      if (year < 1000 || year > new Date().getFullYear() + 2) return false;
    }

    // Check for reasonable page count
    if (source.pageCount) {
      if (source.pageCount < 1 || source.pageCount > 10000) return false;
    }

    return true;
  }

  /**
   * Check if a name is in valid "Last, First" format
   */
  #isValidLastFirstFormat(name: string): boolean {
    const parts = name.split(",");
    return parts.length >= 2 && parts.every((part) => part.trim().length > 0);
  }

  /**
   * Aggregate author names with special handling for name formats and consensus
   */
  #aggregateAuthors(
    results: MetadataRecord[],
    _preferredLanguage?: string,
  ): string[] | undefined {
    const allAuthors = results
      .map((r) => r.authors)
      .filter((authors) => authors && authors.length > 0)
      .flat() as string[];

    if (allAuthors.length === 0) return undefined;

    // Group authors by normalized name (handling "Last, First" vs "First Last")
    const authorGroups = new Map<
      string,
      {
        names: string[];
        count: number;
        sources: MetadataRecord[];
        formats: Map<string, number>;
      }
    >();

    for (let i = 0; i < allAuthors.length; i++) {
      const author = allAuthors[i];
      const result =
        results[Math.floor(i / (results[0]?.authors?.length || 1))];
      const normalized = this.#normalizeAuthorName(author);

      if (!authorGroups.has(normalized)) {
        authorGroups.set(normalized, {
          names: [],
          count: 0,
          sources: [],
          formats: new Map(),
        });
      }

      const group = authorGroups.get(normalized)!;
      group.names.push(author);
      group.count++;
      group.sources.push(result);

      // Track format frequency
      const format = author.includes(",") ? "last-first" : "first-last";
      group.formats.set(format, (group.formats.get(format) || 0) + 1);
    }

    // Select the best format for each author based on consensus and preference
    const finalAuthors: string[] = [];

    for (const group of authorGroups.values()) {
      const firstLastCount = group.formats.get("first-last") || 0;
      const lastFirstCount = group.formats.get("last-first") || 0;

      // Always prefer "First Last" format when sources agree on it
      // or when we need to convert from "Last, First"
      const preferFirstLast = firstLastCount >= lastFirstCount;

      let preferredName: string;
      if (preferFirstLast) {
        // Find a "First Last" format name, or convert from "Last, First"
        const firstLastName = group.names.find((name) => !name.includes(","));
        if (firstLastName) {
          preferredName = firstLastName;
        } else {
          // Convert the first "Last, First" format to "First Last"
          const lastFirstName = group.names.find((name) => name.includes(","));
          preferredName = lastFirstName
            ? this.#convertToFirstLastFormat(lastFirstName)
            : group.names[0];
        }
      } else {
        // Only use "Last, First" if it's significantly more common
        preferredName =
          group.names.find((name) => name.includes(",")) || group.names[0];
      }

      finalAuthors.push(preferredName);
    }

    return finalAuthors;
  }

  /**
   * Normalize author name for comparison (handles "Last, First" vs "First Last")
   * Enhanced with international support and complex name handling
   */
  #normalizeAuthorName(name: string): string {
    return this.#enhancedNormalizeAuthorName(name);
  }

  /**
   * Convert "Last, First" format to "First Last" format for display
   * Enhanced with international support and complex name handling
   */
  #convertToFirstLastFormat(name: string): string {
    return this.#enhancedConvertToFirstLastFormat(name);
  }

  // ===== Enhanced Name Parsing Utilities =====

  /**
   * Normalize a value for comparison
   */
  #normalizeValueForComparison(value: any): string {
    if (typeof value === "string") {
      return value.toLowerCase().trim();
    }
    if (Array.isArray(value)) {
      return value
        .map((v) => String(v).toLowerCase().trim())
        .sort()
        .join("|");
    }
    if (value instanceof Date) {
      return value.getFullYear().toString();
    }
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value).toLowerCase();
    }
    return String(value).toLowerCase();
  }

  /**
   * Remove duplicate results based on title and author similarity
   */
  #removeDuplicates(results: MetadataRecord[]): MetadataRecord[] {
    const unique: MetadataRecord[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      // Create a key based on title and first author
      const title =
        result.title
          ?.toLowerCase()
          .replace(/[^\w\s]/g, "")
          .trim() || "";
      const author =
        result.authors?.[0]
          ?.toLowerCase()
          .replace(/[^\w\s]/g, "")
          .trim() || "";
      const key = `${title}-${author}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * Map Open Library book search result to MetadataRecord format
   */
  #mapOpenLibraryBookToMetadata(
    result: any,
  ): Partial<
    Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">
  > {
    const metadata: Partial<
      Omit<MetadataRecord, "id" | "source" | "timestamp" | "confidence">
    > = {};

    // Basic fields
    if (result.title) {
      metadata.title = result.title;
    }

    if (result.author_name && Array.isArray(result.author_name)) {
      metadata.authors = result.author_name;
    }

    if (result.isbn && Array.isArray(result.isbn)) {
      metadata.isbn = result.isbn;
    }

    if (result.language && Array.isArray(result.language)) {
      metadata.language = result.language[0];
    }

    if (result.subject && Array.isArray(result.subject)) {
      metadata.subjects = result.subject;
    }

    if (result.first_sentence && Array.isArray(result.first_sentence)) {
      metadata.description = result.first_sentence[0];
    }

    if (result.publisher && Array.isArray(result.publisher)) {
      metadata.publisher = result.publisher[0];
    }

    // Publication date handling
    if (
      result.publish_date &&
      Array.isArray(result.publish_date) &&
      result.publish_date[0]
    ) {
      try {
        metadata.publicationDate = new Date(result.publish_date[0]);
      } catch {
        // If date parsing fails, try first_publish_year
        if (result.first_publish_year) {
          metadata.publicationDate = new Date(result.first_publish_year, 0, 1);
        }
      }
    } else if (result.first_publish_year) {
      metadata.publicationDate = new Date(result.first_publish_year, 0, 1);
    }

    // Page count
    if (result.number_of_pages_median) {
      metadata.pageCount = result.number_of_pages_median;
    }

    // Series information
    if (result.series && Array.isArray(result.series) && result.series[0]) {
      metadata.series = {
        name: result.series[0],
      };
    }

    // Edition information
    if (result.edition_key && Array.isArray(result.edition_key)) {
      metadata.edition = result.edition_key[0];
    }

    // Cover image
    if (result.cover_i) {
      metadata.coverImage = {
        url: `https://covers.openlibrary.org/b/id/${result.cover_i}-L.jpg`,
      };
    }

    // Store provider-specific data
    metadata.providerData = {
      openlibraryKey: result.key,
      workKey: result.key,
      editionCount: result.edition_count,
      hasFulltext: result.has_fulltext,
      publicLibraryAccess: result.public_scan_b,
      ratingsAverage: result.ratings_average,
      ratingsCount: result.ratings_count,
      wantToReadCount: result.want_to_read_count,
      currentlyReadingCount: result.currently_reading_count,
      alreadyReadCount: result.already_read_count,
    };

    return metadata;
  }

  /**
   * Calculate confidence score based on search type and result quality
   */
  #calculateConfidence(
    result: any,
    searchType: "title" | "isbn" | "creator" | "multi",
    query?: MultiCriteriaQuery,
  ): number {
    let baseConfidence = 0.7;

    // Adjust base confidence by search type
    switch (searchType) {
      case "isbn":
        baseConfidence = 0.85; // ISBN searches are very reliable but not perfect
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

    checkField(result.title);
    checkField(result.author_name);
    checkField(result.isbn);
    checkField(result.publish_date || result.first_publish_year);
    checkField(result.subject);
    checkField(result.publisher);
    checkField(result.language);
    checkField(result.number_of_pages_median);

    if (fieldCount > 0) {
      completenessBoost = (filledFields / fieldCount) * 0.15; // Up to 15% boost
    }

    // Boost confidence for popular/well-documented books
    let popularityBoost = 0;
    if (result.edition_count && result.edition_count > 1) {
      popularityBoost += 0.05;
    }
    if (result.ratings_count && result.ratings_count > 10) {
      popularityBoost += 0.05;
    }
    if (result.want_to_read_count && result.want_to_read_count > 100) {
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
          result.title &&
          result.title.toLowerCase().includes(query.title.toLowerCase())
        ) {
          matchedCriteria++;
        }
      }

      if (query.authors && query.authors.length > 0) {
        totalCriteria++;
        if (
          result.author_name &&
          result.author_name.some((author: string) =>
            query.authors!.some((queryAuthor) =>
              author.toLowerCase().includes(queryAuthor.toLowerCase()),
            ),
          )
        ) {
          matchedCriteria++;
        }
      }

      if (query.isbn) {
        totalCriteria++;
        if (
          result.isbn &&
          result.isbn.includes(query.isbn.replace(/[-\s]/g, ""))
        ) {
          matchedCriteria++;
        }
      }

      if (query.language) {
        totalCriteria++;
        if (result.language && result.language.includes(query.language)) {
          matchedCriteria++;
        }
      }

      if (totalCriteria > 0) {
        criteriaMatchBoost = (matchedCriteria / totalCriteria) * 0.1; // Up to 10% boost
      }
    }

    // Calculate final confidence, capped at 0.88 to prevent perfect scores
    const finalConfidence = Math.min(
      0.88,
      baseConfidence + completenessBoost + popularityBoost + criteriaMatchBoost,
    );

    return Math.round(finalConfidence * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Parse a name into its components (first, last, middle, prefixes, suffixes)
   * Handles various international name formats and edge cases
   * @deprecated Use parseNameComponents from open-library/name-utils.js directly
   */
  #parseNameComponents(name: string): NameComponents {
    return parseNameComponents(name);
  }

  /**
   * Convert any name format to "First Last" format with proper handling of complex names
   * @deprecated Use convertToFirstLastFormat from open-library/name-utils.js directly
   */
  #convertToPreferredFormat(name: string): string {
    return convertToFirstLastFormat(name);
  }

  // ===== Enhanced Name Parsing Methods =====

  /**
   * Normalize name for comparison with enhanced international support
   * @deprecated Use normalizeNameForComparison from open-library/name-utils.js directly
   */
  #normalizeNameForComparison(name: string): string {
    return normalizeNameForComparison(name);
  }

  /**
   * Check if two names refer to the same person with enhanced matching
   * @deprecated Use areNamesEquivalent from open-library/name-utils.js directly
   */
  #areNamesEquivalent(name1: string, name2: string): boolean {
    return areNamesEquivalent(name1, name2);
  }

  // ===== Confidence Factor Tracking Public API =====

  /**
   * Check if names match when considering initials
   * @deprecated Use matchesWithInitials from open-library/name-utils.js directly
   */
  #matchesWithInitials(
    components1: NameComponents,
    components2: NameComponents,
  ): boolean {
    return matchesWithInitials(components1, components2);
  }

  /**
   * Get the preferred display format for a name from multiple variants
   */
  #getPreferredNameFormat(nameVariants: string[]): string {
    if (nameVariants.length === 0) return "";
    if (nameVariants.length === 1) return nameVariants[0];

    // Prefer "First Last" format over "Last, First"
    const firstLastFormat = nameVariants.find((name) => !name.includes(","));
    if (firstLastFormat) return firstLastFormat;

    // If all are "Last, First", convert the first one
    return convertToFirstLastFormat(nameVariants[0]);
  }

  /**
   * Enhanced normalize author name with international support
   * @deprecated Use normalizeAuthorName from open-library/name-utils.js directly
   */
  #enhancedNormalizeAuthorName(name: string): string {
    return normalizeAuthorName(name);
  }

  /**
   * Enhanced convert to first-last format with international support
   * @deprecated Use convertToFirstLastFormat from open-library/name-utils.js directly
   */
  #enhancedConvertToFirstLastFormat(name: string): string {
    return convertToFirstLastFormat(name);
  }
}
