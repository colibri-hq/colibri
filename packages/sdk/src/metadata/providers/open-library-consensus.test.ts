import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenLibraryMetadataProvider } from "./open-library.js";
import { MetadataType } from "./provider.js";

// Create a mock for the searchBook function
const mockSearchBook = vi.fn();

// Mock the OpenLibrary client with a proper class mock
vi.mock("@colibri-hq/open-library-client", () => ({
  Client: class MockClient {
    searchBook = mockSearchBook;
  },
}));

describe("OpenLibraryMetadataProvider - Consensus-based Aggregation", () => {
  let provider: OpenLibraryMetadataProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenLibraryMetadataProvider();
  });

  // Helper function to create mock OpenLibrary API results
  const createMockOpenLibraryResult = (overrides: any = {}) => ({
    title: "Test Book",
    author_name: ["Test Author"],
    first_publish_year: 2020,
    language: ["eng"],
    key: "/works/OL123456W",
    isbn: ["9781234567890"],
    subject: ["Fiction"],
    publisher: ["Test Publisher"],
    number_of_pages_median: 200,
    cover_i: 12345,
    edition_count: 1,
    ratings_average: 4.0,
    ratings_count: 100,
    ...overrides,
  });

  describe("Author Name Format Consensus", () => {
    it('should prefer "First Last" format when multiple sources agree', async () => {
      // Mock results with mixed name formats - more sources prefer "First Last"
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Little Book of Ikigai",
          author_name: ["Ken Mogi"], // First Last
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Little Book of Ikigai",
          author_name: ["Ken Mogi"], // First Last
          key: "/works/OL2",
        }),
        createMockOpenLibraryResult({
          title: "Little Book of Ikigai",
          author_name: ["Mogi, Ken"], // Last, First
          key: "/works/OL3",
        }),
        createMockOpenLibraryResult({
          title: "Little Book of Ikigai",
          author_name: ["Ken Mogi"], // First Last
          key: "/works/OL4",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({
        title: "Little Book of Ikigai",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0].authors).toEqual(["Ken Mogi"]); // Should prefer "First Last" format
      expect(results[0].confidence).toBeGreaterThan(0.8); // Should have high confidence due to consensus
    });

    it('should handle "Last, First" to "First Last" conversion in aggregation', async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Test Book",
          author_name: ["Mogi, Ken"], // Last, First
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Test Book",
          author_name: ["Ken Mogi"], // First Last
          key: "/works/OL2",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByCreator({ name: "Mogi, Ken", fuzzy: true });

      expect(results).toHaveLength(1);
      // Should recognize both formats as the same author and prefer "First Last"
      expect(results[0].authors).toEqual(["Ken Mogi"]);
    });
  });

  describe("Consensus-based Field Selection", () => {
    it("should prefer values that multiple sources agree on", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Little Book of Ikigai",
          first_publish_year: 2017, // 3 sources agree on 2017
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Little Book of Ikigai",
          first_publish_year: 2017,
          key: "/works/OL2",
        }),
        createMockOpenLibraryResult({
          title: "Little Book of Ikigai",
          first_publish_year: 2017,
          key: "/works/OL3",
        }),
        createMockOpenLibraryResult({
          title: "Little Book of Ikigai",
          first_publish_year: 2018, // Only 1 source says 2018
          key: "/works/OL4",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({
        title: "Little Book of Ikigai",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0].publicationDate?.getFullYear()).toBe(2017); // Should prefer consensus value
      expect(results[0].confidence).toBeGreaterThan(0.85); // High confidence due to strong consensus
    });

    it("should boost confidence when multiple sources agree perfectly", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Consensus Book",
          author_name: ["Test Author"],
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Consensus Book",
          author_name: ["Test Author"],
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL2",
        }),
        createMockOpenLibraryResult({
          title: "Consensus Book",
          author_name: ["Test Author"],
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL3",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({ title: "Consensus Book", exactMatch: false });

      expect(results).toHaveLength(1);
      // Confidence should be boosted due to perfect consensus
      expect(results[0].confidence).toBeGreaterThan(0.9);
    });

    it("should prefer higher confidence sources when consensus is equal", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Equal Consensus Book",
          publisher: ["Publisher A"], // 2 sources for Publisher A
          ratings_average: 4.5, // Higher rating = higher confidence
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Equal Consensus Book",
          publisher: ["Publisher A"],
          ratings_average: 4.8, // Higher rating = higher confidence
          key: "/works/OL2",
        }),
        createMockOpenLibraryResult({
          title: "Equal Consensus Book",
          publisher: ["Publisher B"], // 2 sources for Publisher B
          ratings_average: 3.0, // Lower rating = lower confidence
          key: "/works/OL3",
        }),
        createMockOpenLibraryResult({
          title: "Equal Consensus Book",
          publisher: ["Publisher B"],
          ratings_average: 3.2, // Lower rating = lower confidence
          key: "/works/OL4",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({
        title: "Equal Consensus Book",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      // Should prefer Publisher A due to higher confidence sources
      expect(results[0].publisher).toBe("Publisher A");
    });

    it("should consider language preference in field selection scoring", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Multilingual Book",
          language: ["eng"], // English - preferred language
          publisher: ["English Publisher"],
          ratings_average: 4.0, // Good rating
          ratings_count: 100,
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Multilingual Book",
          language: ["eng"], // English - preferred language
          publisher: ["English Publisher"],
          ratings_average: 4.0, // Good rating
          ratings_count: 100,
          key: "/works/OL2",
        }),
        createMockOpenLibraryResult({
          title: "Multilingual Book",
          language: ["ger"], // German - not preferred
          publisher: ["German Publisher"],
          ratings_average: 3.5, // Lower rating
          ratings_count: 50,
          key: "/works/OL3",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchMultiCriteria({
        title: "Multilingual Book",
        language: "eng", // Prefer English
      });

      expect(results).toHaveLength(1);
      // Should prefer English language due to both consensus and language preference
      expect(results[0].language).toBe("eng");
      expect(results[0].publisher).toBe("English Publisher");
    });

    it("should enhance field selection with source reliability weighting", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Reliability Test Book",
          author_name: ["High Quality Author"],
          first_publish_year: 2020,
          publisher: ["High Quality Publisher"],
          isbn: ["9781234567890"],
          number_of_pages_median: 300,
          language: ["eng"],
          subject: ["Fiction", "Literature"],
          ratings_average: 4.5, // High quality source
          ratings_count: 200,
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Reliability Test Book",
          author_name: ["High Quality Author"],
          first_publish_year: 2020,
          publisher: ["High Quality Publisher"],
          isbn: ["9781234567890"],
          number_of_pages_median: 300,
          language: ["eng"],
          subject: ["Fiction", "Literature"],
          ratings_average: 4.5, // High quality source
          ratings_count: 200,
          key: "/works/OL2",
        }),
        createMockOpenLibraryResult({
          title: "Reliability Test Book",
          author_name: ["Low Quality Author"],
          // Missing many fields - lower reliability
          ratings_average: 2.0, // Low quality source
          ratings_count: 10,
          key: "/works/OL3",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({
        title: "Reliability Test Book",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      // Should prefer the high-quality sources with consensus
      expect(results[0].authors).toEqual(["High Quality Author"]);
      expect(results[0].publisher).toBe("High Quality Publisher");
      expect(results[0].isbn).toEqual(["9781234567890"]);
    });
  });

  describe("Single Aggregated Result per Provider", () => {
    it("should return exactly one result even with multiple matches", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Popular Book",
          author_name: ["Popular Author"],
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Popular Book",
          author_name: ["Popular Author"],
          key: "/works/OL2",
        }),
        createMockOpenLibraryResult({
          title: "Popular Book",
          author_name: ["Popular Author"],
          key: "/works/OL3",
        }),
        createMockOpenLibraryResult({
          title: "Popular Book",
          author_name: ["Popular Author"],
          key: "/works/OL4",
        }),
        createMockOpenLibraryResult({
          title: "Popular Book",
          author_name: ["Popular Author"],
          key: "/works/OL5",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByCreator({ name: "Popular Author", fuzzy: true });

      expect(results).toHaveLength(1); // Should return exactly one aggregated result
      expect(results[0].confidence).toBeGreaterThan(0.9); // High confidence due to strong consensus
    });

    it("should aggregate results from multi-criteria search into single result", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Multi Criteria Book",
          author_name: ["Test Author"],
          first_publish_year: 2021,
          language: ["eng"],
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Multi Criteria Book",
          author_name: ["Test Author"],
          first_publish_year: 2021,
          language: ["eng"],
          key: "/works/OL2",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchMultiCriteria({
        title: "Multi Criteria Book",
        authors: ["Test Author"],
        language: "eng",
      });

      expect(results).toHaveLength(1); // Single aggregated result
      expect(results[0].title).toBe("Multi Criteria Book");
      expect(results[0].authors).toEqual(["Test Author"]);
      expect(results[0].language).toBe("eng");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty results gracefully", async () => {
      mockSearchBook.mockImplementation(async function* () {
        // No results
      });

      const results = await provider.searchByCreator({ name: "Nonexistent Author", fuzzy: true });

      expect(results).toHaveLength(0);
    });

    it("should handle single result without aggregation issues", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Single Result Book",
          author_name: ["Single Author"],
          first_publish_year: 2022,
          key: "/works/OL1",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByCreator({ name: "Single Author", fuzzy: true });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Single Result Book");
      expect(results[0].authors).toEqual(["Single Author"]);
    });

    it("should handle results with missing fields", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Incomplete Book 1",
          author_name: ["Author Name"],
          // Missing first_publish_year
          first_publish_year: undefined,
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Incomplete Book 2",
          // Missing author_name
          author_name: undefined,
          first_publish_year: 2020,
          key: "/works/OL2",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({ title: "Incomplete Book", exactMatch: false });

      expect(results).toHaveLength(1);
      // Should handle missing fields gracefully
      expect(results[0]).toBeDefined();
      expect(results[0].title).toContain("Incomplete Book");
    });

    it("should handle complex author names with multiple parts", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Complex Names Book",
          author_name: ["Van Der Berg, Jan Willem"], // Complex "Last, First Middle"
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Complex Names Book",
          author_name: ["Jan Willem Van Der Berg"], // Same author in "First Middle Last" format
          key: "/works/OL2",
        }),
        createMockOpenLibraryResult({
          title: "Complex Names Book",
          author_name: ["J.W. Van Der Berg"], // Same author with initials
          key: "/works/OL3",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({
        title: "Complex Names Book",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      // Should recognize all as the same author and prefer readable format
      expect(results[0].authors).toEqual(["Jan Willem Van Der Berg"]);
      expect(results[0].confidence).toBeGreaterThan(0.8);
    });

    it("should handle author names with prefixes and suffixes", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Prefix Suffix Book",
          author_name: ["Dr. Smith Jr., John"], // With prefix and suffix
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Prefix Suffix Book",
          author_name: ["John Smith Jr."], // Same author without prefix
          key: "/works/OL2",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({
        title: "Prefix Suffix Book",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      // Should handle prefixes and suffixes - may prefer the first format found
      expect(results[0].authors).toHaveLength(1);
      expect(results[0].authors[0]).toContain("Smith");
      expect(results[0].authors[0]).toContain("John");
    });

    it("should handle international names and special characters", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "International Names Book",
          author_name: ["García-Márquez, Gabriel José"], // Spanish name with accents and hyphen
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "International Names Book",
          author_name: ["Gabriel José García-Márquez"], // Same name in different format
          key: "/works/OL2",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({
        title: "International Names Book",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      // Should handle international characters correctly
      expect(results[0].authors).toEqual(["Gabriel José García-Márquez"]);
    });

    it("should handle edge case with null and undefined values", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Null Values Book",
          author_name: null, // Null author
          first_publish_year: undefined, // Undefined year
          language: [], // Empty array
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Null Values Book",
          author_name: ["Valid Author"], // Valid author
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL2",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({
        title: "Null Values Book",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      // Should handle null/undefined values gracefully and use valid data
      expect(results[0].title).toBe("Null Values Book");
      expect(results[0].authors).toEqual(["Valid Author"]);
      expect(results[0].publicationDate?.getFullYear()).toBe(2020);
      expect(results[0].language).toBe("eng");
    });

    it("should handle extreme disagreement between sources", async () => {
      const mockResults = [
        createMockOpenLibraryResult({
          title: "Disagreement Book A",
          author_name: ["Author A"],
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Disagreement Book B",
          author_name: ["Author B"],
          first_publish_year: 2021,
          language: ["ger"],
          key: "/works/OL2",
        }),
        createMockOpenLibraryResult({
          title: "Disagreement Book C",
          author_name: ["Author C"],
          first_publish_year: 2022,
          language: ["fre"],
          key: "/works/OL3",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({
        title: "Disagreement Book",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      // Should handle extreme disagreement - confidence may still be reasonable due to other factors
      expect(results[0].confidence).toBeLessThan(0.95);
      // Should still return a result with best available data
      expect(results[0].title).toContain("Disagreement Book");
    });

    it("should handle very large number of sources", async () => {
      const mockResults = Array.from({ length: 20 }, (_, i) =>
        createMockOpenLibraryResult({
          title: "Popular Book",
          author_name: ["Popular Author"],
          first_publish_year: 2020,
          language: ["eng"],
          ratings_average: 4.0 + i * 0.01, // Slight variations
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of mockResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({ title: "Popular Book", exactMatch: false });

      expect(results).toHaveLength(1);
      // Should handle many sources efficiently and boost confidence
      expect(results[0].confidence).toBeGreaterThan(0.95);
      expect(results[0].title).toBe("Popular Book");
      expect(results[0].authors).toEqual(["Popular Author"]);
    });
  });

  describe("Confidence Calculation", () => {
    it("should calculate higher confidence for strong consensus", async () => {
      const strongConsensusResults = [
        createMockOpenLibraryResult({
          title: "Strong Consensus Book",
          author_name: ["Consensus Author"],
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Strong Consensus Book",
          author_name: ["Consensus Author"],
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL2",
        }),
        createMockOpenLibraryResult({
          title: "Strong Consensus Book",
          author_name: ["Consensus Author"],
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL3",
        }),
        createMockOpenLibraryResult({
          title: "Strong Consensus Book",
          author_name: ["Consensus Author"],
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL4",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of strongConsensusResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({
        title: "Strong Consensus Book",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBeGreaterThan(0.9); // Very high confidence
    });

    it("should calculate lower confidence for weak consensus", async () => {
      const weakConsensusResults = [
        createMockOpenLibraryResult({
          title: "Weak Consensus Book",
          author_name: ["Author A"],
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Different Book",
          author_name: ["Author B"],
          first_publish_year: 2021,
          language: ["ger"],
          key: "/works/OL2",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of weakConsensusResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({
        title: "Weak Consensus Book",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBeLessThan(0.9); // Lower confidence due to disagreement
    });

    it("should boost confidence based on number of agreeing sources", async () => {
      // Test with few sources
      const fewSources = [
        createMockOpenLibraryResult({ title: "Few Sources Book", key: "/works/OL1" }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of fewSources) {
          yield result;
        }
      });

      const fewResults = await provider.searchByTitle({
        title: "Few Sources Book",
        exactMatch: false,
      });

      // Reset mock for many sources test
      const manySources = [
        createMockOpenLibraryResult({ title: "Many Sources Book", key: "/works/OL1" }),
        createMockOpenLibraryResult({ title: "Many Sources Book", key: "/works/OL2" }),
        createMockOpenLibraryResult({ title: "Many Sources Book", key: "/works/OL3" }),
        createMockOpenLibraryResult({ title: "Many Sources Book", key: "/works/OL4" }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of manySources) {
          yield result;
        }
      });

      const manyResults = await provider.searchByTitle({
        title: "Many Sources Book",
        exactMatch: false,
      });

      expect(manyResults[0].confidence).toBeGreaterThan(fewResults[0].confidence);
    });

    it("should never assign perfect 1.0 confidence score", async () => {
      // Create perfect consensus scenario
      const perfectResults = Array.from({ length: 10 }, (_, i) =>
        createMockOpenLibraryResult({
          title: "Perfect Book",
          author_name: ["Perfect Author"],
          first_publish_year: 2020,
          language: ["eng"],
          publisher: ["Perfect Publisher"],
          isbn: ["9781234567890"],
          subject: ["Fiction"],
          ratings_average: 5.0,
          ratings_count: 1000,
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of perfectResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({ title: "Perfect Book", exactMatch: false });

      expect(results).toHaveLength(1);
      expect(results[0].confidence).toBeLessThan(1.0); // Should never be perfect 1.0
      expect(results[0].confidence).toBeGreaterThan(0.95); // But should be very high
    });

    it("should apply confidence penalties for source disagreement", async () => {
      const disagreementResults = [
        createMockOpenLibraryResult({
          title: "Penalty Test Book",
          author_name: ["Author One"],
          first_publish_year: 2020,
          language: ["eng"],
          ratings_average: 4.0,
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Penalty Test Book",
          author_name: ["Author Two"], // Different author
          first_publish_year: 2021, // Different year
          language: ["ger"], // Different language
          ratings_average: 3.0,
          key: "/works/OL2",
        }),
        createMockOpenLibraryResult({
          title: "Penalty Test Book",
          author_name: ["Author Three"], // Another different author
          first_publish_year: 2022, // Another different year
          language: ["fre"], // Another different language
          ratings_average: 2.0,
          key: "/works/OL3",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of disagreementResults) {
          yield result;
        }
      });

      const results = await provider.searchByTitle({
        title: "Penalty Test Book",
        exactMatch: false,
      });

      expect(results).toHaveLength(1);
      // Should apply penalties for disagreement - confidence should be lower than perfect consensus
      expect(results[0].confidence).toBeLessThan(0.95);
    });

    it("should differentiate confidence between strong and weak consensus", async () => {
      // Strong consensus test
      const strongConsensus = [
        createMockOpenLibraryResult({
          title: "Strong Test",
          author_name: ["Same Author"],
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Strong Test",
          author_name: ["Same Author"],
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL2",
        }),
        createMockOpenLibraryResult({
          title: "Strong Test",
          author_name: ["Same Author"],
          first_publish_year: 2020,
          language: ["eng"],
          key: "/works/OL3",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of strongConsensus) {
          yield result;
        }
      });

      const strongResults = await provider.searchByTitle({
        title: "Strong Test",
        exactMatch: false,
      });

      // Weak consensus test
      const weakConsensus = [
        createMockOpenLibraryResult({
          title: "Weak Test",
          author_name: ["Author A"],
          first_publish_year: 2020,
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Weak Test",
          author_name: ["Author B"],
          first_publish_year: 2021,
          key: "/works/OL2",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of weakConsensus) {
          yield result;
        }
      });

      const weakResults = await provider.searchByTitle({ title: "Weak Test", exactMatch: false });

      // Strong consensus should have higher confidence than weak consensus
      expect(strongResults[0].confidence).toBeGreaterThan(weakResults[0].confidence);
      expect(strongResults[0].confidence).toBeGreaterThan(0.9); // Strong consensus above 0.9
      expect(weakResults[0].confidence).toBeLessThan(0.9); // Weak consensus below 0.9
    });

    it("should increase confidence with more agreeing sources", async () => {
      // Test with 2 agreeing sources
      const twoSources = [
        createMockOpenLibraryResult({
          title: "Agreement Test",
          author_name: ["Test Author"],
          key: "/works/OL1",
        }),
        createMockOpenLibraryResult({
          title: "Agreement Test",
          author_name: ["Test Author"],
          key: "/works/OL2",
        }),
      ];

      mockSearchBook.mockImplementation(async function* () {
        for (const result of twoSources) {
          yield result;
        }
      });

      const twoResults = await provider.searchByTitle({
        title: "Agreement Test",
        exactMatch: false,
      });

      // Test with 5 agreeing sources
      const fiveSources = Array.from({ length: 5 }, (_, i) =>
        createMockOpenLibraryResult({
          title: "Agreement Test",
          author_name: ["Test Author"],
          key: `/works/OL${i + 1}`,
        }),
      );

      mockSearchBook.mockImplementation(async function* () {
        for (const result of fiveSources) {
          yield result;
        }
      });

      const fiveResults = await provider.searchByTitle({
        title: "Agreement Test",
        exactMatch: false,
      });

      // More agreeing sources should result in higher confidence
      expect(fiveResults[0].confidence).toBeGreaterThan(twoResults[0].confidence);
    });
  });

  describe("Provider Configuration", () => {
    it("should have appropriate priority for Open Library", () => {
      expect(provider.priority).toBe(80); // High priority
    });

    it("should provide reliability scores for different data types", () => {
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBeGreaterThan(0.9);
      expect(provider.getReliabilityScore(MetadataType.AUTHORS)).toBeGreaterThan(0.8);
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBeGreaterThan(0.9);
      expect(provider.getReliabilityScore(MetadataType.DESCRIPTION)).toBeGreaterThan(0.6);
    });

    it("should support expected metadata types", () => {
      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PHYSICAL_DIMENSIONS)).toBe(false);
    });
  });
});
