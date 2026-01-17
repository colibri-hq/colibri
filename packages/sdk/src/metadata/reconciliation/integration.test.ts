import { describe, expect, it } from "vitest";
import type {
  ContentDescriptionInput,
  IdentifierInput,
  MetadataSource,
  PublicationInfoInput,
  SubjectInput,
} from "./types.js";
import { ContentReconciler } from "./content.js";
import { IdentifierReconciler } from "./identifiers.js";
import { PublicationReconciler } from "./publication.js";
import { SubjectReconciler } from "./subjects.js";

describe("Publication Reconciliation Integration", () => {
  const reconciler = new PublicationReconciler();

  const openLibrarySource: MetadataSource = {
    name: "OpenLibrary",
    reliability: 0.8,
    timestamp: new Date("2024-01-01"),
  };

  const wikiDataSource: MetadataSource = {
    name: "WikiData",
    reliability: 0.9,
    timestamp: new Date("2024-01-02"),
  };

  const locSource: MetadataSource = {
    name: "Library of Congress",
    reliability: 0.95,
    timestamp: new Date("2024-01-03"),
  };

  it("should reconcile complete publication information from multiple sources", () => {
    const inputs: PublicationInfoInput[] = [
      { date: "2023", publisher: "Penguin", place: "New York City", source: openLibrarySource },
      { date: "2023-05-15", publisher: "Random House", place: "NYC", source: wikiDataSource },
      {
        date: "2023-05",
        publisher: "Penguin Random House Publishers Inc.",
        place: "New York, NY",
        source: locSource,
      },
    ];

    const result = reconciler.reconcilePublicationInfo(inputs);

    // Should prefer most specific date from most reliable source
    expect(result.date.value.year).toBe(2023);
    expect(result.date.value.month).toBe(5);
    expect(result.date.value.day).toBe(15);
    expect(result.date.value.precision).toBe("day");

    // Should normalize publisher names and prefer most reliable source
    expect(result.publisher.value.normalized).toBe("penguin random house");
    expect(result.publisher.sources[0].name).toBe("Library of Congress");

    // Should normalize place names
    expect(result.place.value.normalized).toBe("new york");
    expect(result.place.value.country).toBe("united states");

    // Should have high overall confidence
    const overallConfidence = reconciler.getOverallConfidence(result);
    expect(overallConfidence).toBeGreaterThan(0.8);

    // Should detect conflicts
    const conflicts = reconciler.getAllConflicts(result);
    expect(conflicts.length).toBeGreaterThan(0);

    // Should track sources (may be deduplicated if same source is best for multiple fields)
    const sources = reconciler.getAllSources(result);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.length).toBeLessThanOrEqual(3);

    // Should include at least the most reliable sources
    const sourceNames = sources.map((s) => s.name);
    expect(sourceNames).toContain("WikiData"); // Selected for date
    expect(sourceNames).toContain("Library of Congress"); // Selected for publisher
  });

  it("should handle partial information gracefully", () => {
    const inputs: PublicationInfoInput[] = [
      { date: "1984", source: openLibrarySource },
      { publisher: "Secker & Warburg", source: wikiDataSource },
      { place: "London, England", source: locSource },
    ];

    const result = reconciler.reconcilePublicationInfo(inputs);

    expect(result.date.value.year).toBe(1984);
    expect(result.date.value.precision).toBe("year");

    expect(result.publisher.value.name).toBe("Secker & Warburg");
    expect(result.publisher.value.normalized).toContain("secker");

    expect(result.place.value.normalized).toBe("london");
    expect(result.place.value.country).toBe("united kingdom");

    // Should have reasonable confidence even with partial data
    const overallConfidence = reconciler.getOverallConfidence(result);
    expect(overallConfidence).toBeGreaterThan(0.5);
  });

  it("should demonstrate conflict resolution", () => {
    const inputs: PublicationInfoInput[] = [
      {
        date: "2020",
        publisher: "Publisher A",
        place: "Boston",
        source: openLibrarySource, // Lower reliability
      },
      {
        date: "2021",
        publisher: "Publisher B",
        place: "Chicago",
        source: locSource, // Higher reliability
      },
    ];

    const result = reconciler.reconcilePublicationInfo(inputs);

    // Should prefer more reliable source for conflicts
    expect(result.date.value.year).toBe(2021);
    expect(result.publisher.value.name).toBe("Publisher B");
    expect(result.place.value.normalized).toBe("chicago");

    // Should record conflicts
    const conflicts = reconciler.getAllConflicts(result);
    expect(conflicts.length).toBe(3); // Date, publisher, and place conflicts

    // Each conflict should have resolution reasoning
    conflicts.forEach((conflict) => {
      expect(conflict.resolution).toContain("reliable source");
    });
  });
});

