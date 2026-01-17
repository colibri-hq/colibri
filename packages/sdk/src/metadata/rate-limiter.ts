import { sleep } from "@colibri-hq/shared";
import type { RateLimitConfig } from "./providers/provider.js";

/**
 * Request tracking for rate limiting
 */
interface RequestRecord {
  timestamp: number;
  count: number;
}

/**
 * Rate limiter implementation for metadata providers
 */
export class RateLimiter {
  private requests = new Map<string, RequestRecord[]>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if a request is allowed for the given key
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing requests for this key
    let keyRequests = this.requests.get(key) || [];

    // Remove expired requests
    keyRequests = keyRequests.filter((req) => req.timestamp > windowStart);

    // Count total requests in the current window
    const totalRequests = keyRequests.reduce((sum, req) => sum + req.count, 0);

    // Check if we're under the limit
    const allowed = totalRequests < this.config.maxRequests;

    if (allowed) {
      // Add this request
      keyRequests.push({ timestamp: now, count: 1 });
      this.requests.set(key, keyRequests);
    }

    return allowed;
  }

  /**
   * Wait until a request is allowed
   */
  async waitForSlot(key: string): Promise<void> {
    while (!this.isAllowed(key)) {
      // Calculate wait time based on oldest request in window
      const now = Date.now();
      const windowStart = now - this.config.windowMs;
      const keyRequests = this.requests.get(key) || [];

      const oldestRequest = keyRequests.find((req) => req.timestamp > windowStart);
      const waitTime = oldestRequest
        ? Math.max(0, oldestRequest.timestamp + this.config.windowMs - now)
        : this.config.requestDelay || 1000;

      await sleep(Math.min(waitTime, 5000));
    }

    // Add delay between requests if configured
    if (this.config.requestDelay) {
      await sleep(this.config.requestDelay);
    }
  }

  /**
   * Get remaining requests for a key
   */
  getRemainingRequests(key: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const keyRequests = this.requests.get(key) || [];

    const validRequests = keyRequests.filter((req) => req.timestamp > windowStart);
    const totalRequests = validRequests.reduce((sum, req) => sum + req.count, 0);

    return Math.max(0, this.config.maxRequests - totalRequests);
  }

  /**
   * Get time until next request slot is available
   */
  getTimeUntilReset(key: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const keyRequests = this.requests.get(key) || [];

    const validRequests = keyRequests.filter((req) => req.timestamp > windowStart);
    if (validRequests.length === 0) {
      return 0;
    }

    const oldestRequest = validRequests[0];
    return Math.max(0, oldestRequest.timestamp + this.config.windowMs - now);
  }

  /**
   * Clear all request records
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * Clear request records for a specific key
   */
  clearKey(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }
}

/**
 * Global rate limiter registry for providers
 */
export class RateLimiterRegistry {
  private limiters = new Map<string, RateLimiter>();

  /**
   * Get or create a rate limiter for a provider
   */
  getLimiter(providerName: string, config: RateLimitConfig): RateLimiter {
    let limiter = this.limiters.get(providerName);
    if (!limiter) {
      limiter = new RateLimiter(config);
      this.limiters.set(providerName, limiter);
    }
    return limiter;
  }

  /**
   * Update rate limiter configuration for a provider
   */
  updateLimiterConfig(providerName: string, config: Partial<RateLimitConfig>): boolean {
    const limiter = this.limiters.get(providerName);
    if (limiter) {
      limiter.updateConfig(config);
      return true;
    }
    return false;
  }

  /**
   * Clear rate limiter for a provider
   */
  clearLimiter(providerName: string): boolean {
    const limiter = this.limiters.get(providerName);
    if (limiter) {
      limiter.clear();
      return this.limiters.delete(providerName);
    }
    return false;
  }

  /**
   * Clear all rate limiters
   */
  clearAll(): void {
    Array.from(this.limiters.values()).forEach((limiter) => {
      limiter.clear();
    });
    this.limiters.clear();
  }

  /**
   * Get statistics for all rate limiters
   */
  getStats(): Record<
    string,
    { remainingRequests: number; timeUntilReset: number; config: RateLimitConfig }
  > {
    const stats: Record<string, any> = {};

    Array.from(this.limiters.entries()).forEach(([providerName, limiter]) => {
      stats[providerName] = {
        remainingRequests: limiter.getRemainingRequests(providerName),
        timeUntilReset: limiter.getTimeUntilReset(providerName),
        config: limiter.getConfig(),
      };
    });

    return stats;
  }
}

/**
 * Global rate limiter registry instance
 */
export const globalRateLimiterRegistry = new RateLimiterRegistry();
