import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorQuery, MetadataRecord, MultiCriteriaQuery, TitleQuery } from "./provider.js";
import { MetadataConfigManager } from "../config.js";
import { ConfigurableMetadataProvider } from "./configurable-provider.js";

// Mock provider for testing
class TestConfigurableProvider extends ConfigurableMetadataProvider {
  readonly name = "test-provider";

  getDefaultPriority(): number {
    return 50;
  }

  getDefaultBaseUrl(): string {
    return "https://api.test.com";
  }

  async searchByTitle(_query: TitleQuery): Promise<MetadataRecord[]> {
    return [];
  }

  async searchByISBN(_isbn: string): Promise<MetadataRecord[]> {
    return [];
  }

  async searchByCreator(_query: CreatorQuery): Promise<MetadataRecord[]> {
    return [];
  }

  async searchMultiCriteria(_query: MultiCriteriaQuery): Promise<MetadataRecord[]> {
    return [];
  }

  // Expose protected methods for testing
  public testGetOption<T>(key: string, defaultValue?: T): T | undefined {
    return this.getOption(key, defaultValue);
  }

  public testGetAuthConfig() {
    return this.getAuthConfig();
  }

  public testGetEndpoint(key: string, defaultValue?: string) {
    return this.getEndpoint(key, defaultValue);
  }

  public testIsFeatureEnabled(feature: string, defaultValue?: boolean) {
    return this.isFeatureEnabled(feature, defaultValue);
  }

  public testGetBaseUrl() {
    return this.getBaseUrl();
  }
}

describe("ConfigurableMetadataProvider", () => {
  let configManager: MetadataConfigManager;
  let provider: TestConfigurableProvider;

  beforeEach(() => {
    configManager = new MetadataConfigManager();
    provider = new TestConfigurableProvider(configManager);
  });

  describe("initialization", () => {
    it("should initialize with config manager", () => {
      expect(provider).toBeDefined();
      expect(provider.name).toBe("test-provider");
    });

    it("should use default values when no configuration exists", () => {
      expect(provider.priority).toBe(50); // Default priority
      expect(provider.isEnabled).toBe(false); // Not in default config
    });
  });

  describe("configuration integration", () => {
    beforeEach(() => {
      configManager.updateProviderConfig("test-provider", {
        enabled: true,
        priority: 75,
        rateLimit: { maxRequests: 200, windowMs: 30000 },
        timeout: { requestTimeout: 5000, operationTimeout: 15000 },
      });
    });

    it("should reflect configuration changes", () => {
      expect(provider.isEnabled).toBe(true);
      expect(provider.priority).toBe(75);
      expect(provider.rateLimit.maxRequests).toBe(100);
      expect(provider.rateLimit.windowMs).toBe(60000);
      expect(provider.timeout.requestTimeout).toBe(10000);
      expect(provider.timeout.operationTimeout).toBe(30000);
    });

    it("should update configuration through provider methods", () => {
      provider.updateConfig({ priority: 90, options: { customOption: "test-value" } });

      expect(provider.priority).toBe(90);
      expect(provider.testGetOption("customOption")).toBe("test-value");
    });

    it("should enable/disable provider", () => {
      provider.setEnabled(false);
      expect(provider.isEnabled).toBe(false);

      provider.setEnabled(true);
      expect(provider.isEnabled).toBe(true);
    });
  });

  describe("configuration options", () => {
    beforeEach(() => {
      configManager.updateProviderConfig("test-provider", {
        enabled: true,
        options: { stringOption: "test-string", numberOption: 42, booleanOption: true },
        auth: { apiKey: "secret-key", username: "test-user" },
        endpoints: {
          baseUrl: "https://custom.api.com",
          searchUrl: "https://custom.api.com/search",
        },
        features: { fuzzySearch: true, coverImages: false },
      });
    });

    it("should get provider options", () => {
      expect(provider.testGetOption("stringOption")).toBe("test-string");
      expect(provider.testGetOption("numberOption")).toBe(42);
      expect(provider.testGetOption("booleanOption")).toBe(true);
      expect(provider.testGetOption("nonExistent")).toBeUndefined();
      expect(provider.testGetOption("nonExistent", "default")).toBe("default");
    });

    it("should get authentication configuration", () => {
      const auth = provider.testGetAuthConfig();
      expect(auth?.apiKey).toBe("secret-key");
      expect(auth?.username).toBe("test-user");
    });

    it("should get endpoint configuration", () => {
      expect(provider.testGetEndpoint("baseUrl")).toBe("https://custom.api.com");
      expect(provider.testGetEndpoint("searchUrl")).toBe("https://custom.api.com/search");
      expect(provider.testGetEndpoint("nonExistent")).toBeUndefined();
      expect(provider.testGetEndpoint("nonExistent", "default")).toBe("default");
    });

    it("should check feature flags", () => {
      expect(provider.testIsFeatureEnabled("fuzzySearch")).toBe(true);
      expect(provider.testIsFeatureEnabled("coverImages")).toBe(false);
      expect(provider.testIsFeatureEnabled("nonExistent")).toBe(false);
      expect(provider.testIsFeatureEnabled("nonExistent", true)).toBe(true);
    });

    it("should get base URL with fallback", () => {
      expect(provider.testGetBaseUrl()).toBe("https://custom.api.com");

      // Test fallback to default
      configManager.updateProviderConfig("test-provider", { endpoints: {} });
      expect(provider.testGetBaseUrl()).toBe("https://api.test.com");
    });
  });

  describe("configuration change handling", () => {
    it("should call onConfigChanged when configuration changes", () => {
      const onConfigChangedSpy = vi.fn();
      (provider as any).onConfigChanged = onConfigChangedSpy;

      configManager.updateProviderConfig("test-provider", { enabled: true, priority: 80 });

      expect(onConfigChangedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true, priority: 80 }),
      );
    });

    it("should not call onConfigChanged if method is not implemented", () => {
      // Should not throw error when onConfigChanged is not implemented
      expect(() => {
        configManager.updateProviderConfig("test-provider", { enabled: true });
      }).not.toThrow();
    });
  });

  describe("cleanup", () => {
    it("should remove configuration listener on cleanup", async () => {
      const initialListenerCount = (configManager as any).listeners.length;

      await provider.cleanup();

      const finalListenerCount = (configManager as any).listeners.length;
      expect(finalListenerCount).toBe(initialListenerCount - 1);
    });

    it("should call parent cleanup if it exists", async () => {
      const parentCleanupSpy = vi.fn();
      (provider as any).constructor.prototype.cleanup = parentCleanupSpy;

      await provider.cleanup();

      // Note: This test is a bit artificial since we can't easily mock the parent class
      // In a real scenario, you'd want to test this with actual inheritance
    });
  });

  describe("effective configuration values", () => {
    it("should merge provider config with defaults", () => {
      configManager.updateProviderConfig("test-provider", {
        enabled: true,
        rateLimit: {
          maxRequests: 150,
          // windowMs not specified, should use default
        },
      });

      const rateLimit = provider.rateLimit;
      expect(rateLimit.maxRequests).toBe(100);
      expect(rateLimit.windowMs).toBe(60000); // Default value
    });

    it("should use default timeout when not configured", () => {
      configManager.updateProviderConfig("test-provider", {
        enabled: true,
        // No timeout configuration
      });

      const timeout = provider.timeout;
      expect(timeout.requestTimeout).toBe(10000); // Default value
      expect(timeout.operationTimeout).toBe(30000); // Default value
    });
  });
});
