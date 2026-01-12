/**
 * Provider initialization and registration infrastructure
 *
 * This module handles the creation and registration of metadata providers
 * based on instance settings. It reads configuration from the database
 * and registers appropriate providers with the global registry.
 */

import type { Database } from "../database.js";
import { getSettingValue } from "../settings/index.js";
import { globalProviderRegistry } from "./registry.js";
import { globalConfigManager } from "./config.js";
import type { MetadataProvider } from "./providers/provider.js";

// Import all available providers
import { OpenLibraryMetadataProvider } from "./providers/open-library.js";
import { WikiDataMetadataProvider } from "./providers/wikidata.js";
import { LibraryOfCongressMetadataProvider } from "./providers/library-of-congress.js";
import { ISNIMetadataProvider } from "./providers/isni.js";
import { ViafMetadataProvider } from "./providers/viaf.js";
import { GoogleBooksMetadataProvider } from "./providers/google-books.js";
import { InternetArchiveMetadataProvider } from "./providers/internet-archive.js";
import { AmazonPaapiMetadataProvider } from "./providers/amazon.js";
import { ISBNdbMetadataProvider } from "./providers/isbndb.js";
import { DNBMetadataProvider } from "./providers/dnb.js";
import { BNBMetadataProvider } from "./providers/bnb.js";
import { CrossrefMetadataProvider } from "./providers/crossref.js";
import { SpringerNatureMetadataProvider } from "./providers/springer.js";
import { DOABMetadataProvider } from "./providers/doab.js";

/**
 * Provider factory function type
 */
type ProviderFactory = (
  database: Database,
  fetch?: typeof globalThis.fetch,
) => Promise<MetadataProvider | null>;

/**
 * Provider configuration for initialization
 */
interface ProviderInitConfig {
  /** Provider name (must match provider.name) */
  name: string;
  /** Factory function to create provider instance */
  factory: ProviderFactory;
  /** Whether this provider requires API credentials */
  requiresCredentials: boolean;
  /** Setting key to check if provider is enabled (optional for always-on providers) */
  enabledSettingKey?:
    | "urn:colibri:settings:metadata:google-books-enabled"
    | "urn:colibri:settings:metadata:amazon-enabled"
    | "urn:colibri:settings:metadata:isbndb-enabled"
    | "urn:colibri:settings:metadata:springer-enabled"
    | "urn:colibri:settings:metadata:librarything-enabled";
}

/**
 * All available provider configurations
 */
const PROVIDER_CONFIGS: ProviderInitConfig[] = [
  // Free providers (always available)
  {
    name: "OpenLibrary",
    factory: async (_, fetch) => new OpenLibraryMetadataProvider(fetch),
    requiresCredentials: false,
  },
  {
    name: "WikiData",
    factory: async (_, fetch) => new WikiDataMetadataProvider(fetch),
    requiresCredentials: false,
  },
  {
    name: "LibraryOfCongress",
    factory: async (_, fetch) => new LibraryOfCongressMetadataProvider(fetch),
    requiresCredentials: false,
  },
  {
    name: "ISNI",
    factory: async (_, fetch) => new ISNIMetadataProvider(fetch),
    requiresCredentials: false,
  },
  {
    name: "VIAF",
    factory: async (_, fetch) => new ViafMetadataProvider(fetch),
    requiresCredentials: false,
  },
  {
    name: "InternetArchive",
    factory: async (_, fetch) => new InternetArchiveMetadataProvider(fetch),
    requiresCredentials: false,
  },
  {
    name: "DNB",
    factory: async (_, fetch) => new DNBMetadataProvider(fetch),
    requiresCredentials: false,
  },
  {
    name: "BNB",
    factory: async (_, fetch) => new BNBMetadataProvider(fetch),
    requiresCredentials: false,
  },
  {
    name: "Crossref",
    factory: async (_, fetch) => new CrossrefMetadataProvider(fetch),
    requiresCredentials: false,
  },
  {
    name: "DOAB",
    factory: async (_, fetch) => new DOABMetadataProvider(fetch),
    requiresCredentials: false,
  },

  // Configurable providers (require settings)
  {
    name: "GoogleBooks",
    factory: createGoogleBooksProvider,
    requiresCredentials: false, // API key is optional
    enabledSettingKey: "urn:colibri:settings:metadata:google-books-enabled",
  },
  {
    name: "AmazonPAAPI",
    factory: createAmazonProvider,
    requiresCredentials: true,
    enabledSettingKey: "urn:colibri:settings:metadata:amazon-enabled",
  },
  {
    name: "ISBNdb",
    factory: createISBNdbProvider,
    requiresCredentials: true,
    enabledSettingKey: "urn:colibri:settings:metadata:isbndb-enabled",
  },
  {
    name: "SpringerNature",
    factory: createSpringerProvider,
    requiresCredentials: true,
    enabledSettingKey: "urn:colibri:settings:metadata:springer-enabled",
  },
];

