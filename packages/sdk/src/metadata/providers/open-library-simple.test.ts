import { beforeEach, describe, expect, it } from "vitest";
import { OpenLibraryMetadataProvider } from "./open-library.js";
import { MetadataType } from "./provider.js";

describe("OpenLibraryMetadataProvider - Basic Tests", () => {
  let provider: OpenLibraryMetadataProvider;

  beforeEach(() => {
    provider = new OpenLibraryMetadataProvider();
  });

  describe("Provider Configuration", () => {
    it("should have correct name and priority", () => {
      expect(provider.name).toBe("OpenLibrary");
      expect(provider.priority).toBe(80);
    });

    it("should provide reliability scores for different data types", () => {
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBeGreaterThan(
        0.9,
      );
      expect(
        provider.getReliabilityScore(MetadataType.AUTHORS),
      ).toBeGreaterThan(0.8);
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBeGreaterThan(
        0.9,
      );
      expect(
        provider.getReliabilityScore(MetadataType.DESCRIPTION),
      ).toBeGreaterThan(0.6);
    });

    it("should support expected metadata types", () => {
      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PHYSICAL_DIMENSIONS)).toBe(
        false,
      );
    });
  });
});
