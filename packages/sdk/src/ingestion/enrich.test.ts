import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MetadataRecord } from "../metadata/provider.js";
import type { ExtractedMetadata } from "./types.js";
import { globalProviderRegistry } from "../metadata/registry.js";
import { enrichMetadata } from "./enrich.js";

// Mock the provider registry
vi.mock("../metadata/registry.js", () => ({
  globalProviderRegistry: { getProvider: vi.fn(), getEnabledProviders: vi.fn() },
}));

describe("enrichMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty result when no providers are available", async () => {
    vi.mocked(globalProviderRegistry.getEnabledProviders).mockReturnValue([]);

    const metadata: ExtractedMetadata = {
      title: "Test Book",
      contributors: [{ name: "Test Author", roles: ["aut"], sortingKey: "Author, Test" }],
    };

    const result = await enrichMetadata(metadata);

    expect(result.enriched).toEqual({});
    expect(result.sources).toEqual([]);
    expect(result.confidence).toEqual({});
  });

  it("should search by ISBN if available", async () => {
    const mockProvider = {
      name: "TestProvider",
      searchByISBN: vi
        .fn()
        .mockResolvedValue([
          {
            id: "test-1",
            source: "TestProvider",
            confidence: 0.9,
            timestamp: new Date(),
            title: "Enriched Title",
            authors: ["Enriched Author"],
            description: "Enriched description",
          } as MetadataRecord,
        ]),
      searchMultiCriteria: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(globalProviderRegistry.getEnabledProviders).mockReturnValue([mockProvider as any]);

    const metadata: ExtractedMetadata = {
      title: "Test Book",
      identifiers: [{ type: "isbn", value: "9781234567890" }],
    };

    const result = await enrichMetadata(metadata, { fillMissingOnly: false });

    expect(mockProvider.searchByISBN).toHaveBeenCalledWith("9781234567890");
    expect(result.enriched.title).toBe("Enriched Title");
    expect(result.sources).toContain("TestProvider");
  });

  it("should fall back to multi-criteria search when no ISBN", async () => {
    const mockProvider = {
      name: "TestProvider",
      searchByISBN: vi.fn().mockResolvedValue([]),
      searchMultiCriteria: vi
        .fn()
        .mockResolvedValue([
          {
            id: "test-1",
            source: "TestProvider",
            confidence: 0.85,
            timestamp: new Date(),
            title: "Found Title",
            authors: ["Found Author"],
          } as MetadataRecord,
        ]),
    };

    vi.mocked(globalProviderRegistry.getEnabledProviders).mockReturnValue([mockProvider as any]);

    const metadata: ExtractedMetadata = {
      title: "Test Book",
      contributors: [{ name: "Test Author", roles: ["aut"], sortingKey: "Author, Test" }],
    };

    const result = await enrichMetadata(metadata, { fillMissingOnly: false });

    expect(mockProvider.searchMultiCriteria).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Test Book", authors: ["Test Author"] }),
    );
    expect(result.enriched.title).toBe("Found Title");
  });

  it("should only fill missing fields when fillMissingOnly is true", async () => {
    const mockProvider = {
      name: "TestProvider",
      searchByISBN: vi.fn().mockResolvedValue([]),
      searchMultiCriteria: vi
        .fn()
        .mockResolvedValue([
          {
            id: "test-1",
            source: "TestProvider",
            confidence: 0.9,
            timestamp: new Date(),
            title: "New Title",
            description: "New Description",
          } as MetadataRecord,
        ]),
    };

    vi.mocked(globalProviderRegistry.getEnabledProviders).mockReturnValue([mockProvider as any]);

    const metadata: ExtractedMetadata = {
      title: "Existing Title",
      synopsis: undefined, // Missing field
    };

    const result = await enrichMetadata(metadata, { fillMissingOnly: true });

    // Title should not be enriched (already exists)
    expect(result.enriched.title).toBeUndefined();
    // Synopsis should be enriched (was missing)
    expect(result.enriched.synopsis).toBe("New Description");
  });

  it("should respect minConfidence threshold", async () => {
    const mockProvider = {
      name: "TestProvider",
      searchByISBN: vi.fn().mockResolvedValue([]),
      searchMultiCriteria: vi.fn().mockResolvedValue([
        {
          id: "test-1",
          source: "TestProvider",
          confidence: 0.5, // Below threshold
          timestamp: new Date(),
          title: "Low Confidence Title",
        } as MetadataRecord,
      ]),
    };

    vi.mocked(globalProviderRegistry.getEnabledProviders).mockReturnValue([mockProvider as any]);

    const metadata: ExtractedMetadata = { title: undefined };

    const result = await enrichMetadata(metadata, { fillMissingOnly: true, minConfidence: 0.7 });

    // Should not enrich because confidence is below threshold
    expect(result.enriched.title).toBeUndefined();
  });

  it("should merge results from multiple providers", async () => {
    const provider1 = {
      name: "Provider1",
      searchByISBN: vi.fn().mockResolvedValue([]),
      searchMultiCriteria: vi
        .fn()
        .mockResolvedValue([
          {
            id: "p1-1",
            source: "Provider1",
            confidence: 0.8,
            timestamp: new Date(),
            title: "Title from Provider 1",
            description: "Description from Provider 1",
          } as MetadataRecord,
        ]),
    };

    const provider2 = {
      name: "Provider2",
      searchByISBN: vi.fn().mockResolvedValue([]),
      searchMultiCriteria: vi.fn().mockResolvedValue([
        {
          id: "p2-1",
          source: "Provider2",
          confidence: 0.9, // Higher confidence
          timestamp: new Date(),
          title: "Title from Provider 2",
          language: "en",
        } as MetadataRecord,
      ]),
    };

    vi.mocked(globalProviderRegistry.getEnabledProviders).mockReturnValue([
      provider1 as any,
      provider2 as any,
    ]);

    const metadata: ExtractedMetadata = {
      title: "Search Query",
      contributors: [{ name: "Test Author", roles: ["aut"], sortingKey: "Author, Test" }],
    };

    const result = await enrichMetadata(metadata, { fillMissingOnly: false });

    // Should use Provider2's title (higher confidence) when fillMissingOnly is false
    expect(result.enriched.title).toBe("Title from Provider 2");
    // Should use Provider1's description (only source)
    expect(result.enriched.synopsis).toBe("Description from Provider 1");
    // Should use Provider2's language
    expect(result.enriched.language).toBe("en");
    // Should track both sources
    expect(result.sources).toContain("Provider1");
    expect(result.sources).toContain("Provider2");
  });

  it("should handle provider errors gracefully", async () => {
    const failingProvider = {
      name: "FailingProvider",
      searchByISBN: vi.fn().mockRejectedValue(new Error("Network error")),
      searchMultiCriteria: vi.fn().mockRejectedValue(new Error("Network error")),
    };

    const workingProvider = {
      name: "WorkingProvider",
      searchByISBN: vi.fn().mockResolvedValue([]),
      searchMultiCriteria: vi
        .fn()
        .mockResolvedValue([
          {
            id: "working-1",
            source: "WorkingProvider",
            confidence: 0.9,
            timestamp: new Date(),
            title: "Working Title",
          } as MetadataRecord,
        ]),
    };

    vi.mocked(globalProviderRegistry.getEnabledProviders).mockReturnValue([
      failingProvider as any,
      workingProvider as any,
    ]);

    const metadata: ExtractedMetadata = {
      title: "Search Query",
      contributors: [{ name: "Test Author", roles: ["aut"], sortingKey: "Author, Test" }],
    };

    const result = await enrichMetadata(metadata, { fillMissingOnly: false });

    // Should still get results from working provider
    expect(result.enriched.title).toBe("Working Title");
    expect(result.sources).toContain("WorkingProvider");
    expect(result.sources).not.toContain("FailingProvider");
  });

  it("should respect timeout option", async () => {
    const slowProvider = {
      name: "SlowProvider",
      searchByISBN: vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 5000))),
      searchMultiCriteria: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(globalProviderRegistry.getEnabledProviders).mockReturnValue([slowProvider as any]);

    const metadata: ExtractedMetadata = {
      title: "Test",
      identifiers: [{ type: "isbn", value: "9781234567890" }],
    };

    const result = await enrichMetadata(metadata, { timeout: 100 });

    // Should return empty result due to timeout
    expect(result.enriched).toEqual({});
    expect(result.sources).toEqual([]);
  });

  it("should merge subjects from multiple sources", async () => {
    const mockProvider = {
      name: "TestProvider",
      searchByISBN: vi.fn().mockResolvedValue([]),
      searchMultiCriteria: vi.fn().mockResolvedValue([
        {
          id: "test-1",
          source: "TestProvider",
          confidence: 0.9,
          timestamp: new Date(),
          subjects: ["Fiction", "Adventure"],
        } as MetadataRecord,
        {
          id: "test-2",
          source: "TestProvider",
          confidence: 0.85,
          timestamp: new Date(),
          subjects: ["Adventure", "Fantasy"], // "Adventure" is duplicate
        } as MetadataRecord,
      ]),
    };

    vi.mocked(globalProviderRegistry.getEnabledProviders).mockReturnValue([mockProvider as any]);

    const metadata: ExtractedMetadata = { title: "Test", subjects: undefined };

    const result = await enrichMetadata(metadata, { fillMissingOnly: true });

    // Should deduplicate subjects (case-insensitive)
    expect(result.enriched.subjects).toHaveLength(3);
    expect(result.enriched.subjects).toContain("fiction");
    expect(result.enriched.subjects).toContain("adventure");
    expect(result.enriched.subjects).toContain("fantasy");
  });

  it("should convert series information correctly", async () => {
    const mockProvider = {
      name: "TestProvider",
      searchByISBN: vi.fn().mockResolvedValue([]),
      searchMultiCriteria: vi
        .fn()
        .mockResolvedValue([
          {
            id: "test-1",
            source: "TestProvider",
            confidence: 0.9,
            timestamp: new Date(),
            series: { name: "The Lord of the Rings", volume: 2 },
          } as MetadataRecord,
        ]),
    };

    vi.mocked(globalProviderRegistry.getEnabledProviders).mockReturnValue([mockProvider as any]);

    const metadata: ExtractedMetadata = { title: "The Two Towers", series: undefined };

    const result = await enrichMetadata(metadata, { fillMissingOnly: true });

    expect(result.enriched.series).toEqual({ name: "The Lord of the Rings", position: 2 });
  });

  it("should use specific providers when specified", async () => {
    const provider1 = {
      name: "Provider1",
      searchByISBN: vi.fn().mockResolvedValue([]),
      searchMultiCriteria: vi
        .fn()
        .mockResolvedValue([
          {
            id: "p1-1",
            source: "Provider1",
            confidence: 0.9,
            timestamp: new Date(),
            title: "Title from Provider 1",
          } as MetadataRecord,
        ]),
    };

    const provider2 = {
      name: "Provider2",
      searchByISBN: vi.fn().mockResolvedValue([]),
      searchMultiCriteria: vi
        .fn()
        .mockResolvedValue([
          {
            id: "p2-1",
            source: "Provider2",
            confidence: 0.95,
            timestamp: new Date(),
            title: "Title from Provider 2",
          } as MetadataRecord,
        ]),
    };

    vi.mocked(globalProviderRegistry.getProvider).mockImplementation((name) => {
      if (name === "Provider1") return provider1 as any;
      if (name === "Provider2") return provider2 as any;
      return undefined;
    });

    const metadata: ExtractedMetadata = { title: "Search Query" };

    const result = await enrichMetadata(metadata, {
      providers: ["Provider1"],
      fillMissingOnly: false,
    });

    // Should only query Provider1
    expect(result.sources).toEqual(["Provider1"]);
    expect(result.enriched.title).toBe("Title from Provider 1");
  });
});