describe("Subject Reconciliation Integration", () => {
  const subjectReconciler = new SubjectReconciler();

  const openLibrarySource: MetadataSource = {
    name: "OpenLibrary",
    reliability: 0.8,
    timestamp: new Date("2024-01-01"),
  };

  const wikiDataSource: MetadataSource = {
    name: "WikiData",
    reliability: 0.9,
    timestamp: new Date("2024-01-02"),
  };

  const locSource: MetadataSource = {
    name: "Library of Congress",
    reliability: 0.95,
    timestamp: new Date("2024-01-03"),
  };

  it("should reconcile subjects from multiple metadata sources", () => {
    const inputs: SubjectInput[] = [
      {
        subjects: [
          "Science Fiction",
          "Space Opera",
          "Adventure",
          { name: "Literature", code: "800", scheme: "dewey" },
        ],
        source: openLibrarySource,
      },
      {
        subjects: ["sci-fi", "futuristic", "space travel", "Fiction -- Science fiction"],
        source: wikiDataSource,
      },
      {
        subjects: [
          { name: "Science fiction", scheme: "lcsh" },
          { name: "American literature", code: "810", scheme: "dewey" },
          "adventure stories",
        ],
        source: locSource,
      },
    ];

    const result = subjectReconciler.reconcileSubjects(inputs);

    // Should deduplicate similar subjects
    const normalizedNames = result.value.map((s) => s.normalized);
    expect(normalizedNames).toContain("science fiction");
    expect(normalizedNames).toContain("adventure");

    // Should not have duplicates of science fiction (sci-fi should be normalized)
    const sciFiCount = normalizedNames.filter((name) => name === "science fiction").length;
    expect(sciFiCount).toBe(1);

    // Should preserve classification codes and schemes
    const literatureSubject = result.value.find((s) => s.name === "Literature");
    expect(literatureSubject?.code).toBe("800");
    expect(literatureSubject?.scheme).toBe("dewey");

    // Should have high confidence due to multiple reliable sources
    expect(result.confidence).toBeGreaterThan(0.7);

    // Should detect conflicts between different subject sets
    expect(result.conflicts).toBeDefined();
    expect(result.conflicts![0].field).toBe("subjects");
  });

  it("should handle hierarchical LCSH subjects", () => {
    const inputs: SubjectInput[] = [
      {
        subjects: [
          "Computer programming -- Software engineering -- Agile development",
          "Mathematics -- Algebra -- Linear algebra",
        ],
        source: locSource,
      },
    ];

    const result = subjectReconciler.reconcileSubjects(inputs);

    expect(result.value).toHaveLength(2);

    const programmingSubject = result.value.find((s) => s.name.includes("Computer programming"));
    const mathSubject = result.value.find((s) => s.name.includes("Mathematics"));

    expect(programmingSubject?.scheme).toBe("lcsh");
    expect(programmingSubject?.hierarchy).toEqual([
      "Computer programming",
      "Software engineering",
      "Agile development",
    ]);

    expect(mathSubject?.scheme).toBe("lcsh");
    expect(mathSubject?.hierarchy).toEqual(["Mathematics", "Algebra", "Linear algebra"]);
  });

  it("should organize subjects by type and quality", () => {
    const inputs: SubjectInput[] = [
      {
        subjects: [
          "programming", // tag
          "computer science", // keyword
          "History of computing in the digital age", // subject
          "science fiction", // genre
          { name: "Mathematics", code: "510", scheme: "dewey" }, // classified subject
        ],
        source: locSource,
      },
    ];

    const result = subjectReconciler.reconcileSubjects(inputs);

    expect(result.value).toHaveLength(5);

    // Should prioritize subjects with classification codes
    const mathSubject = result.value.find((s) => s.code === "510");
    expect(mathSubject).toBeDefined();
    expect(mathSubject?.scheme).toBe("dewey");

    // Should detect different types correctly
    const types = result.value.map((s) => s.type);
    expect(types).toContain("subject");
    expect(types).toContain("genre");
    expect(types).toContain("keyword");
    expect(types).toContain("tag");

    // Should have high confidence due to classification codes and reliable source
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});

describe("Identifier Reconciliation Integration", () => {
  const openLibrarySource: MetadataSource = {
    name: "OpenLibrary",
    reliability: 0.8,
    timestamp: new Date("2024-01-01"),
  };

  const wikiDataSource: MetadataSource = {
    name: "WikiData",
    reliability: 0.9,
    timestamp: new Date("2024-01-02"),
  };

  const locSource: MetadataSource = {
    name: "Library of Congress",
    reliability: 0.95,
    timestamp: new Date("2024-01-03"),
  };

  it("should reconcile identifiers from multiple metadata sources", () => {
    const reconciler = new IdentifierReconciler();

    const inputs: IdentifierInput[] = [
      { isbn: "978-0-123-45678-6", oclc: "123456789", source: openLibrarySource },
      {
        isbn: "9780123456786", // Same ISBN, different format
        doi: "10.1000/182",
        goodreads: "12345678",
        source: wikiDataSource,
      },
      {
        isbn: "0123456789", // ISBN-10 version
        lccn: "abc1234567890",
        amazon: "B01234567X",
        source: locSource,
      },
    ];

    const result = reconciler.reconcileIdentifiers(inputs);

    // Should deduplicate identical ISBNs
    const isbns = result.value.filter((id) => id.type === "isbn");
    expect(isbns).toHaveLength(1);
    expect(isbns[0].normalized).toBe("9780123456786");
    expect(isbns[0].valid).toBe(true);

    // Should include all unique identifier types
    const types = result.value.map((id) => id.type);
    expect(types).toContain("isbn");
    expect(types).toContain("oclc");
    expect(types).toContain("doi");
    expect(types).toContain("goodreads");
    expect(types).toContain("lccn");
    expect(types).toContain("amazon");

    // Should prioritize by type (ISBN first)
    expect(result.value[0].type).toBe("isbn");

    // Should have high confidence due to valid identifiers
    expect(result.confidence).toBeGreaterThan(0.8);

    // Should detect conflicts for duplicate ISBNs
    expect(result.conflicts).toBeDefined();
    expect(result.conflicts!.length).toBeGreaterThan(0);
  });

  it("should handle mixed valid and invalid identifiers", () => {
    const reconciler = new IdentifierReconciler();

    const inputs: IdentifierInput[] = [
      {
        isbn: "9770123456786", // Invalid ISBN (wrong prefix)
        oclc: "12345", // Too short, invalid
        doi: "10.1000/182", // Valid
        source: openLibrarySource,
      },
      {
        isbn: "9780123456786", // Valid ISBN
        goodreads: "12345678", // Valid
        amazon: "INVALID123", // Invalid format
        source: wikiDataSource,
      },
    ];

    const result = reconciler.reconcileIdentifiers(inputs);

    // Should include both valid and invalid identifiers
    const validIds = result.value.filter((id) => id.valid);
    const invalidIds = result.value.filter((id) => !id.valid);

    expect(validIds.length).toBeGreaterThan(0);
    expect(invalidIds.length).toBeGreaterThan(0);

    // Valid identifiers should come first
    expect(result.value[0].valid).toBe(true);

    // Should have moderate confidence due to mixed validity
    expect(result.confidence).toBeLessThan(0.9);
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it("should normalize various identifier formats correctly", () => {
    const reconciler = new IdentifierReconciler();

    const inputs: IdentifierInput[] = [
      {
        isbn: "978-0-12-345678-6", // Hyphenated ISBN
        doi: "doi:10.1000/182", // DOI with prefix
        oclc: "ocm123456789", // OCLC with prefix
        goodreads: "https://www.goodreads.com/book/show/12345678", // GoodReads URL
        amazon: "https://amazon.com/dp/B01234567X", // Amazon URL
        google: "https://books.google.com/books?id=ABC123DEF456", // Google Books URL
        source: openLibrarySource,
      },
    ];

    const result = reconciler.reconcileIdentifiers(inputs);

    // Check normalization
    const isbn = result.value.find((id) => id.type === "isbn");
    expect(isbn?.normalized).toBe("9780123456786");

    const doi = result.value.find((id) => id.type === "doi");
    expect(doi?.normalized).toBe("10.1000/182");

    const oclc = result.value.find((id) => id.type === "oclc");
    expect(oclc?.normalized).toBe("123456789");

    const goodreads = result.value.find((id) => id.type === "goodreads");
    expect(goodreads?.normalized).toBe("12345678");

    const amazon = result.value.find((id) => id.type === "amazon");
    expect(amazon?.normalized).toBe("B01234567X");

    const google = result.value.find((id) => id.type === "google");
    expect(google?.normalized).toBe("ABC123DEF456");

    // All should be valid
    expect(result.value.every((id) => id.valid)).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
describe("Content Reconciliation Integration", () => {
  const contentReconciler = new ContentReconciler();

  const openLibrarySource: MetadataSource = {
    name: "OpenLibrary",
    reliability: 0.8,
    timestamp: new Date("2024-01-01"),
  };

  const wikiDataSource: MetadataSource = {
    name: "WikiData",
    reliability: 0.9,
    timestamp: new Date("2024-01-02"),
  };

  const publisherSource: MetadataSource = {
    name: "Publisher Official",
    reliability: 0.95,
    timestamp: new Date("2024-01-03"),
  };

  it("should reconcile complete content description from multiple sources", () => {
    const inputs: ContentDescriptionInput[] = [
      {
        descriptions: ["A thrilling adventure story set in space."],
        tableOfContents: "Chapter 1: Launch\nChapter 2: Journey\nChapter 3: Discovery",
        reviews: [
          { text: "Great book with amazing characters!", rating: 5, scale: 5, verified: false },
        ],
        ratings: [{ value: 4.2, scale: 5, count: 150 }],
        coverImages: ["https://example.com/small-cover.jpg"],
        excerpt: "The stars beckoned from beyond...",
        source: openLibrarySource,
      },
      {
        descriptions: [
          "An epic science fiction novel that explores the depths of space and human nature.",
        ],
        reviews: [
          {
            text: "Compelling narrative with deep philosophical themes. Highly recommended for sci-fi fans.",
            rating: 5,
            scale: 5,
            verified: true,
            helpful: 45,
            total: 50,
          },
        ],
        ratings: [{ value: 4.5, scale: 5, count: 300 }],
        coverImages: [
          {
            url: "https://example.com/hd-cover.jpg",
            width: 600,
            height: 900,
            format: "jpeg",
            quality: "large",
            verified: true,
          },
        ],
        source: wikiDataSource,
      },
      {
        descriptions: [
          {
            text: "From the publisher: A masterful work of science fiction that combines thrilling adventure with profound insights into the human condition. This novel takes readers on an unforgettable journey through the cosmos.",
            type: "summary",
            source: "publisher",
          },
        ],
        tableOfContents: {
          entries: [
            { title: "Prologue: The Call", page: 1, level: 0 },
            { title: "Part I: Departure", page: 5, level: 0 },
            { title: "Chapter 1: Launch Preparations", page: 7, level: 1 },
            { title: "Chapter 2: Into the Void", page: 25, level: 1 },
            { title: "Part II: Discovery", page: 45, level: 0 },
            { title: "Chapter 3: First Contact", page: 47, level: 1 },
            { title: "Chapter 4: Understanding", page: 68, level: 1 },
            { title: "Epilogue: Return", page: 89, level: 0 },
          ],
          format: "hierarchical",
          pageNumbers: true,
        },
        ratings: [{ value: 4.7, scale: 5, count: 50 }],
        excerpt:
          "The stars beckoned from beyond the edge of known space, their light carrying whispers of ancient secrets...",
        source: publisherSource,
      },
    ];

    const result = contentReconciler.reconcileContentDescription(inputs);

    // Should select highest quality description (from publisher)
    expect(result.description.value.text).toContain("masterful work of science fiction");
    expect(result.description.value.type).toBe("summary");
    expect(result.description.confidence).toBeGreaterThan(0.8);

    // Should select most complete table of contents
    expect(result.tableOfContents.value.entries).toHaveLength(8);
    expect(result.tableOfContents.value.format).toBe("hierarchical");
    expect(result.tableOfContents.value.pageNumbers).toBe(true);
    expect(result.tableOfContents.value.entries[0].title).toBe("Prologue: The Call");

    // Should aggregate and sort reviews by quality
    expect(result.reviews.value).toHaveLength(2);
    expect(result.reviews.value[0].verified).toBe(true);
    expect(result.reviews.value[0].text).toContain("philosophical themes");

    // Should calculate weighted average rating
    expect(result.rating.value.value).toBeGreaterThan(4.0);
    expect(result.rating.value.value).toBeLessThan(5.0);
    expect(result.rating.value.scale).toBe(5);
    expect(result.rating.value.count).toBe(500); // Total from all sources

    // Should select highest quality cover image
    expect(result.coverImage.value.url).toBe("https://example.com/hd-cover.jpg");
    expect(result.coverImage.value.width).toBe(600);
    expect(result.coverImage.value.height).toBe(900);
    expect(result.coverImage.value.verified).toBe(true);

    // Should select best excerpt
    expect(result.excerpt.value).toContain("ancient secrets");
    expect(result.excerpt.confidence).toBeGreaterThan(0.7);
  });

  it("should handle conflicting content descriptions", () => {
    const inputs: ContentDescriptionInput[] = [
      {
        descriptions: ["A romantic comedy set in New York City."],
        ratings: [{ value: 2.0, scale: 5, count: 100 }],
        coverImages: ["https://example.com/romance-cover.jpg"],
        source: openLibrarySource,
      },
      {
        descriptions: ["A thrilling science fiction adventure in space."],
        ratings: [{ value: 4.8, scale: 5, count: 200 }],
        coverImages: ["https://example.com/scifi-cover.jpg"],
        source: wikiDataSource,
      },
    ];

    const result = contentReconciler.reconcileContentDescription(inputs);

    // Should detect conflicts in descriptions
    expect(result.description.conflicts).toBeDefined();
    expect(result.description.conflicts![0].field).toBe("description");
    expect(result.description.reasoning).toContain("conflict resolution");

    // Should detect conflicts in ratings (significant difference: 2.0 vs 4.8)
    expect(result.rating.conflicts).toBeDefined();
    expect(result.rating.conflicts![0].field).toBe("rating");

    // Should detect conflicts in cover images
    expect(result.coverImage.conflicts).toBeDefined();
    expect(result.coverImage.conflicts![0].field).toBe("coverImage");

    // Should still provide best available values
    expect(result.description.value.text).toContain("science fiction"); // Higher reliability source
    expect(result.rating.value.value).toBeGreaterThan(2.0); // Weighted average
  });

  it("should handle partial content information gracefully", () => {
    const inputs: ContentDescriptionInput[] = [
      { descriptions: ["A good book about adventure."], source: openLibrarySource },
      { ratings: [{ value: 4.0, scale: 5, count: 50 }], source: wikiDataSource },
      {
        coverImages: [
          { url: "https://example.com/cover.png", width: 300, height: 450, format: "png" },
        ],
        source: publisherSource,
      },
    ];

    const result = contentReconciler.reconcileContentDescription(inputs);

    // Should have description from first source
    expect(result.description.value.text).toBe("A good book about adventure.");
    expect(result.description.confidence).toBeGreaterThan(0.5);

    // Should have empty table of contents
    expect(result.tableOfContents.value.entries).toHaveLength(0);
    expect(result.tableOfContents.confidence).toBe(0.1);

    // Should have empty reviews
    expect(result.reviews.value).toHaveLength(0);
    expect(result.reviews.confidence).toBe(0.1);

    // Should have rating from second source
    expect(result.rating.value.value).toBe(4.0);
    expect(result.rating.confidence).toBeGreaterThan(0.7);

    // Should have cover image from third source
    expect(result.coverImage.value.url).toBe("https://example.com/cover.png");
    expect(result.coverImage.confidence).toBeGreaterThan(0.6);

    // Should have empty excerpt
    expect(result.excerpt.value).toBe("");
    expect(result.excerpt.confidence).toBe(0.1);
  });

  it("should prioritize verified and high-quality content", () => {
    const inputs: ContentDescriptionInput[] = [
      {
        descriptions: ["Short description"],
        reviews: [{ text: "Okay book", rating: 3, scale: 5, verified: false }],
        coverImages: [
          { url: "https://example.com/low-res.jpg", width: 100, height: 150, quality: "thumbnail" },
        ],
        source: openLibrarySource,
      },
      {
        descriptions: [
          {
            text: "This comprehensive and well-researched book provides an in-depth exploration of its subject matter, offering readers valuable insights and practical knowledge that will enhance their understanding of the topic.",
            quality: 0.9,
            source: "editorial review",
          },
        ],
        reviews: [
          {
            text: "Exceptional work with thorough research and clear explanations. The author demonstrates deep expertise and presents complex concepts in an accessible manner.",
            rating: 5,
            scale: 5,
            verified: true,
            helpful: 89,
            total: 95,
          },
        ],
        coverImages: [
          {
            url: "https://example.com/high-res.jpg",
            width: 800,
            height: 1200,
            format: "jpeg",
            quality: "original",
            verified: true,
          },
        ],
        source: publisherSource,
      },
    ];

    const result = contentReconciler.reconcileContentDescription(inputs);

    // Should select high-quality description
    expect(result.description.value.text).toContain("comprehensive and well-researched");
    expect(result.description.confidence).toBeGreaterThan(0.8);

    // Should prioritize verified review
    expect(result.reviews.value[0].verified).toBe(true);
    expect(result.reviews.value[0].text).toContain("Exceptional work");

    // Should select high-resolution, verified cover image
    expect(result.coverImage.value.url).toBe("https://example.com/high-res.jpg");
    expect(result.coverImage.value.verified).toBe(true);
    expect(result.coverImage.value.quality).toBe("original");
    expect(result.coverImage.confidence).toBeGreaterThan(0.8);
  });
});
