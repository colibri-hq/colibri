import type { Database } from "../database.js";
import type { JsonObject } from "../schema.js";
import type { SettingCategory, SettingKey, SettingValueMap, SettingWithValue } from "./types.js";
import { loadSettings, updateSettings } from "../resources/settings.js";
import {
  getAllSettingDefinitions,
  getSettingDefinition,
  getSettingDefinitionsByCategory,
  isValidSettingKey,
  SETTINGS_REGISTRY,
} from "./registry.js";

// Re-export types and registry functions
export * from "./types.js";
export {
  getAllSettingDefinitions,
  getSettingDefinition,
  getSettingDefinitionsByCategory,
  isValidSettingKey,
  SETTINGS_REGISTRY,
};

/**
 * Convert a URN setting key to an environment variable name.
 * Example: "urn:colibri:settings:general:instance-name" -> "COLIBRI_INSTANCE_NAME"
 */
export function settingKeyToEnvVar(key: SettingKey): string {
  // Extract the path after "urn:colibri:settings:"
  const path = key.replace("urn:colibri:settings:", "");

  // Split by colon, take only the last part (the actual setting name)
  const parts = path.split(":");
  const settingName = parts[parts.length - 1];

  // Convert to uppercase with underscores
  return `COLIBRI_${settingName.toUpperCase().replace(/-/g, "_")}`;
}

/**
 * Parse an environment variable value to the expected type.
 */
function parseEnvValue<K extends SettingKey>(
  key: K,
  envValue: string,
): SettingValueMap[K] | undefined {
  const definition = getSettingDefinition(key);

  try {
    switch (definition.type) {
      case "boolean":
        return (envValue.toLowerCase() === "true" || envValue === "1") as SettingValueMap[K];
      case "number":
        return Number(envValue) as unknown as SettingValueMap[K];
      case "string[]":
        return envValue.split(",").map((s) => s.trim()) as SettingValueMap[K];
      case "string":
      default:
        return envValue as SettingValueMap[K];
    }
  } catch {
    return undefined;
  }
}

/**
 * Get a setting value with precedence: environment > database > default.
 *
 * @param database - Database connection
 * @param key - The setting key
 * @returns The setting value and its source
 */
export async function getSetting<K extends SettingKey>(
  database: Database,
  key: K,
): Promise<{ value: SettingValueMap[K]; source: "environment" | "database" | "default" }> {
  const definition = getSettingDefinition(key);

  // 1. Check environment variable
  const envVar = settingKeyToEnvVar(key);
  const envValue = process.env[envVar];

  if (envValue !== undefined) {
    const parsed = parseEnvValue(key, envValue);
    if (parsed !== undefined) {
      // Validate the parsed value
      const result = definition.validation.safeParse(parsed);
      if (result.success) {
        return { value: result.data, source: "environment" };
      }
    }
  }

  // 2. Check database
  try {
    const settings = await loadSettings(database);
    const data = settings.data as Record<string, unknown> | null;

    if (data && key in data) {
      const dbValue = data[key];
      const result = definition.validation.safeParse(dbValue);
      if (result.success) {
        return { value: result.data, source: "database" };
      }
    }
  } catch {
    // Settings table might be empty, fall through to default
  }

  // 3. Return default
  return { value: definition.default, source: "default" };
}

/**
 * Get just the setting value (without source information).
 */
export async function getSettingValue<K extends SettingKey>(
  database: Database,
  key: K,
): Promise<SettingValueMap[K]> {
  const { value } = await getSetting(database, key);
  return value;
}

/**
 * Set a setting value in the database.
 *
 * @param database - Database connection
 * @param key - The setting key
 * @param value - The value to set
 * @param userId - The user ID making the change (for audit)
 */
