import type {
  MetadataProvider,
  RateLimitConfig,
  TimeoutConfig,
} from "./providers/provider.js";
import { MetadataType } from "./providers/provider.js";
import {
  globalConfigManager,
  type MetadataConfigManager,
  type ProviderConfig,
} from "./config.js";

/**
 * Provider registration information
 * Note: Provider enablement is managed by the ConfigManager, not the registry.
 * The registry only tracks registration and provider-specific config overrides.
 */
export interface ProviderRegistration {
  provider: MetadataProvider;
  config?: Record<string, unknown> | undefined;
}

/**
 * Registry for managing metadata providers with configuration support
 */
export class MetadataProviderRegistry {
  private providers = new Map<string, ProviderRegistration>();
  private initialized = false;
  private configManager: MetadataConfigManager;

  constructor(configManager: MetadataConfigManager = globalConfigManager) {
    this.configManager = configManager;
  }

  /**
   * Register a metadata provider
   * @param provider The metadata provider to register
   * @param config Optional provider-specific configuration overrides
   *
   * Note: Use ConfigManager.setProviderEnabled() to enable/disable providers.
   * The enabled parameter has been removed - all enablement is now managed by ConfigManager.
   */
  register(provider: MetadataProvider, config?: Record<string, unknown>): void {
    if (this.providers.has(provider.name)) {
      throw new Error(
        `Provider with name '${provider.name}' is already registered`,
      );
    }

    this.providers.set(provider.name, {
      provider,
      config,
    });
  }

  /**
   * Unregister a metadata provider
   */
  unregister(providerName: string): boolean {
    const registration = this.providers.get(providerName);
    if (registration) {
      // Cleanup provider if it supports cleanup
      if (registration.provider.cleanup) {
        registration.provider.cleanup().catch((error) => {
          console.warn(`Error cleaning up provider ${providerName}:`, error);
        });
      }
      return this.providers.delete(providerName);
    }
    return false;
  }

  /**
   * Get a specific provider by name
   * Only returns the provider if it's both registered AND enabled in config
   */
  getProvider(name: string): MetadataProvider | undefined {
    const registration = this.providers.get(name);
    if (!registration) {
      return undefined;
    }

    // Single source of truth: ConfigManager determines enablement
    return this.configManager.isProviderEnabled(name)
      ? registration.provider
      : undefined;
  }

  /**
   * Get all enabled providers
   * Returns only providers that are both registered and enabled in ConfigManager
   */
  getEnabledProviders(): MetadataProvider[] {
    return Array.from(this.providers.values())
      .filter((reg) =>
        // Single source of truth: ConfigManager determines enablement
        this.configManager.isProviderEnabled(reg.provider.name),
      )
      .map((reg) => reg.provider)
      .sort((a, b) => {
        const priorityA = this.configManager.getEffectivePriority(
          a.name,
          a.priority,
        );
        const priorityB = this.configManager.getEffectivePriority(
          b.name,
          b.priority,
        );
        return priorityB - priorityA; // Sort by priority (highest first)
      });
  }

