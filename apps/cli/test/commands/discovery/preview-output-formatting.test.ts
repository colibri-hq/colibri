import {
  type MetadataRecord,
  type MultiCriteriaQuery,
  WikiDataMetadataProvider,
} from "@colibri-hq/sdk/metadata";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch for WikiData provider
const mockFetch = vi.fn();

// Mock WikiData SPARQL response
const createMockWikiDataResponse = (bindings: unknown[]) => ({
  head: {
    vars: [
      "book",
      "title",
      "author",
      "authorLabel",
      "isbn",
      "publishDate",
      "publisher",
      "publisherLabel",
    ],
  },
  results: { bindings },
});

// Mock console.log to capture CLI output
const mockConsoleLog = vi.fn();
const originalConsoleLog = console.log;

// Simple CLI output formatter for testing
class TestCLIFormatter {
  private logs: string[] = [];

  clearLogs(): void {
    this.logs = [];
  }

  displayDetailedOutput(
    results: MetadataRecord[],
    providerResults: Array<{
      duration: number;
      error?: Error;
      provider: string;
      records: MetadataRecord[];
      success: boolean;
    }>,
    showConfidence: boolean,
  ): void {
    this.log("=== Detailed Metadata Results ===");

    if (results.length === 0) {
      this.log("❌ No metadata found for the given criteria.");
      return;
    }

    // Display best result
    const bestResult = results[0];
    this.log(
      `Best Match (Confidence: ${(bestResult.confidence * 100).toFixed(1)}%):`,
    );
    this.log("");

    // Display core metadata fields
    this.displayMetadataField(
      "Title",
      bestResult.title,
      bestResult.confidence,
      showConfidence,
    );
    this.displayMetadataField(
      "Authors",
      bestResult.authors,
      bestResult.confidence,
      showConfidence,
    );
    this.displayMetadataField(
      "ISBN",
      bestResult.isbn,
      bestResult.confidence,
      showConfidence,
    );
    this.displayMetadataField(
      "Publisher",
      bestResult.publisher,
      bestResult.confidence,
      showConfidence,
    );
    this.displayMetadataField(
      "Publication Date",
      bestResult.publicationDate,
      bestResult.confidence,
      showConfidence,
    );
    this.displayMetadataField(
      "Language",
      bestResult.language,
      bestResult.confidence,
      showConfidence,
    );
    this.displayMetadataField(
      "Subjects",
      bestResult.subjects,
      bestResult.confidence,
      showConfidence,
    );

    // Show provider performance metrics
    if (providerResults.length > 0) {
      this.log("=== Provider Performance Metrics ===");
      for (const result of providerResults) {
        const status = result.success ? "✅ Success" : "❌ Failed";
        this.log(`${result.provider}: ${status} (${result.duration}ms)`);
        if (result.success) {
          this.log(`  Records Found: ${result.records.length}`);
          if (result.records.length > 0) {
            const avgConfidence =
              result.records.reduce((sum, r) => sum + r.confidence, 0) /
              result.records.length;
            this.log(
              `  Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`,
            );
          }
        } else if (result.error) {
          this.log(`  Error: ${result.error.message}`);
        }
      }
    }

    // Show all results summary
    if (results.length > 1) {
      this.log("\n=== All Results Summary ===");
      this.log(`Found ${results.length} results:`);
      for (const [index, record] of results.slice(0, 5).entries()) {
        const confidenceStr = showConfidence
          ? ` (${(record.confidence * 100).toFixed(1)}%)`
          : "";
        this.log(
          `  ${index + 1}. ${record.title || "Unknown Title"}${confidenceStr} - ${record.source}`,
        );
      }
      if (results.length > 5) {
        this.log(`  ... and ${results.length - 5} more results`);
      }
    }
  }

