/**
 * Tests for metadata conversion utilities
 */

import { describe, it, expect } from "vitest";
import type { MetadataRecord } from "../metadata/provider.js";
import {
  convertToExtractedMetadata,
  mergeMetadataRecords,
  selectBestValue,
  mergeArrayField,
  calculateAggregatedConfidence,
  resolveConflict,
} from "./metadata-converter.js";

describe("convertToExtractedMetadata", () => {
  it("should convert basic metadata fields", () => {
    const record: MetadataRecord = {
      id: "test-1",
      source: "WikiData",
      confidence: 0.9,
      timestamp: new Date(),
      title: "The Great Gatsby",
      authors: ["F. Scott Fitzgerald"],
      isbn: ["9780743273565"],
      description: "A classic American novel",
      publicationDate: new Date("1925-04-10"),
      pageCount: 180,
      language: "en",
      publisher: "Scribner",
      subjects: ["Fiction", "Classic Literature"],
      series: { name: "Great American Novels", volume: 1 },
    };

    const result = convertToExtractedMetadata(record);

    expect(result.title).toBe("The Great Gatsby");
    expect(result.synopsis).toBe("A classic American novel");
    expect(result.datePublished).toEqual(new Date("1925-04-10"));
    expect(result.numberOfPages).toBe(180);
    expect(result.language).toBe("en");
    expect(result.subjects).toEqual(["Fiction", "Classic Literature"]);
    expect(result.series).toEqual({ name: "Great American Novels", position: 1 });
  });

  it("should convert authors to contributors with aut role", () => {
    const record: MetadataRecord = {
      id: "test-2",
      source: "OpenLibrary",
      confidence: 0.85,
      timestamp: new Date(),
      title: "Harry Potter",
      authors: ["J.K. Rowling"],
    };

    const result = convertToExtractedMetadata(record);

    expect(result.contributors).toHaveLength(1);
    expect(result.contributors?.[0]).toEqual({
      name: "J.K. Rowling",
      roles: ["aut"],
      sortingKey: "Rowling, J.K.",
    });
  });

  it("should convert ISBN to identifiers", () => {
    const record: MetadataRecord = {
      id: "test-3",
      source: "WikiData",
      confidence: 0.95,
      timestamp: new Date(),
      title: "Test Book",
      isbn: ["9780743273565", "0743273567"],
    };

    const result = convertToExtractedMetadata(record);

    expect(result.identifiers).toHaveLength(2);
    expect(result.identifiers?.[0]).toEqual({ type: "isbn", value: "9780743273565" });
    expect(result.identifiers?.[1]).toEqual({ type: "isbn", value: "0743273567" });
  });

  it("should add publisher as contributor with pbl role", () => {
    const record: MetadataRecord = {
      id: "test-4",
      source: "LoC",
      confidence: 0.88,
      timestamp: new Date(),
      title: "Test Book",
      authors: ["John Doe"],
      publisher: "Penguin Books",
    };

    const result = convertToExtractedMetadata(record);

    expect(result.contributors).toHaveLength(2);
    expect(result.contributors?.[0].roles).toContain("aut");
    expect(result.contributors?.[1]).toEqual({
      name: "Penguin Books",
      roles: ["pbl"],
      sortingKey: "Penguin Books",
    });
  });

  it("should generate proper sorting keys for names", () => {
    const record: MetadataRecord = {
      id: "test-5",
      source: "WikiData",
      confidence: 0.9,
      timestamp: new Date(),
      title: "Test Book",
      authors: [
        "John Smith",
        "Ludwig van Beethoven",
        "J.K. Rowling",
        "García Márquez, Gabriel", // Already in correct format
      ],
    };

    const result = convertToExtractedMetadata(record);

    expect(result.contributors?.[0].sortingKey).toBe("Smith, John");
    expect(result.contributors?.[1].sortingKey).toBe("Beethoven, Ludwig van");
    expect(result.contributors?.[2].sortingKey).toBe("Rowling, J.K.");
    expect(result.contributors?.[3].sortingKey).toBe("García Márquez, Gabriel");
  });

  it("should store provider data in properties", () => {
    const record: MetadataRecord = {
      id: "test-6",
      source: "WikiData",
      confidence: 0.92,
      timestamp: new Date("2024-01-01"),
      title: "Test Book",
      providerData: { wikidataId: "Q12345", wikidataUri: "http://www.wikidata.org/entity/Q12345" },
    };

    const result = convertToExtractedMetadata(record);

    expect(result.properties?.providerData).toEqual({
      source: "WikiData",
      confidence: 0.92,
      timestamp: new Date("2024-01-01"),
      data: { wikidataId: "Q12345", wikidataUri: "http://www.wikidata.org/entity/Q12345" },
    });
  });
});

