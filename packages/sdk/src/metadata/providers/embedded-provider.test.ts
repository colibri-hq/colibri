/**
 * Tests for Embedded Metadata Provider
 *
 * These tests verify that:
 * - Metadata extraction from ebooks creates proper MetadataRecords
 * - ISBNs are normalized consistently with cache-keys.ts
 * - Author names are normalized using open-library/name-utils.ts
 * - Confidence scoring reflects metadata completeness
 * - The provider can participate in aggregation pipelines
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { Metadata as EbookMetadata } from "../../ebooks/metadata.js";
import { DEFAULT_EMBEDDED_PROVIDER_CONFIG, EmbeddedMetadataProvider } from "./embedded-provider.js";
import { MetadataType } from "./provider.js";

describe("EmbeddedMetadataProvider", () => {
  let provider: EmbeddedMetadataProvider;

  beforeEach(() => {
    provider = new EmbeddedMetadataProvider();
  });

  describe("Provider Properties", () => {
    it("should have correct provider metadata", () => {
      expect(provider.name).toBe("embedded");
      expect(provider.priority).toBe(100); // Highest priority
      expect(provider.rateLimit.maxRequests).toBe(1000);
      expect(provider.timeout.requestTimeout).toBe(30000);
    });

    it("should support all metadata types except physical dimensions", () => {
      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
      expect(provider.supportsDataType(MetadataType.COVER_IMAGE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PHYSICAL_DIMENSIONS)).toBe(false);
    });

    it("should provide high reliability scores for file-based metadata", () => {
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBeGreaterThan(0.9);
      expect(provider.getReliabilityScore(MetadataType.AUTHORS)).toBeGreaterThan(0.85);
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBeGreaterThan(0.9);
      expect(provider.getReliabilityScore(MetadataType.PAGE_COUNT)).toBeGreaterThan(0.9);
    });

    it("should provide lower reliability scores for potentially inaccurate metadata", () => {
      expect(provider.getReliabilityScore(MetadataType.PUBLICATION_DATE)).toBeLessThan(0.7);
      expect(provider.getReliabilityScore(MetadataType.PHYSICAL_DIMENSIONS)).toBeLessThan(0.5);
    });
  });

  describe("Metadata Conversion", () => {
    it("should convert complete EPUB metadata to MetadataRecord", () => {
      const ebookMetadata: EbookMetadata = {
        title: "The Great Gatsby",
        contributors: [
          { name: "F. Scott Fitzgerald", roles: ["aut"], sortingKey: "Fitzgerald, F. Scott" },
        ],
        identifiers: [{ type: "isbn", value: "978-0-7432-7356-5" }],
        datePublished: new Date("1925-04-10"),
        language: "en",
        synopsis: "A novel about the American Dream in the 1920s",
        tags: ["Fiction", "Classic Literature", "American Literature"],
        numberOfPages: 180,
      };

      const record = (provider as any).convertToMetadataRecord(
        ebookMetadata,
        "epub",
        "gatsby.epub",
      );

      expect(record.source).toBe("embedded");
      expect(record.title).toBe("The Great Gatsby");
      expect(record.authors).toEqual(["F. Scott Fitzgerald"]);
      expect(record.isbn).toContain("9780743273565"); // Normalized
      expect(record.publicationDate).toBeInstanceOf(Date);
      expect(record.language).toBe("en");
      expect(record.description).toBe("A novel about the American Dream in the 1920s");
      expect(record.subjects).toEqual(["Fiction", "Classic Literature", "American Literature"]);
      expect(record.pageCount).toBe(180);
      expect(record.confidence).toBeGreaterThan(0.8);
    });

    it("should normalize author names when configured", () => {
      const ebookMetadata: EbookMetadata = {
        title: "1984",
        contributors: [{ name: "Orwell, George", roles: ["aut"], sortingKey: "Orwell, George" }],
      };

      const record = (provider as any).convertToMetadataRecord(ebookMetadata, "epub");

      // Should convert "Last, First" to "First Last" format
      expect(record.authors).toEqual(["George Orwell"]);
    });

    it("should not normalize author names when disabled", () => {
      const customProvider = new EmbeddedMetadataProvider({ normalizeAuthorNames: false });

      const ebookMetadata: EbookMetadata = {
        title: "1984",
        contributors: [{ name: "Orwell, George", roles: ["aut"], sortingKey: "Orwell, George" }],
      };

      const record = (customProvider as any).convertToMetadataRecord(ebookMetadata, "epub");

      // Should keep original format
      expect(record.authors).toEqual(["Orwell, George"]);
    });

    it("should extract publisher from contributors", () => {
      const ebookMetadata: EbookMetadata = {
        title: "Test Book",
        contributors: [
          { name: "Test Author", roles: ["aut"], sortingKey: "Author, Test" },
          { name: "Penguin Random House", roles: ["bkp"], sortingKey: "Penguin Random House" },
        ],
      };

      const record = (provider as any).convertToMetadataRecord(ebookMetadata, "epub");

      expect(record.publisher).toBe("Penguin Random House");
    });

    it("should extract series information", () => {
      const ebookMetadata: EbookMetadata = {
        title: "The Two Towers",
        contributors: [{ name: "J.R.R. Tolkien", roles: ["aut"], sortingKey: "Tolkien, J.R.R." }],
        series: { name: "The Lord of the Rings", position: 2 },
      };

      const record = (provider as any).convertToMetadataRecord(ebookMetadata, "epub");

      expect(record.series).toEqual({ name: "The Lord of the Rings", volume: 2 });
    });

    it("should handle cover images", () => {
      const coverBlob = new Blob(["fake-image-data"], { type: "image/jpeg" });
      const ebookMetadata: EbookMetadata = {
        title: "Test Book",
        contributors: [{ name: "Test Author", roles: ["aut"], sortingKey: "Author, Test" }],
        cover: coverBlob,
      };

      const record = (provider as any).convertToMetadataRecord(ebookMetadata, "epub");

      expect(record.coverImage).toBeDefined();
      expect(record.coverImage?.url).toMatch(/^blob:/);
    });
  });

  describe("ISBN Normalization", () => {
    it("should normalize ISBN-10 to ISBN-13 by default", () => {
      const ebookMetadata: EbookMetadata = {
        title: "Test Book",
        contributors: [{ name: "Test Author", roles: ["aut"], sortingKey: "Author, Test" }],
        // Valid ISBN-10 with correct checksum
        identifiers: [{ type: "isbn", value: "0306406152" }],
      };

      const record = (provider as any).convertToMetadataRecord(ebookMetadata, "epub");

      expect(record.isbn).toBeDefined();
      expect(record.isbn?.[0]).toHaveLength(13);
      expect(record.isbn?.[0]).toMatch(/^978/);
      // 0306406152 → 9780306406157
      expect(record.isbn?.[0]).toBe("9780306406157");
    });

    it("should preserve ISBN-13 format", () => {
      const ebookMetadata: EbookMetadata = {
        title: "Test Book",
        contributors: [{ name: "Test Author", roles: ["aut"], sortingKey: "Author, Test" }],
        identifiers: [{ type: "isbn", value: "978-0-7432-7356-5" }],
      };

      const record = (provider as any).convertToMetadataRecord(ebookMetadata, "epub");

      expect(record.isbn).toEqual(["9780743273565"]);
    });

    it("should handle multiple ISBNs", () => {
      const ebookMetadata: EbookMetadata = {
        title: "Test Book",
        contributors: [{ name: "Test Author", roles: ["aut"], sortingKey: "Author, Test" }],
        identifiers: [
          // Valid ISBNs with correct checksums
          { type: "isbn", value: "978-0-306-40615-7" },
          { type: "isbn", value: "978-1-86197-876-9" },
        ],
      };

      const record = (provider as any).convertToMetadataRecord(ebookMetadata, "epub");

      expect(record.isbn).toHaveLength(2);
      expect(record.isbn).toContain("9780306406157");
      expect(record.isbn).toContain("9781861978769");
    });

    it("should skip invalid ISBNs", () => {
      const ebookMetadata: EbookMetadata = {
        title: "Test Book",
        contributors: [{ name: "Test Author", roles: ["aut"], sortingKey: "Author, Test" }],
        identifiers: [
          { type: "isbn", value: "invalid-isbn" },
          { type: "isbn", value: "978-0-7432-7356-5" },
        ],
      };

      const record = (provider as any).convertToMetadataRecord(ebookMetadata, "epub");

      // Should filter out invalid ISBN but keep the valid one
      expect(record.isbn).toContain("9780743273565");
    });
  });

  describe("Confidence Scoring", () => {
    it("should assign high confidence to complete EPUB metadata", () => {
      const ebookMetadata: EbookMetadata = {
        title: "Complete Book",
        contributors: [{ name: "Author Name", roles: ["aut"], sortingKey: "Name, Author" }],
        identifiers: [{ type: "isbn", value: "978-0-123-45678-9" }],
        datePublished: new Date("2020-01-01"),
        language: "en",
        synopsis: "A complete book with all metadata",
        tags: ["Fiction"],
        numberOfPages: 300,
      };

      const confidence = (provider as any).calculateConfidence(ebookMetadata, "epub");

      expect(confidence).toBeGreaterThan(0.9);
    });

    it("should assign lower confidence to PDF metadata", () => {
      const ebookMetadata: EbookMetadata = {
        title: "PDF Book",
        contributors: [{ name: "Author Name", roles: ["aut"], sortingKey: "Name, Author" }],
      };

      const pdfConfidence = (provider as any).calculateConfidence(ebookMetadata, "pdf");
      const epubConfidence = (provider as any).calculateConfidence(ebookMetadata, "epub");

      expect(pdfConfidence).toBeLessThan(epubConfidence);
    });

    it("should penalize missing title", () => {
      const withTitle: EbookMetadata = {
        title: "Test Book",
        contributors: [{ name: "Author Name", roles: ["aut"], sortingKey: "Name, Author" }],
      };

      const withoutTitle: EbookMetadata = {
        title: undefined,
        contributors: [{ name: "Author Name", roles: ["aut"], sortingKey: "Name, Author" }],
      };

      const confWith = (provider as any).calculateConfidence(withTitle, "epub");
      const confWithout = (provider as any).calculateConfidence(withoutTitle, "epub");

      expect(confWithout).toBeLessThan(confWith);
      expect(confWith - confWithout).toBeGreaterThan(0.15);
    });

    it("should penalize missing authors", () => {
      const withAuthor: EbookMetadata = {
        title: "Test Book",
        contributors: [{ name: "Author Name", roles: ["aut"], sortingKey: "Name, Author" }],
      };

      const withoutAuthor: EbookMetadata = { title: "Test Book", contributors: [] };

      const confWith = (provider as any).calculateConfidence(withAuthor, "epub");
      const confWithout = (provider as any).calculateConfidence(withoutAuthor, "epub");

      expect(confWithout).toBeLessThan(confWith);
      expect(confWith - confWithout).toBeGreaterThan(0.1);
    });

    it("should boost confidence for having ISBN", () => {
      // Use minimal metadata to avoid hitting 1.0 ceiling
      const withIsbn: EbookMetadata = {
        title: "Test Book",
        contributors: [{ name: "Author Name", roles: ["aut"], sortingKey: "Name, Author" }],
        // Valid ISBN
        identifiers: [{ type: "isbn", value: "978-0-306-40615-7" }],
      };

      const withoutIsbn: EbookMetadata = {
        title: "Test Book",
        contributors: [{ name: "Author Name", roles: ["aut"], sortingKey: "Name, Author" }],
      };

      // Use PDF format to get lower base confidence and avoid ceiling
      const confWith = (provider as any).calculateConfidence(withIsbn, "pdf");
      const confWithout = (provider as any).calculateConfidence(withoutIsbn, "pdf");

      expect(confWith).toBeGreaterThan(confWithout);
      expect(confWith - confWithout).toBeGreaterThanOrEqual(0.09); // ISBN boost (~0.1, accounting for floating point)
    });

    it("should keep confidence in valid range", () => {
      const minimal: EbookMetadata = { title: undefined, contributors: [] };

      const maximal: EbookMetadata = {
        title: "Complete Book",
        contributors: [{ name: "Author Name", roles: ["aut"], sortingKey: "Name, Author" }],
        identifiers: [{ type: "isbn", value: "978-0-123-45678-9" }],
        datePublished: new Date("2020-01-01"),
        language: "en",
        synopsis: "Complete metadata",
        tags: ["Fiction", "Fantasy"],
        numberOfPages: 300,
      };

      const minConf = (provider as any).calculateConfidence(minimal, "pdf");
      const maxConf = (provider as any).calculateConfidence(maximal, "epub");

      expect(minConf).toBeGreaterThanOrEqual(0.0);
      expect(minConf).toBeLessThanOrEqual(1.0);
      expect(maxConf).toBeGreaterThanOrEqual(0.0);
      expect(maxConf).toBeLessThanOrEqual(1.0);
    });
  });

  describe("Record ID Generation", () => {
    it("should generate consistent IDs based on ISBN", () => {
      const metadata1: EbookMetadata = {
        title: "Book Title",
        contributors: [{ name: "Author", roles: ["aut"], sortingKey: "Author" }],
        // Valid ISBN
        identifiers: [{ type: "isbn", value: "978-0-306-40615-7" }],
      };

      const metadata2: EbookMetadata = {
        title: "Different Title",
        contributors: [
          { name: "Different Author", roles: ["aut"], sortingKey: "Author, Different" },
        ],
        // Same valid ISBN
        identifiers: [{ type: "isbn", value: "978-0-306-40615-7" }],
      };

      const id1 = (provider as any).generateRecordId(metadata1, "epub");
      const id2 = (provider as any).generateRecordId(metadata2, "epub");

      expect(id1).toBe(id2); // Same ISBN = same ID
      expect(id1).toContain("9780306406157");
    });

    it("should generate IDs based on title when ISBN is missing", () => {
      const metadata: EbookMetadata = {
        title: "Unique Book Title",
        contributors: [{ name: "Author", roles: ["aut"], sortingKey: "Author" }],
      };

      const id = (provider as any).generateRecordId(metadata, "epub");

      expect(id).toMatch(/^embedded-[a-z0-9]+-epub$/);
    });

    it("should generate IDs based on filename when title and ISBN are missing", () => {
      const metadata: EbookMetadata = { title: undefined, contributors: [] };

      const id = (provider as any).generateRecordId(metadata, "epub", "mybook.epub");

      expect(id).toMatch(/^embedded-[a-z0-9]+-epub$/);
    });
  });

  describe("Configuration", () => {
    it("should allow custom configuration", () => {
      const customProvider = new EmbeddedMetadataProvider({
        baseConfidence: 0.7,
        normalizeIsbn13: false,
      });

      expect(customProvider.getConfig().baseConfidence).toBe(0.7);
      expect(customProvider.getConfig().normalizeIsbn13).toBe(false);
    });

    it("should merge custom config with defaults", () => {
      const customProvider = new EmbeddedMetadataProvider({ baseConfidence: 0.7 });

      const config = customProvider.getConfig();
      expect(config.baseConfidence).toBe(0.7);
      expect(config.normalizeIsbn13).toBe(DEFAULT_EMBEDDED_PROVIDER_CONFIG.normalizeIsbn13);
    });

    it("should allow runtime configuration updates", () => {
      provider.updateConfig({ baseConfidence: 0.6 });

      expect(provider.getConfig().baseConfidence).toBe(0.6);
    });
  });

  describe("Search Methods", () => {
    it("should return empty results for search by title", async () => {
      const results = await provider.searchByTitle({ title: "Test" });
      expect(results).toEqual([]);
    });

    it("should return empty results for search by ISBN", async () => {
      const results = await provider.searchByISBN("978-0-123-45678-9");
      expect(results).toEqual([]);
    });

    it("should return empty results for search by creator", async () => {
      const results = await provider.searchByCreator({ name: "Author" });
      expect(results).toEqual([]);
    });

    it("should return empty results for multi-criteria search", async () => {
      const results = await provider.searchMultiCriteria({ title: "Test", authors: ["Author"] });
      expect(results).toEqual([]);
    });
  });

  describe("Metadata Type Detection", () => {
    it("should detect all available metadata types", () => {
      const ebookMetadata: EbookMetadata = {
        title: "Test",
        contributors: [
          { name: "Author", roles: ["aut"], sortingKey: "Author" },
          { name: "Publisher", roles: ["bkp"], sortingKey: "Publisher" },
        ],
        identifiers: [{ type: "isbn", value: "123" }],
        datePublished: new Date(),
        language: "en",
        synopsis: "Description",
        tags: ["Tag"],
        numberOfPages: 100,
        cover: new Blob(["data"]),
        series: { name: "Series", position: 1 },
      };

      const types = (provider as any).getAvailableMetadataTypes(ebookMetadata);

      expect(types).toContain(MetadataType.TITLE);
      expect(types).toContain(MetadataType.AUTHORS);
      expect(types).toContain(MetadataType.PUBLISHER);
      expect(types).toContain(MetadataType.ISBN);
      expect(types).toContain(MetadataType.PUBLICATION_DATE);
      expect(types).toContain(MetadataType.LANGUAGE);
      expect(types).toContain(MetadataType.DESCRIPTION);
      expect(types).toContain(MetadataType.SUBJECTS);
      expect(types).toContain(MetadataType.PAGE_COUNT);
      expect(types).toContain(MetadataType.COVER_IMAGE);
      expect(types).toContain(MetadataType.SERIES);
    });
  });
});
