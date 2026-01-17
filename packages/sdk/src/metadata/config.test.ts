import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_METADATA_CONFIG,
  MetadataConfigManager,
  type MetadataSystemConfig,
  type ProviderConfig,
} from "./config.js";

describe("MetadataConfigManager", () => {
  let configManager: MetadataConfigManager;

  beforeEach(() => {
    configManager = new MetadataConfigManager();
  });

  describe("initialization", () => {
    it("should initialize with default configuration", () => {
      const config = configManager.getConfig();
      expect(config).toEqual(DEFAULT_METADATA_CONFIG);
    });

    it("should initialize with custom configuration", () => {
      const customConfig: Partial<MetadataSystemConfig> = {
        maxConcurrentQueries: 10,
        enableCaching: false,
      };

      const manager = new MetadataConfigManager(customConfig);
      const config = manager.getConfig();

      expect(config.maxConcurrentQueries).toBe(10);
      expect(config.enableCaching).toBe(false);
      expect(config.defaultRateLimit).toEqual(DEFAULT_METADATA_CONFIG.defaultRateLimit);
    });
  });

  describe("configuration updates", () => {
    it("should update global configuration", () => {
      const updates: Partial<MetadataSystemConfig> = {
        maxConcurrentQueries: 15,
        coordinatorTimeout: 90000,
      };

      configManager.updateConfig(updates);
      const config = configManager.getConfig();

      expect(config.maxConcurrentQueries).toBe(15);
      expect(config.coordinatorTimeout).toBe(90000);
    });

    it("should merge nested configuration objects", () => {
      const updates: Partial<MetadataSystemConfig> = { defaultRateLimit: { maxRequests: 200 } };

      configManager.updateConfig(updates);
      const config = configManager.getConfig();

      expect(config.defaultRateLimit.maxRequests).toBe(200);
      expect(config.defaultRateLimit.windowMs).toBe(
        DEFAULT_METADATA_CONFIG.defaultRateLimit.windowMs,
      );
    });
  });

  describe("provider configuration", () => {
    it("should get provider configuration", () => {
      const config = configManager.getProviderConfig("open-library");
      expect(config).toBeDefined();
      expect(config?.enabled).toBe(true);
      expect(config?.priority).toBe(80);
    });

    it("should update provider configuration", () => {
      const updates: Partial<ProviderConfig> = {
        enabled: false,
        priority: 100,
        rateLimit: { maxRequests: 50 },
      };

      configManager.updateProviderConfig("open-library", updates);
      const config = configManager.getProviderConfig("open-library");

      expect(config?.enabled).toBe(false);
      expect(config?.priority).toBe(100);
      expect(config?.rateLimit?.maxRequests).toBe(50);
    });

    it("should create new provider configuration", () => {
      const newProviderConfig: Partial<ProviderConfig> = { enabled: true, priority: 60 };

      configManager.updateProviderConfig("new-provider", newProviderConfig);
      const config = configManager.getProviderConfig("new-provider");

      expect(config?.enabled).toBe(true);
      expect(config?.priority).toBe(60);
    });

    it("should enable/disable providers", () => {
      configManager.setProviderEnabled("open-library", false);
      expect(configManager.isProviderEnabled("open-library")).toBe(false);

      configManager.setProviderEnabled("open-library", true);
      expect(configManager.isProviderEnabled("open-library")).toBe(true);
    });
  });

  describe("effective configuration", () => {
    it("should return effective rate limit configuration", () => {
      const rateLimit = configManager.getEffectiveRateLimit("open-library");
      expect(rateLimit.maxRequests).toBe(100); // From provider-specific config
      expect(rateLimit.windowMs).toBe(60000);
      expect(rateLimit.requestDelay).toBe(100);
    });

    it("should return default rate limit for unconfigured provider", () => {
      const rateLimit = configManager.getEffectiveRateLimit("unknown-provider");
      expect(rateLimit).toEqual(DEFAULT_METADATA_CONFIG.defaultRateLimit);
    });

    it("should merge provider-specific rate limit with defaults", () => {
      configManager.updateProviderConfig("test-provider", { rateLimit: { maxRequests: 50 } });

      const rateLimit = configManager.getEffectiveRateLimit("test-provider");
      expect(rateLimit.maxRequests).toBe(50);
      expect(rateLimit.windowMs).toBe(DEFAULT_METADATA_CONFIG.defaultRateLimit.windowMs);
    });

    it("should return effective timeout configuration", () => {
      const timeout = configManager.getEffectiveTimeout("library-of-congress");
      expect(timeout.requestTimeout).toBe(20000);
      expect(timeout.operationTimeout).toBe(45000);
    });

    it("should return effective priority", () => {
      const priority = configManager.getEffectivePriority("open-library", 50);
      expect(priority).toBe(80); // From configuration

      const defaultPriority = configManager.getEffectivePriority("unknown-provider", 50);
      expect(defaultPriority).toBe(50); // Default value
    });
  });

  describe("enabled providers", () => {
    it("should return enabled providers sorted by priority", () => {
      const enabledProviders = configManager.getEnabledProviders();

      expect(enabledProviders).toContain("library-of-congress");
      expect(enabledProviders).toContain("open-library");
      expect(enabledProviders).toContain("wikidata");
      expect(enabledProviders).toContain("isni");
      expect(enabledProviders).not.toContain("viaf"); // Disabled by default

      // Should be sorted by priority (highest first)
      const locIndex = enabledProviders.indexOf("library-of-congress");
      const olIndex = enabledProviders.indexOf("open-library");

      // Library of Congress should come before Open Library (higher priority: 90 vs 80)
      expect(locIndex).toBeLessThan(olIndex);
    });

    it("should exclude disabled providers", () => {
      configManager.setProviderEnabled("open-library", false);
      const enabledProviders = configManager.getEnabledProviders();

      expect(enabledProviders).not.toContain("open-library");
    });
  });

  describe("configuration listeners", () => {
    it("should notify listeners on configuration changes", () => {
      let notificationCount = 0;
      let lastConfig: MetadataSystemConfig | null = null;

      const listener = (config: MetadataSystemConfig) => {
        notificationCount++;
        lastConfig = config;
      };

      configManager.addListener(listener);

      configManager.updateConfig({ maxConcurrentQueries: 20 });

      expect(notificationCount).toBe(1);
      expect(lastConfig!.maxConcurrentQueries).toBe(20);

      configManager.removeListener(listener);
      configManager.updateConfig({ maxConcurrentQueries: 25 });

      expect(notificationCount).toBe(1); // Should not increase after removal
    });
  });

  describe("JSON serialization", () => {
    it("should export configuration as JSON", () => {
      const json = configManager.toJson();
      const parsed = JSON.parse(json);

      expect(parsed.maxConcurrentQueries).toBe(DEFAULT_METADATA_CONFIG.maxConcurrentQueries);
      expect(parsed.providers["open-library"].enabled).toBe(true);
    });

    it("should load configuration from JSON", () => {
      const customConfig = {
        maxConcurrentQueries: 30,
        providers: { "custom-provider": { enabled: true, priority: 95 } },
      };

      configManager.loadFromJson(JSON.stringify(customConfig));
      const config = configManager.getConfig();

      expect(config.maxConcurrentQueries).toBe(30);
      expect(config.providers["custom-provider"]?.enabled).toBe(true);
      expect(config.providers["custom-provider"]?.priority).toBe(95);
    });

    it("should throw error for invalid JSON", () => {
      expect(() => {
        configManager.loadFromJson("invalid json");
      }).toThrow("Failed to parse configuration JSON");
    });
  });

  describe("configuration validation", () => {
    it("should validate valid configuration", () => {
      const validation = configManager.validate();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect invalid global settings", () => {
      configManager.updateConfig({
        maxConcurrentQueries: -1,
        coordinatorTimeout: 0,
        cacheTtl: -100,
      });

      const validation = configManager.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("maxConcurrentQueries must be greater than 0");
      expect(validation.errors).toContain("coordinatorTimeout must be greater than 0");
      expect(validation.errors).toContain("cacheTtl must be greater than 0");
    });

    it("should detect invalid provider settings", () => {
      configManager.updateProviderConfig("test-provider", {
        priority: -5,
        rateLimit: { maxRequests: 0, windowMs: -1000 },
        timeout: { requestTimeout: -1, operationTimeout: 0 },
      });

      const validation = configManager.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("priority must be non-negative"))).toBe(true);
      expect(validation.errors.some((e) => e.includes("maxRequests must be greater than 0"))).toBe(
        true,
      );
      expect(validation.errors.some((e) => e.includes("windowMs must be greater than 0"))).toBe(
        true,
      );
      expect(
        validation.errors.some((e) => e.includes("requestTimeout must be greater than 0")),
      ).toBe(true);
      expect(
        validation.errors.some((e) => e.includes("operationTimeout must be greater than 0")),
      ).toBe(true);
    });
  });

  describe("configuration reset", () => {
    it("should reset to default configuration", () => {
      configManager.updateConfig({ maxConcurrentQueries: 50 });
      configManager.updateProviderConfig("open-library", { enabled: false });

      configManager.reset();
      const config = configManager.getConfig();

      expect(config).toEqual(DEFAULT_METADATA_CONFIG);
    });
  });
});
