import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../database.js";
import {
  exportSettings,
  getSetting,
  getSettingValue,
  importSettings,
  resetSetting,
  setSetting,
  settingKeyToEnvVar,
} from "./index.js";

// Mock the settings resource
vi.mock("../resources/settings.js", () => ({ loadSettings: vi.fn(), updateSettings: vi.fn() }));

import { loadSettings, updateSettings } from "../resources/settings.js";

const mockLoadSettings = vi.mocked(loadSettings);
const mockUpdateSettings = vi.mocked(updateSettings);

// Create a mock database
const mockDatabase = {} as Database;

describe("settings index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any environment variables that might affect tests
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("COLIBRI_")) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("settingKeyToEnvVar", () => {
    it("should convert URN keys to environment variable names", () => {
      expect(settingKeyToEnvVar("urn:colibri:settings:general:instance-name")).toBe(
        "COLIBRI_INSTANCE_NAME",
      );
      expect(settingKeyToEnvVar("urn:colibri:settings:security:registration-enabled")).toBe(
        "COLIBRI_REGISTRATION_ENABLED",
      );
      expect(settingKeyToEnvVar("urn:colibri:settings:metadata:auto-fetch-enabled")).toBe(
        "COLIBRI_AUTO_FETCH_ENABLED",
      );
      expect(settingKeyToEnvVar("urn:colibri:settings:metadata:provider-priority")).toBe(
        "COLIBRI_PROVIDER_PRIORITY",
      );
    });
  });

  describe("getSetting", () => {
    it("should return environment variable value when set", async () => {
      process.env.COLIBRI_INSTANCE_NAME = "My Test Library";

      const result = await getSetting(mockDatabase, "urn:colibri:settings:general:instance-name");

      expect(result.value).toBe("My Test Library");
      expect(result.source).toBe("environment");
      expect(mockLoadSettings).not.toHaveBeenCalled();
    });

    it("should parse boolean environment variables correctly", async () => {
      process.env.COLIBRI_REGISTRATION_ENABLED = "true";

      const result = await getSetting(
        mockDatabase,
        "urn:colibri:settings:security:registration-enabled",
      );

      expect(result.value).toBe(true);
      expect(result.source).toBe("environment");
    });

    it("should parse boolean environment variables with 1/0", async () => {
      process.env.COLIBRI_REGISTRATION_ENABLED = "1";

      const result = await getSetting(
        mockDatabase,
        "urn:colibri:settings:security:registration-enabled",
      );

      expect(result.value).toBe(true);
      expect(result.source).toBe("environment");

      process.env.COLIBRI_REGISTRATION_ENABLED = "0";

      const result2 = await getSetting(
        mockDatabase,
        "urn:colibri:settings:security:registration-enabled",
      );

      expect(result2.value).toBe(false);
      expect(result2.source).toBe("environment");
    });

    it("should parse string array environment variables correctly", async () => {
      process.env.COLIBRI_PROVIDER_PRIORITY = "wikidata, open-library, google-books";

      const result = await getSetting(
        mockDatabase,
        "urn:colibri:settings:metadata:provider-priority",
      );

      expect(result.value).toEqual(["wikidata", "open-library", "google-books"]);
      expect(result.source).toBe("environment");
    });

    it("should return database value when no environment variable is set", async () => {
      mockLoadSettings.mockResolvedValueOnce({
        data: { "urn:colibri:settings:general:instance-name": "Database Library" },
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });

      const result = await getSetting(mockDatabase, "urn:colibri:settings:general:instance-name");

      expect(result.value).toBe("Database Library");
      expect(result.source).toBe("database");
      expect(mockLoadSettings).toHaveBeenCalledWith(mockDatabase);
    });

    it("should return default value when neither env nor database has value", async () => {
      mockLoadSettings.mockResolvedValueOnce({
        data: {},
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });

      const result = await getSetting(mockDatabase, "urn:colibri:settings:general:instance-name");

      expect(result.value).toBe("Colibri");
      expect(result.source).toBe("default");
    });

    it("should return default value when database throws", async () => {
      mockLoadSettings.mockRejectedValueOnce(new Error("No settings found"));

      const result = await getSetting(mockDatabase, "urn:colibri:settings:general:instance-name");

      expect(result.value).toBe("Colibri");
      expect(result.source).toBe("default");
    });

    it("should ignore invalid environment variable values", async () => {
      // Set an invalid value for a string setting (empty string fails validation)
      process.env.COLIBRI_INSTANCE_NAME = "";

      mockLoadSettings.mockResolvedValueOnce({
        data: { "urn:colibri:settings:general:instance-name": "Database Name" },
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });

      const result = await getSetting(mockDatabase, "urn:colibri:settings:general:instance-name");

      // Should fall back to database since empty string fails validation
      expect(result.value).toBe("Database Name");
      expect(result.source).toBe("database");
    });
  });

  describe("getSettingValue", () => {
    it("should return just the value without source", async () => {
      mockLoadSettings.mockResolvedValueOnce({
        data: { "urn:colibri:settings:general:instance-name": "Test Library" },
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });

      const value = await getSettingValue(
        mockDatabase,
        "urn:colibri:settings:general:instance-name",
      );

      expect(value).toBe("Test Library");
    });
  });

  describe("setSetting", () => {
    it("should merge new value with existing settings", async () => {
      mockLoadSettings.mockResolvedValueOnce({
        data: {
          "urn:colibri:settings:general:instance-name": "Old Name",
          "urn:colibri:settings:security:registration-enabled": true,
        },
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });
      mockUpdateSettings.mockResolvedValueOnce({} as never);

      await setSetting(mockDatabase, "urn:colibri:settings:general:instance-name", "New Name");

      expect(mockUpdateSettings).toHaveBeenCalledWith(mockDatabase, {
        data: {
          "urn:colibri:settings:general:instance-name": "New Name",
          "urn:colibri:settings:security:registration-enabled": true,
        },
        updated_by: null,
      });
    });

    it("should include user ID when provided", async () => {
      mockLoadSettings.mockResolvedValueOnce({
        data: {},
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });
      mockUpdateSettings.mockResolvedValueOnce({} as never);

      await setSetting(
        mockDatabase,
        "urn:colibri:settings:general:instance-name",
        "New Name",
        "123",
      );

      expect(mockUpdateSettings).toHaveBeenCalledWith(mockDatabase, {
        data: { "urn:colibri:settings:general:instance-name": "New Name" },
        updated_by: BigInt(123),
      });
    });

    it("should throw error for invalid values", async () => {
      await expect(
        setSetting(
          mockDatabase,
          "urn:colibri:settings:general:instance-name",
          "", // empty string fails validation
        ),
      ).rejects.toThrow("Invalid value for setting");
    });

    it("should create new settings when none exist", async () => {
      mockLoadSettings.mockRejectedValueOnce(new Error("No settings"));
      mockUpdateSettings.mockResolvedValueOnce({} as never);

      await setSetting(mockDatabase, "urn:colibri:settings:general:instance-name", "First Name");

      expect(mockUpdateSettings).toHaveBeenCalledWith(mockDatabase, {
        data: { "urn:colibri:settings:general:instance-name": "First Name" },
        updated_by: null,
      });
    });
  });

  describe("resetSetting", () => {
    it("should remove the key from settings", async () => {
      mockLoadSettings.mockResolvedValueOnce({
        data: {
          "urn:colibri:settings:general:instance-name": "Custom Name",
          "urn:colibri:settings:security:registration-enabled": false,
        },
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });
      mockUpdateSettings.mockResolvedValueOnce({} as never);

      await resetSetting(mockDatabase, "urn:colibri:settings:general:instance-name");

      expect(mockUpdateSettings).toHaveBeenCalledWith(mockDatabase, {
        data: { "urn:colibri:settings:security:registration-enabled": false },
        updated_by: null,
      });
    });

    it("should do nothing when no settings exist", async () => {
      mockLoadSettings.mockRejectedValueOnce(new Error("No settings"));

      await resetSetting(mockDatabase, "urn:colibri:settings:general:instance-name");

      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });
  });

  describe("exportSettings", () => {
    it("should return all settings data", async () => {
      const settingsData = {
        "urn:colibri:settings:general:instance-name": "My Library",
        "urn:colibri:settings:security:registration-enabled": true,
      };

      mockLoadSettings.mockResolvedValueOnce({
        data: settingsData,
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });

      const result = await exportSettings(mockDatabase);

      expect(result).toEqual(settingsData);
    });

    it("should return empty object when no settings exist", async () => {
      mockLoadSettings.mockRejectedValueOnce(new Error("No settings"));

      const result = await exportSettings(mockDatabase);

      expect(result).toEqual({});
    });
  });

  describe("importSettings", () => {
    it("should import valid settings", async () => {
      mockLoadSettings.mockResolvedValueOnce({
        data: {},
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });
      mockUpdateSettings.mockResolvedValueOnce({} as never);

      const result = await importSettings(mockDatabase, {
        "urn:colibri:settings:general:instance-name": "Imported Library",
        "urn:colibri:settings:security:registration-enabled": false,
      });

      expect(result.imported).toContain("urn:colibri:settings:general:instance-name");
      expect(result.imported).toContain("urn:colibri:settings:security:registration-enabled");
      expect(result.errors).toHaveLength(0);
    });

    it("should report errors for invalid keys", async () => {
      mockLoadSettings.mockResolvedValueOnce({
        data: {},
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });
      mockUpdateSettings.mockResolvedValueOnce({} as never);

      const result = await importSettings(mockDatabase, {
        "invalid-key": "value",
        "urn:colibri:settings:general:instance-name": "Valid Name",
      });

      expect(result.imported).toContain("urn:colibri:settings:general:instance-name");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].key).toBe("invalid-key");
      expect(result.errors[0].error).toBe("Unknown setting key");
    });

    it("should report errors for invalid values", async () => {
      mockLoadSettings.mockResolvedValueOnce({
        data: {},
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });

      const result = await importSettings(mockDatabase, {
        "urn:colibri:settings:general:instance-name": "", // invalid - empty string
        "urn:colibri:settings:security:registration-enabled": "not-a-boolean", // invalid
      });

      expect(result.imported).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });

    it("should merge with existing settings", async () => {
      mockLoadSettings.mockResolvedValueOnce({
        data: { "urn:colibri:settings:security:registration-enabled": true },
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });
      mockUpdateSettings.mockResolvedValueOnce({} as never);

      await importSettings(mockDatabase, {
        "urn:colibri:settings:general:instance-name": "New Name",
      });

      expect(mockUpdateSettings).toHaveBeenCalledWith(mockDatabase, {
        data: {
          "urn:colibri:settings:security:registration-enabled": true,
          "urn:colibri:settings:general:instance-name": "New Name",
        },
        updated_by: null,
      });
    });

    it("should include user ID when provided", async () => {
      mockLoadSettings.mockResolvedValueOnce({
        data: {},
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null,
      });
      mockUpdateSettings.mockResolvedValueOnce({} as never);

      await importSettings(
        mockDatabase,
        { "urn:colibri:settings:general:instance-name": "Test" },
        "456",
      );

      expect(mockUpdateSettings).toHaveBeenCalledWith(mockDatabase, {
        data: { "urn:colibri:settings:general:instance-name": "Test" },
        updated_by: BigInt(456),
      });
    });
  });
});
