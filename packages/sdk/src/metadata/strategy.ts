import type { PerformanceMonitor } from "./performance.js";
import type { MetadataProvider, MultiCriteriaQuery } from "./providers/provider.js";
import { MetadataType } from "./providers/provider.js";

/**
 * Provider selection strategies
 */
export type ProviderStrategy = "all" | "priority" | "fastest" | "consensus";

/**
 * Options for provider selection
 */
export interface StrategyOptions {
  /** Limit number of providers to query */
  maxProviders?: number;
  /** Prioritize providers for these languages (ISO 639-1 codes) */
  preferredLanguages?: string[];
  /** Only use providers supporting these metadata types */
  requiredDataTypes?: MetadataType[];
  /** Provider names to exclude from selection */
  excludeProviders?: string[];
  /** Minimum reliability score required (0-1) */
  minReliabilityScore?: number;
  /** Performance monitor for historical response times (used by 'fastest' strategy) */
  performanceMonitor?: PerformanceMonitor;
}

/**
 * Provider with selection metadata
 */
interface ProviderWithScore {
  provider: MetadataProvider;
  selectionScore: number;
}

/**
 * Language support configuration per provider
 * Maps provider name to supported language codes (ISO 639-1)
 */
const PROVIDER_LANGUAGE_SUPPORT: Record<string, string[]> = {
  OpenLibrary: ["en", "es", "fr", "de", "it", "pt", "nl", "pl", "ru", "ja", "zh", "ar"],
  WikiData: [
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "nl",
    "pl",
    "ru",
    "ja",
    "zh",
    "ar",
    "ko",
    "hi",
    "sv",
    "fi",
  ],
  LibraryOfCongress: ["en"], // Primarily English
  ISNI: ["en", "es", "fr", "de", "it", "pt", "nl", "pl", "ru", "ja", "zh"], // International coverage
  VIAF: ["en", "es", "fr", "de", "it", "pt", "nl", "pl", "ru", "ja", "zh"], // Virtual International Authority File
};

/**
 * Select providers based on strategy and options
 *
 * @param providers - Available metadata providers
 * @param query - The metadata query being executed
 * @param strategy - Selection strategy to use
 * @param options - Additional selection options
 * @returns Filtered and sorted list of providers to use
 *
 * @example
 * ```typescript
 * const providers = registry.getEnabledProviders();
 * const selected = selectProviders(
 *   providers,
 *   { title: "The Lord of the Rings", authors: ["J.R.R. Tolkien"] },
 *   "priority",
 *   { maxProviders: 3, requiredDataTypes: [MetadataType.TITLE, MetadataType.AUTHORS] }
 * );
 * ```
 */
export function selectProviders(
  providers: MetadataProvider[],
  query: MultiCriteriaQuery,
  strategy: ProviderStrategy,
  options: StrategyOptions = {},
): MetadataProvider[] {
  // Apply filters first
  const filtered = applyFilters(providers, options);

  // Apply strategy-specific sorting
  let selected: MetadataProvider[];

  switch (strategy) {
    case "all":
      selected = sortByPriority(filtered);
      break;
    case "priority":
      selected = sortByPriority(filtered);
      break;
    case "fastest":
      selected = sortBySpeed(filtered, options.performanceMonitor);
      break;
    case "consensus":
      selected = selectForConsensus(filtered, query, options);
      break;
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }

  // Apply maxProviders limit
  if (options.maxProviders !== undefined && options.maxProviders >= 0) {
    // If maxProviders is 0, return empty array
    if (options.maxProviders === 0) {
      return [];
    }

    selected = selected.slice(0, options.maxProviders);
  }

  return selected;
}

/**
 * Sort providers by priority (highest first)
 *
 * @param providers - Providers to sort
 * @returns Sorted providers (descending priority)
 */
export function sortByPriority(providers: MetadataProvider[]): MetadataProvider[] {
  return providers.toSorted(({ priority: a }, { priority: b }) => b - a);
}

/**
 * Sort providers by historical response times (fastest first)
 *
 * Uses performance monitor to get average response times for each provider.
 * Falls back to priority sorting if no performance data is available.
 *
 * @param providers - Providers to sort
 * @param monitor - Performance monitor with historical data
 * @returns Sorted providers (fastest first)
 */
