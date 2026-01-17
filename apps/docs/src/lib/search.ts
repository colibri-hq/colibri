/**
 * Pagefind search integration for the documentation site.
 * Provides typed wrappers around the Pagefind API with debouncing and result transformation.
 */

// Pagefind types (generated at build time, loaded dynamically)
interface PagefindAPI {
  init: () => Promise<void>;
  search: (query: string, options?: PagefindSearchOptions) => Promise<PagefindSearchResponse>;
  debouncedSearch: (
    query: string,
    options?: PagefindSearchOptions,
    debounceMs?: number,
  ) => Promise<PagefindSearchResponse | null>;
  preload: (term: string) => Promise<void>;
  destroy: () => void;
}

interface PagefindSearchOptions {
  filters?: Record<string, string | string[]>;
  sort?: Record<string, "asc" | "desc">;
}

interface PagefindSearchResponse {
  results: PagefindResult[];
  unfilteredResultCount: number;
  filters: Record<string, Record<string, number>>;
  totalFilters: Record<string, Record<string, number>>;
  timings: { preload: number; search: number; total: number };
}

interface PagefindResult {
  id: string;
  score: number;
  words: number[];
  data: () => Promise<PagefindResultData>;
}

interface PagefindResultData {
  url: string;
  content: string;
  word_count: number;
  excerpt: string; // HTML with <mark> tags for highlighting
  meta: { title: string; image?: string; image_alt?: string };
  anchors?: Array<{ element: string; id: string; text: string; location: number }>;
  sub_results?: Array<{
    url: string;
    title: string;
    excerpt: string;
    anchor?: { element: string; id: string; text: string };
  }>;
}

/** Transformed search result for display */
export interface SearchResult {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  breadcrumb: string[];
  score: number;
}

// Singleton Pagefind instance
let pagefind: PagefindAPI | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize Pagefind. Safe to call multiple times - will only initialize once.
 * In dev mode, pagefind is served by vite-plugin-pagefind.
 * In production, pagefind is generated at build time.
 */
export async function initSearch(): Promise<void> {
  if (pagefind) {
    return;
  }

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      // Pagefind is served by vite-plugin-pagefind in dev mode
      // and generated at build time for production
      // @ts-expect-error - Pagefind module is dynamically loaded
      const module = await import("/pagefind/pagefind.js");
      pagefind = module as unknown as PagefindAPI;
      await pagefind.init();
    } catch {
      initPromise = null;
    }
  })();

  await initPromise;
}

/**
 * Convert a URL path to breadcrumb segments.
 * e.g., "/getting-started/quick-start" -> ["Getting Started", "Quick Start"]
 */
function urlToBreadcrumb(url: string): string[] {
  return url
    .replace(/^\//, "") // Remove leading slash
    .replace(/\/$/, "") // Remove trailing slash
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    );
}

/**
 * Search the documentation.
 * @param query - Search query string
 * @param maxResults - Maximum number of results to return (default: 10)
 * @returns Array of search results
 */
export async function search(query: string, maxResults = 10): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  await initSearch();

  if (!pagefind) {
    return [];
  }

  const response = await pagefind.debouncedSearch(query, {}, 300);

  // debouncedSearch returns null if superseded by a newer search
  if (!response) {
    return [];
  }

  // Load result data in parallel for the first N results
  const resultPromises = response.results.slice(0, maxResults).map(async (result) => {
    const data = await result.data();
    return {
      id: result.id,
      url: data.url,
      title: data.meta.title || urlToBreadcrumb(data.url).pop() || "Untitled",
      excerpt: data.excerpt,
      breadcrumb: urlToBreadcrumb(data.url),
      score: result.score,
    };
  });

  return Promise.all(resultPromises);
}

// Recent searches storage
const STORAGE_KEY = "colibri-docs-recent-searches";
const MAX_RECENT = 5;

/**
 * Get recent search queries from localStorage.
 */
export function getRecentSearches(): string[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add a search query to recent searches.
 * Moves existing entries to the top and limits to MAX_RECENT items.
 */
export function addRecentSearch(query: string): void {
  if (typeof localStorage === "undefined" || !query.trim()) {
    return;
  }
  try {
    const recent = getRecentSearches().filter((q) => q !== query);
    recent.unshift(query.trim());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Remove a specific search query from recent searches.
 */
export function removeRecentSearch(query: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    const recent = getRecentSearches().filter((q) => q !== query);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch {
    // Ignore localStorage errors
  }
}
