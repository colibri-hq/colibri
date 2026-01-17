import { describe, expect, it } from "vitest";
import { isValidLanguageCode, resolveLanguage, resolveLanguages } from "./resolve.js";

describe("resolveLanguage", () => {
  describe("ISO 639-1 codes (2-letter)", () => {
    it("resolves 'en' to English", () => {
      const result = resolveLanguage("en");
      expect(result).not.toBeNull();
      expect(result?.iso3).toBe("eng");
      expect(result?.iso1).toBe("en");
      expect(result?.name).toBe("English");
      expect(result?.matchType).toBe("iso1");
    });

    it("resolves 'de' to German", () => {
      const result = resolveLanguage("de");
      expect(result?.iso3).toBe("deu");
      expect(result?.name).toBe("German");
    });

    it("resolves 'fr' to French", () => {
      const result = resolveLanguage("fr");
      expect(result?.iso3).toBe("fra");
      expect(result?.name).toBe("French");
    });

    it("resolves 'ja' to Japanese", () => {
      const result = resolveLanguage("ja");
      expect(result?.iso3).toBe("jpn");
      expect(result?.name).toBe("Japanese");
    });

    it("is case-insensitive", () => {
      expect(resolveLanguage("EN")?.iso3).toBe("eng");
      expect(resolveLanguage("En")?.iso3).toBe("eng");
    });
  });

  describe("ISO 639-3 codes (3-letter)", () => {
    it("resolves 'eng' to English", () => {
      const result = resolveLanguage("eng");
      expect(result?.iso3).toBe("eng");
      expect(result?.iso1).toBe("en");
      expect(result?.name).toBe("English");
      expect(result?.matchType).toBe("iso3");
    });

    it("resolves 'deu' to German", () => {
      const result = resolveLanguage("deu");
      expect(result?.iso3).toBe("deu");
      expect(result?.name).toBe("German");
    });

    it("resolves 'fra' to French", () => {
      const result = resolveLanguage("fra");
      expect(result?.iso3).toBe("fra");
    });

    it("resolves languages without ISO 639-1 codes", () => {
      // Acholi - has no ISO 639-1 code
      const result = resolveLanguage("ach");
      expect(result?.iso3).toBe("ach");
      expect(result?.iso1).toBeNull();
      expect(result?.name).toBe("Acoli");
    });

    it("is case-insensitive", () => {
      expect(resolveLanguage("ENG")?.iso3).toBe("eng");
      expect(resolveLanguage("Eng")?.iso3).toBe("eng");
    });
  });

  describe("regional variants", () => {
    it("strips region from 'en-US'", () => {
      const result = resolveLanguage("en-US");
      expect(result?.iso3).toBe("eng");
      expect(result?.matchType).toBe("regional");
      expect(result?.input).toBe("en-US");
    });

    it("strips region from 'en-GB'", () => {
      const result = resolveLanguage("en-GB");
      expect(result?.iso3).toBe("eng");
      expect(result?.matchType).toBe("regional");
    });

    it("handles underscore separator 'en_US'", () => {
      const result = resolveLanguage("en_US");
      expect(result?.iso3).toBe("eng");
      expect(result?.matchType).toBe("regional");
    });

    it("handles complex tags like 'pt-BR'", () => {
      const result = resolveLanguage("pt-BR");
      expect(result?.iso3).toBe("por");
      expect(result?.name).toBe("Portuguese");
    });

    it("handles 3-letter codes with regions", () => {
      const result = resolveLanguage("eng-US");
      expect(result?.iso3).toBe("eng");
      expect(result?.matchType).toBe("iso3"); // Not regional because base is 3-letter
    });
  });

  describe("language names", () => {
    it("resolves 'English' case-insensitively", () => {
      expect(resolveLanguage("English")?.iso3).toBe("eng");
      expect(resolveLanguage("english")?.iso3).toBe("eng");
      expect(resolveLanguage("ENGLISH")?.iso3).toBe("eng");
    });

    it("resolves 'German'", () => {
      const result = resolveLanguage("German");
      expect(result?.iso3).toBe("deu");
      expect(result?.matchType).toBe("name");
    });

    it("resolves 'French'", () => {
      expect(resolveLanguage("French")?.iso3).toBe("fra");
    });

    it("resolves 'Spanish'", () => {
      expect(resolveLanguage("Spanish")?.iso3).toBe("spa");
    });

    it("resolves 'Japanese'", () => {
      expect(resolveLanguage("Japanese")?.iso3).toBe("jpn");
    });

    it("resolves 'Chinese'", () => {
      expect(resolveLanguage("Chinese")?.iso3).toBe("zho");
    });
  });

  describe("edge cases", () => {
    it("returns null for empty string", () => {
      expect(resolveLanguage("")).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
      expect(resolveLanguage("   ")).toBeNull();
    });

    it("returns null for invalid code", () => {
      expect(resolveLanguage("xyz")).toBeNull();
      expect(resolveLanguage("xx")).toBeNull();
    });

    it("returns null for non-string input", () => {
      // @ts-expect-error Testing runtime behavior
      expect(resolveLanguage(null)).toBeNull();
      // @ts-expect-error Testing runtime behavior
      expect(resolveLanguage(undefined)).toBeNull();
      // @ts-expect-error Testing runtime behavior
      expect(resolveLanguage(123)).toBeNull();
    });

    it("handles whitespace around valid codes", () => {
      expect(resolveLanguage("  en  ")?.iso3).toBe("eng");
      expect(resolveLanguage(" English ")?.iso3).toBe("eng");
    });

    it("preserves original input in result", () => {
      const result = resolveLanguage("  EN-US  ");
      expect(result?.input).toBe("EN-US");
    });
  });

  describe("language types", () => {
    it("includes living languages", () => {
      const result = resolveLanguage("eng");
      expect(result?.type).toBe("living");
    });

    it("includes extinct languages", () => {
      // Latin is a historical language
      const result = resolveLanguage("lat");
      expect(result?.type).toBe("historical");
    });

    it("includes constructed languages", () => {
      // Esperanto is constructed
      const result = resolveLanguage("epo");
      expect(result?.type).toBe("constructed");
    });
  });
});

