import { z } from "zod";
import type { SettingDefinition, SettingKey, SettingValueMap } from "./types.js";

/**
 * Registry of all instance settings with their definitions.
 */
export const SETTINGS_REGISTRY: {
  [K in SettingKey]: SettingDefinition<SettingValueMap[K]>;
} = {
  // General settings
  "urn:colibri:settings:general:instance-name": {
    key: "urn:colibri:settings:general:instance-name",
    category: "general",
    type: "string",
    default: "Colibri",
    validation: z.string().min(1).max(100),
    adminOnly: true,
    description: "The display name of this Colibri instance",
  },

  "urn:colibri:settings:general:instance-description": {
    key: "urn:colibri:settings:general:instance-description",
    category: "general",
    type: "string",
    default: "",
    validation: z.string().max(500),
    adminOnly: true,
    description: "A short description of this Colibri instance",
  },

  // Security settings
  "urn:colibri:settings:security:registration-enabled": {
    key: "urn:colibri:settings:security:registration-enabled",
    category: "security",
    type: "boolean",
    default: true,
    validation: z.boolean(),
    adminOnly: true,
    description: "Allow new users to register accounts",
  },

  "urn:colibri:settings:security:require-email-verification": {
    key: "urn:colibri:settings:security:require-email-verification",
    category: "security",
    type: "boolean",
    default: false,
    validation: z.boolean(),
    adminOnly: true,
    description: "Require email verification before allowing access",
  },

  // Content settings
  "urn:colibri:settings:content:public-bookshelf-enabled": {
    key: "urn:colibri:settings:content:public-bookshelf-enabled",
    category: "content",
    type: "boolean",
    default: false,
    validation: z.boolean(),
    adminOnly: true,
    description: "Allow users to create public bookshelves",
  },

  "urn:colibri:settings:content:default-visibility": {
    key: "urn:colibri:settings:content:default-visibility",
    category: "content",
    type: "string",
    default: "private",
    validation: z.enum(["private", "shared"]),
    adminOnly: true,
    description: "Default visibility for newly added works",
  },

  "urn:colibri:settings:content:moderation-enabled": {
    key: "urn:colibri:settings:content:moderation-enabled",
    category: "content",
    type: "boolean",
    default: false,
    validation: z.boolean(),
    adminOnly: true,
    description: "Enable the comment moderation system (reporting, hiding, activity logs)",
  },

  // Metadata settings
  "urn:colibri:settings:metadata:auto-fetch-enabled": {
    key: "urn:colibri:settings:metadata:auto-fetch-enabled",
    category: "metadata",
    type: "boolean",
    default: true,
    validation: z.boolean(),
    adminOnly: true,
    description: "Automatically fetch metadata when importing books",
  },

  "urn:colibri:settings:metadata:provider-priority": {
    key: "urn:colibri:settings:metadata:provider-priority",
    category: "metadata",
    type: "string[]",
    default: ["open-library", "wikidata"],
    validation: z.array(z.string()),
    adminOnly: true,
    description: "Order of metadata providers to query",
  },

  "urn:colibri:settings:metadata:enabled-providers": {
    key: "urn:colibri:settings:metadata:enabled-providers",
    category: "metadata",
    type: "string[]",
    default: ["OpenLibrary", "WikiData", "LibraryOfCongress", "ISNI", "VIAF"],
    validation: z.array(z.string()),
    adminOnly: true,
    description: "List of enabled metadata providers",
  },

  // Google Books
  "urn:colibri:settings:metadata:google-books-enabled": {
    key: "urn:colibri:settings:metadata:google-books-enabled",
    category: "metadata",
    type: "boolean",
    default: false,
    validation: z.boolean(),
    adminOnly: true,
    description: "Enable Google Books metadata provider",
  },

  "urn:colibri:settings:metadata:google-books-api-key": {
    key: "urn:colibri:settings:metadata:google-books-api-key",
    category: "metadata",
    type: "string",
    default: "",
    validation: z.string(),
    adminOnly: true,
    secret: true,
    description: "Google Books API key",
  },

  // Amazon PAAPI
  "urn:colibri:settings:metadata:amazon-enabled": {
    key: "urn:colibri:settings:metadata:amazon-enabled",
    category: "metadata",
    type: "boolean",
    default: false,
    validation: z.boolean(),
    adminOnly: true,
    description: "Enable Amazon Product Advertising API metadata provider",
  },

  "urn:colibri:settings:metadata:amazon-access-key": {
    key: "urn:colibri:settings:metadata:amazon-access-key",
    category: "metadata",
    type: "string",
    default: "",
    validation: z.string(),
    adminOnly: true,
    secret: true,
    description: "Amazon PAAPI access key",
  },

  "urn:colibri:settings:metadata:amazon-secret-key": {
    key: "urn:colibri:settings:metadata:amazon-secret-key",
    category: "metadata",
    type: "string",
    default: "",
    validation: z.string(),
    adminOnly: true,
    secret: true,
    description: "Amazon PAAPI secret key",
  },

  "urn:colibri:settings:metadata:amazon-partner-tag": {
    key: "urn:colibri:settings:metadata:amazon-partner-tag",
    category: "metadata",
    type: "string",
    default: "",
    validation: z.string(),
    adminOnly: true,
    description: "Amazon PAAPI partner tag",
  },

  "urn:colibri:settings:metadata:amazon-region": {
    key: "urn:colibri:settings:metadata:amazon-region",
    category: "metadata",
    type: "string",
    default: "us",
    validation: z.string(),
    adminOnly: true,
    description: "Amazon PAAPI region",
  },

  // ISBNdb
  "urn:colibri:settings:metadata:isbndb-enabled": {
    key: "urn:colibri:settings:metadata:isbndb-enabled",
    category: "metadata",
    type: "boolean",
    default: false,
    validation: z.boolean(),
    adminOnly: true,
    description: "Enable ISBNdb metadata provider",
  },

  "urn:colibri:settings:metadata:isbndb-api-key": {
    key: "urn:colibri:settings:metadata:isbndb-api-key",
    category: "metadata",
    type: "string",
    default: "",
    validation: z.string(),
    adminOnly: true,
    secret: true,
    description: "ISBNdb API key",
  },

  // Springer Nature
  "urn:colibri:settings:metadata:springer-enabled": {
    key: "urn:colibri:settings:metadata:springer-enabled",
    category: "metadata",
    type: "boolean",
    default: false,
    validation: z.boolean(),
    adminOnly: true,
    description: "Enable Springer Nature metadata provider",
  },

  "urn:colibri:settings:metadata:springer-api-key": {
    key: "urn:colibri:settings:metadata:springer-api-key",
    category: "metadata",
    type: "string",
    default: "",
    validation: z.string(),
    adminOnly: true,
    secret: true,
    description: "Springer Nature API key",
  },

  // LibraryThing (for covers)
  "urn:colibri:settings:metadata:librarything-enabled": {
    key: "urn:colibri:settings:metadata:librarything-enabled",
    category: "metadata",
    type: "boolean",
    default: false,
    validation: z.boolean(),
    adminOnly: true,
    description: "Enable LibraryThing cover provider",
  },

  "urn:colibri:settings:metadata:librarything-api-key": {
    key: "urn:colibri:settings:metadata:librarything-api-key",
    category: "metadata",
    type: "string",
    default: "",
    validation: z.string(),
    adminOnly: true,
    secret: true,
    description: "LibraryThing API key",
  },

  // Cover fetching options
  "urn:colibri:settings:metadata:cover-fallback-enabled": {
    key: "urn:colibri:settings:metadata:cover-fallback-enabled",
    category: "metadata",
    type: "boolean",
    default: true,
    validation: z.boolean(),
    adminOnly: true,
    description: "Enable fallback cover fetching from multiple sources",
  },

  "urn:colibri:settings:metadata:cover-min-width": {
    key: "urn:colibri:settings:metadata:cover-min-width",
    category: "metadata",
    type: "number",
    default: 400,
    validation: z.number().min(0),
    adminOnly: true,
    description: "Minimum cover image width in pixels",
  },

  "urn:colibri:settings:metadata:cover-min-height": {
    key: "urn:colibri:settings:metadata:cover-min-height",
    category: "metadata",
    type: "number",
    default: 600,
    validation: z.number().min(0),
    adminOnly: true,
    description: "Minimum cover image height in pixels",
  },

  // Enrichment settings
  "urn:colibri:settings:metadata:enrichment-enabled": {
    key: "urn:colibri:settings:metadata:enrichment-enabled",
    category: "metadata",
    type: "boolean",
    default: true,
    validation: z.boolean(),
    adminOnly: true,
    description: "Automatically enrich metadata for newly imported books in the background",
  },

  "urn:colibri:settings:metadata:enrichment-auto-apply-threshold": {
    key: "urn:colibri:settings:metadata:enrichment-auto-apply-threshold",
    category: "metadata",
    type: "number",
    default: 0.9,
    validation: z.number().min(0).max(1),
    adminOnly: true,
    description: "Confidence threshold for auto-applying enrichment improvements (0.0 to 1.0)",
  },
} as const;

/**
 * Get the definition for a specific setting key.
 */
export function getSettingDefinition<K extends SettingKey>(
  key: K,
): SettingDefinition<SettingValueMap[K]> {
  const definition = SETTINGS_REGISTRY[key];
  if (!definition) {
    throw new Error(`Unknown setting key: ${key}`);
  }
  return definition;
}

/**
 * Get all setting definitions.
 */
export function getAllSettingDefinitions(): SettingDefinition[] {
  return Object.values(SETTINGS_REGISTRY);
}

/**
 * Get all setting definitions for a specific category.
 */
export function getSettingDefinitionsByCategory(
  category: SettingDefinition["category"],
): SettingDefinition[] {
  return Object.values(SETTINGS_REGISTRY).filter((def) => def.category === category);
}

/**
 * Check if a key is a valid setting key.
 */
export function isValidSettingKey(key: string): key is SettingKey {
  return key in SETTINGS_REGISTRY;
}
