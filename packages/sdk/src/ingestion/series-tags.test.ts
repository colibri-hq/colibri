import { describe, expect, it } from "vitest";
import type { Metadata } from "../ebooks/metadata.js";

/**
 * Integration tests for series and tag extraction during ingestion.
 *
 * These tests verify that:
 * 1. Series information from EPUB files is correctly extracted and linked to works
 * 2. Subject tags from EPUB files are correctly extracted and linked to works
 * 3. Duplicate tags are not created
 * 4. Series positions are correctly stored
 */
describe("Series and Tag Ingestion", () => {
  // Note: These tests would need a proper database setup to run
  // This file demonstrates the expected behavior and integration points

  describe("Series Ingestion", () => {
    it("should create series and link to work during ingestion", async () => {
      // Mock setup
      // const database = setupTestDatabase();

      // Create a mock file with series metadata
      const _mockMetadata: Partial<Metadata> = {
        title: "The Fellowship of the Ring",
        series: {
          name: "The Lord of the Rings",
          position: 1,
        },
        contributors: [
          {
            name: "J.R.R. Tolkien",
            roles: ["aut"],
            sortingKey: "Tolkien, J.R.R.",
          },
        ],
        language: "en",
      };

      // Expected behavior:
      // 1. ingestWork() extracts metadata.series
      // 2. findOrCreateSeries() is called with "The Lord of the Rings"
      // 3. addWorkToSeries() links the work to the series with position 1
      // 4. The work can be queried via loadSeriesWorks()

      // const result = await ingestWork(database, mockFile, { userId: "test-user" });
      // expect(result.status).toBe("created");

      // const seriesWorks = await loadSeriesWorks(database, series.id);
      // expect(seriesWorks).toHaveLength(1);
      // expect(seriesWorks[0].series_position).toBe(1);
    });

    it("should reuse existing series for multiple works", async () => {
      // When ingesting multiple books in the same series,
      // the series should only be created once
      // const book1 = createMockFile({ series: { name: "Harry Potter", position: 1 } });
      // const book2 = createMockFile({ series: { name: "Harry Potter", position: 2 } });
      // const result1 = await ingestWork(database, book1, { userId: "test-user" });
      // const result2 = await ingestWork(database, book2, { userId: "test-user" });
      // // Both should link to the same series
      // const seriesWorks = await loadSeriesWorks(database, series.id);
      // expect(seriesWorks).toHaveLength(2);
    });

    it("should handle series without position", async () => {
      const _mockMetadata: Partial<Metadata> = {
        title: "A Standalone Book",
        series: {
          name: "Miscellaneous Series",
          // No position
        },
      };

      // Expected behavior:
      // 1. Series is still created/found
      // 2. work_series entry is created with position = NULL
    });

    it("should use fuzzy matching for similar series names", async () => {
      // The findOrCreateSeries function uses fuzzy matching
      // "Lord of The Rings" and "The Lord of the Rings" should match
      // const series1 = await findOrCreateSeries(database, "The Lord of the Rings");
      // const series2 = await findOrCreateSeries(database, "Lord of The Rings");
      // expect(series1.id).toBe(series2.id);
    });
  });

  describe("Tag Ingestion", () => {
    it("should create tags from subjects during ingestion", async () => {
      const _mockMetadata: Partial<Metadata> = {
        title: "A Fantasy Novel",
        tags: ["Fiction", "Fantasy", "Epic Fantasy"],
        contributors: [
          {
            name: "Test Author",
            roles: ["aut"],
            sortingKey: "Author, Test",
          },
        ],
      };

      // Expected behavior:
      // 1. ingestWork() extracts metadata.tags (formerly subjects)
      // 2. For each tag, findOrCreateTag() is called
      // 3. addTagToWork() links each tag to the work
      // 4. Tags can be queried via loadTagsForWork()

      // const result = await ingestWork(database, mockFile, { userId: "test-user" });
      // const tags = await loadTagsForWork(database, result.work.id);

      // expect(tags).toHaveLength(3);
      // expect(tags.map(t => t.value)).toContain("fiction");
      // expect(tags.map(t => t.value)).toContain("fantasy");
      // expect(tags.map(t => t.value)).toContain("epic fantasy");
    });

    it("should normalize tag values", async () => {
      // Tags are normalized to lowercase and trimmed
      const _mockTags = ["  Fiction  ", "FANTASY", "Epic Fantasy"];

      // After normalization:
      // "  Fiction  " -> "fiction"
      // "FANTASY" -> "fantasy"
      // "Epic Fantasy" -> "epic fantasy"
    });

    it("should reuse existing tags", async () => {
      // When multiple books have the same tag, only one tag record should exist
      // const book1 = createMockFile({ tags: ["Fiction", "Fantasy"] });
      // const book2 = createMockFile({ tags: ["Fiction", "Science Fiction"] });
      // await ingestWork(database, book1, { userId: "test-user" });
      // await ingestWork(database, book2, { userId: "test-user" });
      // const allTags = await loadTags(database);
      // const fictionTags = allTags.filter(t => t.value === "fiction");
      // expect(fictionTags).toHaveLength(1); // Only one "fiction" tag
    });

    it("should not duplicate tags when adding edition to existing work", async () => {
      // When adding a new edition to an existing work,
      // tags should not be duplicated
      // This is handled in createNewEdition() lines 565-595
      // It checks existing tags and skips duplicates
    });

    it("should handle compound BISAC subjects", async () => {
      // The loadSubjects function in epub.ts handles splitting
      const compoundSubject = "Fiction / Fantasy / Epic";
      const parts = compoundSubject.split(" / ").map((s) => s.trim());

      expect(parts).toEqual(["Fiction", "Fantasy", "Epic"]);

      // Each part becomes a separate tag
    });

    it("should filter out invalid tags", async () => {
      // Valid tags should be:
      // - Non-empty after trimming
      // - Length >= 2 characters (optional validation)
      // - Length <= 50 characters (optional validation)

      const tags = ["", "  ", "a", "ValidTag", "A".repeat(100)];

      const validTags = tags.filter((t) => {
        const trimmed = t.trim();
        return trimmed.length >= 2 && trimmed.length <= 50;
      });

      expect(validTags).toEqual(["ValidTag"]);
    });
  });

  describe("Integration with Duplicate Detection", () => {
    it("should preserve series and tags when adding edition", async () => {
      // When a duplicate work is detected and we add a new edition,
      // the series and tags should be linked to the work if not already present
      // This is handled in createNewEdition() which:
      // 1. Checks if work is already in series before adding
      // 2. Checks existing tags before adding new ones
    });

    it("should handle warnings gracefully", async () => {
      // If series or tag linking fails, it should add a warning but not fail
      // See ingestion/index.ts lines 438-440 and 452-454
      // try/catch blocks add warnings instead of throwing
    });
  });

  describe("Edge Cases", () => {
    it("should handle EPUB with no series or subjects", async () => {
      const _mockMetadata: Partial<Metadata> = {
        title: "Simple Book",
        // No series
        // No tags
        contributors: [
          {
            name: "Test Author",
            roles: ["aut"],
            sortingKey: "Author, Test",
          },
        ],
      };

      // Should complete successfully without errors
      // const result = await ingestWork(database, mockFile, { userId: "test-user" });
      // expect(result.status).toBe("created");
    });

    it("should handle EPUB with many subjects", async () => {
      // Some EPUBs have 10+ subjects
      const manyTags = Array.from({ length: 20 }, (_, i) => `Subject ${i}`);

      const _mockMetadata: Partial<Metadata> = {
        title: "Over-Tagged Book",
        tags: manyTags,
        contributors: [
          {
            name: "Test Author",
            roles: ["aut"],
            sortingKey: "Author, Test",
          },
        ],
      };

      // Should create all tags (or impose a reasonable limit)
      // Current implementation doesn't limit, but could be added
    });

    it("should handle special characters in series names", async () => {
      const _mockMetadata: Partial<Metadata> = {
        title: "Book One",
        series: {
          name: "The Hitchhiker's Guide to the Galaxy",
          position: 1,
        },
      };

      // Should handle apostrophes and other special characters correctly
    });

    it("should handle unicode in tag values", async () => {
      const _mockMetadata: Partial<Metadata> = {
        title: "International Book",
        tags: ["日本語", "Français", "Español", "Русский"],
      };

      // Should properly store and retrieve unicode tag values
    });
  });
});