export function sortBySpeed(
  providers: MetadataProvider[],
  monitor?: PerformanceMonitor,
): MetadataProvider[] {
  if (!monitor) {
    // No performance data, fall back to priority
    return sortByPriority(providers);
  }

  const providersWithSpeed = providers.map((provider) => {
    // Get all stats and filter for this provider
    const allStats = monitor.getStats();
    const providerStats = allStats.filter(({ provider: candidate }) => candidate === provider.name);

    // Calculate average duration across all operations for this provider
    let avgDuration = Infinity;
    if (providerStats.length > 0) {
      const totalDuration = providerStats.reduce(
        (sum, stat) => sum + stat.averageDuration * stat.totalOperations,
        0,
      );
      const totalOperations = providerStats.reduce((sum, stat) => sum + stat.totalOperations, 0);
      avgDuration = totalOperations > 0 ? totalDuration / totalOperations : Infinity;
    }

    return { provider, avgDuration };
  });

  // Sort by average duration (ascending), then by priority (descending)
  providersWithSpeed.sort((a, b) => {
    if (a.avgDuration !== b.avgDuration) {
      return a.avgDuration - b.avgDuration;
    }
    return b.provider.priority - a.provider.priority;
  });

  return providersWithSpeed.map((item) => item.provider);
}

/**
 * Filter providers by data type support
 *
 * @param providers - Providers to filter
 * @param dataTypes - Required metadata types
 * @returns Providers that support all required data types
 */
export function filterByDataTypeSupport(
  providers: MetadataProvider[],
  dataTypes: MetadataType[],
): MetadataProvider[] {
  if (dataTypes.length === 0) {
    return providers;
  }

  return providers.filter((provider) => dataTypes.every((type) => provider.supportsDataType(type)));
}

/**
 * Filter providers by language support
 *
 * Prioritizes providers that support the preferred languages.
 * Does not exclude providers - just sorts them by language preference.
 *
 * @param providers - Providers to filter/sort
 * @param languages - Preferred language codes (ISO 639-1)
 * @returns Providers sorted by language support preference
 */
export function filterByLanguageSupport(
  providers: MetadataProvider[],
  languages: string[],
): MetadataProvider[] {
  if (languages.length === 0) {
    return providers;
  }

  const providersWithScore: ProviderWithScore[] = providers.map((provider) => {
    const supportedLangs = PROVIDER_LANGUAGE_SUPPORT[provider.name] ?? ["en"];
    const matchCount = languages.filter((lang) => supportedLangs.includes(lang)).length;
    const selectionScore = matchCount / languages.length;

    return { provider, selectionScore };
  });

  // Sort by language match score (descending), then by priority
  providersWithScore.sort((a, b) => {
    if (a.selectionScore !== b.selectionScore) {
      return b.selectionScore - a.selectionScore;
    }
    return b.provider.priority - a.provider.priority;
  });

  return providersWithScore.map((item) => item.provider);
}

/**
 * Filter providers by reliability score
 *
 * @param providers - Providers to filter
 * @param dataTypes - Metadata types to check reliability for
 * @param minScore - Minimum reliability score (0-1)
 * @returns Providers meeting minimum reliability threshold
 */
export function filterByReliability(
  providers: MetadataProvider[],
  dataTypes: MetadataType[],
  minScore: number,
): MetadataProvider[] {
  if (dataTypes.length === 0 || minScore <= 0) {
    return providers;
  }

  return providers.filter((provider) => {
    // Calculate average reliability across all required data types
    const scores = dataTypes.map((type) => provider.getReliabilityScore(type));
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return avgScore >= minScore;
  });
}

/**
 * Apply all filters to providers
 *
 * @param providers - Providers to filter
 * @param options - Filter options
 * @returns Filtered providers
 */
function applyFilters(providers: MetadataProvider[], options: StrategyOptions): MetadataProvider[] {
  let filtered = providers;

  // Exclude providers by name
  if (options.excludeProviders && options.excludeProviders.length > 0) {
    const excludeSet = new Set(options.excludeProviders);
    filtered = filtered.filter((p) => !excludeSet.has(p.name));
  }

  // Filter by required data types
  if (options.requiredDataTypes && options.requiredDataTypes.length > 0) {
    filtered = filterByDataTypeSupport(filtered, options.requiredDataTypes);
  }

  // Filter by reliability
  if (options.minReliabilityScore && options.minReliabilityScore > 0 && options.requiredDataTypes) {
    filtered = filterByReliability(
      filtered,
      options.requiredDataTypes,
      options.minReliabilityScore,
    );
  }

  // Sort by language preference (doesn't exclude, just reorders)
  if (options.preferredLanguages && options.preferredLanguages.length > 0) {
    filtered = filterByLanguageSupport(filtered, options.preferredLanguages);
  }

  return filtered;
}

