import { TimeoutManager } from "../timeout-manager.js";

/**
 * Result of fetching a cover image
 */
export interface CoverResult {
  /** URL of the cover image */
  url: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Source that provided this cover */
  source: string;
  /** Binary image data */
  data?: Blob;
}

/**
 * Quality assessment result
 */
export interface QualityAssessment {
  /** Whether the cover meets quality requirements */
  acceptable: boolean;
  /** List of quality issues found */
  issues: string[];
  /** Quality score (0-1, higher is better) */
  score: number;
}

/**
 * Options for fetching cover images
 */
export interface CoverFetchOptions {
  /** Minimum acceptable width (default: 400) */
  minWidth?: number;
  /** Minimum acceptable height (default: 600) */
  minHeight?: number;
  /** Preferred sources to prioritize */
  preferredSources?: string[];
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Amazon API credentials */
  amazonApiKey?: string;
  /** LibraryThing API key */
  libraryThingApiKey?: string;
}

/**
 * Interface for cover image sources
 */
export interface CoverSource {
  /** Unique name of the source */
  name: string;
  /** Priority (higher = preferred, embedded is always 100) */
  priority: number;
  /** Fetch cover image by ISBN */
  fetchCover(isbn: string): Promise<CoverResult | null>;
}

/**
 * Error thrown when cover fetch fails
 */
export class CoverFetchError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CoverFetchError";
  }
}

/**
 * Known placeholder image signatures (first 8 bytes as hex)
 */
const PLACEHOLDER_SIGNATURES = new Set([
  // Common solid color images (1x1 transparent PNG)
  "89504e470d0a1a0a",
  // Common "no cover" image patterns
  "ffd8ffe000104a46", // JPEG header for common placeholders
]);

/**
 * Check if an image is a known placeholder
 */
export async function isPlaceholderImage(data: Blob): Promise<boolean> {
  // Check file size - very small images are likely placeholders
  if (data.size < 1024) {
    return true;
  }

  // Check first 8 bytes for known signatures
  const buffer = await data.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const signature = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (PLACEHOLDER_SIGNATURES.has(signature)) {
    return true;
  }

  // Check entropy - very low entropy indicates solid colors
  const entropy = calculateEntropy(bytes);

  return entropy < 1.0;
}

/**
 * Calculate Shannon entropy of byte array (0-8 bits)
 */
function calculateEntropy(bytes: Uint8Array): number {
  const freq = new Map<number, number>();
  for (const byte of bytes) {
    freq.set(byte, (freq.get(byte) || 0) + 1);
  }

  let entropy = 0;
  const len = bytes.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Get image dimensions from blob
 */
async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number } | null> {
  try {
    // Use createImageBitmap for efficient dimension extraction
    const bitmap = await createImageBitmap(blob);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return null;
  }
}

/**
 * Assess cover image quality
 */
export async function assessCoverQuality(
  cover: CoverResult,
  options?: Pick<CoverFetchOptions, "minWidth" | "minHeight">,
): Promise<QualityAssessment> {
  const issues: string[] = [];
  let score = 1.0;

  const minWidth = options?.minWidth ?? 400;
  const minHeight = options?.minHeight ?? 600;

  // Check if we have image data to analyze
  if (!cover.data) {
    issues.push("No image data available for analysis");
    score -= 0.3;
  } else {
    // Check for placeholder
    if (await isPlaceholderImage(cover.data)) {
      issues.push("Image appears to be a placeholder");
      score -= 0.6;
    }

    // Get dimensions if not provided
    if (!cover.width || !cover.height) {
      const dimensions = await getImageDimensions(cover.data);
      if (dimensions) {
        cover.width = dimensions.width;
        cover.height = dimensions.height;
      }
    }
  }

  // Check dimensions
  if (cover.width && cover.height) {
    if (cover.width < minWidth) {
      issues.push(`Width ${cover.width}px below minimum ${minWidth}px`);
      score -= 0.2;
    }
    if (cover.height < minHeight) {
      issues.push(`Height ${cover.height}px below minimum ${minHeight}px`);
      score -= 0.2;
    }

    // Check aspect ratio (books are typically 0.6-0.75)
    const aspectRatio = cover.width / cover.height;
    if (aspectRatio < 0.5 || aspectRatio > 0.9) {
      issues.push(`Unusual aspect ratio ${aspectRatio.toFixed(2)}`);
      score -= 0.1;
    }
  } else {
    issues.push("Unable to determine dimensions");
    score -= 0.2;
  }

  return { acceptable: score >= 0.5 && issues.length < 3, issues, score: Math.max(0, score) };
}

/**
 * Google Books cover source
 */
class GoogleBooksSource implements CoverSource {
  readonly name = "Google Books";
  readonly priority = 90;

  private timeoutManager: TimeoutManager;

  constructor(timeout: number = 10000) {
    this.timeoutManager = new TimeoutManager({
      requestTimeout: timeout,
      operationTimeout: timeout * 2,
    });
  }

  async fetchCover(isbn: string): Promise<CoverResult | null> {
    const url = `https://books.google.com/books/content?vid=ISBN:${isbn}&printsec=frontcover&img=1&zoom=1`;

    try {
      const response = await this.timeoutManager.fetchWithTimeout(url);

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.startsWith("image/")) {
        return null;
      }

      const data = await response.blob();
      const dimensions = await getImageDimensions(data);

      return { url, source: this.name, data, ...dimensions };
    } catch (error) {
      throw new CoverFetchError(`Failed to fetch from Google Books: ${error}`, this.name, error);
    }
  }
}

/**
 * OpenLibrary cover source
 */
class OpenLibrarySource implements CoverSource {
  readonly name = "OpenLibrary";
  readonly priority = 80;

  private timeoutManager: TimeoutManager;

