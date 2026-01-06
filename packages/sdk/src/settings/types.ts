import type { z } from "zod";

/**
 * Categories for organizing instance settings.
 */
export type SettingCategory = "general" | "security" | "content" | "metadata";

/**
 * Value types supported by settings.
 */
export type SettingValueType = "boolean" | "string" | "number" | "string[]";

/**
 * Definition of a single instance setting.
 */
export interface SettingDefinition<T = unknown> {
  /**
   * URN key for the setting, e.g., "urn:colibri:settings:general:instance-name"
   */
  key: SettingKey;

  /**
   * Category for grouping in UI.
   */
  category: SettingCategory;

  /**
   * The type of value this setting holds.
   */
  type: SettingValueType;

  /**
   * Default value when not set.
   */
  default: T;

  /**
   * Zod schema for validation.
   */
  validation: z.ZodType<T>;

  /**
   * Whether this setting can only be modified by admins.
   */
  adminOnly: boolean;

  /**
   * Whether this setting should be stored in the vault (encrypted).
   */
  secret?: boolean;

  /**
   * Human-readable description.
   */
  description: string;
}

/**
 * All valid setting keys. This is derived from the registry.
 */
export type SettingKey =
  | "urn:colibri:settings:general:instance-name"
  | "urn:colibri:settings:general:instance-description"
  | "urn:colibri:settings:security:registration-enabled"
  | "urn:colibri:settings:security:require-email-verification"
  | "urn:colibri:settings:content:public-bookshelf-enabled"
  | "urn:colibri:settings:content:default-visibility"
  | "urn:colibri:settings:content:moderation-enabled"
  | "urn:colibri:settings:metadata:auto-fetch-enabled"
  | "urn:colibri:settings:metadata:provider-priority"
  | "urn:colibri:settings:metadata:enabled-providers"
  | "urn:colibri:settings:metadata:google-books-enabled"
  | "urn:colibri:settings:metadata:google-books-api-key"
  | "urn:colibri:settings:metadata:amazon-enabled"
  | "urn:colibri:settings:metadata:amazon-access-key"
  | "urn:colibri:settings:metadata:amazon-secret-key"
  | "urn:colibri:settings:metadata:amazon-partner-tag"
  | "urn:colibri:settings:metadata:amazon-region"
  | "urn:colibri:settings:metadata:isbndb-enabled"
  | "urn:colibri:settings:metadata:isbndb-api-key"
  | "urn:colibri:settings:metadata:springer-enabled"
  | "urn:colibri:settings:metadata:springer-api-key"
  | "urn:colibri:settings:metadata:librarything-enabled"
  | "urn:colibri:settings:metadata:librarything-api-key"
  | "urn:colibri:settings:metadata:cover-fallback-enabled"
  | "urn:colibri:settings:metadata:cover-min-width"
  | "urn:colibri:settings:metadata:cover-min-height"
  | "urn:colibri:settings:metadata:enrichment-enabled"
  | "urn:colibri:settings:metadata:enrichment-auto-apply-threshold";

/**
 * Map of setting keys to their value types.
 */
export interface SettingValueMap {
  "urn:colibri:settings:general:instance-name": string;
  "urn:colibri:settings:general:instance-description": string;
  "urn:colibri:settings:security:registration-enabled": boolean;
  "urn:colibri:settings:security:require-email-verification": boolean;
  "urn:colibri:settings:content:public-bookshelf-enabled": boolean;
  "urn:colibri:settings:content:default-visibility": "private" | "shared";
  "urn:colibri:settings:content:moderation-enabled": boolean;
  "urn:colibri:settings:metadata:auto-fetch-enabled": boolean;
  "urn:colibri:settings:metadata:provider-priority": string[];
  "urn:colibri:settings:metadata:enabled-providers": string[];
  "urn:colibri:settings:metadata:google-books-enabled": boolean;
  "urn:colibri:settings:metadata:google-books-api-key": string;
  "urn:colibri:settings:metadata:amazon-enabled": boolean;
  "urn:colibri:settings:metadata:amazon-access-key": string;
  "urn:colibri:settings:metadata:amazon-secret-key": string;
  "urn:colibri:settings:metadata:amazon-partner-tag": string;
  "urn:colibri:settings:metadata:amazon-region": string;
  "urn:colibri:settings:metadata:isbndb-enabled": boolean;
  "urn:colibri:settings:metadata:isbndb-api-key": string;
  "urn:colibri:settings:metadata:springer-enabled": boolean;
  "urn:colibri:settings:metadata:springer-api-key": string;
  "urn:colibri:settings:metadata:librarything-enabled": boolean;
  "urn:colibri:settings:metadata:librarything-api-key": string;
  "urn:colibri:settings:metadata:cover-fallback-enabled": boolean;
  "urn:colibri:settings:metadata:cover-min-width": number;
  "urn:colibri:settings:metadata:cover-min-height": number;
  "urn:colibri:settings:metadata:enrichment-enabled": boolean;
  "urn:colibri:settings:metadata:enrichment-auto-apply-threshold": number;
}

/**
 * Setting with its current value, for use in UI.
 * Excludes the validation schema since it can't be serialized to JSON.
 */
export interface SettingWithValue<
  K extends SettingKey = SettingKey,
> extends Omit<SettingDefinition<SettingValueMap[K]>, "validation"> {
  value: SettingValueMap[K];
  source: "environment" | "database" | "default";
}