describe("mergeMetadataRecords", () => {
  it("should merge multiple records with highest confidence as base", () => {
    const records: MetadataRecord[] = [
      {
        id: "1",
        source: "OpenLibrary",
        confidence: 0.75,
        timestamp: new Date(),
        title: "The Great Gatsby",
        authors: ["F. Scott Fitzgerald"],
      },
      {
        id: "2",
        source: "WikiData",
        confidence: 0.92, // Highest confidence
        timestamp: new Date(),
        title: "The Great Gatsby",
        authors: ["F. Scott Fitzgerald"],
        publicationDate: new Date("1925-04-10"),
        language: "en",
      },
      {
        id: "3",
        source: "LoC",
        confidence: 0.85,
        timestamp: new Date(),
        title: "The Great Gatsby",
        subjects: ["American fiction", "Classic literature"],
      },
    ];

    const result = mergeMetadataRecords(records);

    // Base should be from WikiData (highest confidence)
    expect(result.title).toBe("The Great Gatsby");
    expect(result.datePublished).toEqual(new Date("1925-04-10"));
    expect(result.language).toBe("en");

    // Subjects from LoC should be merged (preserving original case)
    expect(result.subjects).toEqual(["American fiction", "Classic literature"]);

    // Should track all sources
    expect(result.properties?.mergedSources).toHaveLength(3);
    expect(result.properties?.mergedSources?.[0].source).toBe("WikiData");
  });

  it("should merge contributors from multiple sources", () => {
    const records: MetadataRecord[] = [
      {
        id: "1",
        source: "WikiData",
        confidence: 0.9,
        timestamp: new Date(),
        title: "Test Book",
        authors: ["John Doe", "Jane Smith"],
      },
      {
        id: "2",
        source: "OpenLibrary",
        confidence: 0.85,
        timestamp: new Date(),
        title: "Test Book",
        authors: ["John Doe", "Bob Johnson"], // Duplicate John Doe
        publisher: "Penguin",
      },
    ];

    const result = mergeMetadataRecords(records);

    // Should have 4 unique contributors (2 authors + 1 unique author + 1 publisher)
    expect(result.contributors).toHaveLength(4);

    const names = result.contributors?.map((c) => c.name) || [];
    expect(names).toContain("John Doe");
    expect(names).toContain("Jane Smith");
    expect(names).toContain("Bob Johnson");
    expect(names).toContain("Penguin");

    // John Doe should not be duplicated
    const johnDoeCount = names.filter((n) => n === "John Doe").length;
    expect(johnDoeCount).toBe(1);
  });

  it("should merge identifiers without duplicates", () => {
    const records: MetadataRecord[] = [
      {
        id: "1",
        source: "WikiData",
        confidence: 0.9,
        timestamp: new Date(),
        title: "Test Book",
        isbn: ["978-0-7432-7356-5", "0-7432-7356-7"],
      },
      {
        id: "2",
        source: "OpenLibrary",
        confidence: 0.85,
        timestamp: new Date(),
        title: "Test Book",
        isbn: ["9780743273565", "0143039431"], // First is duplicate (normalized)
      },
    ];

    const result = mergeMetadataRecords(records);

    expect(result.identifiers).toHaveLength(3); // 3 unique ISBNs
  });

  it("should return empty object for empty input", () => {
    const result = mergeMetadataRecords([]);
    expect(result).toEqual({});
  });
});

describe("selectBestValue", () => {
  it("should select value from highest confidence record", () => {
    const records: MetadataRecord[] = [
      {
        id: "1",
        source: "OpenLibrary",
        confidence: 0.75,
        timestamp: new Date(),
        title: "The Great Gatsby",
      },
      {
        id: "2",
        source: "WikiData",
        confidence: 0.92,
        timestamp: new Date(),
        title: "The Great Gatsby",
      },
      {
        id: "3",
        source: "LoC",
        confidence: 0.85,
        timestamp: new Date(),
        title: "The Great Gatsby",
      },
    ];

    const result = selectBestValue<string>(records, "title");

    expect(result).toBe("The Great Gatsby");
  });

  it("should filter by minimum confidence threshold", () => {
    const records: MetadataRecord[] = [
      {
        id: "1",
        source: "OpenLibrary",
        confidence: 0.55, // Below threshold
        timestamp: new Date(),
        title: "Low Confidence Title",
      },
      {
        id: "2",
        source: "WikiData",
        confidence: 0.92,
        timestamp: new Date(),
        title: "High Confidence Title",
      },
    ];

    const result = selectBestValue<string>(records, "title", 0.6);

    expect(result).toBe("High Confidence Title");
  });

  it("should return undefined if no records meet criteria", () => {
    const records: MetadataRecord[] = [
      {
        id: "1",
        source: "OpenLibrary",
        confidence: 0.55,
        timestamp: new Date(),
        title: "Low Confidence Title",
      },
    ];

    const result = selectBestValue<string>(records, "title", 0.8);

    expect(result).toBeUndefined();
  });
});

