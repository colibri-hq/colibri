import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the OpenLibrary client before importing initialize-providers
vi.mock("@colibri-hq/open-library-client", () => ({
  Client: class MockClient {
    searchBook = vi.fn();
  },
}));

import {
  cleanupMetadataProviders,
  getAvailableProviderNames,
  getProviderInitializationStatus,
  initializeMetadataProviders,
  providerRequiresCredentials,
  reinitializeProvider,
} from "./initialize-providers.js";
import { globalProviderRegistry } from "./registry.js";

// Mock the database and settings
const mockDatabase = { selectFrom: vi.fn(), insertInto: vi.fn(), updateTable: vi.fn() } as any;

// Mock settings responses
const mockSettings: Record<string, any> = {
  "urn:colibri:settings:metadata:enabled-providers": ["OpenLibrary", "WikiData", "GoogleBooks"],
  "urn:colibri:settings:metadata:google-books-enabled": true,
  "urn:colibri:settings:metadata:google-books-api-key": "",
  "urn:colibri:settings:metadata:amazon-enabled": false,
  "urn:colibri:settings:metadata:amazon-access-key": "",
  "urn:colibri:settings:metadata:amazon-secret-key": "",
  "urn:colibri:settings:metadata:amazon-partner-tag": "",
  "urn:colibri:settings:metadata:amazon-region": "us",
  "urn:colibri:settings:metadata:isbndb-enabled": false,
  "urn:colibri:settings:metadata:isbndb-api-key": "",
};

// Mock the settings module
vi.mock("../settings/index.js", () => ({
  getSettingValue: vi.fn((_db, key) => {
    return Promise.resolve(mockSettings[key] ?? "");
  }),
  getSetting: vi.fn((_db, key) => {
    return Promise.resolve({ value: mockSettings[key] ?? "", source: "default" });
  }),
}));

// Mock fetch
const mockFetch = vi.fn();