describe("resolveLanguages (bulk)", () => {
  it("resolves multiple inputs", () => {
    const inputs = ["en", "de", "fr"];
    const results = resolveLanguages(inputs);

    expect(results.size).toBe(3);
    expect(results.get("en")?.iso3).toBe("eng");
    expect(results.get("de")?.iso3).toBe("deu");
    expect(results.get("fr")?.iso3).toBe("fra");
  });

  it("handles invalid inputs in bulk", () => {
    const inputs = ["en", "invalid", "de"];
    const results = resolveLanguages(inputs);

    expect(results.size).toBe(3);
    expect(results.get("en")?.iso3).toBe("eng");
    expect(results.get("invalid")).toBeNull();
    expect(results.get("de")?.iso3).toBe("deu");
  });

  it("handles empty array", () => {
    const results = resolveLanguages([]);
    expect(results.size).toBe(0);
  });

  it("handles mixed input types", () => {
    const inputs = ["en", "deu", "en-US", "German"];
    const results = resolveLanguages(inputs);

    expect(results.get("en")?.matchType).toBe("iso1");
    expect(results.get("deu")?.matchType).toBe("iso3");
    expect(results.get("en-US")?.matchType).toBe("regional");
    expect(results.get("German")?.matchType).toBe("name");
  });
});

describe("isValidLanguageCode", () => {
  it("validates ISO 639-1 codes", () => {
    expect(isValidLanguageCode("en")).toBe(true);
    expect(isValidLanguageCode("de")).toBe(true);
    expect(isValidLanguageCode("fr")).toBe(true);
  });

  it("validates ISO 639-3 codes", () => {
    expect(isValidLanguageCode("eng")).toBe(true);
    expect(isValidLanguageCode("deu")).toBe(true);
    expect(isValidLanguageCode("fra")).toBe(true);
  });

  it("validates regional variants", () => {
    expect(isValidLanguageCode("en-US")).toBe(true);
    expect(isValidLanguageCode("de-AT")).toBe(true);
    expect(isValidLanguageCode("pt_BR")).toBe(true);
  });

  it("rejects invalid codes", () => {
    expect(isValidLanguageCode("xyz")).toBe(false);
    expect(isValidLanguageCode("xx")).toBe(false);
    expect(isValidLanguageCode("")).toBe(false);
  });

  it("rejects language names (only codes are valid)", () => {
    // isValidLanguageCode is specifically for codes, not names
    expect(isValidLanguageCode("English")).toBe(false);
    expect(isValidLanguageCode("German")).toBe(false);
  });

  it("handles non-string input", () => {
    // @ts-expect-error Testing runtime behavior
    expect(isValidLanguageCode(null)).toBe(false);
    // @ts-expect-error Testing runtime behavior
    expect(isValidLanguageCode(undefined)).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isValidLanguageCode("EN")).toBe(true);
    expect(isValidLanguageCode("ENG")).toBe(true);
  });
});