describe("mergeArrayField", () => {
  it("should merge arrays and remove duplicates", () => {
    const records: MetadataRecord[] = [
      {
        id: "1",
        source: "WikiData",
        confidence: 0.9,
        timestamp: new Date(),
        title: "Test",
        subjects: ["Fiction", "Classic Literature"],
      },
      {
        id: "2",
        source: "OpenLibrary",
        confidence: 0.85,
        timestamp: new Date(),
        title: "Test",
        subjects: ["fiction", "Historical Fiction"], // Duplicate 'Fiction'
      },
    ];

    const result = mergeArrayField<string>(records, "subjects", 0.6);

    expect(result).toHaveLength(3);
    expect(result).toContain("Fiction");
    expect(result).toContain("Classic Literature");
    expect(result).toContain("Historical Fiction");
  });

  it("should use custom normalizer for deduplication", () => {
    const records: MetadataRecord[] = [
      {
        id: "1",
        source: "WikiData",
        confidence: 0.9,
        timestamp: new Date(),
        title: "Test",
        isbn: ["978-0-7432-7356-5"],
      },
      {
        id: "2",
        source: "OpenLibrary",
        confidence: 0.85,
        timestamp: new Date(),
        title: "Test",
        isbn: ["9780743273565"], // Same ISBN, different format
      },
    ];

    const normalizeISBN = (isbn: string) => isbn.replace(/[-\s]/g, "");
    const result = mergeArrayField<string>(records, "isbn", 0.6, normalizeISBN);

    expect(result).toHaveLength(1); // Should deduplicate
  });

  it("should filter by minimum confidence", () => {
    const records: MetadataRecord[] = [
      {
        id: "1",
        source: "WikiData",
        confidence: 0.9,
        timestamp: new Date(),
        title: "Test",
        subjects: ["Fiction"],
      },
      {
        id: "2",
        source: "LowQuality",
        confidence: 0.4, // Below threshold
        timestamp: new Date(),
        title: "Test",
        subjects: ["BadData"],
      },
    ];

    const result = mergeArrayField<string>(records, "subjects", 0.6);

    expect(result).toEqual(["Fiction"]);
  });
});

describe("calculateAggregatedConfidence", () => {
  it("should return base confidence for single record", () => {
    const records: MetadataRecord[] = [
      { id: "1", source: "WikiData", confidence: 0.85, timestamp: new Date(), title: "Test Book" },
    ];

    const result = calculateAggregatedConfidence(records, "title");

    expect(result).toBe(0.85);
  });

  it("should add consensus boost for multiple sources", () => {
    const records: MetadataRecord[] = [
      { id: "1", source: "WikiData", confidence: 0.85, timestamp: new Date(), title: "Test Book" },
      { id: "2", source: "LoC", confidence: 0.8, timestamp: new Date(), title: "Test Book" },
      {
        id: "3",
        source: "OpenLibrary",
        confidence: 0.75,
        timestamp: new Date(),
        title: "Test Book",
      },
    ];

    const result = calculateAggregatedConfidence(records, "title");

    // Base: 0.85 + Consensus boost: (3-1) * 0.05 = 0.10
    // Total: 0.95
    expect(result).toBe(0.95);
  });

  it("should cap confidence at 0.98", () => {
    const records: MetadataRecord[] = [
      { id: "1", source: "WikiData", confidence: 0.95, timestamp: new Date(), title: "Test Book" },
      { id: "2", source: "LoC", confidence: 0.95, timestamp: new Date(), title: "Test Book" },
      {
        id: "3",
        source: "OpenLibrary",
        confidence: 0.95,
        timestamp: new Date(),
        title: "Test Book",
      },
      { id: "4", source: "ISNI", confidence: 0.95, timestamp: new Date(), title: "Test Book" },
    ];

    const result = calculateAggregatedConfidence(records, "title");

    // Would be 0.95 + 0.15 = 1.10, but capped at 0.98
    expect(result).toBe(0.98);
  });

  it("should return 0 for empty records", () => {
    const result = calculateAggregatedConfidence([], "title");
    expect(result).toBe(0);
  });

  it("should ignore records without the field", () => {
    const records: MetadataRecord[] = [
      { id: "1", source: "WikiData", confidence: 0.85, timestamp: new Date(), title: "Test Book" },
      {
        id: "2",
        source: "LoC",
        confidence: 0.8,
        timestamp: new Date(),
        // No title field
      },
    ];

    const result = calculateAggregatedConfidence(records, "title");

    // Only one record has title, so no consensus boost
    expect(result).toBe(0.85);
  });
});