  constructor(timeout: number = 10000) {
    this.timeoutManager = new TimeoutManager({
      requestTimeout: timeout,
      operationTimeout: timeout * 2,
    });
  }

  async fetchCover(isbn: string): Promise<CoverResult | null> {
    const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

    try {
      const response = await this.timeoutManager.fetchWithTimeout(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.blob();

      // OpenLibrary returns a placeholder image for missing covers
      if (await isPlaceholderImage(data)) {
        return null;
      }

      const dimensions = await getImageDimensions(data);

      return { url, source: this.name, data, ...dimensions };
    } catch (error) {
      throw new CoverFetchError(`Failed to fetch from OpenLibrary: ${error}`, this.name, error);
    }
  }
}

/**
 * Amazon cover source (requires API key)
 */
class AmazonSource implements CoverSource {
  readonly name = "Amazon";
  readonly priority = 85;

  private timeoutManager: TimeoutManager;

  constructor(
    private apiKey: string,
    timeout: number = 10000,
  ) {
    this.timeoutManager = new TimeoutManager({
      requestTimeout: timeout,
      operationTimeout: timeout * 2,
    });
  }

  async fetchCover(_isbn: string): Promise<CoverResult | null> {
    // Amazon Product Advertising API implementation would go here
    // This is a placeholder - actual implementation requires proper API integration
    throw new Error("Amazon cover fetching not yet implemented");
  }
}

/**
 * LibraryThing cover source (requires API key)
 */
class LibraryThingSource implements CoverSource {
  readonly name = "LibraryThing";
  readonly priority = 75;

  private timeoutManager: TimeoutManager;

  constructor(
    private apiKey: string,
    timeout: number = 10000,
  ) {
    this.timeoutManager = new TimeoutManager({
      requestTimeout: timeout,
      operationTimeout: timeout * 2,
    });
  }

  async fetchCover(isbn: string): Promise<CoverResult | null> {
    const url = `http://covers.librarything.com/devkey/${this.apiKey}/large/isbn/${isbn}`;

    try {
      const response = await this.timeoutManager.fetchWithTimeout(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.blob();
      const dimensions = await getImageDimensions(data);

      return { url, source: this.name, data, ...dimensions };
    } catch (error) {
      throw new CoverFetchError(`Failed to fetch from LibraryThing: ${error}`, this.name, error);
    }
  }
}

/**
 * Create cover sources based on options
 */
function createSources(options?: CoverFetchOptions): CoverSource[] {
  const sources: CoverSource[] = [];
  const timeout = options?.timeout ?? 10000;

  // Always include Google Books and OpenLibrary (free, no API key required)
  sources.push(new GoogleBooksSource(timeout));
  sources.push(new OpenLibrarySource(timeout));

  // Add optional sources if API keys are provided
  if (options?.amazonApiKey) {
    sources.push(new AmazonSource(options.amazonApiKey, timeout));
  }

  if (options?.libraryThingApiKey) {
    sources.push(new LibraryThingSource(options.libraryThingApiKey, timeout));
  }

  // Sort by priority (highest first)
  sources.sort((a, b) => b.priority - a.priority);

  // Apply preferred sources
  if (options?.preferredSources?.length) {
    sources.sort((a, b) => {
      const aIndex = options.preferredSources!.indexOf(a.name);
      const bIndex = options.preferredSources!.indexOf(b.name);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return b.priority - a.priority;
    });
  }

  return sources;
}

/**
 * Fetch cover image with fallback cascade
 * Priority: Embedded → Google Books → Amazon → OpenLibrary → LibraryThing
 *
 * @param isbn - ISBN to search for
 * @param embeddedCover - Cover image extracted from ebook file (if any)
 * @param options - Fetch options
 * @returns Best available cover, or null if none found
 */
export async function fetchCover(
  isbn: string,
  embeddedCover: Blob | null = null,
  options?: CoverFetchOptions,
): Promise<CoverResult | null> {
  const sources = createSources(options);
  const results: Array<{ cover: CoverResult; assessment: QualityAssessment }> = [];

  // Try embedded cover first (always highest priority)
  if (embeddedCover) {
    const dimensions = await getImageDimensions(embeddedCover);
    const embeddedResult: CoverResult = {
      url: "embedded",
      source: "Embedded",
      data: embeddedCover,
      ...dimensions,
    };

    const assessment = await assessCoverQuality(embeddedResult, options);

    // If embedded cover is acceptable, return it immediately
    if (assessment.acceptable) {
      return embeddedResult;
    }

    // Otherwise, save it as a fallback
    results.push({ cover: embeddedResult, assessment });
  }

  // Try each external source in priority order
  for (const source of sources) {
    try {
      const cover = await source.fetchCover(isbn);

      if (!cover) {
        continue;
      }

      const assessment = await assessCoverQuality(cover, options);

      // If we found an acceptable cover, return it immediately
      if (assessment.acceptable) {
        return cover;
      }

      // Otherwise, save it as a potential fallback
      results.push({ cover, assessment });
    } catch {
      // Continue to next source on error
    }
  }

  // No acceptable cover found - return best available
  if (results.length === 0) {
    return null;
  }

  // Sort by quality score (highest first)
  results.sort((a, b) => b.assessment.score - a.assessment.score);

  return results[0].cover;
}

/**
 * Fetch multiple cover sizes if available
 */
export async function fetchCoverSizes(
  isbn: string,
  embeddedCover: Blob | null = null,
  options?: CoverFetchOptions,
): Promise<Map<string, CoverResult>> {
  const sizes = new Map<string, CoverResult>();

  // Get the best cover
  const bestCover = await fetchCover(isbn, embeddedCover, options);

  if (bestCover) {
    sizes.set("large", bestCover);
  }

  return sizes;
}
