import { writable, derived } from "svelte/store";

/**
 * Enrichment status for a work
 */
export type EnrichmentStatus = "enriching" | "available" | "none";

/**
 * Enrichment info stored per work
 */
export interface EnrichmentInfo {
  status: EnrichmentStatus;
  improvementCount?: number;
  sources?: string[];
}

/**
 * Store tracking enrichment status for works.
 * Key is workId, value is the enrichment info.
 */
const enrichmentMap = writable<Map<string, EnrichmentInfo>>(new Map());

/**
 * Update enrichment status for a work
 */
export function setEnrichmentStatus(
  workId: string,
  info: EnrichmentInfo,
): void {
  enrichmentMap.update((map) => {
    const newMap = new Map(map);
    if (info.status === "none") {
      newMap.delete(workId);
    } else {
      newMap.set(workId, info);
    }
    return newMap;
  });
}

/**
 * Mark a work as currently enriching
 */
export function markEnriching(workId: string): void {
  setEnrichmentStatus(workId, { status: "enriching" });
}

/**
 * Mark a work as having available enrichment
 */
export function markEnrichmentAvailable(
  workId: string,
  improvementCount: number,
  sources: string[],
): void {
  setEnrichmentStatus(workId, {
    status: "available",
    improvementCount,
    sources,
  });
}

/**
 * Clear enrichment status for a work
 */
export function clearEnrichmentStatus(workId: string): void {
  setEnrichmentStatus(workId, { status: "none" });
}

/**
 * Get enrichment status for a specific work
 */
export function getEnrichmentStatus(workId: string) {
  return derived(
    enrichmentMap,
    ($map) => $map.get(workId) ?? { status: "none" as const },
  );
}

/**
 * Check if any enrichments are in progress
 */
export const hasActiveEnrichments = derived(enrichmentMap, ($map) => {
  return Array.from($map.values()).some((info) => info.status === "enriching");
});

/**
 * Get count of available enrichments
 */
export const availableEnrichmentCount = derived(enrichmentMap, ($map) => {
  return Array.from($map.values()).filter((info) => info.status === "available")
    .length;
});