  displayJsonOutput(
    results: MetadataRecord[],
    providerResults: Array<{
      duration: number;
      error?: Error;
      provider: string;
      records: MetadataRecord[];
      success: boolean;
    }>,
    totalDuration: number,
  ): void {
    const output = {
      results: results.map((r) => ({
        authors: r.authors,
        confidence: Math.round(r.confidence * 100) / 100,
        id: r.id,
        isbn: r.isbn,
        language: r.language,
        publicationDate: r.publicationDate?.getFullYear(),
        publisher: r.publisher,
        source: r.source,
        subjects: r.subjects?.slice(0, 5),
        timestamp: r.timestamp.toISOString(),
        title: r.title,
      })),
      summary: {
        providers: providerResults.map((p) => ({
          duration: p.duration,
          error: p.error?.message,
          name: p.provider,
          recordCount: p.records.length,
          success: p.success,
        })),
        totalDuration,
        totalResults: results.length,
      },
    };

    this.log(JSON.stringify(output, null, 2));
  }

  displayTableOutput(results: MetadataRecord[], showConfidence: boolean): void {
    this.log("=== Table Format Results ===");

    if (results.length === 0) {
      this.log("No results to display");
      return;
    }

    // Table header
    const headers = ["#", "Title", "Authors", "Publisher", "Year"];
    if (showConfidence) {
      headers.push("Confidence", "Source");
    }
    this.log(headers.join(" | "));
    this.log("-".repeat(headers.join(" | ").length));

    // Table rows
    for (const [index, record] of results.slice(0, 10).entries()) {
      const row = [
        (index + 1).toString(),
        (record.title || "Unknown").slice(0, 30),
        (record.authors?.join(", ") || "Unknown").slice(0, 25),
        (record.publisher || "Unknown").slice(0, 20),
        record.publicationDate?.getFullYear()?.toString() || "Unknown",
      ];

      if (showConfidence) {
        row.push(`${(record.confidence * 100).toFixed(1)}%`, record.source);
      }

      this.log(row.join(" | "));
    }

    if (results.length > 10) {
      this.log(`... and ${results.length - 10} more results`);
    }
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  log(message: string): void {
    this.logs.push(message);
    mockConsoleLog(message);
  }

  private displayMetadataField(
    label: string,
    value: unknown,
    confidence: number,
    showConfidence: boolean,
  ): void {
    if (!value) {
      return; // Skip empty fields
    }

    let displayValue: string;

    // Format the value based on its type
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return;
      }
      displayValue = value.join(", ");
    } else if (value instanceof Date) {
      displayValue = value.getFullYear().toString();
    } else if (typeof value === "object") {
      if (value.name) {
        displayValue = value.name;
        if (value.volume) {
          displayValue += ` (Volume ${value.volume})`;
        }
      } else if (value.url) {
        displayValue = value.url;
      } else {
        displayValue = JSON.stringify(value);
      }
    } else {
      displayValue = String(value);
    }

    // Truncate very long values
    if (displayValue.length > 200) {
      displayValue = displayValue.slice(0, 200) + "...";
    }

    this.log(`${label}: ${displayValue}`);

    if (showConfidence) {
      const confidenceIcon =
        confidence >= 0.8 ? "🟢" : confidence > 0.5 ? "🟡" : "🔴";
      this.log(
        `  ${confidenceIcon} Confidence: ${(confidence * 100).toFixed(1)}%`,
      );
    }
  }
}