/**
 * Select providers for consensus strategy
 *
 * Consensus strategy selects providers that are likely to agree on data.
 * It groups providers by their reliability scores for the relevant data types
 * and selects a balanced set that can provide cross-validation.
 *
 * @param providers - Filtered providers
 * @param query - The metadata query
 * @param options - Selection options
 * @returns Providers optimized for consensus validation
 */
function selectForConsensus(
  providers: MetadataProvider[],
  query: MultiCriteriaQuery,
  options: StrategyOptions,
): MetadataProvider[] {
  // Determine which data types are relevant based on query
  const relevantDataTypes = getRelevantDataTypes(query);

  // Score each provider based on reliability for relevant data types
  const providersWithScore: ProviderWithScore[] = providers.map((provider) => {
    const scores = relevantDataTypes.map((type) => provider.getReliabilityScore(type));
    const avgScore =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0.5;

    return { provider, selectionScore: avgScore };
  });

  // Sort by reliability score (descending), then by priority
  providersWithScore.sort((a, b) => {
    if (a.selectionScore !== b.selectionScore) {
      return b.selectionScore - a.selectionScore;
    }
    return b.provider.priority - a.provider.priority;
  });

  // Select diverse providers for consensus
  // Take top performers but ensure diversity in data type coverage
  const selected: MetadataProvider[] = [];
  const maxProviders = options.maxProviders ?? 3;

  // Always include the top provider
  if (providersWithScore.length > 0) {
    selected.push(providersWithScore[0].provider);
  }

  // Add providers that complement the first one's strengths
  for (const item of providersWithScore.slice(1)) {
    if (selected.length >= maxProviders) {
      break;
    }

    // Check if this provider covers data types not well-covered by selected ones
    const addsDiversity = relevantDataTypes.some((type) => {
      const thisScore = item.provider.getReliabilityScore(type);
      const maxExistingScore = Math.max(...selected.map((p) => p.getReliabilityScore(type)));
      // Add if this provider is significantly better for this type
      return thisScore > maxExistingScore + 0.1;
    });

    if (addsDiversity || selected.length < 2) {
      selected.push(item.provider);
    }
  }

  return selected;
}

/**
 * Determine which metadata types are relevant based on the query
 *
 * @param query - Metadata query
 * @returns Relevant metadata types
 */
function getRelevantDataTypes(query: MultiCriteriaQuery): MetadataType[] {
  const types: MetadataType[] = [];

  if (query.title) {
    types.push(MetadataType.TITLE);
  }
  if (query.authors && query.authors.length > 0) {
    types.push(MetadataType.AUTHORS);
  }
  if (query.isbn) {
    types.push(MetadataType.ISBN);
  }
  if (query.language) {
    types.push(MetadataType.LANGUAGE);
  }
  if (query.subjects && query.subjects.length > 0) {
    types.push(MetadataType.SUBJECTS);
  }
  if (query.publisher) {
    types.push(MetadataType.PUBLISHER);
  }
  if (query.yearRange) {
    types.push(MetadataType.PUBLICATION_DATE);
  }

  // If no specific types identified, assume all basic types are relevant
  if (types.length === 0) {
    return [
      MetadataType.TITLE,
      MetadataType.AUTHORS,
      MetadataType.ISBN,
      MetadataType.PUBLICATION_DATE,
      MetadataType.DESCRIPTION,
    ];
  }

  return types;
}

/**
 * Add language support configuration for a provider
 *
 * @param providerName - Name of the provider
 * @param languages - Supported language codes (ISO 639-1)
 */
export function registerProviderLanguageSupport(providerName: string, languages: string[]): void {
  PROVIDER_LANGUAGE_SUPPORT[providerName] = languages;
}

/**
 * Get supported languages for a provider
 *
 * @param providerName - Name of the provider
 * @returns Supported language codes
 */
export function getProviderLanguageSupport(providerName: string): string[] {
  return PROVIDER_LANGUAGE_SUPPORT[providerName] ?? ["en"];
}
