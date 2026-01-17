/**
 * Example usage of the enhanced OpenLibraryMetadataProvider
 *
 * This demonstrates the new multi-criteria search capabilities
 * and reliability scoring features.
 */

import { OpenLibraryMetadataProvider } from "./providers/open-library.js";
import {
  BaseMetadataProvider,
  type CreatorQuery,
  type MetadataRecord,
  MetadataType,
  type MultiCriteriaQuery,
  type TitleQuery,
} from "./providers/provider.js";

/**
 * Example metadata provider for testing and demonstration purposes
 */
export class ExampleMetadataProvider extends BaseMetadataProvider {
  readonly name = "example-provider";
  readonly priority = 100;

  constructor() {
    super();
  }

  async searchByTitle(criteria: TitleQuery): Promise<MetadataRecord[]> {
    return [
      {
        id: "example-1",
        title: criteria.title,
        source: this.name,
        confidence: 0.85,
        timestamp: new Date(),
        isbn: ["978-1234567890"],
        authors: ["Test Author"],
        publicationDate: new Date("2023-01-01"),
        description: "Example book for testing",
        subjects: ["Test", "Example"],
        language: "en",
      },
    ];
  }

  async searchByISBN(isbn: string): Promise<MetadataRecord[]> {
    return [
      {
        id: "example-isbn-1",
        title: "Test Book",
        source: this.name,
        confidence: 0.95,
        timestamp: new Date(),
        isbn: [isbn],
        authors: ["Test Author"],
        publicationDate: new Date("2023-01-01"),
        description: "Example book found by ISBN",
        subjects: ["Test"],
        language: "en",
      },
    ];
  }

  async searchByCreator(criteria: CreatorQuery): Promise<MetadataRecord[]> {
    return [
      {
        id: "example-creator-1",
        title: "Test Book by Author",
        source: this.name,
        confidence: 0.8,
        timestamp: new Date(),
        isbn: ["978-0987654321"],
        authors: [criteria.name],
        publicationDate: new Date("2023-01-01"),
        description: "Example book found by creator",
        subjects: ["Test"],
        language: "en",
      },
    ];
  }

  async searchMultiCriteria(criteria: MultiCriteriaQuery): Promise<MetadataRecord[]> {
    const results: MetadataRecord[] = [];

    // If title is provided, add a title-based result
    if (criteria.title) {
      results.push({
        id: "example-multi-title",
        title: criteria.title,
        source: this.name,
        confidence: 0.9,
        timestamp: new Date(),
        isbn: ["978-1111111111"],
        authors: criteria.authors || ["Multi Author"],
        publicationDate: new Date("2023-01-01"),
        description: "Example book found by title in multi-criteria search",
        subjects: criteria.subjects || ["Test"],
        language: criteria.language || "en",
      });
    }

    // If ISBN is provided, add an ISBN-based result
    if (criteria.isbn) {
      results.push({
        id: "example-multi-isbn",
        title: criteria.title || "Book found by ISBN",
        source: this.name,
        confidence: 0.95,
        timestamp: new Date(),
        isbn: [criteria.isbn],
        authors: criteria.authors || ["ISBN Author"],
        publicationDate: new Date("2023-01-01"),
        description: "Example book found by ISBN in multi-criteria search",
        subjects: criteria.subjects || ["Test"],
        language: criteria.language || "en",
      });
    }

    // If no specific criteria, return a default result
    if (results.length === 0) {
      results.push({
        id: "example-multi-default",
        title: "Multi-criteria Result",
        source: this.name,
        confidence: 0.8,
        timestamp: new Date(),
        isbn: ["978-1111111111"],
        authors: ["Multi Author"],
        publicationDate: new Date("2023-01-01"),
        description: "Example book found by multi-criteria search",
        subjects: ["Test"],
        language: "en",
      });
    }

    return results;
  }

  supportsDataType(type: MetadataType): boolean {
    const supportedTypes = [
      MetadataType.TITLE,
      MetadataType.AUTHORS,
      MetadataType.ISBN,
      MetadataType.DESCRIPTION,
      MetadataType.SUBJECTS,
      MetadataType.LANGUAGE,
      MetadataType.PUBLICATION_DATE,
    ];
    return supportedTypes.includes(type);
  }

  getReliabilityScore(type: MetadataType): number {
    switch (type) {
      case MetadataType.TITLE:
        return 0.9;
      case MetadataType.ISBN:
        return 0.95;
      case MetadataType.AUTHORS:
        return 0.85;
      case MetadataType.DESCRIPTION:
        return 0.7;
      case MetadataType.SUBJECTS:
        return 0.75;
      case MetadataType.LANGUAGE:
        return 0.8;
      case MetadataType.PUBLICATION_DATE:
        return 0.8;
      default:
        return 0.5;
    }
  }
}