/**
 * Create Google Books provider with optional API key
 */
async function createGoogleBooksProvider(
  database: Database,
  fetch?: typeof globalThis.fetch,
): Promise<MetadataProvider | null> {
  try {
    const apiKey = await getSettingValue(
      database,
      "urn:colibri:settings:metadata:google-books-api-key",
    );

    // Google Books works without an API key (with lower rate limits)
    return new GoogleBooksMetadataProvider(fetch, apiKey || undefined);
  } catch (error) {
    console.warn("Failed to create Google Books provider:", error);
    return null;
  }
}

/**
 * Create Amazon PAAPI provider with required credentials
 */
async function createAmazonProvider(
  database: Database,
  fetch?: typeof globalThis.fetch,
): Promise<MetadataProvider | null> {
  try {
    const [accessKey, secretKey, partnerTag, region] = await Promise.all([
      getSettingValue(
        database,
        "urn:colibri:settings:metadata:amazon-access-key",
      ),
      getSettingValue(
        database,
        "urn:colibri:settings:metadata:amazon-secret-key",
      ),
      getSettingValue(
        database,
        "urn:colibri:settings:metadata:amazon-partner-tag",
      ),
      getSettingValue(database, "urn:colibri:settings:metadata:amazon-region"),
    ]);

    // All credentials are required for Amazon
    if (!accessKey || !secretKey || !partnerTag) {
      console.debug(
        "Amazon PAAPI provider not configured: missing credentials",
      );
      return null;
    }

    return new AmazonPaapiMetadataProvider(
      {
        accessKey,
        secretKey,
        partnerTag,
        region:
          (region as
            | "us"
            | "uk"
            | "de"
            | "fr"
            | "jp"
            | "ca"
            | "it"
            | "es"
            | "au") || "us",
      },
      fetch,
    );
  } catch (error) {
    console.warn("Failed to create Amazon PAAPI provider:", error);
    return null;
  }
}

/**
 * Create ISBNdb provider with required API key
 */
async function createISBNdbProvider(
  database: Database,
  fetch?: typeof globalThis.fetch,
): Promise<MetadataProvider | null> {
  try {
    const apiKey = await getSettingValue(
      database,
      "urn:colibri:settings:metadata:isbndb-api-key",
    );

    if (!apiKey) {
      console.debug("ISBNdb provider not configured: missing API key");
      return null;
    }

    return new ISBNdbMetadataProvider(database, fetch);
  } catch (error) {
    console.warn("Failed to create ISBNdb provider:", error);
    return null;
  }
}

/**
 * Create Springer Nature provider with required API key
 */
async function createSpringerProvider(
  database: Database,
  fetch?: typeof globalThis.fetch,
): Promise<MetadataProvider | null> {
  try {
    const apiKey = await getSettingValue(
      database,
      "urn:colibri:settings:metadata:springer-api-key",
    );

    if (!apiKey) {
      console.debug("Springer Nature provider not configured: missing API key");
      return null;
    }

    return new SpringerNatureMetadataProvider(apiKey, fetch);
  } catch (error) {
    console.warn("Failed to create Springer Nature provider:", error);
    return null;
  }
}

/**
 * Initialize all metadata providers based on instance settings
 *
 * This function reads the enabled providers list from settings and
 * initializes each provider with appropriate credentials.
 *
 * @param database - Database connection for reading settings
 * @param fetch - Optional fetch implementation (defaults to globalThis.fetch)
 * @returns Promise<void>
 */
