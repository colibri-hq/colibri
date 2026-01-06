import { describe, expect, it } from "vitest";
import { PublisherReconciler } from "./publishers.js";
import type { MetadataSource, PublicationInfoInput } from "./types.js";

describe("PublisherReconciler", () => {
  const reconciler = new PublisherReconciler();

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

  describe("normalizePublisher", () => {
    it("should normalize basic publisher names", () => {
      const result = reconciler.normalizePublisher(
        "Penguin Random House Publishers Inc.",
      );
      expect(result.normalized).toBe("penguin random house");
      expect(result.name).toBe("Penguin Random House Publishers Inc.");
    });

    it("should handle known publisher variations", () => {
      const variations = [
        "Penguin",
        "Random House",
        "Bantam Books",
        "Dell Publishing",
      ];

      for (const variation of variations) {
        const result = reconciler.normalizePublisher(variation);
        expect(result.normalized).toBe("penguin random house");
      }
    });

    it("should normalize HarperCollins variations", () => {
      const variations = [
        "Harper",
        "Collins",
        "Harper & Row",
        "HarperCollins Publishers",
      ];

      for (const variation of variations) {
        const result = reconciler.normalizePublisher(variation);
        expect(result.normalized).toBe("harpercollins");
      }
    });

    it("should handle university presses", () => {
      const result = reconciler.normalizePublisher("Oxford University Press");
      expect(result.normalized).toBe("oxford university press");
    });

    it("should remove common suffixes", () => {
      const result = reconciler.normalizePublisher(
        "Example Publishing Company Inc.",
      );
      expect(result.normalized).toBe("example");
    });

    it("should expand abbreviations", () => {
      const result = reconciler.normalizePublisher("MIT Press");
      expect(result.normalized).toBe("mit press");
    });

    it("should handle Publisher objects", () => {
      const input = {
        name: "Penguin Random House",
        location: "New York",
      };

      const result = reconciler.normalizePublisher(input);
      expect(result.name).toBe("Penguin Random House");
      expect(result.location).toBe("New York");
      expect(result.normalized).toBe("penguin random house");
    });
  });

  describe("reconcilePublishers", () => {
    it("should handle single publisher input", () => {
      const inputs: PublicationInfoInput[] = [
        {
          publisher: "Penguin Random House",
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcilePublishers(inputs);
      expect(result.value.name).toBe("Penguin Random House");
      expect(result.value.normalized).toBe("penguin random house");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sources).toHaveLength(1);
      expect(result.reasoning).toBe("Single valid publisher");
    });

    it("should deduplicate similar publisher names", () => {
      const inputs: PublicationInfoInput[] = [
        {
          publisher: "Penguin",
          source: mockSource1,
        },
        {
          publisher: "Random House",
          source: mockSource2,
        },
      ];

      const result = reconciler.reconcilePublishers(inputs);
      expect(result.value.normalized).toBe("penguin random house");
      expect(result.sources).toHaveLength(1);
    });

    it("should prefer more reliable sources in conflicts", () => {
      const inputs: PublicationInfoInput[] = [
        {
          publisher: "Publisher A",
          source: mockSource1, // reliability 0.8
        },
        {
          publisher: "Publisher B",
          source: mockSource2, // reliability 0.9
        },
      ];

      const result = reconciler.reconcilePublishers(inputs);
      expect(result.value.name).toBe("Publisher B");
      expect(result.conflicts).toBeDefined();
      expect(result.reasoning).toContain("conflict");
    });

    it("should throw error for no publishers", () => {
      expect(() => reconciler.reconcilePublishers([])).toThrow(
        "No publishers to reconcile",
      );
    });

    it("should throw error for no valid publishers", () => {
      const inputs: PublicationInfoInput[] = [
        {
          publisher: "", // Empty publisher
          source: mockSource1,
        },
      ];

      expect(() => reconciler.reconcilePublishers(inputs)).toThrow(
        "No valid publishers found",
      );
    });

    it("should boost confidence for well-known publishers", () => {
      const inputs: PublicationInfoInput[] = [
        {
          publisher: "Oxford University Press",
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcilePublishers(inputs);
      expect(result.confidence).toBeGreaterThan(mockSource1.reliability);
    });
  });
});
