import { describe, it, expect } from "vitest";
import {
  getLanguageByIso3,
  getLanguageByIso1,
  getLanguageByName,
  getAllLanguages,
  getLanguageCount,
} from "./indexes.js";

describe("getLanguageByIso3", () => {
  it("returns language for valid ISO 639-3 code", () => {
    const result = getLanguageByIso3("eng");
    expect(result).not.toBeNull();
    expect(result?.iso3).toBe("eng");
    expect(result?.iso1).toBe("en");
    expect(result?.name).toBe("English");
    expect(result?.type).toBe("living");
  });

  it("is case-insensitive", () => {
    expect(getLanguageByIso3("ENG")?.name).toBe("English");
    expect(getLanguageByIso3("Eng")?.name).toBe("English");
  });

  it("returns null for invalid code", () => {
    expect(getLanguageByIso3("xyz")).toBeNull();
    expect(getLanguageByIso3("")).toBeNull();
  });

  it("returns language without ISO 639-1", () => {
    // Acholi has no ISO 639-1 code
    const result = getLanguageByIso3("ach");
    expect(result?.iso3).toBe("ach");
    expect(result?.iso1).toBeNull();
  });
});

describe("getLanguageByIso1", () => {
  it("returns language for valid ISO 639-1 code", () => {
    const result = getLanguageByIso1("en");
    expect(result).not.toBeNull();
    expect(result?.iso3).toBe("eng");
    expect(result?.iso1).toBe("en");
    expect(result?.name).toBe("English");
  });

  it("is case-insensitive", () => {
    expect(getLanguageByIso1("EN")?.name).toBe("English");
    expect(getLanguageByIso1("En")?.name).toBe("English");
  });

  it("returns null for invalid code", () => {
    expect(getLanguageByIso1("xx")).toBeNull();
    expect(getLanguageByIso1("")).toBeNull();
  });

  it("returns null for 3-letter code", () => {
    // This function only handles 2-letter codes
    expect(getLanguageByIso1("eng")).toBeNull();
  });
});

describe("getLanguageByName", () => {
  it("returns language for exact name match", () => {
    const result = getLanguageByName("English");
    expect(result).not.toBeNull();
    expect(result?.iso3).toBe("eng");
    expect(result?.name).toBe("English");
  });

  it("is case-insensitive", () => {
    expect(getLanguageByName("english")?.iso3).toBe("eng");
    expect(getLanguageByName("ENGLISH")?.iso3).toBe("eng");
    expect(getLanguageByName("EnGlIsH")?.iso3).toBe("eng");
  });

  it("returns null for partial match", () => {
    // We don't do partial/fuzzy matching
    expect(getLanguageByName("Eng")).toBeNull();
  });

  it("returns null for invalid name", () => {
    expect(getLanguageByName("NotARealLanguage")).toBeNull();
    expect(getLanguageByName("")).toBeNull();
  });

  it("finds constructed languages like Klingon", () => {
    const result = getLanguageByName("Klingon");
    expect(result?.iso3).toBe("tlh");
    expect(result?.type).toBe("constructed");
  });
});

describe("getAllLanguages", () => {
  it("returns a non-empty array", () => {
    const languages = getAllLanguages();
    expect(Array.isArray(languages)).toBe(true);
    expect(languages.length).toBeGreaterThan(0);
  });

  it("returns frozen array", () => {
    const languages = getAllLanguages();
    expect(Object.isFrozen(languages)).toBe(true);
  });

  it("contains expected languages", () => {
    const languages = getAllLanguages();
    const english = languages.find((l) => l.iso3 === "eng");
    expect(english).toBeDefined();
    expect(english?.name).toBe("English");
  });

  it("all entries have required fields", () => {
    const languages = getAllLanguages();
    for (const lang of languages.slice(0, 100)) {
      // Sample first 100
      expect(typeof lang.iso3).toBe("string");
      expect(lang.iso3.length).toBe(3);
      expect(typeof lang.name).toBe("string");
      expect(lang.name.length).toBeGreaterThan(0);
      expect(["living", "historical", "extinct", "constructed", "special"]).toContain(lang.type);
    }
  });
});

describe("getLanguageCount", () => {
  it("returns a positive number", () => {
    const count = getLanguageCount();
    expect(count).toBeGreaterThan(0);
  });

  it("matches getAllLanguages length", () => {
    expect(getLanguageCount()).toBe(getAllLanguages().length);
  });

  it("is approximately 7,900 (ISO 639-3 standard)", () => {
    const count = getLanguageCount();
    expect(count).toBeGreaterThan(7800);
    expect(count).toBeLessThan(8100);
  });
});

describe("data integrity", () => {
  it("all ISO 639-1 codes are 2 characters", () => {
    const languages = getAllLanguages();
    for (const lang of languages) {
      if (lang.iso1 !== null) {
        expect(lang.iso1.length).toBe(2);
      }
    }
  });

  it("all ISO 639-3 codes are 3 characters", () => {
    const languages = getAllLanguages();
    for (const lang of languages) {
      expect(lang.iso3.length).toBe(3);
    }
  });

  it("ISO 639-3 codes are lowercase", () => {
    const languages = getAllLanguages();
    for (const lang of languages) {
      expect(lang.iso3).toBe(lang.iso3.toLowerCase());
    }
  });

  it("ISO 639-1 codes are lowercase", () => {
    const languages = getAllLanguages();
    for (const lang of languages) {
      if (lang.iso1 !== null) {
        expect(lang.iso1).toBe(lang.iso1.toLowerCase());
      }
    }
  });

  it("ISO 639-3 codes are unique", () => {
    const languages = getAllLanguages();
    const codes = languages.map((l) => l.iso3);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});