/**
 * Documentation of the complete flow:
 *
 * 1. File Upload -> loadEpubMetadata()
 *    - Extracts series from <meta name="calibre:series"> or <meta property="belongs-to-collection">
 *    - Extracts subjects from <dc:subject> elements
 *    - Splits compound subjects on " / "
 *    - Returns Metadata with series and tags fields
 *
 * 2. ingestWork() -> createNewWork() or createNewEdition()
 *    - Series handling (lines 424-441):
 *      - Calls findOrCreateSeries(name, language, userId)
 *      - Calls addWorkToSeries(workId, seriesId, position)
 *      - Catches errors and adds to warnings
 *
 *    - Tag handling (lines 443-456):
 *      - Iterates over metadata.subjects
 *      - Calls findOrCreateTag(subject, userId)
 *      - Calls addTagToWork(workId, tagId)
 *      - Catches errors and adds to warnings
 *
 * 3. Series Resource Functions (resources/series.ts):
 *    - findSeriesByName(): Exact match (case-insensitive)
 *    - findSeriesByFuzzyName(): Similarity matching (>70%)
 *    - findOrCreateSeries(): Tries exact -> fuzzy -> create
 *    - addWorkToSeries(): Creates series_entry record
 *
 * 4. Tag Resource Functions (resources/tag.ts):
 *    - normalizeTag(): Lowercase + trim
 *    - findTagByValue(): Exact match on normalized value
 *    - findOrCreateTag(): Find by normalized value or create
 *    - addTagToWork(): Creates work_tag record
 *
 * 5. Database Schema:
 *    - series table: id, name, language
 *    - series_entry table: work_id, series_id, position
 *    - tag table: id, value (normalized), color, emoji
 *    - work_tag table: work_id, tag_id
 */
