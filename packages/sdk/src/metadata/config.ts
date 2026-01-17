import type { RateLimitConfig, TimeoutConfig } from "./providers/provider.js";

/**
 * Configuration for a specific metadata provider
 */
export interface ProviderConfig {
  /** Whether the provider is enabled */
  enabled: boolean;

  /** Priority override for this provider (higher = more preferred) */
  priority?: number;

  /** Rate limiting configuration override */
  rateLimit?: Partial<RateLimitConfig>;

  /** Timeout configuration override */
  timeout?: Partial<TimeoutConfig>;

  /** Provider-specific configuration options */
  options?: Record<string, unknown>;

  /** API credentials or authentication config */
  auth?: {
    apiKey?: string;
    username?: string;
    password?: string;
    token?: string;
    [key: string]: unknown;
  };

  /** Custom endpoints or URLs */
  endpoints?: { baseUrl?: string; searchUrl?: string; [key: string]: string };

  /** Feature flags for this provider */
  features?: {
    fuzzySearch?: boolean;
    multiCriteria?: boolean;
    coverImages?: boolean;
    [key: string]: boolean;
  };
}

/**
 * Global configuration for the metadata system
 */
export interface MetadataSystemConfig {
  /** Default rate limiting configuration */
  defaultRateLimit: RateLimitConfig;

  /** Default timeout configuration */
  defaultTimeout: TimeoutConfig;

  /** Maximum number of concurrent provider queries */
  maxConcurrentQueries: number;

  /** Global timeout for coordinated queries */
  coordinatorTimeout: number;

  /** Whether to enable caching */
  enableCaching: boolean;

  /** Cache TTL in milliseconds */
  cacheTtl: number;

  /** Maximum cache size (number of entries) */
  maxCacheSize: number;

  /** Provider-specific configurations */
  providers: Record<string, ProviderConfig>;

  /** Logging configuration */
  logging: {
    level: "debug" | "info" | "warn" | "error";
    enableProviderLogs: boolean;
    enablePerformanceLogs: boolean;
  };

  /** Retry configuration */
  retry: { maxAttempts: number; baseDelay: number; maxDelay: number; exponentialBackoff: boolean };
}

/**
 * Default configuration values
 */
export const DEFAULT_METADATA_CONFIG: MetadataSystemConfig = {
  defaultRateLimit: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    requestDelay: 100,
  },

  defaultTimeout: {
    requestTimeout: 10000, // 10 seconds
    operationTimeout: 30000, // 30 seconds
  },

  maxConcurrentQueries: 5,
  coordinatorTimeout: 60000, // 1 minute

  enableCaching: true,
  cacheTtl: 300000, // 5 minutes
  maxCacheSize: 1000,

  providers: {
    "open-library": {
      enabled: true,
      priority: 80,
      rateLimit: { maxRequests: 100, windowMs: 60000, requestDelay: 100 },
      timeout: { requestTimeout: 15000, operationTimeout: 30000 },
      features: { fuzzySearch: true, multiCriteria: true, coverImages: true },
    },

    "library-of-congress": {
      enabled: true,
      priority: 90,
      rateLimit: { maxRequests: 50, windowMs: 60000, requestDelay: 200 },
      timeout: { requestTimeout: 20000, operationTimeout: 45000 },
      features: { fuzzySearch: false, multiCriteria: true, coverImages: false },
    },

    wikidata: {
      enabled: true,
      priority: 70,
      rateLimit: { maxRequests: 200, windowMs: 60000, requestDelay: 50 },
      timeout: { requestTimeout: 12000, operationTimeout: 30000 },
      features: { fuzzySearch: true, multiCriteria: true, coverImages: false },
    },

    isni: {
      enabled: true,
      priority: 60,
      rateLimit: { maxRequests: 30, windowMs: 60000, requestDelay: 500 },
      timeout: { requestTimeout: 10000, operationTimeout: 25000 },
      features: { fuzzySearch: false, multiCriteria: false, coverImages: false },
    },

    viaf: {
      enabled: false, // Disabled by default
      priority: 50,
      rateLimit: { maxRequests: 20, windowMs: 60000, requestDelay: 1000 },
      timeout: { requestTimeout: 15000, operationTimeout: 30000 },
      features: { fuzzySearch: false, multiCriteria: false, coverImages: false },
    },
  },

  logging: { level: "info", enableProviderLogs: true, enablePerformanceLogs: false },

  retry: { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000, exponentialBackoff: true },
};

/**
 * Configuration manager for the metadata system
 */