export async function initializeMetadataProviders(
  database: Database,
  fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<void> {
  // Get list of enabled providers from settings
  const enabledProviderNames = await getSettingValue(
    database,
    "urn:colibri:settings:metadata:enabled-providers",
  );

  // Create a set for fast lookup
  const enabledSet = new Set(enabledProviderNames);

  // Track initialization results
  const results: Array<{
    name: string;
    success: boolean;
    error?: string;
  }> = [];

  // Initialize each provider
  for (const config of PROVIDER_CONFIGS) {
    // Check if this provider is in the enabled list
    const isInEnabledList = enabledSet.has(config.name);

    // For providers with specific enable settings, also check that
    let isExplicitlyEnabled = true;
    if (config.enabledSettingKey) {
      try {
        isExplicitlyEnabled = await getSettingValue(
          database,
          config.enabledSettingKey,
        );
      } catch {
        // Default to disabled if setting check fails
        isExplicitlyEnabled = false;
      }
    }

    // Provider must be both in the enabled list AND explicitly enabled (if applicable)
    const shouldEnable = isInEnabledList && isExplicitlyEnabled;

    if (!shouldEnable) {
      results.push({
        name: config.name,
        success: true,
        error: "Provider disabled by settings",
      });
      continue;
    }

    try {
      // Create provider instance
      const provider = await config.factory(database, fetch);

      if (provider) {
        // Register with global registry
        globalProviderRegistry.register(provider);

        // Enable the provider in ConfigManager
        globalConfigManager.setProviderEnabled(provider.name, true);

        // Initialize the provider if it has an initialize method
        if (provider.initialize) {
          await provider.initialize();
        }

        results.push({ name: config.name, success: true });
      } else {
        results.push({
          name: config.name,
          success: false,
          error: "Factory returned null (missing credentials?)",
        });
      }
    } catch (error) {
      results.push({
        name: config.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Log summary
  const successCount = results.filter((r) => r.success && !r.error).length;
  const failedCount = results.filter((r) => !r.success).length;
  const disabledCount = results.filter(
    (r) => r.success && r.error?.includes("disabled"),
  ).length;

  console.info(
    `Metadata providers initialized: ${successCount} active, ${disabledCount} disabled, ${failedCount} failed`,
  );

  // Log failures in detail
  for (const result of results) {
    if (!result.success) {
      console.warn(`  - ${result.name}: ${result.error || "Unknown error"}`);
    }
  }
}

/**
 * Re-initialize a specific provider (e.g., after settings change)
 *
 * @param database - Database connection
 * @param providerName - Name of the provider to reinitialize
 * @param fetch - Optional fetch implementation
 */
export async function reinitializeProvider(
  database: Database,
  providerName: string,
  fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<boolean> {
  const config = PROVIDER_CONFIGS.find((c) => c.name === providerName);
  if (!config) {
    console.warn(`Unknown provider: ${providerName}`);
    return false;
  }

  // Unregister existing provider if present
  globalProviderRegistry.unregister(providerName);

  // Check if provider should be enabled
  const enabledProviderNames = await getSettingValue(
    database,
    "urn:colibri:settings:metadata:enabled-providers",
  );

  if (!enabledProviderNames.includes(providerName)) {
    console.debug(`Provider ${providerName} is not in enabled list`);
    return false;
  }

  // Check explicit enable setting if applicable
  if (config.enabledSettingKey) {
    const isEnabled = await getSettingValue(database, config.enabledSettingKey);
    if (!isEnabled) {
      console.debug(`Provider ${providerName} is explicitly disabled`);
      return false;
    }
  }

  try {
    const provider = await config.factory(database, fetch);
    if (provider) {
      // Register with global registry
      globalProviderRegistry.register(provider);

      // Enable the provider in ConfigManager
      globalConfigManager.setProviderEnabled(provider.name, true);

      if (provider.initialize) {
        await provider.initialize();
      }
      console.info(`Provider ${providerName} reinitialized successfully`);
      return true;
    }
  } catch (error) {
    console.warn(`Failed to reinitialize provider ${providerName}:`, error);
  }

  return false;
}

/**
 * Get initialization status for all providers
 */
export async function getProviderInitializationStatus(
  database: Database,
): Promise<
  Array<{
    name: string;
    registered: boolean;
    enabled: boolean;
    requiresCredentials: boolean;
    hasCredentials: boolean;
  }>
> {
  const enabledProviderNames = await getSettingValue(
    database,
    "urn:colibri:settings:metadata:enabled-providers",
  );
  const enabledSet = new Set(enabledProviderNames);

  const statuses: Array<{
    name: string;
    registered: boolean;
    enabled: boolean;
    requiresCredentials: boolean;
    hasCredentials: boolean;
  }> = [];

  for (const config of PROVIDER_CONFIGS) {
    const isRegistered =
      globalProviderRegistry.getProvider(config.name) !== undefined;
    const isEnabled = enabledSet.has(config.name);

    // Check if provider has required credentials
    let hasCredentials = true;
    if (config.requiresCredentials) {
      try {
        const provider = await config.factory(database);
        hasCredentials = provider !== null;
      } catch {
        hasCredentials = false;
      }
    }

    statuses.push({
      name: config.name,
      registered: isRegistered,
      enabled: isEnabled,
      requiresCredentials: config.requiresCredentials,
      hasCredentials,
    });
  }

  return statuses;
}

/**
 * Cleanup all registered providers
 */
export async function cleanupMetadataProviders(): Promise<void> {
  await globalProviderRegistry.cleanup();
  globalProviderRegistry.clear();
}

/**
 * Get list of all available provider names
 */
export function getAvailableProviderNames(): string[] {
  return PROVIDER_CONFIGS.map((c) => c.name);
}

/**
 * Check if a provider requires credentials
 */
export function providerRequiresCredentials(providerName: string): boolean {
  const config = PROVIDER_CONFIGS.find((c) => c.name === providerName);
  return config?.requiresCredentials ?? false;
}