  /**
   * Get providers that support a specific metadata type
   */
  getProvidersForDataType(dataType: MetadataType): MetadataProvider[] {
    return this.getEnabledProviders()
      .filter((provider) => provider.supportsDataType(dataType))
      .sort((a, b) => {
        // Sort by reliability score for this data type, then by priority
        const scoreA = a.getReliabilityScore(dataType);
        const scoreB = b.getReliabilityScore(dataType);
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score first
        }
        return b.priority - a.priority; // Higher priority first
      });
  }

  /**
   * Enable or disable a provider
   * @deprecated Use configManager.setProviderEnabled() directly instead.
   * This method now delegates to ConfigManager for consistency.
   */
  setProviderEnabled(name: string, enabled: boolean): boolean {
    const registration = this.providers.get(name);
    if (!registration) {
      return false;
    }

    // Delegate to ConfigManager - single source of truth
    this.configManager.setProviderEnabled(name, enabled);
    return true;
  }

  /**
   * Update provider configuration
   */
  updateProviderConfig(name: string, config: Record<string, unknown>): boolean {
    const registration = this.providers.get(name);
    if (registration) {
      registration.config = { ...registration.config, ...config };
      return true;
    }
    return false;
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(name: string): Record<string, unknown> | undefined {
    return this.providers.get(name)?.config;
  }

  /**
   * List all registered provider names
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * List enabled provider names
   * Returns providers that are both registered and enabled in ConfigManager
   */
  listEnabledProviders(): string[] {
    return Array.from(this.providers.values())
      .filter((reg) =>
        // Single source of truth: ConfigManager determines enablement
        this.configManager.isProviderEnabled(reg.provider.name),
      )
      .map((reg) => reg.provider.name);
  }

  /**
   * Get provider statistics with configuration information
   */
  getProviderStats(): Array<{
    name: string;
    enabled: boolean;
    priority: number;
    effectivePriority: number;
    supportedDataTypes: MetadataType[];
    reliabilityScores: Record<MetadataType, number>;
    rateLimit: RateLimitConfig;
    timeout: TimeoutConfig;
  }> {
    return Array.from(this.providers.values()).map((reg) => ({
      name: reg.provider.name,
      // Single source of truth: ConfigManager determines enablement
      enabled: this.configManager.isProviderEnabled(reg.provider.name),
      priority: reg.provider.priority,
      effectivePriority: this.configManager.getEffectivePriority(
        reg.provider.name,
        reg.provider.priority,
      ),
      supportedDataTypes: Object.values(MetadataType).filter((type) =>
        reg.provider.supportsDataType(type),
      ),
      reliabilityScores: Object.values(MetadataType).reduce(
        (scores, type) => {
          scores[type] = reg.provider.getReliabilityScore(type);
          return scores;
        },
        {} as Record<MetadataType, number>,
      ),
      rateLimit: this.configManager.getEffectiveRateLimit(reg.provider.name),
      timeout: this.configManager.getEffectiveTimeout(reg.provider.name),
    }));
  }

  /**
   * Get configuration manager
   */
  getConfigManager(): MetadataConfigManager {
    return this.configManager;
  }

  /**
   * Update provider configuration through the config manager
   */
  updateProviderConfiguration(
    name: string,
    config: Partial<ProviderConfig>,
  ): void {
    this.configManager.updateProviderConfig(name, config);
  }

  /**
   * Enable or disable provider through the config manager
   */
  setProviderEnabledInConfig(name: string, enabled: boolean): void {
    this.configManager.setProviderEnabled(name, enabled);
  }

  /**
   * Initialize all registered providers that are enabled in ConfigManager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const initPromises = Array.from(this.providers.values())
      .filter(
        (reg) =>
          // Only initialize providers that are enabled in ConfigManager
          this.configManager.isProviderEnabled(reg.provider.name) &&
          reg.provider.initialize,
      )
      .map(async (reg) => {
        try {
          await reg.provider.initialize!();
        } catch (error) {
          console.warn(
            `Failed to initialize provider ${reg.provider.name}:`,
            error,
          );
          // Disable provider in ConfigManager if initialization fails
          this.configManager.setProviderEnabled(reg.provider.name, false);
        }
      });

    await Promise.allSettled(initPromises);
    this.initialized = true;
  }

  /**
   * Cleanup all providers
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.providers.values())
      .filter((reg) => reg.provider.cleanup)
      .map(async (reg) => {
        try {
          await reg.provider.cleanup!();
        } catch (error) {
          console.warn(
            `Error cleaning up provider ${reg.provider.name}:`,
            error,
          );
        }
      });

    await Promise.allSettled(cleanupPromises);
    this.initialized = false;
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.cleanup().catch((error) => {
      console.warn("Error during cleanup:", error);
    });
    this.providers.clear();
    this.initialized = false;
  }
}

/**
 * Global provider registry instance
 */
export const globalProviderRegistry = new MetadataProviderRegistry();
