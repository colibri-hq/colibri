import type { TimeoutConfig } from "./providers/provider.js";

/**
 * Timeout error class
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeoutMs: number,
  ) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Timeout manager for handling request and operation timeouts
 */
export class TimeoutManager {
  private config: TimeoutConfig;
  private activeTimeouts = new Set<NodeJS.Timeout>();

  constructor(config: TimeoutConfig) {
    this.config = config;
  }

  /**
   * Wrap a promise with a timeout
   */
  async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage?: string,
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new TimeoutError(
            errorMessage || `Operation timed out after ${timeoutMs}ms`,
            timeoutMs,
          ),
        );
      }, timeoutMs);
      this.activeTimeouts.add(timeoutId);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      return result;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.activeTimeouts.delete(timeoutId);
      }
    }
  }

  /**
   * Wrap a request with the configured request timeout
   */
  async withRequestTimeout<T>(
    promise: Promise<T>,
    customTimeout?: number,
  ): Promise<T> {
    const timeout = customTimeout || this.config.requestTimeout;
    return this.withTimeout(
      promise,
      timeout,
      `Request timed out after ${timeout}ms`,
    );
  }

  /**
   * Wrap an operation with the configured operation timeout
   */
  async withOperationTimeout<T>(
    promise: Promise<T>,
    customTimeout?: number,
  ): Promise<T> {
    const timeout = customTimeout || this.config.operationTimeout;
    return this.withTimeout(
      promise,
      timeout,
      `Operation timed out after ${timeout}ms`,
    );
  }

  /**
   * Create an AbortController that will abort after the specified timeout
   */
  createAbortController(timeoutMs?: number): AbortController {
    const controller = new AbortController();
    const timeout = timeoutMs || this.config.requestTimeout;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    this.activeTimeouts.add(timeoutId);

    // Clean up timeout when signal is aborted
    controller.signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      this.activeTimeouts.delete(timeoutId);
    });

    return controller;
  }

  /**
   * Wrap fetch with timeout and abort controller
   */
  async fetchWithTimeout(
    input: RequestInfo | URL,
    init?: RequestInit & { timeout?: number },
  ): Promise<Response> {
    const timeout = init?.timeout || this.config.requestTimeout;
    const controller = this.createAbortController(timeout);

    const fetchInit: RequestInit = {
      ...init,
      signal: controller.signal,
    };

    try {
      const response = await fetch(input, fetchInit);
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new TimeoutError(
          `Fetch request timed out after ${timeout}ms`,
          timeout,
        );
      }
      throw error;
    }
  }

  /**
   * Execute multiple promises with individual timeouts
   */
  async executeWithTimeouts<T>(
    promises: Array<{
      promise: Promise<T>;
      timeout?: number;
      name?: string;
    }>,
  ): Promise<
    Array<{
      success: boolean;
      result?: T | undefined;
      error?: Error | undefined;
      name?: string | undefined;
    }>
  > {
    const results = await Promise.allSettled(
      promises.map(async ({ promise, timeout, name }) => {
        try {
          const result = await this.withTimeout(
            promise,
            timeout || this.config.requestTimeout,
            `Promise ${name || "unnamed"} timed out`,
          );
          return {
            success: true,
            result: result as T,
            error: undefined,
            name: name || undefined,
          };
        } catch (error) {
          return {
            success: false,
            result: undefined,
            error: error instanceof Error ? error : new Error(String(error)),
            name: name || undefined,
          };
        }
      }),
    );

    return results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : {
            success: false,
            result: undefined,
            error:
              result.reason instanceof Error
                ? result.reason
                : new Error(String(result.reason)),
            name: undefined,
          },
    );
  }

  /**
   * Update timeout configuration
   */
  updateConfig(config: Partial<TimeoutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TimeoutConfig {
    return { ...this.config };
  }

  /**
   * Clear all active timeouts
   */
  clearAllTimeouts(): void {
    Array.from(this.activeTimeouts).forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.activeTimeouts.clear();
  }

  /**
   * Get count of active timeouts
   */
  getActiveTimeoutCount(): number {
    return this.activeTimeouts.size;
  }
}

/**
 * Global timeout manager registry for providers
 */
export class TimeoutManagerRegistry {
  private managers = new Map<string, TimeoutManager>();

  /**
   * Get or create a timeout manager for a provider
   */
  getManager(providerName: string, config: TimeoutConfig): TimeoutManager {
    let manager = this.managers.get(providerName);
    if (!manager) {
      manager = new TimeoutManager(config);
      this.managers.set(providerName, manager);
    }
    return manager;
  }

  /**
   * Update timeout manager configuration for a provider
   */
  updateManagerConfig(
    providerName: string,
    config: Partial<TimeoutConfig>,
  ): boolean {
    const manager = this.managers.get(providerName);
    if (manager) {
      manager.updateConfig(config);
      return true;
    }
    return false;
  }

  /**
   * Clear timeout manager for a provider
   */
  clearManager(providerName: string): boolean {
    const manager = this.managers.get(providerName);
    if (manager) {
      manager.clearAllTimeouts();
      return this.managers.delete(providerName);
    }
    return false;
  }

  /**
   * Clear all timeout managers
   */
  clearAll(): void {
    Array.from(this.managers.values()).forEach((manager) => {
      manager.clearAllTimeouts();
    });
    this.managers.clear();
  }

  /**
   * Get statistics for all timeout managers
   */
  getStats(): Record<
    string,
    {
      activeTimeouts: number;
      config: TimeoutConfig;
    }
  > {
    const stats: Record<string, any> = {};

    Array.from(this.managers.entries()).forEach(([providerName, manager]) => {
      stats[providerName] = {
        activeTimeouts: manager.getActiveTimeoutCount(),
        config: manager.getConfig(),
      };
    });

    return stats;
  }
}

/**
 * Global timeout manager registry instance
 */
export const globalTimeoutManagerRegistry = new TimeoutManagerRegistry();
