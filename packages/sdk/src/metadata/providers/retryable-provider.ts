/**
 * RetryableMetadataProvider - Base class with common retry and error handling logic
 *
 * This class extends BaseMetadataProvider and provides:
 * - Automatic retry with exponential backoff
 * - Rate limiting integration via global registry
 * - Timeout management via global registry
 * - Common error classification (rate limit, retryable errors)
 *
 * All metadata providers that make HTTP requests should extend this class
 * instead of BaseMetadataProvider directly.
 */

import { globalRateLimiterRegistry } from "../rate-limiter.js";
import { globalTimeoutManagerRegistry } from "../timeout-manager.js";
import { cleanIsbn, normalizeDoi, normalizeLanguageCode, parseDate } from "../utils/index.js";
import { BaseMetadataProvider } from "./provider.js";

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Maximum backoff delay in milliseconds (default: 30000) */
  maxBackoffDelay?: number;
  /** Default delay for rate limit errors in milliseconds (default: 60000) */
  defaultRateLimitDelay?: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  maxBackoffDelay: 30000,
  defaultRateLimitDelay: 60000,
};

/**
 * Abstract base class for metadata providers with retry and error handling
 */
export abstract class RetryableMetadataProvider extends BaseMetadataProvider {
  /**
   * User agent string for HTTP requests
   * Subclasses should override this with a specific user agent
   */
  protected readonly userAgent: string =
    "Colibri-Metadata-Discovery/1.0 (https://github.com/colibri-hq/colibri)";

  /**
   * Retry configuration
   * Subclasses can override to customize retry behavior
   */
  protected readonly retryConfig: Required<RetryConfig> = DEFAULT_RETRY_CONFIG;

  /**
   * Execute an operation with automatic retry, rate limiting, and timeout management
   *
   * @param operation - The async operation to execute
   * @param operationName - Human-readable name for logging
   * @param maxRetries - Maximum retry attempts (uses retryConfig.maxRetries if not specified)
   * @returns The result of the operation
   *
   * @throws Never throws - on failure after all retries, returns an empty array.
   * Callers fetching raw API responses (objects) must handle this empty-array fallback
   * by checking for empty results or using optional chaining.
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.retryConfig.maxRetries,
  ): Promise<T> {
    const rateLimiter = globalRateLimiterRegistry.getLimiter(this.name, this.rateLimit);
    const timeoutManager = globalTimeoutManagerRegistry.getManager(this.name, this.timeout);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Wait for rate limit slot
        await rateLimiter.waitForSlot(this.name);

        // Execute operation with timeout
        return await timeoutManager.withRequestTimeout(operation());
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if this is a rate limit error
        if (this.isRateLimitError(lastError)) {
          const retryAfter = this.extractRetryAfter(lastError);

          if (attempt < maxRetries) {
            await this.delay(retryAfter);
            continue;
          }
        }

        // Check if this is a retryable error
        if (this.isRetryableError(lastError) && attempt < maxRetries) {
          const backoffDelay = this.calculateBackoffDelay(attempt);
          await this.delay(backoffDelay);
          continue;
        }

        // If this is the last attempt or a non-retryable error, break
        break;
      }
    }

    // Return empty array as fallback - callers expecting other types should handle this
    return [] as unknown as T;
  }

  /**
   * Check if an error indicates rate limiting
   *
   * Subclasses can override to add provider-specific rate limit detection
   */
  protected isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("429") ||
      message.includes("quota") ||
      (error as Error & { status?: number }).status === 429
    );
  }

  /**
   * Extract retry-after delay from rate limit error
   *
   * Subclasses can override for provider-specific header parsing
   */
  protected extractRetryAfter(error: Error): number {
    // Try to extract Retry-After header value from error message
    const retryAfterMatch = error.message.match(/retry.after[:\s]+(\d+)/i);
    if (retryAfterMatch) {
      return parseInt(retryAfterMatch[1]) * 1000; // Convert seconds to milliseconds
    }

    return this.retryConfig.defaultRateLimitDelay;
  }

  /**
   * Check if an error is retryable (network issues, timeouts, server errors)
   *
   * Subclasses can override to add provider-specific error classification
   */
  protected isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("connection") ||
      message.includes("econnreset") ||
      message.includes("enotfound") ||
      message.includes("etimedout") ||
      message.includes("socket hang up") ||
      message.includes("aborted")
    ) {
      return true;
    }

    // HTTP 5xx server errors
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    ) {
      return true;
    }

    // Timeout errors from our timeout manager
    return error.name === "TimeoutError";
  }

  /**
   * Calculate exponential backoff delay with jitter
   *
   * Uses the formula: min(maxBackoffDelay, 2^attempt * 1000 + random(0, 1000))
   */
  protected calculateBackoffDelay(attempt: number): number {
    const baseDelay = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, this.retryConfig.maxBackoffDelay);
  }

  /**
   * Helper method to delay execution
   * Extracted to allow easier testing
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean an ISBN by removing hyphens and spaces
   * @deprecated Use cleanIsbn from ./utils/normalization.js instead
   */
  protected cleanIsbn(isbn: string): string {
    return cleanIsbn(isbn);
  }

  /**
   * Normalize a DOI by removing the doi.org URL prefix if present
   * @deprecated Use normalizeDoi from ./utils/normalization.js instead
   */
  protected normalizeDoi(doi: string): string {
    return normalizeDoi(doi);
  }

  /**
   * Parse a date string into a Date object
   * Handles various formats: YYYY, YYYY-MM, YYYY-MM-DD
   * @deprecated Use parseDate from ./utils/date-parsing.js instead
   */
  protected parseDate(dateStr?: string): Date | undefined {
    return parseDate(dateStr);
  }

  /**
   * Normalize language code from ISO 639-2/B (3-letter) to ISO 639-1 (2-letter)
   * @deprecated Use normalizeLanguageCode from ./utils/normalization.js instead
   */
  protected normalizeLanguageCode(lang?: string): string | undefined {
    if (!lang) return undefined;
    const result = normalizeLanguageCode(lang);
    return result || undefined;
  }
}