export async function setSetting<K extends SettingKey>(
  database: Database,
  key: K,
  value: SettingValueMap[K],
  userId?: string,
): Promise<void> {
  const definition = getSettingDefinition(key);

  // Validate the value
  const result = definition.validation.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid value for setting ${key}: ${result.error.message}`);
  }

  // Load existing settings
  let existingData: JsonObject = {};
  try {
    const settings = await loadSettings(database);
    existingData = (settings.data as JsonObject) ?? {};
  } catch {
    // No existing settings
  }

  // Merge with new value
  const newData: JsonObject = { ...existingData, [key]: result.data };

  // Save new revision
  await updateSettings(database, { data: newData, updated_by: userId ? BigInt(userId) : null });
}

/**
 * Reset a setting to its default value.
 *
 * @param database - Database connection
 * @param key - The setting key
 * @param userId - The user ID making the change (for audit)
 */
export async function resetSetting<K extends SettingKey>(
  database: Database,
  key: K,
  userId?: string,
): Promise<void> {
  // Load existing settings
  let existingData: JsonObject = {};
  try {
    const settings = await loadSettings(database);
    existingData = (settings.data as JsonObject) ?? {};
  } catch {
    // No existing settings, nothing to reset
    return;
  }

  // Remove the key from data (will fall back to default on read)
  const { [key]: _, ...rest } = existingData;
  const newData: JsonObject = rest as JsonObject;

  // Save new revision
  await updateSettings(database, { data: newData, updated_by: userId ? BigInt(userId) : null });
}

/**
 * Get all settings with their current values, grouped by category.
 * Excludes the validation schema since it can't be serialized to JSON.
 */
export async function getAllSettings(
  database: Database,
): Promise<Record<SettingCategory, SettingWithValue[]>> {
  const definitions = getAllSettingDefinitions();
  const result: Record<SettingCategory, SettingWithValue[]> = {
    general: [],
    security: [],
    content: [],
    metadata: [],
  };

  for (const definition of definitions) {
    const { value, source } = await getSetting(database, definition.key as SettingKey);
    // Exclude validation schema - it can't be serialized to JSON
    const { validation: _, ...serializableDefinition } = definition;
    result[definition.category].push({
      ...serializableDefinition,
      value,
      source,
    } as SettingWithValue);
  }

  return result;
}

/**
 * Get all settings as a flat list with their current values.
 * Excludes the validation schema since it can't be serialized to JSON.
 */
export async function getAllSettingsFlat(database: Database): Promise<SettingWithValue[]> {
  const definitions = getAllSettingDefinitions();
  const settings: SettingWithValue[] = [];

  for (const definition of definitions) {
    const { value, source } = await getSetting(database, definition.key as SettingKey);
    // Exclude validation schema - it can't be serialized to JSON
    const { validation: _, ...serializableDefinition } = definition;
    settings.push({ ...serializableDefinition, value, source } as SettingWithValue);
  }

  return settings;
}

/**
 * Export all settings as a JSON object (for backup/export).
 */
export async function exportSettings(database: Database): Promise<Record<SettingKey, unknown>> {
  try {
    const settings = await loadSettings(database);
    return (settings.data as Record<SettingKey, unknown>) ?? {};
  } catch {
    return {} as Record<SettingKey, unknown>;
  }
}

/**
 * Import settings from a JSON object (for restore/import).
 * Only imports valid setting keys and validates values.
 *
 * @param database - Database connection
 * @param data - Settings data to import
 * @param userId - The user ID making the change (for audit)
 * @returns Object with imported keys and any errors
 */
export async function importSettings(
  database: Database,
  data: Record<string, unknown>,
  userId?: string,
): Promise<{ imported: SettingKey[]; errors: Array<{ key: string; error: string }> }> {
  const imported: SettingKey[] = [];
  const errors: Array<{ key: string; error: string }> = [];

  // Load existing settings
  let existingData: JsonObject = {};
  try {
    const settings = await loadSettings(database);
    existingData = (settings.data as JsonObject) ?? {};
  } catch {
    // No existing settings
  }

  const newData: JsonObject = { ...existingData };

  for (const [key, value] of Object.entries(data)) {
    if (!isValidSettingKey(key)) {
      errors.push({ key, error: "Unknown setting key" });
      continue;
    }

    const definition = getSettingDefinition(key);
    const result = definition.validation.safeParse(value);

    if (!result.success) {
      errors.push({ key, error: result.error.message });
      continue;
    }

    newData[key] = result.data;
    imported.push(key);
  }

  if (imported.length > 0) {
    await updateSettings(database, { data: newData, updated_by: userId ? BigInt(userId) : null });
  }

  return { imported, errors };
}