async function demonstrateEnhancedProvider() {
  const provider = new OpenLibraryMetadataProvider();

  console.log("=== Enhanced Open Library Provider Demo ===\n");

  // Show provider capabilities
  console.log(`Provider: ${provider.name}`);
  console.log(`Priority: ${provider.priority}`);
  console.log(
    `Rate Limit: ${provider.rateLimit.maxRequests} requests per ${provider.rateLimit.windowMs}ms`,
  );
  console.log(`Request Timeout: ${provider.timeout.requestTimeout}ms\n`);

  // Show reliability scores
  console.log("Reliability Scores:");
  const dataTypes = [
    MetadataType.TITLE,
    MetadataType.AUTHORS,
    MetadataType.ISBN,
    MetadataType.SUBJECTS,
    MetadataType.DESCRIPTION,
    MetadataType.COVER_IMAGE,
  ];

  dataTypes.forEach((type) => {
    const score = provider.getReliabilityScore(type);
    const supported = provider.supportsDataType(type);
    console.log(`  ${type}: ${score} (${supported ? "supported" : "not supported"})`);
  });

  console.log("\n=== Search Examples ===\n");

  try {
    // Example 1: Title search
    console.log("1. Title Search (exact match):");
    const titleResults = await provider.searchByTitle({ title: "The Hobbit", exactMatch: true });
    console.log(`Found ${titleResults.length} results`);
    if (titleResults.length > 0) {
      const result = titleResults[0];
      console.log(`  Title: ${result.title}`);
      console.log(`  Authors: ${result.authors?.join(", ")}`);
      console.log(`  Confidence: ${result.confidence}`);
      console.log(`  Source: ${result.source}`);
    }
    console.log();

    // Example 2: ISBN search
    console.log("2. ISBN Search:");
    const isbnResults = await provider.searchByISBN("978-0-547-92822-7");
    console.log(`Found ${isbnResults.length} results`);
    if (isbnResults.length > 0) {
      const result = isbnResults[0];
      console.log(`  Title: ${result.title}`);
      console.log(`  ISBN: ${result.isbn?.join(", ")}`);
      console.log(`  Confidence: ${result.confidence}`);
    }
    console.log();

    // Example 3: Creator search
    console.log("3. Creator Search:");
    const creatorResults = await provider.searchByCreator({ name: "J.R.R. Tolkien", fuzzy: false });
    console.log(`Found ${creatorResults.length} results`);
    if (creatorResults.length > 0) {
      const result = creatorResults[0];
      console.log(`  Title: ${result.title}`);
      console.log(`  Authors: ${result.authors?.join(", ")}`);
      console.log(`  Confidence: ${result.confidence}`);
    }
    console.log();

    // Example 4: Multi-criteria search
    console.log("4. Multi-Criteria Search:");
    const multiResults = await provider.searchMultiCriteria({
      title: "The Hobbit",
      authors: ["J.R.R. Tolkien"],
      language: "eng",
      subjects: ["Fantasy"],
      yearRange: [1930, 1940],
      fuzzy: false,
    });
    console.log(`Found ${multiResults.length} results`);
    if (multiResults.length > 0) {
      const result = multiResults[0];
      console.log(`  Title: ${result.title}`);
      console.log(`  Authors: ${result.authors?.join(", ")}`);
      console.log(`  Language: ${result.language}`);
      console.log(`  Subjects: ${result.subjects?.slice(0, 3).join(", ")}...`);
      console.log(`  Publication Date: ${result.publicationDate?.getFullYear()}`);
      console.log(`  Confidence: ${result.confidence}`);
      console.log(`  Provider Data Keys: ${Object.keys(result.providerData || {}).join(", ")}`);
    }
  } catch (error) {
    console.error("Error during demonstration:", error);
  }
}

/**
 * Demonstrates the complete infrastructure integration
 */
export async function demonstrateInfrastructure() {
  const provider = new ExampleMetadataProvider();

  console.log("=== Infrastructure Integration Demo ===\n");

  // Show provider capabilities
  console.log(`Provider: ${provider.name}`);
  console.log(`Priority: ${provider.priority}`);

  // Test data type support
  console.log("\nSupported Data Types:");
  const dataTypes = [
    MetadataType.TITLE,
    MetadataType.AUTHORS,
    MetadataType.ISBN,
    MetadataType.DESCRIPTION,
    MetadataType.SUBJECTS,
    MetadataType.LANGUAGE,
    MetadataType.PUBLICATION_DATE,
    MetadataType.PHYSICAL_DIMENSIONS,
  ];

  dataTypes.forEach((type) => {
    const supported = provider.supportsDataType(type);
    const score = provider.getReliabilityScore(type);
    console.log(`  ${type}: ${supported ? "supported" : "not supported"} (reliability: ${score})`);
  });

  // Test searches
  console.log("\n=== Search Tests ===\n");

  const titleResults = await provider.searchByTitle({ title: "Test Book" });
  console.log(`Title search results: ${titleResults.length}`);

  const isbnResults = await provider.searchByISBN("978-1234567890");
  console.log(`ISBN search results: ${isbnResults.length}`);

  const creatorResults = await provider.searchByCreator({ name: "Test Author" });
  console.log(`Creator search results: ${creatorResults.length}`);

  const multiResults = await provider.searchMultiCriteria({
    title: "Test Book",
    authors: ["Test Author"],
  });
  console.log(`Multi-criteria search results: ${multiResults.length}`);

  return provider;
}

// Run the demonstration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateEnhancedProvider().catch(console.error);
}

export { demonstrateEnhancedProvider };
