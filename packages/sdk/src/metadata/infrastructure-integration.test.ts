import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MetadataConfigManager } from "./config.js";
import { demonstrateInfrastructure, ExampleMetadataProvider } from "./example.js";
import { MetadataProviderRegistry, MetadataType } from "./index.js";

describe("Infrastructure Integration", () => {
  let registry: MetadataProviderRegistry;
  let provider: ExampleMetadataProvider;
  let configManager: MetadataConfigManager;

  beforeEach(() => {
    // Use a fresh config manager for each test to avoid interference
    configManager = new MetadataConfigManager({ providers: {} });
    registry = new MetadataProviderRegistry(configManager);
    provider = new ExampleMetadataProvider();
  });

  afterEach(async () => {
    await registry.cleanup();
  });

  it("should demonstrate complete infrastructure workflow", async () => {
    // Register provider and enable it in configuration
    registry.register(provider);
    registry.setProviderEnabledInConfig("example-provider", true);
    await registry.initialize();

    // Verify registration
    const enabledProviders = registry.getEnabledProviders();
    expect(enabledProviders).toHaveLength(1);
    expect(enabledProviders[0].name).toBe("example-provider");

    // Test provider capabilities
    expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
    expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
    expect(provider.supportsDataType(MetadataType.PHYSICAL_DIMENSIONS)).toBe(false);

    // Test reliability scores
    expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.9);
    expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.95);

    // Test searches
    const titleResults = await provider.searchByTitle({ title: "Test Book" });
    expect(titleResults).toHaveLength(1);
    expect(titleResults[0].title).toBe("Test Book");
    expect(titleResults[0].source).toBe("example-provider");
    expect(titleResults[0].confidence).toBe(0.85);

    const isbnResults = await provider.searchByISBN("978-1234567890");
    expect(isbnResults).toHaveLength(1);
    expect(isbnResults[0].isbn).toContain("978-1234567890");
    expect(isbnResults[0].confidence).toBe(0.95);

    const creatorResults = await provider.searchByCreator({ name: "Test Author" });
    expect(creatorResults).toHaveLength(1);
    expect(creatorResults[0].authors).toContain("Test Author");

    const multiResults = await provider.searchMultiCriteria({
      title: "Multi Test",
      isbn: "978-9876543210",
    });
    expect(multiResults).toHaveLength(2); // One from title, one from ISBN

    // Test provider statistics
    const stats = registry.getProviderStats();
    expect(stats).toHaveLength(1);
    expect(stats[0].name).toBe("example-provider");
    expect(stats[0].priority).toBe(100);
    expect(stats[0].enabled).toBe(true);
    expect(stats[0].supportedDataTypes).toContain(MetadataType.TITLE);
    expect(stats[0].reliabilityScores[MetadataType.TITLE]).toBe(0.9);

    // Test data type filtering
    const titleProviders = registry.getProvidersForDataType(MetadataType.TITLE);
    expect(titleProviders).toHaveLength(1);
    expect(titleProviders[0]).toBe(provider);

    const dimensionProviders = registry.getProvidersForDataType(MetadataType.PHYSICAL_DIMENSIONS);
    expect(dimensionProviders).toHaveLength(0);
  });

  it("should handle provider configuration", () => {
    // Register with config (enablement handled by ConfigManager)
    registry.register(provider, { customSetting: "test" });

    const config = registry.getProviderConfig("example-provider");
    expect(config).toEqual({ customSetting: "test" });

    registry.updateProviderConfig("example-provider", { anotherSetting: "value" });
    const updatedConfig = registry.getProviderConfig("example-provider");
    expect(updatedConfig).toEqual({ customSetting: "test", anotherSetting: "value" });
  });

  it("should handle provider enable/disable", () => {
    // Register provider (enablement controlled by ConfigManager)
    registry.register(provider);

    // Initially disabled in ConfigManager (default in test setup)
    // Need to explicitly enable in ConfigManager
    expect(registry.getEnabledProviders()).toHaveLength(0);

    // Enable via ConfigManager
    registry.setProviderEnabledInConfig("example-provider", true);
    expect(registry.getProvider("example-provider")).toBe(provider);
    expect(registry.getEnabledProviders()).toHaveLength(1);
  });

  it("should demonstrate the complete example", async () => {
    // This test verifies that the demonstration function runs without errors
    // The function returns the provider instance
    const result = await demonstrateInfrastructure();
    expect(result).toBeInstanceOf(ExampleMetadataProvider);
    expect(result.name).toBe("example-provider");
  });
});
