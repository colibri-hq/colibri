import type { MetadataRecord } from "../metadata/providers/provider.js";
import type { ExtractedMetadata, EnrichmentResult } from "./types.js";
import { globalProviderRegistry } from "../metadata/registry.js";

export interface EnrichMetadataOptions {
  /** Specific providers to use (default: all enabled) */
  providers?: string[];
  /** Only fill missing fields, don't override existing */
  fillMissingOnly?: boolean;
  /** Timeout for entire enrichment operation (ms) */
  timeout?: number;
  /** Minimum confidence to accept a value */
  minConfidence?: number;
}

/**
 * Enrich extracted metadata with data from external providers.
 *
 * Strategy:
 * 1. Search by ISBN first (highest reliability)
 * 2. Fall back to title + author search
 * 3. Reconcile results from multiple providers
 * 4. Return enriched fields with confidence scores
 *
 * @param metadata - Metadata extracted from the ebook file
 * @param options - Enrichment options
 * @returns Enrichment result with new metadata and confidence scores
 */
export async function enrichMetadata(
  metadata: ExtractedMetadata,
  options: EnrichMetadataOptions = {},
): Promise<EnrichmentResult> {
  const {
    providers: providerNames,
    fillMissingOnly = true,
    timeout = 30000,
    minConfidence = 0.6,
  } = options;

  // Initialize result
  const enriched: Partial<ExtractedMetadata> = {};
  const sources: string[] = [];
  const confidence: Record<string, number> = {};

  // Get providers to use
  const registry = globalProviderRegistry;
  const providers = providerNames
    ? providerNames
        .map((name) => registry.getProvider(name))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
    : registry.getEnabledProviders();

  if (providers.length === 0) {
    return { enriched, sources, confidence };
  }

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Enrichment timeout")), timeout);
  });

  try {
    // Execute enrichment with timeout
    const result = await Promise.race([
      performEnrichment(metadata, providers, fillMissingOnly, minConfidence),
      timeoutPromise,
    ]);

    return result;
  } catch (error) {
    // On timeout or error, return partial results
    console.warn("Enrichment failed or timed out:", error);
    return { enriched, sources, confidence };
  }
}

/**
 * Perform the actual enrichment by querying providers
 */
