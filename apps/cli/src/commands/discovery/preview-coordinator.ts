import {
  type MetadataRecord,
  MetadataType,
  type MultiCriteriaQuery,
  type NewMetadataProvider,
  OpenLibraryMetadataProvider,
  WikiDataMetadataProvider,
} from "@colibri-hq/sdk/metadata";
import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../command.js";

/**
 * Simple MetadataCoordinator implementation for the CLI
 * This is a simplified version that doesn't require the full metadata-reconciliation package
 */
class SimpleMetadataCoordinator {
  private providers: NewMetadataProvider[];

  constructor(providers: NewMetadataProvider[]) {
    this.providers = providers.toSorted((a, b) => b.priority - a.priority);
  }

  getProviders(): NewMetadataProvider[] {
    return [...this.providers];
  }

  async query(
    query: MultiCriteriaQuery,
  ): Promise<{
    aggregatedRecords: MetadataRecord[];
    providers: Array<{
      duration: number;
      error?: Error;
      name: string;
      records: MetadataRecord[];
      success: boolean;
    }>;
    totalDuration: number;
    totalRecords: number;
  }> {
    const startTime = Date.now();
    const providerResults = [];

    // Query each provider
    for (const provider of this.providers) {
      const providerStartTime = Date.now();
      try {
        const records = await provider.searchMultiCriteria(query);
        providerResults.push({
          duration: Date.now() - providerStartTime,
          name: provider.name,
          records,
          success: true,
        });
      } catch (error) {
        providerResults.push({
          duration: Date.now() - providerStartTime,
          error: error as Error,
          name: provider.name,
          records: [],
          success: false,
        });
      }
    }

    // Aggregate all records
    const allRecords: MetadataRecord[] = [];
    for (const result of providerResults) {
      if (result.success) {
        allRecords.push(...result.records);
      }
    }

    // Simple deduplication by title and author
    const seen = new Set<string>();
    const deduplicated: MetadataRecord[] = [];

    for (const record of allRecords) {
      const key = `${record.title || "unknown"}-${record.authors?.join(",") || "unknown"}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(record);
      }
    }

    // Sort by confidence
    deduplicated.sort((a, b) => b.confidence - a.confidence);

    return {
      aggregatedRecords: deduplicated,
      providers: providerResults,
      totalDuration: Date.now() - startTime,
      totalRecords: deduplicated.length,
    };
  }
}

export class PreviewCoordinator extends BaseCommand<typeof PreviewCoordinator> {
  static override args = {
    title: Args.string({
      description: "Title of the book to discover metadata for",
      required: false,
    }),
  };
  static override description =
    "Preview enhanced metadata discovery with multiple providers and coordination";
  static override examples = [
    {
      command: "<%= config .bin %> <%= command.id %> 'The Great Gatsby'",
      description: "Preview coordinated metadata discovery for 'The Great Gatsby'",
    },
    {
      command: "<%= config .bin %> <%= command.id %> --isbn '978-0-7432-7356-5'",
      description: "Preview coordinated metadata discovery by ISBN",
    },
    {
      command:
        "<%= config .bin %> <%= command.id %> 'The Hobbit' --creator 'J.R.R. Tolkien' --language eng --subject Fantasy",
      description: "Preview multi-provider, multi-criteria metadata discovery",
    },
  ];
  static override flags = {
    creator: Flags.string({
      char: "c",
      description: "Names of creators associated with the book",
      multiple: true,
      required: false,
    }),
    fuzzy: Flags.boolean({
      char: "f",
      default: false,
      description: "Use fuzzy matching for search terms",
    }),
    isbn: Flags.string({ char: "i", description: "ISBN of the book", required: false }),
    language: Flags.string({ char: "l", description: "Language of the book", required: false }),
    publisher: Flags.string({ char: "p", description: "Publisher of the book", required: false }),
    "show-confidence": Flags.boolean({
      default: true,
      description: "Show confidence scores and source attribution",
    }),
    "show-raw": Flags.boolean({
      default: false,
      description: "Show raw metadata from each provider",
    }),
    subject: Flags.string({
      char: "s",
      description: "One or more subjects of the book",
      multiple: true,
      required: false,
    }),
    "year-from": Flags.integer({ description: "Earliest publication year", required: false }),
    "year-to": Flags.integer({ description: "Latest publication year", required: false }),
  };

  async run() {
    const {
      creator,
      fuzzy,
      isbn,
      language,
      publisher,
      "show-confidence": showConfidence,
      "show-raw": showRaw,
      subject,
      "year-from": yearFrom,
      "year-to": yearTo,
    } = this.flags;
    const { title } = this.args;

    // Check if we have any search criteria
    if (!title && !isbn && !creator?.length && !subject?.length && !publisher) {
      this.error(
        "You must provide at least one search criterion: title, ISBN, creator, subject, or publisher.",
      );
    }

    this.log("=== Enhanced Metadata Discovery with Coordination ===\n");

    try {
      // Initialize multiple metadata providers
      const providers: NewMetadataProvider[] = [
        new OpenLibraryMetadataProvider(),
        new WikiDataMetadataProvider(),
        // Add more providers here when they're ready
      ];

      // Create simple coordinator
      const coordinator = new SimpleMetadataCoordinator(providers);

      // Show provider information
      this.log("📡 Configured Providers:");
      for (const provider of coordinator.getProviders()) {
        this.log(`  • ${provider.name} (Priority: ${provider.priority})`);
        this.log(
          `    Rate Limit: ${provider.rateLimit.maxRequests} requests per ${provider.rateLimit.windowMs}ms`,
        );
        this.log(`    Timeout: ${provider.timeout.requestTimeout}ms`);
      }
      this.log("");

      // Build multi-criteria query
      const yearRange =
        yearFrom || yearTo
          ? ([yearFrom || 1000, yearTo || new Date().getFullYear()] as [number, number])
          : undefined;

      const query: MultiCriteriaQuery = { fuzzy };
      if (title) {
        query.title = title;
      }
      if (creator?.length) {
        query.authors = creator;
      }
      if (isbn) {
        query.isbn = isbn;
      }
      if (language) {
        query.language = language;
      }
      if (subject?.length) {
        query.subjects = subject;
      }
      if (publisher) {
        query.publisher = publisher;
      }
      if (yearRange) {
        query.yearRange = yearRange;
      }

      // Display search criteria
      this.log("🔍 Search Criteria:");
      if (title) {
        this.log(`  Title: "${title}"`);
      }
      if (creator?.length) {
        this.log(`  Creators: ${creator.join(", ")}`);
      }
      if (isbn) {
        this.log(`  ISBN: ${isbn}`);
      }
      if (language) {
        this.log(`  Language: ${language}`);
      }
      if (subject?.length) {
        this.log(`  Subjects: ${subject.join(", ")}`);
      }
      if (publisher) {
        this.log(`  Publisher: "${publisher}"`);
      }
      if (yearRange) {
        this.log(`  Year Range: ${yearRange[0]} - ${yearRange[1]}`);
      }
      this.log(`  Fuzzy Matching: ${fuzzy ? "enabled" : "disabled"}`);
      this.log("");

      // Execute coordinated query
      this.log("⏳ Querying metadata providers...");
      const result = await coordinator.query(query);

      // Display coordinator results summary
      this.log(`\n📊 Coordination Results Summary:`);
      this.log(`  Total Duration: ${result.totalDuration}ms`);
      this.log(
        `  Successful Providers: ${result.providers.filter((p) => p.success).length}/${result.providers.length}`,
      );
      this.log(`  Total Records Found: ${result.totalRecords}`);
      this.log("");

      // Show provider-specific results if requested
      if (showRaw) {
        this.log("=== Provider-Specific Results ===");
        for (const providerResult of result.providers) {
          this.log(`\n--- ${providerResult.name} ---`);
          this.log(`Status: ${providerResult.success ? "✅ Success" : "❌ Failed"}`);
          this.log(`Duration: ${providerResult.duration}ms`);
          this.log(`Records: ${providerResult.records.length}`);

          if (!providerResult.success && providerResult.error) {
            this.log(`Error: ${providerResult.error.message}`);
          }

          if (providerResult.success && providerResult.records.length > 0) {
            for (const [index, record] of providerResult.records.slice(0, 3).entries()) {
              this.log(`\n  Record ${index + 1}:`);
              this.log(`    ID: ${record.id}`);
              this.log(`    Confidence: ${(record.confidence * 100).toFixed(1)}%`);
              if (record.title) {
                this.log(`    Title: ${record.title}`);
              }
              if (record.authors?.length) {
                this.log(`    Authors: ${record.authors.join(", ")}`);
              }
              if (record.isbn?.length) {
                this.log(`    ISBN: ${record.isbn.join(", ")}`);
              }
              if (record.language) {
                this.log(`    Language: ${record.language}`);
              }
              if (record.publisher) {
                this.log(`    Publisher: ${record.publisher}`);
              }
              if (record.publicationDate) {
                this.log(`    Publication Date: ${record.publicationDate.getFullYear()}`);
              }
            }

            if (providerResult.records.length > 3) {
              this.log(`    ... and ${providerResult.records.length - 3} more records`);
            }
          }
        }
        this.log("");
      }

      if (result.totalRecords === 0) {
        this.log("❌ No metadata found for the given criteria.");
        this.log("💡 Suggestions:");
        this.log("  • Try using fuzzy matching (--fuzzy)");
        this.log("  • Broaden your search criteria");
        this.log("  • Check spelling of titles, authors, or other terms");
        return;
      }

      // Display reconciled metadata (using best result for now)
      this.log("=== Coordinated Metadata Results ===");

      const bestResult = result.aggregatedRecords[0]; // Already sorted by confidence
      this.log(`Best Match (Confidence: ${(bestResult.confidence * 100).toFixed(1)}%):`);
      this.log("");

      // Display core metadata fields
      this.displayMetadataField("Title", bestResult.title, bestResult.confidence, showConfidence);
      this.displayMetadataField(
        "Authors",
        bestResult.authors,
        bestResult.confidence,
        showConfidence,
      );
      this.displayMetadataField("ISBN", bestResult.isbn, bestResult.confidence, showConfidence);
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
        "Publisher",
        bestResult.publisher,
        bestResult.confidence,
        showConfidence,
      );
      this.displayMetadataField(
        "Subjects",
        bestResult.subjects,
        bestResult.confidence,
        showConfidence,
      );
      this.displayMetadataField(
        "Description",
        bestResult.description,
        bestResult.confidence,
        showConfidence,
      );
      this.displayMetadataField("Series", bestResult.series, bestResult.confidence, showConfidence);
      this.displayMetadataField(
        "Page Count",
        bestResult.pageCount,
        bestResult.confidence,
        showConfidence,
      );
      this.displayMetadataField(
        "Cover Image",
        bestResult.coverImage,
        bestResult.confidence,
        showConfidence,
      );

      // Show provider reliability scores if requested
      if (showConfidence) {
        this.log("\n=== Provider Reliability Scores ===");
        for (const provider of coordinator.getProviders()) {
          this.log(`\n${provider.name}:`);
          const dataTypes = Object.values(MetadataType);
          for (const type of dataTypes) {
            const score = provider.getReliabilityScore(type);
            const supported = provider.supportsDataType(type);
            this.log(`  ${type}: ${(score * 100).toFixed(1)}% ${supported ? "✓" : "✗"}`);
          }
        }
      }

      // Show all results summary
      if (result.aggregatedRecords.length > 1) {
        this.log(`\n=== All Coordinated Results ===`);
        this.log(`Found ${result.aggregatedRecords.length} unique results after deduplication:`);
        for (const [index, record] of result.aggregatedRecords.slice(0, 10).entries()) {
          this.log(
            `  ${index + 1}. ${record.title || "Unknown Title"} (${(record.confidence * 100).toFixed(1)}% confidence) - ${record.source}`,
          );
        }

        if (result.aggregatedRecords.length > 10) {
          this.log(`  ... and ${result.aggregatedRecords.length - 10} more results`);
        }
      }
    } catch (error) {
      this.error(
        `Enhanced metadata discovery failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Display a metadata field with optional confidence information
   */
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
      // Handle complex objects
      if ("name" in value && value.name) {
        displayValue = String(value.name);

        if ("volume" in value && value.volume) {
          displayValue += ` (Volume ${value.volume})`;
        }
      } else if ("url" in value && value.url) {
        displayValue = String(value.url);
      } else {
        displayValue = JSON.stringify(value);
      }
    } else {
      displayValue = String(value);
    }

    // Truncate very long values
    if (displayValue.length > 300) {
      displayValue = displayValue.slice(0, 300) + "...";
    }

    this.log(`${label}: ${displayValue}`);

    if (showConfidence) {
      const confidenceIcon = confidence >= 0.8 ? "🟢" : confidence > 0.5 ? "🟡" : "🔴";
      const source = typeof value === "object" && "source" in value ? value.source : "Unknown";
      this.log(
        `  ${confidenceIcon} Confidence: ${(confidence * 100).toFixed(1)}% | Source: ${source}`,
      );
    }

    this.log(""); // Empty line between fields
  }
}
