import { describe, expect, it } from "vitest";
import { PlaceReconciler } from "./places.js";
import type { MetadataSource, PublicationInfoInput } from "./types.js";

describe("PlaceReconciler", () => {
  const reconciler = new PlaceReconciler();

  const mockSource1: MetadataSource = {
    name: "OpenLibrary",
    reliability: 0.8,
    timestamp: new Date("2024-01-01"),
  };

  const mockSource2: MetadataSource = {
    name: "WikiData",
    reliability: 0.9,
    timestamp: new Date("2024-01-02"),
  };

  describe("normalizePlace", () => {
    it("should normalize New York variations", () => {
      const variations = ["New York City", "NYC", "New York, NY", "Manhattan"];

      for (const variation of variations) {
        const result = reconciler.normalizePlace(variation);
        expect(result.normalized).toBe("new york");
      }
    });

    it("should normalize London variations", () => {
      const variations = [
        "London, England",
        "London, UK",
        "London, Great Britain",
      ];

      for (const variation of variations) {
        const result = reconciler.normalizePlace(variation);
        expect(result.normalized).toBe("london");
      }
    });

    it("should extract country information", () => {
      const result = reconciler.normalizePlace("Paris, France");
      expect(result.normalized).toBe("paris");
      expect(result.country).toBe("france");
    });

    it("should handle US state abbreviations", () => {
      const result = reconciler.normalizePlace("Boston, MA");
      expect(result.normalized).toBe("boston");
      expect(result.country).toBe("united states");
    });

    it("should handle UK variations", () => {
      const result = reconciler.normalizePlace("Cambridge, England");
      expect(result.normalized).toBe("cambridge");
      expect(result.country).toBe("united kingdom");
    });

    it("should handle German city variations", () => {
      const result = reconciler.normalizePlace("München, Germany");
      expect(result.normalized).toBe("munich");
      expect(result.country).toBe("germany");
    });

    it("should handle PublicationPlace objects", () => {
      const input = {
        name: "New York City",
        location: "USA",
      };

      const result = reconciler.normalizePlace(input);
      expect(result.name).toBe("New York City");
      expect(result.normalized).toBe("new york");
    });

    it("should handle unknown places", () => {
      const result = reconciler.normalizePlace("Unknown City, Fictional Place");
      expect(result.name).toBe("Unknown City, Fictional Place");
      expect(result.normalized).toBe("unknown city, fictional place");
      expect(result.country).toBeUndefined();
    });
  });

  describe("reconcilePlaces", () => {
    it("should handle single place input", () => {
      const inputs: PublicationInfoInput[] = [
        {
          place: "New York",
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcilePlaces(inputs);
      expect(result.value.name).toBe("New York");
      expect(result.value.normalized).toBe("new york");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sources).toHaveLength(1);
      expect(result.reasoning).toBe("Single valid place");
    });

    it("should deduplicate similar place names", () => {
      const inputs: PublicationInfoInput[] = [
        {
          place: "New York City",
          source: mockSource1,
        },
        {
          place: "NYC",
          source: mockSource2,
        },
      ];

      const result = reconciler.reconcilePlaces(inputs);
      expect(result.value.normalized).toBe("new york");
      expect(result.sources).toHaveLength(1);
    });

    it("should prefer more reliable sources in conflicts", () => {
      const inputs: PublicationInfoInput[] = [
        {
          place: "Boston",
          source: mockSource1, // reliability 0.8
        },
        {
          place: "Chicago",
          source: mockSource2, // reliability 0.9
        },
      ];

      const result = reconciler.reconcilePlaces(inputs);
      expect(result.value.name).toBe("Chicago");
      expect(result.conflicts).toBeDefined();
      expect(result.reasoning).toContain("conflict");
    });

    it("should boost confidence for major publishing centers", () => {
      const inputs: PublicationInfoInput[] = [
        {
          place: "London",
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcilePlaces(inputs);
      expect(result.confidence).toBeGreaterThan(mockSource1.reliability);
    });

    it("should boost confidence when country is identified", () => {
      const inputs: PublicationInfoInput[] = [
        {
          place: "Paris, France",
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcilePlaces(inputs);
      expect(result.value.country).toBe("france");
      expect(result.confidence).toBeGreaterThan(mockSource1.reliability);
    });

    it("should throw error for no places", () => {
      expect(() => reconciler.reconcilePlaces([])).toThrow(
        "No publication places to reconcile",
      );
    });

    it("should throw error for no valid places", () => {
      const inputs: PublicationInfoInput[] = [
        {
          place: "", // Empty place
          source: mockSource1,
        },
      ];

      expect(() => reconciler.reconcilePlaces(inputs)).toThrow(
        "No valid publication places found",
      );
    });
  });
});