async function performEnrichment(
  metadata: ExtractedMetadata,
  providers: any[],
  fillMissingOnly: boolean,
  minConfidence: number,
): Promise<EnrichmentResult> {
  const enriched: Partial<ExtractedMetadata> = {};
  const sources = new Set<string>();
  const confidence: Record<string, number> = {};

  // Build search query
  const searchQuery = buildSearchQuery(metadata);
  if (!searchQuery) {
    // No searchable criteria
    return { enriched, sources: Array.from(sources), confidence };
  }

  // Query each provider in parallel
  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      try {
        // Try ISBN search first if available
        if (searchQuery.isbn) {
          const records = await provider.searchByISBN(searchQuery.isbn);
          if (records.length > 0) {
            return { provider: provider.name, records };
          }
        }

        // Fall back to multi-criteria search
        if (searchQuery.title || searchQuery.authors) {
          const records = await provider.searchMultiCriteria({
            title: searchQuery.title,
            authors: searchQuery.authors,
          });
          return { provider: provider.name, records };
        }

        return { provider: provider.name, records: [] };
      } catch (error) {
        console.warn(`Provider ${provider.name} failed:`, error);
        return { provider: provider.name, records: [] };
      }
    }),
  );

  // Collect all successful results
  const allRecords: Array<{ provider: string; record: MetadataRecord }> = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.records.length > 0) {
      for (const record of result.value.records) {
        allRecords.push({ provider: result.value.provider, record });
      }
    }
  }

  if (allRecords.length === 0) {
    return { enriched, sources: Array.from(sources), confidence };
  }

  // Helper to check if a field should be enriched
  const shouldEnrich = (value: unknown) => {
    if (!fillMissingOnly) return true;
    return value === undefined || value === null || value === "";
  };

  // Enrich title
  if (shouldEnrich(metadata.title)) {
    const titleCandidates = allRecords
      .map(({ provider, record }) => ({
        value: record.title,
        confidence: record.confidence,
        provider,
      }))
      .filter((c) => c.value && c.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);

    if (titleCandidates.length > 0) {
      enriched.title = titleCandidates[0].value;
      confidence.title = titleCandidates[0].confidence;
      sources.add(titleCandidates[0].provider);
    }
  }

  // Enrich simple fields
  const simpleFields = [
    { field: "synopsis", recordField: "description" },
    { field: "datePublished", recordField: "publicationDate" },
    { field: "numberOfPages", recordField: "pageCount" },
    { field: "language", recordField: "language" },
  ] as const;

  for (const { field, recordField } of simpleFields) {
    if (shouldEnrich(metadata[field])) {
      const candidates = allRecords
        .map(({ provider, record }) => ({
          value: record[recordField],
          confidence: record.confidence,
          provider,
        }))
        .filter((c) => c.value && c.confidence >= minConfidence)
        .sort((a, b) => b.confidence - a.confidence);

      if (candidates.length > 0) {
        enriched[field] = candidates[0].value as any;
        confidence[field] = candidates[0].confidence;
        sources.add(candidates[0].provider);
      }
    }
  }

  // Enrich subjects (merge from all high-confidence records)
  if (shouldEnrich(metadata.subjects) || !metadata.subjects || metadata.subjects.length === 0) {
    const subjectSet = new Set<string>();
    let maxConfidence = 0;

    for (const { provider, record } of allRecords) {
      if (record.subjects && record.confidence >= minConfidence) {
        record.subjects.forEach((s) => subjectSet.add(s.toLowerCase()));
        maxConfidence = Math.max(maxConfidence, record.confidence);
        sources.add(provider);
      }
    }

    if (subjectSet.size > 0) {
      enriched.subjects = Array.from(subjectSet);
      confidence.subjects = maxConfidence;
    }
  }

  // Enrich series
  if (shouldEnrich(metadata.series)) {
    const seriesCandidates = allRecords
      .map(({ provider, record }) => {
        if (!record.series) return undefined;
        return {
          value: { name: record.series.name, position: record.series.volume },
          confidence: record.confidence,
          provider,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== undefined)
      .filter((c) => c.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);

    if (seriesCandidates.length > 0) {
      enriched.series = seriesCandidates[0].value;
      confidence.series = seriesCandidates[0].confidence;
      sources.add(seriesCandidates[0].provider);
    }
  }

  // Enrich contributors (if missing)
  if (
    shouldEnrich(metadata.contributors) ||
    !metadata.contributors ||
    metadata.contributors.length === 0
  ) {
    const authorCandidates = allRecords
      .map(({ provider, record }) => ({
        value: record.authors?.map((name) => ({
          name,
          roles: ["aut"] as string[],
          sortingKey: name,
        })),
        confidence: record.confidence,
        provider,
      }))
      .filter((c) => c.value && c.value.length > 0 && c.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);

    if (authorCandidates.length > 0) {
      enriched.contributors = authorCandidates[0].value;
      confidence.contributors = authorCandidates[0].confidence;
      sources.add(authorCandidates[0].provider);
    }
  }

  return { enriched, sources: Array.from(sources), confidence };
}

/**
 * Build a search query from extracted metadata
 */
function buildSearchQuery(
  metadata: ExtractedMetadata,
): {
  isbn?: string | undefined;
  title?: string | undefined;
  authors?: string[] | undefined;
} | null {
  const isbn = metadata.identifiers?.find((id) => id.type === "isbn")?.value;
  const title = metadata.title;
  const authors = metadata.contributors?.filter((c) => c.roles.includes("aut")).map((c) => c.name);

  if (!isbn && !title) {
    return null;
  }

  return {
    isbn: isbn ?? undefined,
    title: title ?? undefined,
    authors: authors && authors.length > 0 ? authors : undefined,
  };
}

/**
 * Merge enriched metadata into extracted metadata.
 *
 * Strategy:
 * - For simple fields: override with enriched value
 * - For arrays (subjects): merge and deduplicate
 * - For objects (series): prefer enriched if present
 *
 * @param metadata - Original extracted metadata
 * @param enrichment - Enrichment result
 * @returns Merged metadata
 */
export function mergeEnrichedMetadata(
  metadata: ExtractedMetadata,
  enrichment: EnrichmentResult,
): ExtractedMetadata {
  const merged = { ...metadata };

  // Merge each enriched field
  for (const [field, value] of Object.entries(enrichment.enriched)) {
    if (value === undefined) continue;

    if (field === "subjects" && Array.isArray(value)) {
      // Merge arrays and deduplicate (value is already string[] due to validation)
      const existing = merged.subjects ?? [];
      const stringValues = value.filter((v): v is string => typeof v === "string");
      merged.subjects = Array.from(new Set([...existing, ...stringValues]));
    } else if (field === "series" && value) {
      // Prefer enriched series if present
      merged.series = value as any;
    } else {
      // Simple override
      (merged as any)[field] = value;
    }
  }

  return merged;
}
