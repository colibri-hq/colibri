import { beforeEach, describe, expect, it } from "vitest";
import { PerformanceMonitor } from "./performance.js";
import {
  BaseMetadataProvider,
  type CreatorQuery,
  type MetadataRecord,
  MetadataType,
  type MultiCriteriaQuery,
  type TitleQuery,
} from "./providers/provider.js";
import {
  filterByDataTypeSupport,
  filterByLanguageSupport,
  filterByReliability,
  getProviderLanguageSupport,
  type ProviderStrategy,
  registerProviderLanguageSupport,
  selectProviders,
  sortByPriority,
  sortBySpeed,
} from "./strategy.js";

/**
 * Mock provider for testing
 */
class MockProvider extends BaseMetadataProvider {
  constructor(
    public readonly name: string,
    public readonly priority: number,
    private supportedTypes: MetadataType[] = [],
    private reliabilityScores: Partial<Record<MetadataType, number>> = {},
  ) {
    super();
  }

  async searchByTitle(_query: TitleQuery): Promise<MetadataRecord[]> {
    return [];
  }

  async searchByISBN(_isbn: string): Promise<MetadataRecord[]> {
    return [];
  }

  async searchByCreator(_query: CreatorQuery): Promise<MetadataRecord[]> {
    return [];
  }

  async searchMultiCriteria(_query: MultiCriteriaQuery): Promise<MetadataRecord[]> {
    return [];
  }

  supportsDataType(dataType: MetadataType): boolean {
    if (this.supportedTypes.length === 0) {
      return super.supportsDataType(dataType);
    }
    return this.supportedTypes.includes(dataType);
  }

  getReliabilityScore(dataType: MetadataType): number {
    if (dataType in this.reliabilityScores) {
      return this.reliabilityScores[dataType]!;
    }
    return super.getReliabilityScore(dataType);
  }
}

