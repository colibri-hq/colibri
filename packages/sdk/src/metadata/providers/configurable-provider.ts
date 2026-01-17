import { globalConfigManager, type MetadataConfigManager, type ProviderConfig } from "../config.js";
import { BaseMetadataProvider, type RateLimitConfig, type TimeoutConfig } from "./provider.js";

/**
 * Base class for configurable metadata providers
 * Extends BaseMetadataProvider with configuration management capabilities
 */
export abstract class ConfigurableMetadataProvider extends BaseMetadataProvider {
  protected configManager: MetadataConfigManager;
  private configListener: ((config: any) => void) | undefined;

  constructor(configManager: MetadataConfigManager = globalConfigManager) {
    super();
    this.configManager = configManager;
    this.setupConfigListener();
  }

  /**
   * Check if this provider is enabled
   */
  get isEnabled(): boolean {
    return this.configManager.isProviderEnabled(this.name);
  }

  /**
   * Get effective priority for this provider
   */
  get priority(): number {
    return this.configManager.getEffectivePriority(this.name, this.getDefaultPriority());
  }

  /**
   * Get effective rate limit configuration
   */
  getEffectiveRateLimit(): RateLimitConfig {
    return this.configManager.getEffectiveRateLimit(this.name);
  }

  /**
   * Get effective timeout configuration
   */
  getEffectiveTimeout(): TimeoutConfig {
    return this.configManager.getEffectiveTimeout(this.name);
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<ProviderConfig>): void {
    this.configManager.updateProviderConfig(this.name, config);
  }

  /**
   * Enable or disable this provider
   */
  setEnabled(enabled: boolean): void {
    this.configManager.setProviderEnabled(this.name, enabled);
  }

  /**
   * Cleanup method that removes configuration listener
   */
  async cleanup(): Promise<void> {
    if (this.configListener) {
      this.configManager.removeListener(this.configListener);
      this.configListener = undefined;
    }
  }

  /**
   * Abstract methods that subclasses must implement
   */
  abstract getDefaultPriority(): number;

  abstract getDefaultBaseUrl(): string | undefined;

  /**
   * Get the current configuration for this provider
   */
  protected getProviderConfig(): ProviderConfig | undefined {
    return this.configManager.getProviderConfig(this.name);
  }

  /**
   * Get provider-specific options from configuration
   */
  protected getOption<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const config = this.getProviderConfig();
    return (config?.options?.[key] as T) ?? defaultValue;
  }

  /**
   * Get authentication configuration
   */
  protected getAuthConfig(): Record<string, unknown> | undefined {
    return this.getProviderConfig()?.auth;
  }

  /**
   * Get endpoint configuration
   */
  protected getEndpoint(key: string, defaultValue?: string): string | undefined {
    const config = this.getProviderConfig();
    return config?.endpoints?.[key] ?? defaultValue;
  }

  /**
   * Check if a feature is enabled for this provider
   */
  protected isFeatureEnabled(feature: string, defaultValue: boolean = false): boolean {
    const config = this.getProviderConfig();
    return config?.features?.[feature] ?? defaultValue;
  }

  /**
   * Get the base URL for this provider
   */
  protected getBaseUrl(): string | undefined {
    return this.getEndpoint("baseUrl", this.getDefaultBaseUrl());
  }

  /**
   * Optional method for subclasses to handle configuration changes
   */
  protected onConfigChanged?(config: ProviderConfig): void;

  /**
   * Set up configuration change listener
   */
  private setupConfigListener(): void {
    this.configListener = () => {
      const config = this.getProviderConfig();
      if (config && this.onConfigChanged) {
        this.onConfigChanged(config);
      }
    };

    this.configManager.addListener(this.configListener);
  }
}

// Note: Mixin approach removed due to TypeScript complexity with readonly properties
// Use ConfigurableMetadataProvider as base class instead
