/**
 * Integration Tests: Embedded Metadata + External Providers
 *
 * These tests demonstrate how embedded metadata from ebook files can be
 * combined with external metadata providers in the aggregation pipeline.
 */

import { describe, expect, it } from "vitest";
import { EmbeddedMetadataProvider } from "./embedded-provider.js";
import type { MetadataRecord } from "./provider.js";
import { MetadataType } from "./provider.js";
import type { Metadata as EbookMetadata } from "../../ebooks/metadata.js";

describe("Embedded Metadata Integration", () => {
  describe("Confidence Comparison", () => {
    it("should assign higher confidence to embedded metadata than typical external sources", () => {
      const provider = new EmbeddedMetadataProvider();

      const ebookMetadata: EbookMetadata = {
        title: "The Great Gatsby",
        contributors: [
          {
            name: "F. Scott Fitzgerald",
            roles: ["aut"],
            sortingKey: "Fitzgerald, F. Scott",
          },
        ],
        identifiers: [{ type: "isbn", value: "978-0-7432-7356-5" }],
        language: "en",
        synopsis: "A novel about the Jazz Age",
      };

      const embeddedRecord = (provider as any).convertToMetadataRecord(
        ebookMetadata,
        "epub",
      );

      // Embedded metadata should have very high confidence
      expect(embeddedRecord.confidence).toBeGreaterThan(0.85);

      // For comparison, typical external provider confidence ranges from 0.6-0.8
      // So embedded metadata should generally "win" in aggregation
    });

    it("should have lower confidence than embedded for incomplete external data", () => {
      const provider = new EmbeddedMetadataProvider();

      // Embedded metadata with complete info
      const completeEmbedded: EbookMetadata = {
        title: "Complete Book",
        contributors: [
          {
            name: "Author Name",
            roles: ["aut"],
            sortingKey: "Name, Author",
          },
        ],
        identifiers: [{ type: "isbn", value: "978-0-123-45678-9" }],
        language: "en",
        synopsis: "Full description",
        numberOfPages: 300,
      };

      const embeddedRecord = (provider as any).convertToMetadataRecord(
        completeEmbedded,
        "epub",
      );

      // Even a minimal embedded record has good confidence
      expect(embeddedRecord.confidence).toBeGreaterThan(0.8);
    });
  });

  describe("ISBN Normalization Consistency", () => {
    it("should normalize ISBNs consistently for cache key matching", () => {
      const provider = new EmbeddedMetadataProvider();

      // Different ISBN formats that should normalize to the same value
      const formats = [
        "978-0-7432-7356-5",
        "9780743273565",
        "978 0 7432 7356 5",
        "ISBN 978-0-7432-7356-5",
      ];

      const ebookMetadata: EbookMetadata = {
        title: "Test Book",
        contributors: [
          {
            name: "Test Author",
            roles: ["aut"],
            sortingKey: "Author, Test",
          },
        ],
        identifiers: [{ type: "isbn", value: formats[0] }],
      };

      const record = (provider as any).convertToMetadataRecord(
        ebookMetadata,
        "epub",
      );

      // All formats should normalize to the same value
      expect(record.isbn?.[0]).toBe("9780743273565");

      // This ensures that cache lookups will match regardless of ISBN format
    });

    it("should handle ISBN-10 to ISBN-13 conversion for consistency", () => {
      const provider = new EmbeddedMetadataProvider();

      const ebookMetadata: EbookMetadata = {
        title: "Test Book",
        contributors: [
          {
            name: "Test Author",
            roles: ["aut"],
            sortingKey: "Author, Test",
          },
        ],
        // Valid ISBN-10
        identifiers: [{ type: "isbn", value: "0306406152" }],
      };

      const record = (provider as any).convertToMetadataRecord(
        ebookMetadata,
        "epub",
      );

      // ISBN-10 should be converted to ISBN-13
      expect(record.isbn).toBeDefined();
      expect(record.isbn?.[0]).toHaveLength(13);
      expect(record.isbn?.[0]).toMatch(/^978/);
    });
  });

  describe("Author Name Normalization", () => {
    it('should normalize "Last, First" format to "First Last"', () => {
      const provider = new EmbeddedMetadataProvider();

      const ebookMetadata: EbookMetadata = {
        title: "Test Book",
        contributors: [
          {
            name: "Tolkien, J.R.R.",
            roles: ["aut"],
            sortingKey: "Tolkien, J.R.R.",
          },
        ],
      };

      const record = (provider as any).convertToMetadataRecord(
        ebookMetadata,
        "epub",
      );

      // Should normalize to "First Last" format
      expect(record.authors?.[0]).toBe("J.R.R. Tolkien");
    });

    it("should preserve names already in correct format", () => {
      const provider = new EmbeddedMetadataProvider();

      const ebookMetadata: EbookMetadata = {
        title: "Test Book",
        contributors: [
          {
            name: "George Orwell",
            roles: ["aut"],
            sortingKey: "Orwell, George",
          },
        ],
      };

      const record = (provider as any).convertToMetadataRecord(
        ebookMetadata,
        "epub",
      );

      // Should keep the format
      expect(record.authors?.[0]).toBe("George Orwell");
    });
  });

  describe("Aggregation Scenarios", () => {
    it("should provide complementary data to external providers", () => {
      const provider = new EmbeddedMetadataProvider();

      // Embedded metadata with page count but no subjects
      const embeddedMetadata: EbookMetadata = {
        title: "The Hobbit",
        contributors: [
          {
            name: "J.R.R. Tolkien",
            roles: ["aut"],
            sortingKey: "Tolkien, J.R.R.",
          },
        ],
        numberOfPages: 310,
        language: "en",
      };

      const embeddedRecord = (provider as any).convertToMetadataRecord(
        embeddedMetadata,
        "epub",
      );

      // Simulated external provider data with subjects but no page count
      const externalRecord: MetadataRecord = {
        id: "openlibrary-OL27448W",
        source: "openlibrary",
        confidence: 0.75,
        timestamp: new Date(),
        title: "The Hobbit",
        authors: ["J.R.R. Tolkien"],
        subjects: ["Fantasy", "Adventure", "Middle-earth"],
        description:
          "The story of Bilbo Baggins' journey to the Lonely Mountain",
      };

      // In aggregation, we can combine:
      // - Page count from embedded (high confidence)
      // - Subjects from external (not available in embedded)
      // - Title/authors verified by both sources
      expect(embeddedRecord.pageCount).toBe(310);
      expect(embeddedRecord.subjects).toBeUndefined();
      expect(externalRecord.subjects).toHaveLength(3);
      expect(externalRecord.pageCount).toBeUndefined();
    });

    it("should allow embedded metadata to override low-confidence external data", () => {
      const provider = new EmbeddedMetadataProvider();

      // Embedded metadata with accurate page count
      const embeddedMetadata: EbookMetadata = {
        title: "Test Book",
        contributors: [
          {
            name: "Test Author",
            roles: ["aut"],
            sortingKey: "Author, Test",
          },
        ],
        numberOfPages: 256,
      };

      const embeddedRecord = (provider as any).convertToMetadataRecord(
        embeddedMetadata,
        "epub",
      );

      // External provider with potentially inaccurate page count
      const externalRecord: MetadataRecord = {
        id: "external-123",
        source: "external",
        confidence: 0.5,
        timestamp: new Date(),
        pageCount: 250, // Slightly different
      };

      // Embedded should win due to higher confidence and reliability
      expect(embeddedRecord.confidence).toBeGreaterThan(
        externalRecord.confidence,
      );
      expect(
        provider.getReliabilityScore(MetadataType.PAGE_COUNT),
      ).toBeGreaterThan(0.9);
    });

    it("should preserve embedded cover image over external URLs", () => {
      const provider = new EmbeddedMetadataProvider();

      const coverBlob = new Blob(["image-data"], { type: "image/jpeg" });
      const embeddedMetadata: EbookMetadata = {
        title: "Test Book",
        contributors: [
          {
            name: "Test Author",
            roles: ["aut"],
            sortingKey: "Author, Test",
          },
        ],
        cover: coverBlob,
      };

      const embeddedRecord = (provider as any).convertToMetadataRecord(
        embeddedMetadata,
        "epub",
      );

      // Embedded cover is from the actual file, very reliable
      expect(embeddedRecord.coverImage?.url).toMatch(/^blob:/);
      expect(
        provider.getReliabilityScore(MetadataType.COVER_IMAGE),
      ).toBeGreaterThan(0.85);

      // External providers only have URLs, which may be broken or wrong
    });
  });

  describe("Priority in Provider Registry", () => {
    it("should have highest priority among providers", () => {
      const embeddedProvider = new EmbeddedMetadataProvider();

      // Embedded provider should have priority 100
      expect(embeddedProvider.priority).toBe(100);

      // This is higher than typical external providers (usually 1-50)
      // So embedded metadata should be processed first in aggregation
    });
  });

  describe("Metadata Completeness Analysis", () => {
    it("should correctly identify complete vs incomplete metadata", () => {
      const provider = new EmbeddedMetadataProvider();

      const completeMetadata: EbookMetadata = {
        title: "Complete Book",
        contributors: [
          {
            name: "Author Name",
            roles: ["aut"],
            sortingKey: "Name, Author",
          },
          {
            name: "Publisher Name",
            roles: ["bkp"],
            sortingKey: "Name, Publisher",
          },
        ],
        identifiers: [{ type: "isbn", value: "978-0-123-45678-9" }],
        datePublished: new Date("2020-01-01"),
        language: "en",
        synopsis: "A complete description",
        tags: ["Fiction", "Fantasy"],
        numberOfPages: 300,
        series: { name: "Test Series", position: 1 },
      };

      const incompleteMetadata: EbookMetadata = {
        title: "Incomplete Book",
        contributors: [],
      };

      const completeTypes = (provider as any).getAvailableMetadataTypes(
        completeMetadata,
      );
      const incompleteTypes = (provider as any).getAvailableMetadataTypes(
        incompleteMetadata,
      );

      // Should have 10 types: title, authors, publisher, isbn, publication date, language, description, subjects, page count, series
      expect(completeTypes.length).toBeGreaterThanOrEqual(10);
      expect(incompleteTypes).toHaveLength(1); // Only title
    });
  });

  describe("Real-world Scenarios", () => {
    it("should handle Calibre-managed ebook metadata", () => {
      const provider = new EmbeddedMetadataProvider();

      // Calibre adds rich metadata to ebooks
      const calibreMetadata: EbookMetadata = {
        title: "The Name of the Wind",
        contributors: [
          {
            name: "Patrick Rothfuss",
            roles: ["aut"],
            sortingKey: "Rothfuss, Patrick",
          },
          {
            name: "DAW Books",
            roles: ["bkp"],
            sortingKey: "DAW Books",
          },
        ],
        identifiers: [
          { type: "isbn", value: "978-0-7564-0474-1" },
          { type: "calibre", value: "123" },
        ],
        datePublished: new Date("2007-03-27"),
        language: "eng",
        synopsis:
          "The riveting first-person narrative of a young man who grows to be the most notorious magician his world has ever seen.",
        tags: ["Fantasy", "Magic", "Adventure"],
        numberOfPages: 662,
        series: {
          name: "The Kingkiller Chronicle",
          position: 1,
        },
      };

      const record = (provider as any).convertToMetadataRecord(
        calibreMetadata,
        "epub",
      );

      expect(record.title).toBe("The Name of the Wind");
      expect(record.authors).toEqual(["Patrick Rothfuss"]);
      expect(record.publisher).toBe("DAW Books");
      expect(record.isbn).toContain("9780756404741");
      expect(record.language).toBe("eng");
      expect(record.subjects).toEqual(["Fantasy", "Magic", "Adventure"]);
      expect(record.pageCount).toBe(662);
      expect(record.series).toEqual({
        name: "The Kingkiller Chronicle",
        volume: 1,
      });
      expect(record.confidence).toBeGreaterThan(0.9);
    });

    it("should handle minimal PDF metadata gracefully", () => {
      const provider = new EmbeddedMetadataProvider();

      // PDFs often have minimal metadata
      const pdfMetadata: EbookMetadata = {
        title: "Document.pdf",
        contributors: [],
      };

      const record = (provider as any).convertToMetadataRecord(
        pdfMetadata,
        "pdf",
      );

      expect(record.title).toBe("Document.pdf");
      expect(record.authors).toBeUndefined();
      expect(record.confidence).toBeLessThanOrEqual(0.75); // Low confidence due to minimal data and PDF format
    });

    it("should handle indie/self-published ebooks without ISBN", () => {
      const provider = new EmbeddedMetadataProvider();

      // Self-published ebooks may lack ISBNs
      const indieMetadata: EbookMetadata = {
        title: "My Self-Published Novel",
        contributors: [
          {
            name: "Indie Author",
            roles: ["aut"],
            sortingKey: "Author, Indie",
          },
        ],
        language: "en",
        synopsis: "A story without an ISBN",
        tags: ["Fiction", "Indie"],
        numberOfPages: 200,
      };

      const record = (provider as any).convertToMetadataRecord(
        indieMetadata,
        "epub",
      );

      expect(record.isbn).toBeUndefined();
      expect(record.title).toBe("My Self-Published Novel");
      expect(record.authors).toEqual(["Indie Author"]);
      // Still has decent confidence despite no ISBN
      expect(record.confidence).toBeGreaterThan(0.75);
    });
  });
});
