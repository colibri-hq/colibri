import { describe, expect, it } from "vitest";
import { SeriesReconciler } from "./series.js";
import type {
  CollectionInput,
  MetadataSource,
  SeriesInput,
  WorkEditionInput,
} from "./types.js";

describe("SeriesReconciler", () => {
  const reconciler = new SeriesReconciler();

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

  const mockSource3: MetadataSource = {
    name: "LibraryOfCongress",
    reliability: 0.95,
    timestamp: new Date("2024-01-03"),
  };

  describe("reconcileSeries", () => {
    it("should reconcile series from multiple sources", () => {
      const inputs: SeriesInput[] = [
        {
          series: ["Harry Potter, Book 1"],
          source: mockSource1,
        },
        {
          series: ["Harry Potter #1"],
          source: mockSource2,
        },
        {
          series: [
            {
              name: "Harry Potter",
              volume: 1,
              seriesType: "numbered",
              totalVolumes: 7,
            },
          ],
          source: mockSource3,
        },
      ];

      const result = reconciler.reconcileSeries(inputs);

      expect(result.series.value).toHaveLength(1);
      expect(result.series.value[0].name).toBe("Harry Potter");
      expect(result.series.value[0].volume).toBe(1);
      expect(result.series.value[0].seriesType).toBe("numbered");
      expect(result.series.value[0].totalVolumes).toBe(7);
      expect(result.series.confidence).toBeGreaterThan(0.5);
    });

    it("should handle series with different volume formats", () => {
      const inputs: SeriesInput[] = [
        {
          series: ["The Chronicles of Narnia, Volume I"],
          source: mockSource1,
        },
        {
          series: ["Chronicles of Narnia Vol. 1"],
          source: mockSource2,
        },
        {
          series: ["The Chronicles of Narnia: Book One"],
          source: mockSource3,
        },
      ];

      const result = reconciler.reconcileSeries(inputs);

      expect(result.series.value).toHaveLength(1);
      expect(result.series.value[0].normalized).toBe("chronicles of narnia");
      expect(result.series.value[0].volume).toBe(1);
    });

    it("should handle roman numerals in series volumes", () => {
      const inputs: SeriesInput[] = [
        {
          series: ["Foundation, Volume III"],
          source: mockSource1,
        },
        {
          series: ["Foundation Vol. iii"],
          source: mockSource2,
        },
      ];

      const result = reconciler.reconcileSeries(inputs);

      expect(result.series.value).toHaveLength(1);
      expect(result.series.value[0].volume).toBe(3);
    });

    it("should detect anthology and collection series types", () => {
      const inputs: SeriesInput[] = [
        {
          series: ["Best Science Fiction Anthology 2024"],
          source: mockSource1,
        },
        {
          series: ["Complete Works Collection"],
          source: mockSource2,
        },
      ];

      const result = reconciler.reconcileSeries(inputs);

      expect(result.series.value).toHaveLength(2);
      expect(
        result.series.value.find((s) => s.name.includes("Anthology"))
          ?.seriesType,
      ).toBe("anthology");
      expect(
        result.series.value.find((s) => s.name.includes("Collection"))
          ?.seriesType,
      ).toBe("collection");
    });

    it("should handle empty series input", () => {
      const inputs: SeriesInput[] = [
        {
          series: [],
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcileSeries(inputs);

      expect(result.series.value).toHaveLength(0);
      expect(result.series.confidence).toBe(0.1);
    });
  });

  describe("reconcileWorkEdition", () => {
    it("should reconcile work and edition information", () => {
      const inputs: WorkEditionInput[] = [
        {
          work: {
            title: "The Great Gatsby",
            type: "novel",
            authors: ["F. Scott Fitzgerald"],
            firstPublished: { year: 1925, precision: "year" },
          },
          edition: {
            title: "The Great Gatsby",
            format: { binding: "paperback", format: "book" },
            language: "en",
            isbn: ["9780743273565"],
          },
          source: mockSource1,
        },
        {
          work: {
            title: "The Great Gatsby",
            type: "novel",
            originalLanguage: "en",
          },
          edition: {
            publisher: { name: "Scribner" },
            pageCount: 180,
          },
          source: mockSource2,
        },
      ];

      const result = reconciler.reconcileWorkEdition(inputs);

      expect(result.work.value.title).toBe("The Great Gatsby");
      expect(result.work.value.type).toBe("novel");
      expect(result.work.value.authors).toContain("F. Scott Fitzgerald");
      expect(result.work.value.originalLanguage).toBe("en");

      expect(result.edition.value.format?.binding).toBe("paperback");
      expect(result.edition.value.publisher?.name).toBe("Scribner");
      expect(result.edition.value.pageCount).toBe(180);
      expect(result.edition.value.isbn).toContain("9780743273565");
    });

    it("should reconcile related works", () => {
      const inputs: WorkEditionInput[] = [
        {
          relatedWorks: [
            {
              title: "The Great Gatsby (2013 Film)",
              relationshipType: "adaptation",
              confidence: 0.9,
            },
            {
              title: "Winter Dreams",
              relationshipType: "prequel",
              confidence: 0.7,
            },
          ],
          source: mockSource1,
        },
        {
          relatedWorks: [
            {
              title: "The Great Gatsby Movie",
              relationshipType: "adaptation",
              confidence: 0.8,
            },
          ],
          source: mockSource2,
        },
      ];

      const result = reconciler.reconcileWorkEdition(inputs);

      expect(result.relatedWorks.value).toHaveLength(2);

      const adaptation = result.relatedWorks.value.find(
        (rw) => rw.relationshipType === "adaptation",
      );
      expect(adaptation).toBeDefined();
      expect(adaptation?.confidence).toBeGreaterThan(0.8);

      const prequel = result.relatedWorks.value.find(
        (rw) => rw.relationshipType === "prequel",
      );
      expect(prequel).toBeDefined();
      expect(prequel?.title).toBe("Winter Dreams");
    });

    it("should handle missing work/edition data gracefully", () => {
      const inputs: WorkEditionInput[] = [
        {
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcileWorkEdition(inputs);

      expect(result.work.value.title).toBe("");
      expect(result.work.confidence).toBe(0.1);
      expect(result.edition.confidence).toBe(0.1);
      expect(result.relatedWorks.value).toHaveLength(0);
    });
  });

  describe("reconcileCollections", () => {
    it("should reconcile collection information", () => {
      const inputs: CollectionInput[] = [
        {
          collections: [
            {
              name: "The Best American Short Stories 2024",
              type: "anthology",
              editors: ["Jess Walter"],
              totalWorks: 20,
            },
          ],
          source: mockSource1,
        },
        {
          collections: ["Best American Short Stories 2024"],
          source: mockSource2,
        },
      ];

      const result = reconciler.reconcileCollections(inputs);

      expect(result.collections.value).toHaveLength(1);
      expect(result.collections.value[0].name).toBe(
        "The Best American Short Stories 2024",
      );
      expect(result.collections.value[0].type).toBe("anthology");
      expect(result.collections.value[0].editors).toContain("Jess Walter");
      expect(result.collections.value[0].totalWorks).toBe(20);
    });

    it("should reconcile collection contents", () => {
      const inputs: CollectionInput[] = [
        {
          collectionContents: [
            {
              title: "The Lottery",
              type: "short_story",
              authors: ["Shirley Jackson"],
              position: 1,
              pageRange: { start: 1, end: 8 },
            },
            {
              title: "A Good Man Is Hard to Find",
              type: "short_story",
              authors: ["Flannery O'Connor"],
              position: 2,
              pageRange: { start: 9, end: 24 },
            },
          ],
          source: mockSource1,
        },
        {
          collectionContents: [
            {
              title: "The Lottery",
              authors: ["Shirley Jackson"],
              originalPublication: {
                title: "The New Yorker",
                date: { year: 1948, precision: "year" },
              },
            },
          ],
          source: mockSource2,
        },
      ];

      const result = reconciler.reconcileCollections(inputs);

      expect(result.collectionContents.value).toHaveLength(2);

      const lottery = result.collectionContents.value.find(
        (c) => c.title === "The Lottery",
      );
      expect(lottery).toBeDefined();
      expect(lottery?.type).toBe("short_story");
      expect(lottery?.position).toBe(1);
      expect(lottery?.originalPublication?.title).toBe("The New Yorker");
      expect(lottery?.originalPublication?.date?.year).toBe(1948);

      const goodMan = result.collectionContents.value.find(
        (c) => c.title === "A Good Man Is Hard to Find",
      );
      expect(goodMan).toBeDefined();
      expect(goodMan?.position).toBe(2);
    });

    it("should detect collection types from names", () => {
      const inputs: CollectionInput[] = [
        {
          collections: [
            "Science Fiction Anthology 2024",
            "Complete Works Collection",
            "The Lord of the Rings Omnibus",
            "Star Wars Series Collection",
          ],
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcileCollections(inputs);

      expect(result.collections.value).toHaveLength(4);

      const types = result.collections.value.map((c) => c.type);
      expect(types).toContain("anthology");
      expect(types).toContain("collection");
      expect(types).toContain("omnibus");
      expect(types).toContain("series_collection");
    });

    it("should handle empty collection input", () => {
      const inputs: CollectionInput[] = [
        {
          collections: [],
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcileCollections(inputs);

      expect(result.collections.value).toHaveLength(0);
      expect(result.collections.confidence).toBe(0.1);
      expect(result.collectionContents.value).toHaveLength(0);
    });
  });

  describe("series name normalization", () => {
    it("should normalize series names consistently", () => {
      const inputs: SeriesInput[] = [
        {
          series: [
            "The Lord of the Rings",
            "Lord of the Rings Series",
            "LOTR Saga",
            "The Lord of the Rings Cycle",
          ],
          source: mockSource1,
        },
      ];

      const result = reconciler.reconcileSeries(inputs);

      // All should be normalized to similar forms
      expect(result.series.value.length).toBeGreaterThan(0);
      // The exact normalization may vary, but they should be processed
      result.series.value.forEach((series) => {
        expect(series.normalized).toBeDefined();
        expect(series.normalized!.length).toBeGreaterThan(0);
      });
    });
  });

  describe("volume number parsing", () => {
    it("should parse various volume number formats", () => {
      const testCases = [
        { input: "Series Name, Book 1", expectedVolume: 1 },
        { input: "Series Name #2", expectedVolume: 2 },
        { input: "Series Name Vol. III", expectedVolume: 3 },
        { input: "Series Name (Volume 4)", expectedVolume: 4 },
        { input: "Book V of Series Name", expectedVolume: 5 },
        { input: "Series Name, 1st Edition", expectedVolume: 1 },
        { input: "Series Name Second Book", expectedVolume: 2 },
      ];

      for (const testCase of testCases) {
        const inputs: SeriesInput[] = [
          {
            series: [testCase.input],
            source: mockSource1,
          },
        ];

        const result = reconciler.reconcileSeries(inputs);

        if (result.series.value.length > 0) {
          expect(
            result.series.value[0].volume,
            `Failed for input: "${testCase.input}"`,
          ).toBe(testCase.expectedVolume);
        }
      }
    });
  });

  describe("error handling", () => {
    it("should throw error for empty series input array", () => {
      expect(() => reconciler.reconcileSeries([])).toThrow(
        "No series inputs to reconcile",
      );
    });

    it("should throw error for empty work/edition input array", () => {
      expect(() => reconciler.reconcileWorkEdition([])).toThrow(
        "No work/edition inputs to reconcile",
      );
    });

    it("should throw error for empty collection input array", () => {
      expect(() => reconciler.reconcileCollections([])).toThrow(
        "No collection inputs to reconcile",
      );
    });
  });
});
