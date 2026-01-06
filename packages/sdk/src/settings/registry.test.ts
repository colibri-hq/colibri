import { describe, expect, it } from "vitest";
import {
  getAllSettingDefinitions,
  getSettingDefinition,
  getSettingDefinitionsByCategory,
  isValidSettingKey,
  SETTINGS_REGISTRY,
} from "./registry.js";

describe("settings registry", () => {
  describe("SETTINGS_REGISTRY", () => {
    it("should contain all expected setting keys", () => {
      const expectedKeys = [
        "urn:colibri:settings:general:instance-name",
        "urn:colibri:settings:general:instance-description",
        "urn:colibri:settings:security:registration-enabled",
        "urn:colibri:settings:security:require-email-verification",
        "urn:colibri:settings:content:public-bookshelf-enabled",
        "urn:colibri:settings:content:default-visibility",
        "urn:colibri:settings:content:moderation-enabled",
        "urn:colibri:settings:metadata:auto-fetch-enabled",
        "urn:colibri:settings:metadata:provider-priority",
        "urn:colibri:settings:metadata:enabled-providers",
        "urn:colibri:settings:metadata:google-books-enabled",
        "urn:colibri:settings:metadata:google-books-api-key",
        "urn:colibri:settings:metadata:amazon-enabled",
        "urn:colibri:settings:metadata:amazon-access-key",
        "urn:colibri:settings:metadata:amazon-secret-key",
        "urn:colibri:settings:metadata:amazon-partner-tag",
        "urn:colibri:settings:metadata:amazon-region",
        "urn:colibri:settings:metadata:isbndb-enabled",
        "urn:colibri:settings:metadata:isbndb-api-key",
        "urn:colibri:settings:metadata:springer-enabled",
        "urn:colibri:settings:metadata:springer-api-key",
        "urn:colibri:settings:metadata:librarything-enabled",
        "urn:colibri:settings:metadata:librarything-api-key",
        "urn:colibri:settings:metadata:cover-fallback-enabled",
        "urn:colibri:settings:metadata:cover-min-width",
        "urn:colibri:settings:metadata:cover-min-height",
      ];

      for (const key of expectedKeys) {
        expect(SETTINGS_REGISTRY).toHaveProperty(key);
      }
    });

    it("should have valid definitions for all settings", () => {
      for (const [key, definition] of Object.entries(SETTINGS_REGISTRY)) {
        expect(definition.key).toBe(key);
        expect(definition.category).toBeDefined();
        expect(definition.type).toBeDefined();
        expect(definition.default).toBeDefined();
        expect(definition.validation).toBeDefined();
        expect(definition.adminOnly).toBeDefined();
        expect(definition.description).toBeDefined();
      }
    });

    it("should have correct types for each setting", () => {
      expect(
        SETTINGS_REGISTRY["urn:colibri:settings:general:instance-name"].type,
      ).toBe("string");
      expect(
        SETTINGS_REGISTRY["urn:colibri:settings:security:registration-enabled"]
          .type,
      ).toBe("boolean");
      expect(
        SETTINGS_REGISTRY["urn:colibri:settings:metadata:provider-priority"]
          .type,
      ).toBe("string[]");
    });
  });

  describe("getSettingDefinition", () => {
    it("should return the correct definition for a valid key", () => {
      const definition = getSettingDefinition(
        "urn:colibri:settings:general:instance-name",
      );

      expect(definition.key).toBe("urn:colibri:settings:general:instance-name");
      expect(definition.category).toBe("general");
      expect(definition.type).toBe("string");
      expect(definition.default).toBe("Colibri");
    });

    it("should throw an error for an invalid key", () => {
      expect(() => {
        // @ts-expect-error - testing invalid key
        getSettingDefinition("urn:colibri:settings:invalid:key");
      }).toThrow("Unknown setting key");
    });
  });

  describe("getAllSettingDefinitions", () => {
    it("should return all setting definitions", () => {
      const definitions = getAllSettingDefinitions();

      expect(definitions).toHaveLength(Object.keys(SETTINGS_REGISTRY).length);
    });

    it("should include all categories", () => {
      const definitions = getAllSettingDefinitions();
      const categories = new Set(definitions.map((d) => d.category));

      expect(categories).toContain("general");
      expect(categories).toContain("security");
      expect(categories).toContain("content");
      expect(categories).toContain("metadata");
    });
  });

  describe("getSettingDefinitionsByCategory", () => {
    it("should return only settings for the specified category", () => {
      const generalSettings = getSettingDefinitionsByCategory("general");

      expect(generalSettings.length).toBeGreaterThan(0);
      for (const setting of generalSettings) {
        expect(setting.category).toBe("general");
      }
    });

    it("should return correct number of settings per category", () => {
      const generalSettings = getSettingDefinitionsByCategory("general");
      const securitySettings = getSettingDefinitionsByCategory("security");
      const contentSettings = getSettingDefinitionsByCategory("content");
      const metadataSettings = getSettingDefinitionsByCategory("metadata");

      expect(generalSettings).toHaveLength(2);
      expect(securitySettings).toHaveLength(2);
      expect(contentSettings).toHaveLength(3);
      expect(metadataSettings).toHaveLength(19);
    });
  });

  describe("isValidSettingKey", () => {
    it("should return true for valid keys", () => {
      expect(
        isValidSettingKey("urn:colibri:settings:general:instance-name"),
      ).toBe(true);
      expect(
        isValidSettingKey("urn:colibri:settings:security:registration-enabled"),
      ).toBe(true);
    });

    it("should return false for invalid keys", () => {
      expect(isValidSettingKey("invalid-key")).toBe(false);
      expect(isValidSettingKey("urn:colibri:settings:invalid:key")).toBe(false);
      expect(isValidSettingKey("")).toBe(false);
    });
  });

  describe("validation schemas", () => {
    it("should validate string settings correctly", () => {
      const definition = getSettingDefinition(
        "urn:colibri:settings:general:instance-name",
      );

      expect(definition.validation.safeParse("My Library").success).toBe(true);
      expect(definition.validation.safeParse("").success).toBe(false); // min length 1
      expect(definition.validation.safeParse(123).success).toBe(false); // wrong type
    });

    it("should validate boolean settings correctly", () => {
      const definition = getSettingDefinition(
        "urn:colibri:settings:security:registration-enabled",
      );

      expect(definition.validation.safeParse(true).success).toBe(true);
      expect(definition.validation.safeParse(false).success).toBe(true);
      expect(definition.validation.safeParse("true").success).toBe(false); // wrong type
      expect(definition.validation.safeParse(1).success).toBe(false); // wrong type
    });

    it("should validate string[] settings correctly", () => {
      const definition = getSettingDefinition(
        "urn:colibri:settings:metadata:provider-priority",
      );

      expect(
        definition.validation.safeParse(["open-library", "wikidata"]).success,
      ).toBe(true);
      expect(definition.validation.safeParse([]).success).toBe(true);
      expect(definition.validation.safeParse("open-library").success).toBe(
        false,
      ); // wrong type
    });

    it("should validate enum settings correctly", () => {
      const definition = getSettingDefinition(
        "urn:colibri:settings:content:default-visibility",
      );

      expect(definition.validation.safeParse("private").success).toBe(true);
      expect(definition.validation.safeParse("shared").success).toBe(true);
      expect(definition.validation.safeParse("public").success).toBe(false); // not in enum
      expect(definition.validation.safeParse("invalid").success).toBe(false);
    });

    it("should validate number settings correctly", () => {
      const widthDefinition = getSettingDefinition(
        "urn:colibri:settings:metadata:cover-min-width",
      );
      const heightDefinition = getSettingDefinition(
        "urn:colibri:settings:metadata:cover-min-height",
      );

      expect(widthDefinition.validation.safeParse(400).success).toBe(true);
      expect(widthDefinition.validation.safeParse(0).success).toBe(true);
      expect(widthDefinition.validation.safeParse(-1).success).toBe(false); // min 0
      expect(widthDefinition.validation.safeParse("400").success).toBe(false); // wrong type

      expect(heightDefinition.validation.safeParse(600).success).toBe(true);
      expect(heightDefinition.validation.safeParse(0).success).toBe(true);
      expect(heightDefinition.validation.safeParse(-1).success).toBe(false); // min 0
    });
  });

  describe("metadata provider settings", () => {
    it("should mark API keys as secret", () => {
      const googleKey = getSettingDefinition(
        "urn:colibri:settings:metadata:google-books-api-key",
      );
      const amazonAccessKey = getSettingDefinition(
        "urn:colibri:settings:metadata:amazon-access-key",
      );
      const amazonSecretKey = getSettingDefinition(
        "urn:colibri:settings:metadata:amazon-secret-key",
      );
      const isbndbKey = getSettingDefinition(
        "urn:colibri:settings:metadata:isbndb-api-key",
      );
      const springerKey = getSettingDefinition(
        "urn:colibri:settings:metadata:springer-api-key",
      );
      const librarythingKey = getSettingDefinition(
        "urn:colibri:settings:metadata:librarything-api-key",
      );

      expect(googleKey.secret).toBe(true);
      expect(amazonAccessKey.secret).toBe(true);
      expect(amazonSecretKey.secret).toBe(true);
      expect(isbndbKey.secret).toBe(true);
      expect(springerKey.secret).toBe(true);
      expect(librarythingKey.secret).toBe(true);
    });

    it("should have correct default values for provider settings", () => {
      const enabledProviders = getSettingDefinition(
        "urn:colibri:settings:metadata:enabled-providers",
      );
      const googleEnabled = getSettingDefinition(
        "urn:colibri:settings:metadata:google-books-enabled",
      );
      const amazonRegion = getSettingDefinition(
        "urn:colibri:settings:metadata:amazon-region",
      );
      const coverFallback = getSettingDefinition(
        "urn:colibri:settings:metadata:cover-fallback-enabled",
      );

      expect(enabledProviders.default).toEqual([
        "OpenLibrary",
        "WikiData",
        "LibraryOfCongress",
        "ISNI",
        "VIAF",
      ]);
      expect(googleEnabled.default).toBe(false);
      expect(amazonRegion.default).toBe("us");
      expect(coverFallback.default).toBe(true);
    });

    it("should mark all metadata settings as admin-only", () => {
      const metadataSettings = getSettingDefinitionsByCategory("metadata");

      for (const setting of metadataSettings) {
        expect(setting.adminOnly).toBe(true);
      }
    });
  });
});