describe("Provider Initialization Infrastructure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalProviderRegistry.clear();
    mockFetch.mockReset();
  });

  afterEach(async () => {
    await cleanupMetadataProviders();
  });

  describe("getAvailableProviderNames", () => {
    it("returns all available provider names", () => {
      const names = getAvailableProviderNames();

      expect(names).toContain("OpenLibrary");
      expect(names).toContain("WikiData");
      expect(names).toContain("LibraryOfCongress");
      expect(names).toContain("ISNI");
      expect(names).toContain("VIAF");
      expect(names).toContain("InternetArchive");
      expect(names).toContain("GoogleBooks");
      expect(names).toContain("AmazonPAAPI");
      expect(names).toContain("ISBNdb");
    });

    it("returns at least 9 providers", () => {
      const names = getAvailableProviderNames();
      expect(names.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe("providerRequiresCredentials", () => {
    it("returns false for free providers", () => {
      expect(providerRequiresCredentials("OpenLibrary")).toBe(false);
      expect(providerRequiresCredentials("WikiData")).toBe(false);
      expect(providerRequiresCredentials("LibraryOfCongress")).toBe(false);
      expect(providerRequiresCredentials("ISNI")).toBe(false);
      expect(providerRequiresCredentials("VIAF")).toBe(false);
      expect(providerRequiresCredentials("InternetArchive")).toBe(false);
    });

    it("returns false for Google Books (API key is optional)", () => {
      expect(providerRequiresCredentials("GoogleBooks")).toBe(false);
    });

    it("returns true for Amazon PAAPI", () => {
      expect(providerRequiresCredentials("AmazonPAAPI")).toBe(true);
    });

    it("returns true for ISBNdb", () => {
      expect(providerRequiresCredentials("ISBNdb")).toBe(true);
    });

    it("returns false for unknown providers", () => {
      expect(providerRequiresCredentials("UnknownProvider")).toBe(false);
    });
  });

  describe("initializeMetadataProviders", () => {
    it("initializes providers based on enabled settings", async () => {
      await initializeMetadataProviders(mockDatabase, mockFetch);

      // Check that enabled providers are registered
      const enabledProviders = globalProviderRegistry.listEnabledProviders();

      expect(enabledProviders).toContain("OpenLibrary");
      expect(enabledProviders).toContain("WikiData");
      expect(enabledProviders).toContain("GoogleBooks");
    });

    it("does not initialize disabled providers", async () => {
      // Amazon and ISBNdb are disabled in our mock settings
      await initializeMetadataProviders(mockDatabase, mockFetch);

      const enabledProviders = globalProviderRegistry.listEnabledProviders();

      expect(enabledProviders).not.toContain("AmazonPAAPI");
      expect(enabledProviders).not.toContain("ISBNdb");
    });

    it("skips providers with missing required credentials", async () => {
      // Add ISBNdb to enabled list but without API key
      mockSettings["urn:colibri:settings:metadata:enabled-providers"] = ["ISBNdb"];
      mockSettings["urn:colibri:settings:metadata:isbndb-enabled"] = true;
      mockSettings["urn:colibri:settings:metadata:isbndb-api-key"] = "";

      await initializeMetadataProviders(mockDatabase, mockFetch);

      const enabledProviders = globalProviderRegistry.listEnabledProviders();
      expect(enabledProviders).not.toContain("ISBNdb");
    });
  });

  describe("reinitializeProvider", () => {
    it("re-registers a provider after settings change", async () => {
      // First initialize
      mockSettings["urn:colibri:settings:metadata:enabled-providers"] = ["OpenLibrary"];
      await initializeMetadataProviders(mockDatabase, mockFetch);

      expect(globalProviderRegistry.listEnabledProviders()).toContain("OpenLibrary");

      // Reinitialize
      const result = await reinitializeProvider(mockDatabase, "OpenLibrary", mockFetch);

      expect(result).toBe(true);
      expect(globalProviderRegistry.listEnabledProviders()).toContain("OpenLibrary");
    });

    it("returns false for unknown providers", async () => {
      const result = await reinitializeProvider(mockDatabase, "UnknownProvider", mockFetch);

      expect(result).toBe(false);
    });

    it("returns false for disabled providers", async () => {
      mockSettings["urn:colibri:settings:metadata:enabled-providers"] = [];

      const result = await reinitializeProvider(mockDatabase, "OpenLibrary", mockFetch);

      expect(result).toBe(false);
    });
  });

  describe("getProviderInitializationStatus", () => {
    it("returns status for all available providers", async () => {
      const statuses = await getProviderInitializationStatus(mockDatabase);

      // Should return status for all available providers
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses.length).toBe(getAvailableProviderNames().length);

      // Each status should have required properties
      for (const status of statuses) {
        expect(status).toHaveProperty("name");
        expect(status).toHaveProperty("registered");
        expect(status).toHaveProperty("enabled");
        expect(status).toHaveProperty("requiresCredentials");
        expect(status).toHaveProperty("hasCredentials");
      }
    });

    it("correctly reports enabled status based on settings", async () => {
      mockSettings["urn:colibri:settings:metadata:enabled-providers"] = [
        "OpenLibrary",
        "GoogleBooks",
      ];

      const statuses = await getProviderInitializationStatus(mockDatabase);

      const openLibraryStatus = statuses.find((s) => s.name === "OpenLibrary");
      expect(openLibraryStatus).toBeDefined();
      expect(openLibraryStatus?.enabled).toBe(true);

      const wikiDataStatus = statuses.find((s) => s.name === "WikiData");
      expect(wikiDataStatus).toBeDefined();
      expect(wikiDataStatus?.enabled).toBe(false);
    });

    it("correctly reports credential requirements", async () => {
      const statuses = await getProviderInitializationStatus(mockDatabase);

      const amazonStatus = statuses.find((s) => s.name === "AmazonPAAPI");
      expect(amazonStatus?.requiresCredentials).toBe(true);

      const openLibraryStatus = statuses.find((s) => s.name === "OpenLibrary");
      expect(openLibraryStatus?.requiresCredentials).toBe(false);
    });
  });

  describe("cleanupMetadataProviders", () => {
    it("clears all registered providers", async () => {
      mockSettings["urn:colibri:settings:metadata:enabled-providers"] = ["OpenLibrary"];
      await initializeMetadataProviders(mockDatabase, mockFetch);

      expect(globalProviderRegistry.listProviders().length).toBeGreaterThan(0);

      await cleanupMetadataProviders();

      expect(globalProviderRegistry.listProviders().length).toBe(0);
    });
  });
});