describe("Strategy Module", () => {
  describe("sortByPriority", () => {
    it("should sort providers by priority (highest first)", () => {
      const providers = [
        new MockProvider("Low", 50),
        new MockProvider("High", 90),
        new MockProvider("Medium", 70),
      ];

      const sorted = sortByPriority(providers);

      expect(sorted.map((p) => p.name)).toEqual(["High", "Medium", "Low"]);
      expect(sorted.map((p) => p.priority)).toEqual([90, 70, 50]);
    });

    it("should handle providers with equal priority", () => {
      const providers = [
        new MockProvider("First", 80),
        new MockProvider("Second", 80),
        new MockProvider("Third", 80),
      ];

      const sorted = sortByPriority(providers);

      expect(sorted).toHaveLength(3);
      expect(sorted.every((p) => p.priority === 80)).toBe(true);
    });

    it("should not modify the original array", () => {
      const providers = [new MockProvider("A", 50), new MockProvider("B", 90)];

      const sorted = sortByPriority(providers);

      expect(sorted).not.toBe(providers);
      expect(providers[0].name).toBe("A");
    });
  });

  describe("sortBySpeed", () => {
    it("should sort by average duration when performance data is available", async () => {
      const providers = [
        new MockProvider("Slow", 80),
        new MockProvider("Fast", 70),
        new MockProvider("Medium", 75),
      ];

      const monitor = new PerformanceMonitor();

      // Record performance data with actual durations
      // Fast provider - 10ms
      monitor.recordOperation("search", 10, true, "Fast", undefined, 10);

      // Medium provider - 50ms
      monitor.recordOperation("search", 50, true, "Medium", undefined, 10);

      // Slow provider - 100ms
      monitor.recordOperation("search", 100, true, "Slow", undefined, 10);

      const sorted = sortBySpeed(providers, monitor);

      // Fast should be first even with lower priority
      expect(sorted[0].name).toBe("Fast");
      expect(sorted[1].name).toBe("Medium");
      expect(sorted[2].name).toBe("Slow");
    });

    it("should fall back to priority sorting without performance monitor", () => {
      const providers = [
        new MockProvider("Low", 50),
        new MockProvider("High", 90),
        new MockProvider("Medium", 70),
      ];

      const sorted = sortBySpeed(providers);

      expect(sorted.map((p) => p.name)).toEqual(["High", "Medium", "Low"]);
    });

    it("should use priority as tiebreaker when durations are equal", () => {
      const providers = [new MockProvider("LowPriority", 50), new MockProvider("HighPriority", 90)];

      const monitor = new PerformanceMonitor();

      // Both have same duration - 100ms
      monitor.recordOperation("search", 100, true, "LowPriority", undefined, 10);
      monitor.recordOperation("search", 100, true, "HighPriority", undefined, 10);

      const sorted = sortBySpeed(providers, monitor);

      expect(sorted[0].name).toBe("HighPriority");
    });
  });

  describe("filterByDataTypeSupport", () => {
    it("should filter providers by required data types", () => {
      const providers = [
        new MockProvider("Full", 80, [MetadataType.TITLE, MetadataType.AUTHORS, MetadataType.ISBN]),
        new MockProvider("Partial", 70, [MetadataType.TITLE]),
        new MockProvider("Different", 75, [MetadataType.PUBLISHER, MetadataType.SUBJECTS]),
      ];

      const filtered = filterByDataTypeSupport(providers, [
        MetadataType.TITLE,
        MetadataType.AUTHORS,
      ]);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Full");
    });

    it("should return all providers when no data types specified", () => {
      const providers = [new MockProvider("A", 80), new MockProvider("B", 70)];

      const filtered = filterByDataTypeSupport(providers, []);

      expect(filtered).toHaveLength(2);
    });

    it("should handle empty provider list", () => {
      const filtered = filterByDataTypeSupport([], [MetadataType.TITLE]);

      expect(filtered).toHaveLength(0);
    });
  });

  describe("filterByLanguageSupport", () => {
    beforeEach(() => {
      // Register language support for test providers
      registerProviderLanguageSupport("English", ["en"]);
      registerProviderLanguageSupport("MultiLang", ["en", "es", "fr", "de"]);
      registerProviderLanguageSupport("Asian", ["ja", "zh", "ko"]);
    });

    it("should prioritize providers by language support", () => {
      const providers = [
        new MockProvider("English", 80),
        new MockProvider("MultiLang", 70),
        new MockProvider("Asian", 75),
      ];

      const filtered = filterByLanguageSupport(providers, ["es", "fr"]);

      // MultiLang supports both, should be first
      expect(filtered[0].name).toBe("MultiLang");
    });

    it("should not exclude providers without language match", () => {
      const providers = [new MockProvider("English", 80), new MockProvider("Asian", 75)];

      const filtered = filterByLanguageSupport(providers, ["ja"]);

      // Should still return both, but Asian first
      expect(filtered).toHaveLength(2);
      expect(filtered[0].name).toBe("Asian");
    });

    it("should return all providers when no languages specified", () => {
      const providers = [new MockProvider("A", 80), new MockProvider("B", 70)];

      const filtered = filterByLanguageSupport(providers, []);

      expect(filtered).toHaveLength(2);
    });

    it("should use priority as tiebreaker for equal language scores", () => {
      registerProviderLanguageSupport("High", ["en", "es"]);
      registerProviderLanguageSupport("Low", ["en", "es"]);

      const providers = [new MockProvider("Low", 70), new MockProvider("High", 90)];

      const filtered = filterByLanguageSupport(providers, ["en"]);

      expect(filtered[0].name).toBe("High");
    });
  });

  describe("filterByReliability", () => {
    it("should filter providers by minimum reliability score", () => {
      const providers = [
        new MockProvider("HighReliability", 80, [], {
          [MetadataType.TITLE]: 0.95,
          [MetadataType.AUTHORS]: 0.9,
        }),
        new MockProvider("MediumReliability", 75, [], {
          [MetadataType.TITLE]: 0.7,
          [MetadataType.AUTHORS]: 0.6,
        }),
        new MockProvider("LowReliability", 70, [], {
          [MetadataType.TITLE]: 0.4,
          [MetadataType.AUTHORS]: 0.5,
        }),
      ];

      const filtered = filterByReliability(
        providers,
        [MetadataType.TITLE, MetadataType.AUTHORS],
        0.7,
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("HighReliability");
    });

    it("should return all providers when minScore is 0", () => {
      const providers = [new MockProvider("A", 80), new MockProvider("B", 70)];

      const filtered = filterByReliability(providers, [MetadataType.TITLE], 0);

      expect(filtered).toHaveLength(2);
    });

    it("should return all providers when no data types specified", () => {
      const providers = [new MockProvider("A", 80), new MockProvider("B", 70)];

      const filtered = filterByReliability(providers, [], 0.8);

      expect(filtered).toHaveLength(2);
    });
  });

  describe("selectProviders", () => {
    let providers: MockProvider[];

    beforeEach(() => {
      providers = [
        new MockProvider("OpenLibrary", 80, [
          MetadataType.TITLE,
          MetadataType.AUTHORS,
          MetadataType.ISBN,
          MetadataType.PUBLICATION_DATE,
        ]),
        new MockProvider("WikiData", 85, [
          MetadataType.TITLE,
          MetadataType.AUTHORS,
          MetadataType.SUBJECTS,
        ]),
        new MockProvider("LibraryOfCongress", 85, [
          MetadataType.TITLE,
          MetadataType.AUTHORS,
          MetadataType.ISBN,
          MetadataType.SUBJECTS,
        ]),
      ];
    });

    describe("'all' strategy", () => {
      it("should return all providers sorted by priority", () => {
        const selected = selectProviders(providers, {}, "all");

        expect(selected).toHaveLength(3);
        // WikiData and LibraryOfCongress both have priority 85
        expect([selected[0].name, selected[1].name]).toContain("WikiData");
        expect([selected[0].name, selected[1].name]).toContain("LibraryOfCongress");
        expect(selected[2].name).toBe("OpenLibrary");
      });

      it("should respect maxProviders option", () => {
        const selected = selectProviders(providers, {}, "all", { maxProviders: 2 });

        expect(selected).toHaveLength(2);
      });
    });

    describe("'priority' strategy", () => {
      it("should return providers sorted by priority", () => {
        const selected = selectProviders(providers, {}, "priority");

        expect(selected).toHaveLength(3);
        expect(selected[2].name).toBe("OpenLibrary");
      });

      it("should apply data type filters", () => {
        const selected = selectProviders(providers, {}, "priority", {
          requiredDataTypes: [MetadataType.ISBN],
        });

        expect(selected).toHaveLength(2);
        expect(selected.map((p) => p.name)).toContain("OpenLibrary");
        expect(selected.map((p) => p.name)).toContain("LibraryOfCongress");
        expect(selected.map((p) => p.name)).not.toContain("WikiData");
      });

      it("should exclude specified providers", () => {
        const selected = selectProviders(providers, {}, "priority", {
          excludeProviders: ["WikiData"],
        });

        expect(selected).toHaveLength(2);
        expect(selected.map((p) => p.name)).not.toContain("WikiData");
      });
    });

    describe("'fastest' strategy", () => {
      it("should use performance data to sort providers", () => {
        const monitor = new PerformanceMonitor();

        // Record WikiData as slow - 200ms
        monitor.recordOperation("search", 200, true, "WikiData", undefined, 10);

        // Record OpenLibrary as fast - 50ms
        monitor.recordOperation("search", 50, true, "OpenLibrary", undefined, 10);

        // Record LibraryOfCongress as medium - 100ms
        monitor.recordOperation("search", 100, true, "LibraryOfCongress", undefined, 10);

        const selected = selectProviders(providers, {}, "fastest", { performanceMonitor: monitor });

        expect(selected[0].name).toBe("OpenLibrary");
      });

      it("should fall back to priority without performance monitor", () => {
        const selected = selectProviders(providers, {}, "fastest");

        expect(selected).toHaveLength(3);
        expect(selected[2].name).toBe("OpenLibrary");
      });
    });

    describe("'consensus' strategy", () => {
      it("should select diverse providers for cross-validation", () => {
        const providers = [
          new MockProvider("TitleExpert", 80, [], {
            [MetadataType.TITLE]: 0.95,
            [MetadataType.AUTHORS]: 0.6,
          }),
          new MockProvider("AuthorExpert", 75, [], {
            [MetadataType.TITLE]: 0.6,
            [MetadataType.AUTHORS]: 0.95,
          }),
          new MockProvider("Generalist", 85, [], {
            [MetadataType.TITLE]: 0.8,
            [MetadataType.AUTHORS]: 0.8,
          }),
        ];

        const selected = selectProviders(
          providers,
          { title: "Test", authors: ["Author"] },
          "consensus",
          { maxProviders: 2 },
        );

        expect(selected).toHaveLength(2);
        // Should select diverse providers, not just by priority
        expect(selected.map((p) => p.name)).toContain("Generalist");
      });

      it("should respect maxProviders for consensus", () => {
        const selected = selectProviders(providers, { title: "Test" }, "consensus", {
          maxProviders: 1,
        });

        expect(selected).toHaveLength(1);
      });

      it("should select providers based on query data types", () => {
        const providers = [
          new MockProvider("ISBNExpert", 80, [MetadataType.ISBN], { [MetadataType.ISBN]: 0.95 }),
          new MockProvider("TitleExpert", 85, [MetadataType.TITLE], { [MetadataType.TITLE]: 0.95 }),
        ];

        const selected = selectProviders(providers, { isbn: "978-0-123456-78-9" }, "consensus", {
          maxProviders: 2,
        });

        // Should prefer ISBNExpert for ISBN query
        expect(selected.some((p) => p.name === "ISBNExpert")).toBe(true);
      });
    });

    it("should throw error for unknown strategy", () => {
      expect(() => {
        selectProviders(providers, {}, "invalid" as ProviderStrategy);
      }).toThrow("Unknown strategy: invalid");
    });
  });

  describe("Language support registry", () => {
    it("should register and retrieve language support", () => {
      registerProviderLanguageSupport("TestProvider", ["en", "es", "fr"]);

      const languages = getProviderLanguageSupport("TestProvider");

      expect(languages).toEqual(["en", "es", "fr"]);
    });

    it("should return default for unknown provider", () => {
      const languages = getProviderLanguageSupport("UnknownProvider");

      expect(languages).toEqual(["en"]);
    });

    it("should allow updating language support", () => {
      registerProviderLanguageSupport("UpdateTest", ["en"]);
      registerProviderLanguageSupport("UpdateTest", ["en", "es"]);

      const languages = getProviderLanguageSupport("UpdateTest");

      expect(languages).toEqual(["en", "es"]);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complex filtering and selection", () => {
      const providers = [
        new MockProvider(
          "Full",
          90,
          [MetadataType.TITLE, MetadataType.AUTHORS, MetadataType.ISBN, MetadataType.SUBJECTS],
          {
            [MetadataType.TITLE]: 0.95,
            [MetadataType.AUTHORS]: 0.9,
            [MetadataType.ISBN]: 0.95,
            [MetadataType.SUBJECTS]: 0.85,
          },
        ),
        new MockProvider("Partial", 85, [MetadataType.TITLE, MetadataType.AUTHORS], {
          [MetadataType.TITLE]: 0.7,
          [MetadataType.AUTHORS]: 0.6,
        }),
        new MockProvider("Excluded", 95, [
          MetadataType.TITLE,
          MetadataType.AUTHORS,
          MetadataType.ISBN,
        ]),
      ];

      const selected = selectProviders(providers, { title: "Test", isbn: "123" }, "priority", {
        maxProviders: 2,
        requiredDataTypes: [MetadataType.TITLE, MetadataType.ISBN],
        minReliabilityScore: 0.8,
        excludeProviders: ["Excluded"],
      });

      expect(selected).toHaveLength(1);
      expect(selected[0].name).toBe("Full");
    });

    it("should handle empty provider list gracefully", () => {
      const selected = selectProviders([], {}, "all");

      expect(selected).toHaveLength(0);
    });

    it("should handle query with all criteria types", () => {
      const query: MultiCriteriaQuery = {
        title: "The Lord of the Rings",
        authors: ["J.R.R. Tolkien"],
        isbn: "978-0-544-00341-5",
        language: "en",
        subjects: ["Fantasy", "Adventure"],
        publisher: "Houghton Mifflin",
        yearRange: [1950, 1960],
        fuzzy: true,
      };

      const providers = [new MockProvider("Comprehensive", 90, Object.values(MetadataType))];

      const selected = selectProviders(providers, query, "consensus");

      expect(selected).toHaveLength(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle provider with no supported data types", () => {
      // Create a provider that explicitly supports nothing
      const emptyProvider = new MockProvider("Empty", 80, [MetadataType.COVER_IMAGE]);

      const providers = [emptyProvider];

      const selected = selectProviders(providers, {}, "priority", {
        requiredDataTypes: [MetadataType.TITLE],
      });

      expect(selected).toHaveLength(0);
    });

    it("should handle maxProviders = 0", () => {
      const providers = [new MockProvider("A", 80), new MockProvider("B", 90)];

      const selected = selectProviders(providers, {}, "all", { maxProviders: 0 });

      expect(selected).toHaveLength(0);
    });

    it("should handle negative maxProviders", () => {
      const providers = [new MockProvider("A", 80), new MockProvider("B", 90)];

      const selected = selectProviders(providers, {}, "all", { maxProviders: -1 });

      // Negative maxProviders should be ignored
      expect(selected).toHaveLength(2);
    });

    it("should handle reliability score of exactly minimum", () => {
      const providers = [new MockProvider("Exact", 80, [], { [MetadataType.TITLE]: 0.8 })];

      const selected = selectProviders(providers, {}, "priority", {
        requiredDataTypes: [MetadataType.TITLE],
        minReliabilityScore: 0.8,
      });

      expect(selected).toHaveLength(1);
    });

    it("should handle very large provider list", () => {
      const providers = Array.from({ length: 100 }, (_, i) => new MockProvider(`Provider${i}`, i));

      const selected = selectProviders(providers, {}, "priority", { maxProviders: 5 });

      expect(selected).toHaveLength(5);
      expect(selected[0].priority).toBeGreaterThan(selected[4].priority);
    });
  });
});