export class MetadataConfigManager {
  private config: MetadataSystemConfig;
  private listeners: Array<(config: MetadataSystemConfig) => void> = [];

  constructor(initialConfig?: Partial<MetadataSystemConfig>) {
    this.config = this.mergeConfig(DEFAULT_METADATA_CONFIG, initialConfig);
  }

  /**
   * Get the current configuration
   */
  getConfig(): MetadataSystemConfig {
    return { ...this.config };
  }

  /**
   * Update the entire configuration
   */
  updateConfig(newConfig: Partial<MetadataSystemConfig>): void {
    this.config = this.mergeConfig(this.config, newConfig);
    this.notifyListeners();
  }

  /**
   * Get configuration for a specific provider
   */
  getProviderConfig(providerName: string): ProviderConfig | undefined {
    return this.config.providers[providerName];
  }

  /**
   * Update configuration for a specific provider
   */
  updateProviderConfig(providerName: string, config: Partial<ProviderConfig>): void {
    const currentConfig = this.config.providers[providerName] || { enabled: true };
    this.config.providers[providerName] = { ...currentConfig, ...config };
    this.notifyListeners();
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(providerName: string, enabled: boolean): void {
    if (!this.config.providers[providerName]) {
      this.config.providers[providerName] = { enabled };
    } else {
      this.config.providers[providerName].enabled = enabled;
    }
    this.notifyListeners();
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(providerName: string): boolean {
    return this.config.providers[providerName]?.enabled ?? false;
  }

  /**
   * Get effective rate limit config for a provider
   */
  getEffectiveRateLimit(providerName: string): RateLimitConfig {
    const providerConfig = this.config.providers[providerName];
    if (!providerConfig?.rateLimit) {
      return this.config.defaultRateLimit;
    }

    return { ...this.config.defaultRateLimit, ...providerConfig.rateLimit };
  }

  /**
   * Get effective timeout config for a provider
   */
  getEffectiveTimeout(providerName: string): TimeoutConfig {
    const providerConfig = this.config.providers[providerName];
    if (!providerConfig?.timeout) {
      return this.config.defaultTimeout;
    }

    return { ...this.config.defaultTimeout, ...providerConfig.timeout };
  }

  /**
   * Get effective priority for a provider
   */
  getEffectivePriority(providerName: string, defaultPriority: number): number {
    return this.config.providers[providerName]?.priority ?? defaultPriority;
  }

  /**
   * Get list of enabled providers sorted by priority
   */
  getEnabledProviders(): string[] {
    return Object.entries(this.config.providers)
      .filter(([_, config]) => config.enabled)
      .sort(([_, a], [__, b]) => (b.priority || 0) - (a.priority || 0))
      .map(([name]) => name);
  }

  /**
   * Add a configuration change listener
   */
  addListener(listener: (config: MetadataSystemConfig) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a configuration change listener
   */
  removeListener(listener: (config: MetadataSystemConfig) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Load configuration from JSON
   */
  loadFromJson(json: string): void {
    try {
      const parsed = JSON.parse(json) as Partial<MetadataSystemConfig>;
      this.updateConfig(parsed);
    } catch (error) {
      throw new Error(
        `Failed to parse configuration JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Export configuration as JSON
   */
  toJson(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = { ...DEFAULT_METADATA_CONFIG };
    this.notifyListeners();
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate global settings
    if (this.config.maxConcurrentQueries <= 0) {
      errors.push("maxConcurrentQueries must be greater than 0");
    }

    if (this.config.coordinatorTimeout <= 0) {
      errors.push("coordinatorTimeout must be greater than 0");
    }

    if (this.config.cacheTtl <= 0) {
      errors.push("cacheTtl must be greater than 0");
    }

    if (this.config.maxCacheSize <= 0) {
      errors.push("maxCacheSize must be greater than 0");
    }

    // Validate provider configurations
    for (const [providerName, providerConfig] of Object.entries(this.config.providers)) {
      if (providerConfig.priority !== undefined && providerConfig.priority < 0) {
        errors.push(`Provider ${providerName}: priority must be non-negative`);
      }

      if (providerConfig.rateLimit) {
        if (
          providerConfig.rateLimit.maxRequests !== undefined &&
          providerConfig.rateLimit.maxRequests <= 0
        ) {
          errors.push(`Provider ${providerName}: rateLimit.maxRequests must be greater than 0`);
        }
        if (
          providerConfig.rateLimit.windowMs !== undefined &&
          providerConfig.rateLimit.windowMs <= 0
        ) {
          errors.push(`Provider ${providerName}: rateLimit.windowMs must be greater than 0`);
        }
      }

      if (providerConfig.timeout) {
        if (
          providerConfig.timeout.requestTimeout !== undefined &&
          providerConfig.timeout.requestTimeout <= 0
        ) {
          errors.push(`Provider ${providerName}: timeout.requestTimeout must be greater than 0`);
        }
        if (
          providerConfig.timeout.operationTimeout !== undefined &&
          providerConfig.timeout.operationTimeout <= 0
        ) {
          errors.push(`Provider ${providerName}: timeout.operationTimeout must be greater than 0`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private mergeConfig(
    base: MetadataSystemConfig,
    override?: Partial<MetadataSystemConfig>,
  ): MetadataSystemConfig {
    if (!override) {
      return this.deepCopy(base);
    }

    // Deep merge providers to avoid shared references
    const mergedProviders: Record<string, ProviderConfig> = {};

    // Copy base providers with deep cloning
    for (const [name, config] of Object.entries(base.providers)) {
      mergedProviders[name] = this.deepCopyProviderConfig(config);
    }

    // Merge override providers
    if (override.providers) {
      for (const [name, config] of Object.entries(override.providers)) {
        if (mergedProviders[name]) {
          const baseConfig = mergedProviders[name];
          const merged: ProviderConfig = { ...baseConfig, ...config };

          // Handle nested objects with proper merging
          if (config.rateLimit && baseConfig.rateLimit) {
            merged.rateLimit = { ...baseConfig.rateLimit, ...config.rateLimit };
          } else if (config.rateLimit) {
            merged.rateLimit = { ...config.rateLimit };
          }

          if (config.timeout && baseConfig.timeout) {
            merged.timeout = { ...baseConfig.timeout, ...config.timeout };
          } else if (config.timeout) {
            merged.timeout = { ...config.timeout };
          }

          if (config.auth && baseConfig.auth) {
            merged.auth = { ...baseConfig.auth, ...config.auth };
          } else if (config.auth) {
            merged.auth = { ...config.auth };
          }

          if (config.endpoints && baseConfig.endpoints) {
            merged.endpoints = { ...baseConfig.endpoints, ...config.endpoints };
          } else if (config.endpoints) {
            merged.endpoints = { ...config.endpoints };
          }

          if (config.features && baseConfig.features) {
            merged.features = { ...baseConfig.features, ...config.features };
          } else if (config.features) {
            merged.features = { ...config.features };
          }

          if (config.options && baseConfig.options) {
            merged.options = { ...baseConfig.options, ...config.options };
          } else if (config.options) {
            merged.options = { ...config.options };
          }

          mergedProviders[name] = merged;
        } else {
          mergedProviders[name] = this.deepCopyProviderConfig(config);
        }
      }
    }

    return {
      ...base,
      ...override,
      defaultRateLimit: { ...base.defaultRateLimit, ...override.defaultRateLimit },
      defaultTimeout: { ...base.defaultTimeout, ...override.defaultTimeout },
      providers: mergedProviders,
      logging: { ...base.logging, ...override.logging },
      retry: { ...base.retry, ...override.retry },
    };
  }

  private deepCopy(config: MetadataSystemConfig): MetadataSystemConfig {
    const providers: Record<string, ProviderConfig> = {};
    for (const [name, providerConfig] of Object.entries(config.providers)) {
      providers[name] = this.deepCopyProviderConfig(providerConfig);
    }

    return {
      ...config,
      defaultRateLimit: { ...config.defaultRateLimit },
      defaultTimeout: { ...config.defaultTimeout },
      providers,
      logging: { ...config.logging },
      retry: { ...config.retry },
    };
  }

  private deepCopyProviderConfig(config: ProviderConfig): ProviderConfig {
    const copy: ProviderConfig = { enabled: config.enabled };

    if (config.priority !== undefined) {
      copy.priority = config.priority;
    }

    if (config.rateLimit) {
      copy.rateLimit = { ...config.rateLimit };
    }

    if (config.timeout) {
      copy.timeout = { ...config.timeout };
    }

    if (config.auth) {
      copy.auth = { ...config.auth };
    }

    if (config.endpoints) {
      copy.endpoints = { ...config.endpoints };
    }

    if (config.features) {
      copy.features = { ...config.features };
    }

    if (config.options) {
      copy.options = { ...config.options };
    }

    return copy;
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.config);
      } catch {
        // Silently ignore listener errors to avoid cascading failures
      }
    }
  }
}

/**
 * Global configuration manager instance
 */
export const globalConfigManager = new MetadataConfigManager();