describe("CLI Output Formatting and Display - WikiData Integration", () => {
  let wikidataProvider: WikiDataMetadataProvider;
  let formatter: TestCLIFormatter;

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = mockConsoleLog;
    wikidataProvider = new WikiDataMetadataProvider(mockFetch);
    formatter = new TestCLIFormatter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.log = originalConsoleLog;
  });

  describe("5.3 Test CLI output formatting and display", () => {
    it("should verify WikiData results are formatted correctly in CLI output", async () => {
      // Mock WikiData response with comprehensive metadata
      const mockBinding = {
        authorLabel: {
          type: "literal",
          value: "George Orwell",
          "xml:lang": "en",
        },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q8261" },
        isbn: { type: "literal", value: "9780451524935" },
        publishDate: {
          datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          type: "literal",
          value: "1949-06-08T00:00:00Z",
        },
        publisherLabel: {
          type: "literal",
          value: "Secker & Warburg",
          "xml:lang": "en",
        },
        title: { type: "literal", value: "1984", "xml:lang": "en" },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([mockBinding]),
        ok: true,
      });

      const query: MultiCriteriaQuery = {
        fuzzy: false,
        title: "1984",
      };

      const results = await wikidataProvider.searchMultiCriteria(query);

      // Mock provider results for display
      const providerResults = [
        {
          duration: 1250,
          provider: "WikiData",
          records: results,
          success: true,
        },
      ];

      // Test detailed output formatting
      formatter.displayDetailedOutput(results, providerResults, true);
      const logs = formatter.getLogs();

      // Verify header is displayed
      expect(logs).toContain("=== Detailed Metadata Results ===");

      // Verify best match confidence is displayed
      expect(logs.some((log) => log.includes("Best Match (Confidence:"))).toBe(
        true,
      );
      expect(logs.some((log) => log.includes("%):"))).toBe(true);

      // Verify core metadata fields are displayed
      expect(logs.some((log) => log.includes("Title: 1984"))).toBe(true);
      expect(logs.some((log) => log.includes("Authors: George Orwell"))).toBe(
        true,
      );
      expect(logs.some((log) => log.includes("ISBN: 9780451524935"))).toBe(
        true,
      );
      expect(
        logs.some((log) => log.includes("Publisher: Secker & Warburg")),
      ).toBe(true);
      expect(logs.some((log) => log.includes("Publication Date: 1949"))).toBe(
        true,
      );

      // Verify WikiData source is properly attributed
      expect(results[0].source).toBe("WikiData");
      expect(results[0].confidence).toBeGreaterThan(0.7);
    });

    it("should verify confidence scores are displayed correctly", async () => {
      // Mock WikiData response with high confidence data (ISBN search)
      const mockBinding = {
        authorLabel: {
          type: "literal",
          value: "F. Scott Fitzgerald",
          "xml:lang": "en",
        },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q74287" },
        isbn: { type: "literal", value: "9780743273565" },
        publishDate: {
          datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          type: "literal",
          value: "1925-04-10T00:00:00Z",
        },
        publisherLabel: {
          type: "literal",
          value: "Charles Scribner's Sons",
          "xml:lang": "en",
        },
        title: { type: "literal", value: "The Great Gatsby", "xml:lang": "en" },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([mockBinding]),
        ok: true,
      });

      const query: MultiCriteriaQuery = {
        fuzzy: false,
        isbn: "978-0-7432-7356-5", // ISBN search should have high confidence
      };

      const results = await wikidataProvider.searchMultiCriteria(query);

      const providerResults = [
        {
          duration: 890,
          provider: "WikiData",
          records: results,
          success: true,
        },
      ];

      // Test with confidence display enabled
      formatter.displayDetailedOutput(results, providerResults, true);
      const logs = formatter.getLogs();

      // Verify confidence scores are displayed with proper formatting
      expect(
        logs.some(
          (log) =>
            log.includes("🟢 Confidence:") ||
            log.includes("🟡 Confidence:") ||
            log.includes("🔴 Confidence:"),
        ),
      ).toBe(true);
      expect(logs.some((log) => log.match(/Confidence: \d+\.\d%/))).toBe(true);

      // Verify confidence is displayed as percentage
      const confidenceLog = logs.find((log) => log.includes("Confidence:"));
      expect(confidenceLog).toBeDefined();
      expect(confidenceLog).toMatch(/\d+\.\d%/);

      // Verify confidence icons are used appropriately
      const result = results[0];
      if (result.confidence >= 0.8) {
        expect(logs.some((log) => log.includes("🟢"))).toBe(true);
      } else if (result.confidence > 0.5) {
        expect(logs.some((log) => log.includes("🟡"))).toBe(true);
      } else {
        expect(logs.some((log) => log.includes("🔴"))).toBe(true);
      }

      // Test with confidence display disabled
      formatter.clearLogs();
      formatter.displayDetailedOutput(results, providerResults, false);
      const logsWithoutConfidence = formatter.getLogs();

      // When showConfidence is false, individual field confidence should not be displayed
      // But the "Best Match (Confidence: X%)" header and provider metrics may still show confidence
      const fieldConfidenceLogs = logsWithoutConfidence.filter(
        (log) =>
          log.includes("🟢 Confidence:") ||
          log.includes("🟡 Confidence:") ||
          log.includes("🔴 Confidence:"),
      );
      expect(fieldConfidenceLogs.length).toBe(0);

      // Confidence icons should not appear for individual fields when disabled
      const fieldLogs = logsWithoutConfidence.filter(
        (log) =>
          !log.includes("Best Match") &&
          !log.includes("Provider Performance") &&
          (log.includes("🟢") || log.includes("🟡") || log.includes("🔴")),
      );
      expect(fieldLogs.length).toBe(0);
    });

    it("should verify provider performance metrics are shown correctly", async () => {
      // Mock WikiData response
      const mockBinding = {
        authorLabel: { type: "literal", value: "Harper Lee", "xml:lang": "en" },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q47209" },
        isbn: { type: "literal", value: "9780061120084" },
        publishDate: {
          datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          type: "literal",
          value: "1960-07-11T00:00:00Z",
        },
        publisherLabel: {
          type: "literal",
          value: "J. B. Lippincott & Co.",
          "xml:lang": "en",
        },
        title: {
          type: "literal",
          value: "To Kill a Mockingbird",
          "xml:lang": "en",
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([mockBinding]),
        ok: true,
      });

      const query: MultiCriteriaQuery = {
        fuzzy: false,
        title: "To Kill a Mockingbird",
      };

      const results = await wikidataProvider.searchMultiCriteria(query);

      // Mock provider results with performance metrics
      const providerResults = [
        {
          duration: 1450, // Realistic WikiData query time
          provider: "WikiData",
          records: results,
          success: true,
        },
        {
          duration: 2100, // Simulate slower provider
          provider: "OpenLibrary",
          records: [], // Empty for this test
          success: true,
        },
        {
          duration: 500, // Failed provider with short duration
          error: new Error("Service temporarily unavailable"),
          provider: "TestProvider",
          records: [],
          success: false,
        },
      ];

      formatter.displayDetailedOutput(results, providerResults, true);
      const logs = formatter.getLogs();

      // Verify performance metrics section is displayed
      expect(logs).toContain("=== Provider Performance Metrics ===");

      // Verify WikiData performance metrics
      expect(
        logs.some((log) => log.includes("WikiData: ✅ Success (1450ms)")),
      ).toBe(true);
      expect(logs.some((log) => log.includes("Records Found: 1"))).toBe(true);
      expect(logs.some((log) => log.includes("Average Confidence:"))).toBe(
        true,
      );

      // Verify OpenLibrary performance metrics
      expect(
        logs.some((log) => log.includes("OpenLibrary: ✅ Success (2100ms)")),
      ).toBe(true);
      expect(logs.some((log) => log.includes("Records Found: 0"))).toBe(true);

      // Verify failed provider metrics
      expect(
        logs.some((log) => log.includes("TestProvider: ❌ Failed (500ms)")),
      ).toBe(true);
      expect(
        logs.some((log) =>
          log.includes("Error: Service temporarily unavailable"),
        ),
      ).toBe(true);

      // Verify duration formatting is correct
      const durationLogs = logs.filter((log) => log.includes("ms)"));
      expect(durationLogs.length).toBeGreaterThanOrEqual(3);

      // Verify each duration is properly formatted
      for (const log of durationLogs) {
        expect(log).toMatch(/\(\d+ms\)/);
      }
    });

    it("should format table output correctly for WikiData results", async () => {
      // Mock multiple WikiData results
      const mockBindings = [
        {
          authorLabel: {
            type: "literal",
            value: "J.R.R. Tolkien",
            "xml:lang": "en",
          },
          book: { type: "uri", value: "http://www.wikidata.org/entity/Q15228" },
          isbn: { type: "literal", value: "9780544003415" },
          publishDate: {
            datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
            type: "literal",
            value: "1954-07-29T00:00:00Z",
          },
          publisherLabel: {
            type: "literal",
            value: "George Allen & Unwin",
            "xml:lang": "en",
          },
          title: {
            type: "literal",
            value: "The Lord of the Rings",
            "xml:lang": "en",
          },
        },
        {
          authorLabel: {
            type: "literal",
            value: "J.R.R. Tolkien",
            "xml:lang": "en",
          },
          book: { type: "uri", value: "http://www.wikidata.org/entity/Q74287" },
          isbn: { type: "literal", value: "9780547928227" },
          publishDate: {
            datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
            type: "literal",
            value: "1937-09-21T00:00:00Z",
          },
          publisherLabel: {
            type: "literal",
            value: "George Allen & Unwin",
            "xml:lang": "en",
          },
          title: { type: "literal", value: "The Hobbit", "xml:lang": "en" },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse(mockBindings),
        ok: true,
      });

      const query: MultiCriteriaQuery = {
        authors: ["J.R.R. Tolkien"],
        fuzzy: false,
      };

      const results = await wikidataProvider.searchMultiCriteria(query);

      // Test table output with confidence
      formatter.displayTableOutput(results, true);
      const logsWithConfidence = formatter.getLogs();

      // Verify table header with confidence columns
      expect(logsWithConfidence).toContain("=== Table Format Results ===");
      expect(
        logsWithConfidence.some((log) =>
          log.includes(
            "# | Title | Authors | Publisher | Year | Confidence | Source",
          ),
        ),
      ).toBe(true);

      // Verify table separator line
      expect(
        logsWithConfidence.some((log) => log.includes("-".repeat(10))),
      ).toBe(true);

      // Verify table rows contain WikiData results
      expect(
        logsWithConfidence.some((log) =>
          log.includes("1 | The Lord of the Rings"),
        ),
      ).toBe(true);
      expect(
        logsWithConfidence.some((log) => log.includes("2 | The Hobbit")),
      ).toBe(true);
      expect(
        logsWithConfidence.some((log) => log.includes("J.R.R. Tolkien")),
      ).toBe(true);
      expect(
        logsWithConfidence.some((log) => log.includes("George Allen & Unwin")),
      ).toBe(true);
      expect(logsWithConfidence.some((log) => log.includes("1954"))).toBe(true);
      expect(logsWithConfidence.some((log) => log.includes("1937"))).toBe(true);
      expect(logsWithConfidence.some((log) => log.includes("WikiData"))).toBe(
        true,
      );

      // Verify confidence percentages are displayed
      expect(logsWithConfidence.some((log) => log.match(/\d+\.\d%/))).toBe(
        true,
      );

      // Test table output without confidence
      formatter.clearLogs();
      formatter.displayTableOutput(results, false);
      const logsWithoutConfidence = formatter.getLogs();

      // Verify table header without confidence columns
      expect(
        logsWithoutConfidence.some((log) =>
          log.includes("# | Title | Authors | Publisher | Year"),
        ),
      ).toBe(true);
      expect(
        logsWithoutConfidence.some((log) => log.includes("Confidence")),
      ).toBe(false);
      expect(logsWithoutConfidence.some((log) => log.includes("Source"))).toBe(
        false,
      );
    });

    it("should format JSON output correctly for WikiData results", async () => {
      // Mock WikiData response
      const mockBinding = {
        authorLabel: {
          type: "literal",
          value: "Jane Austen",
          "xml:lang": "en",
        },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q170583" },
        isbn: { type: "literal", value: "9780141439518" },
        publishDate: {
          datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          type: "literal",
          value: "1813-01-28T00:00:00Z",
        },
        publisherLabel: {
          type: "literal",
          value: "T. Egerton",
          "xml:lang": "en",
        },
        title: {
          type: "literal",
          value: "Pride and Prejudice",
          "xml:lang": "en",
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([mockBinding]),
        ok: true,
      });

      const query: MultiCriteriaQuery = {
        fuzzy: false,
        title: "Pride and Prejudice",
      };

      const results = await wikidataProvider.searchMultiCriteria(query);

      const providerResults = [
        {
          duration: 1100,
          provider: "WikiData",
          records: results,
          success: true,
        },
      ];

      formatter.displayJsonOutput(results, providerResults, 1200);
      const logs = formatter.getLogs();

      // Parse the JSON output
      const jsonOutput = logs.join("");
      expect(() => JSON.parse(jsonOutput)).not.toThrow();

      const parsed = JSON.parse(jsonOutput);

      // Verify JSON structure
      expect(parsed).toHaveProperty("summary");
      expect(parsed).toHaveProperty("results");

      // Verify summary section
      expect(parsed.summary).toHaveProperty("totalResults", 1);
      expect(parsed.summary).toHaveProperty("totalDuration", 1200);
      expect(parsed.summary).toHaveProperty("providers");
      expect(parsed.summary.providers).toHaveLength(1);

      // Verify provider information in summary
      const providerInfo = parsed.summary.providers[0];
      expect(providerInfo).toHaveProperty("name", "WikiData");
      expect(providerInfo).toHaveProperty("success", true);
      expect(providerInfo).toHaveProperty("duration", 1100);
      expect(providerInfo).toHaveProperty("recordCount", 1);
      expect(providerInfo).not.toHaveProperty("error");

      // Verify results section
      expect(parsed.results).toHaveLength(1);
      const result = parsed.results[0];

      expect(result).toHaveProperty("title", "Pride and Prejudice");
      expect(result).toHaveProperty("authors", ["Jane Austen"]);
      expect(result).toHaveProperty("isbn", ["9780141439518"]);
      expect(result).toHaveProperty("publisher", "T. Egerton");
      expect(result).toHaveProperty("publicationDate", 1813);
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("source", "WikiData");
      expect(result).toHaveProperty("timestamp");

      // Verify confidence is properly rounded
      expect(typeof result.confidence).toBe("number");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Verify timestamp is ISO string
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it("should handle empty results gracefully in all output formats", async () => {
      // Mock empty WikiData response
      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([]),
        ok: true,
      });

      const query: MultiCriteriaQuery = {
        fuzzy: false,
        title: "Nonexistent Book Title",
      };

      const results = await wikidataProvider.searchMultiCriteria(query);
      expect(results).toHaveLength(0);

      const providerResults = [
        {
          duration: 800,
          provider: "WikiData",
          records: results,
          success: true,
        },
      ];

      // Test detailed output with empty results
      formatter.displayDetailedOutput(results, providerResults, true);
      let logs = formatter.getLogs();
      expect(logs).toContain("❌ No metadata found for the given criteria.");

      // Test table output with empty results
      formatter.clearLogs();
      formatter.displayTableOutput(results, true);
      logs = formatter.getLogs();
      expect(logs).toContain("No results to display");

      // Test JSON output with empty results
      formatter.clearLogs();
      formatter.displayJsonOutput(results, providerResults, 850);
      logs = formatter.getLogs();

      const jsonOutput = logs.join("");
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.summary.totalResults).toBe(0);
      expect(parsed.results).toHaveLength(0);
    });

    it("should truncate long values appropriately in output", async () => {
      // Mock WikiData response with very long values
      const mockBinding = {
        authorLabel: {
          type: "literal",
          value:
            "Very Long Author Name That Exceeds Normal Length Limits And Should Be Truncated In Table Display",
          "xml:lang": "en",
        },
        book: { type: "uri", value: "http://www.wikidata.org/entity/Q123456" },
        isbn: { type: "literal", value: "9781234567890" },
        publishDate: {
          datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
          type: "literal",
          value: "2020-01-01T00:00:00Z",
        },
        publisherLabel: {
          type: "literal",
          value: "Very Long Publisher Name That Should Also Be Truncated",
          "xml:lang": "en",
        },
        title: {
          type: "literal",
          value:
            "Very Long Book Title That Exceeds Normal Display Limits And Should Be Truncated Appropriately",
          "xml:lang": "en",
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse([mockBinding]),
        ok: true,
      });

      const query: MultiCriteriaQuery = {
        fuzzy: false,
        title: "Very Long Book Title",
      };

      const results = await wikidataProvider.searchMultiCriteria(query);

      // Test table output truncation
      formatter.displayTableOutput(results, true);
      const logs = formatter.getLogs();

      // Verify long values are truncated in table format
      const tableRows = logs.filter((log) => log.includes(" | "));
      const dataRow = tableRows.find((log) => log.startsWith("1 |"));
      expect(dataRow).toBeDefined();

      // Check that title is truncated to 30 characters
      expect(dataRow).toMatch(/Very Long Book Title That Exce/);

      // Check that author is truncated to 25 characters
      expect(dataRow).toMatch(/Very Long Author Name Tha/);

      // Check that publisher is truncated to 20 characters
      expect(dataRow).toMatch(/Very Long Publisher /); // Note: space at end due to truncation

      // Test detailed output truncation (200 character limit)
      formatter.clearLogs();
      const providerResults = [
        {
          duration: 1000,
          provider: "WikiData",
          records: results,
          success: true,
        },
      ];

      formatter.displayDetailedOutput(results, providerResults, true);
      const detailedLogs = formatter.getLogs();

      // In detailed view, full values should be shown (under 200 char limit)
      expect(
        detailedLogs.some((log) =>
          log.includes(
            "Very Long Book Title That Exceeds Normal Display Limits",
          ),
        ),
      ).toBe(true);
      expect(
        detailedLogs.some((log) =>
          log.includes(
            "Very Long Author Name That Exceeds Normal Length Limits",
          ),
        ),
      ).toBe(true);
    });

    it("should display multiple results with proper ranking by confidence", async () => {
      // Mock multiple WikiData results with different confidence levels
      const mockBindings = [
        {
          authorLabel: {
            type: "literal",
            value: "Author One",
            "xml:lang": "en",
          },
          book: { type: "uri", value: "http://www.wikidata.org/entity/Q1" },
          isbn: { type: "literal", value: "9781111111111" },
          title: { type: "literal", value: "Book One", "xml:lang": "en" },
        },
        {
          authorLabel: {
            type: "literal",
            value: "Author Two",
            "xml:lang": "en",
          },
          book: { type: "uri", value: "http://www.wikidata.org/entity/Q2" },
          isbn: { type: "literal", value: "9782222222222" },
          title: { type: "literal", value: "Book Two", "xml:lang": "en" },
        },
        {
          authorLabel: {
            type: "literal",
            value: "Author Three",
            "xml:lang": "en",
          },
          book: { type: "uri", value: "http://www.wikidata.org/entity/Q3" },
          title: { type: "literal", value: "Book Three", "xml:lang": "en" },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        json: async () => createMockWikiDataResponse(mockBindings),
        ok: true,
      });

      const query: MultiCriteriaQuery = {
        fuzzy: false,
        title: "Book",
      };

      const results = await wikidataProvider.searchMultiCriteria(query);
      expect(results.length).toBeGreaterThan(1);

      // Results should be sorted by confidence (highest first)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].confidence).toBeGreaterThanOrEqual(
          results[i + 1].confidence,
        );
      }

      const providerResults = [
        {
          duration: 1300,
          provider: "WikiData",
          records: results,
          success: true,
        },
      ];

      formatter.displayDetailedOutput(results, providerResults, true);
      const logs = formatter.getLogs();

      // Verify all results summary is displayed
      expect(
        logs.some((log) => log.includes("=== All Results Summary ===")),
      ).toBe(true);
      expect(
        logs.some((log) => log.includes(`Found ${results.length} results:`)),
      ).toBe(true);

      // Verify results are listed with confidence scores
      expect(
        logs.some(
          (log) =>
            log.includes("1. Book One") ||
            log.includes("1. Book Two") ||
            log.includes("1. Book Three"),
        ),
      ).toBe(true);
      expect(logs.some((log) => log.includes("- WikiData"))).toBe(true);

      // Verify confidence percentages are shown in summary
      expect(logs.some((log) => log.match(/\(\d+\.\d%\)/))).toBe(true);
    });
  });
});