describe("resolveConflict", () => {
  it("should detect no conflict when all values are identical", () => {
    const records: MetadataRecord[] = [
      { id: "1", source: "WikiData", confidence: 0.9, timestamp: new Date(), language: "en" },
      { id: "2", source: "LoC", confidence: 0.85, timestamp: new Date(), language: "en" },
      { id: "3", source: "OpenLibrary", confidence: 0.8, timestamp: new Date(), language: "en" },
    ];

    const result = resolveConflict<string>(records, "language");

    expect(result.value).toBe("en");
    expect(result.hasConflict).toBe(false);
    expect(result.alternatives).toHaveLength(3);
  });

  it("should detect conflict and choose highest confidence value", () => {
    const records: MetadataRecord[] = [
      {
        id: "1",
        source: "WikiData",
        confidence: 0.92, // Highest
        timestamp: new Date(),
        publicationDate: new Date("2020-01-15"),
      },
      {
        id: "2",
        source: "LoC",
        confidence: 0.85,
        timestamp: new Date(),
        publicationDate: new Date("2020-01-01"),
      },
      {
        id: "3",
        source: "OpenLibrary",
        confidence: 0.8,
        timestamp: new Date(),
        publicationDate: new Date("2019-12-31"),
      },
    ];

    const result = resolveConflict<Date>(records, "publicationDate");

    expect(result.value).toEqual(new Date("2020-01-15"));
    expect(result.hasConflict).toBe(true);
    expect(result.alternatives).toHaveLength(3);
    expect(result.alternatives[0].source).toBe("WikiData");
    expect(result.alternatives[0].confidence).toBe(0.92);
  });

  it("should use normalizer for conflict detection", () => {
    const records: MetadataRecord[] = [
      {
        id: "1",
        source: "WikiData",
        confidence: 0.9,
        timestamp: new Date(),
        title: "The Great Gatsby",
      },
      {
        id: "2",
        source: "OpenLibrary",
        confidence: 0.85,
        timestamp: new Date(),
        title: "THE GREAT GATSBY", // Different case
      },
    ];

    const result = resolveConflict<string>(records, "title", (title) => title.toLowerCase());

    expect(result.hasConflict).toBe(false); // Same after normalization
    expect(result.value).toBe("The Great Gatsby"); // Highest confidence
  });

  it("should return undefined for empty records", () => {
    const result = resolveConflict<string>([], "title");

    expect(result.value).toBeUndefined();
    expect(result.hasConflict).toBe(false);
    expect(result.alternatives).toEqual([]);
  });

  it("should handle single record", () => {
    const records: MetadataRecord[] = [
      { id: "1", source: "WikiData", confidence: 0.9, timestamp: new Date(), title: "Solo Book" },
    ];

    const result = resolveConflict<string>(records, "title");

    expect(result.value).toBe("Solo Book");
    expect(result.hasConflict).toBe(false);
    expect(result.alternatives).toEqual([]);
  });

  it("should provide alternatives sorted by confidence", () => {
    const records: MetadataRecord[] = [
      {
        id: "1",
        source: "OpenLibrary",
        confidence: 0.75,
        timestamp: new Date(),
        title: "Version A",
      },
      { id: "2", source: "WikiData", confidence: 0.92, timestamp: new Date(), title: "Version B" },
      { id: "3", source: "LoC", confidence: 0.85, timestamp: new Date(), title: "Version C" },
    ];

    const result = resolveConflict<string>(records, "title");

    expect(result.alternatives).toHaveLength(3);
    expect(result.alternatives[0].confidence).toBe(0.92);
    expect(result.alternatives[1].confidence).toBe(0.85);
    expect(result.alternatives[2].confidence).toBe(0.75);
  });
});
