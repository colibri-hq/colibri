import {
  detectType,
  type Metadata as EbookMetadata,
  loadMetadata,
} from "@colibri-hq/sdk/ebooks";
import {
  convertEmbeddedMetadata,
  type MetadataRecord,
  MetadataType,
  type MultiCriteriaQuery,
  type NewMetadataProvider,
  OpenLibraryMetadataProvider,
  WikiDataMetadataProvider,
} from "@colibri-hq/sdk/metadata";
import { Args, Flags } from "@oclif/core";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { BaseCommand } from "../../command.js";

export class Preview extends BaseCommand<typeof Preview> {
  static override args = {
    input: Args.string({
      description:
        "Ebook file path or title of the book to discover metadata for",
      required: false,
    }),
  };
  static override description =
    "Preview enhanced metadata discovery from ebook files with optional flag overrides, or manual input search";
  static override examples = [
    {
      command: "<%= config .bin %> <%= command.id %> ./book.epub",
      description: "Preview metadata discovery from an EPUB file",
    },
    {
      command: "<%= config .bin %> <%= command.id %> ./document.pdf",
      description: "Preview metadata discovery from a PDF file",
    },
    {
      command: "<%= config .bin %> <%= command.id %> ./book.mobi",
      description: "Preview metadata discovery from a MOBI file",
    },
    {
      command:
        "<%= config .bin %> <%= command.id %> ./book.epub --creator 'Override Author' --language eng",
      description: "Override embedded metadata with custom author and language",
    },
    {
      command:
        "<%= config .bin %> <%= command.id %> ./book.pdf --isbn '978-0-123456-78-9' --subject 'Science Fiction'",
      description: "Add ISBN and subject when missing from embedded metadata",
    },
    {
      command:
        "<%= config .bin %> <%= command.id %> ./book.epub --publisher 'Custom Publisher' --year-from 2020 --year-to 2023",
      description: "Override publisher and specify publication year range",
    },
    {
      command: "<%= config .bin %> <%= command.id %> 'The Great Gatsby'",
      description:
        "Preview metadata discovery for 'The Great Gatsby' (manual input)",
    },
    {
      command:
        "<%= config .bin %> <%= command.id %> --isbn '978-0-7432-7356-5'",
      description: "Preview metadata discovery by ISBN only",
    },
    {
      command:
        "<%= config .bin %> <%= command.id %> --creator 'F. Scott Fitzgerald' --subject 'Classic Literature' --fuzzy",
      description: "Manual search with fuzzy matching enabled",
    },
  ];
  static override flags = {
    creator: Flags.string({
      char: "c",
      description:
        "Names of creators/authors (overrides embedded metadata when provided)",
      multiple: true,
      required: false,
    }),
    fuzzy: Flags.boolean({
      char: "f",
      default: false,
      description: "Use fuzzy matching for search terms",
    }),
    isbn: Flags.string({
      char: "i",
      description:
        "ISBN of the book (overrides embedded metadata when provided)",
      required: false,
    }),
    language: Flags.string({
      char: "l",
      description:
        "Language code (e.g., 'en', 'fr', 'spa') - overrides embedded metadata when provided",
      required: false,
    }),
    "output-format": Flags.string({
      default: "detailed",
      description: "Output format: table, json, detailed",
      options: ["table", "json", "detailed"],
    }),
    publisher: Flags.string({
      char: "p",
      description: "Publisher name (overrides embedded metadata when provided)",
      required: false,
    }),
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
      description:
        "Subject/genre terms (overrides embedded metadata when provided)",
      multiple: true,
      required: false,
    }),
    "year-from": Flags.integer({
      description:
        "Earliest publication year (overrides embedded date when provided)",
      required: false,
    }),
    "year-to": Flags.integer({
      description:
        "Latest publication year (overrides embedded date when provided)",
      required: false,
    }),
  };

  async run() {
    const {
      creator,
      fuzzy,
      isbn,
      language,
      "output-format": outputFormat,
      publisher,
      "show-confidence": showConfidence,
      "show-raw": showRaw,
      subject,
      "year-from": yearFrom,
      "year-to": yearTo,
    } = this.flags;
    const { input } = this.args;

    // Check if we have any search criteria
    if (!input && !isbn && !creator?.length && !subject?.length && !publisher) {
      this.error(
        "You must provide at least one search criterion: file path, title, ISBN, creator, subject, or publisher.",
      );
    }

    this.log("=== Enhanced Metadata Discovery Preview ===\n");

    // Determine if input is a file path or title text
    let embeddedMetadata: EbookMetadata | null = null;
    let fileType: null | string = null;
    let title: string | undefined = input;

    if (input && existsSync(input)) {
      try {
        this.log("📖 Processing ebook file...");

        // Read file and detect type
        const fileBuffer = await readFile(input);
        const file = new File([fileBuffer], input);

        // Detect file type with enhanced error handling
        try {
          fileType = await detectType(file);
          this.log(`  File Type: ${fileType.toUpperCase()}`);
        } catch {
          // Handle unsupported file format specifically
          throw new Error(
            `Unsupported file format: ${input}. Supported formats: EPUB, MOBI, PDF`,
          );
        }

        // Extract embedded metadata with format-specific error handling
        try {
          embeddedMetadata = await loadMetadata(file);
        } catch (metadataError) {
          // Enhance metadata extraction errors with format context
          const enhancedError = new Error(
            `Failed to extract metadata from ${fileType?.toUpperCase()} file: ${(metadataError as Error).message}`,
          );
          const originalStack = (metadataError as Error).stack;
          if (originalStack) {
            enhancedError.stack = originalStack;
          }
          throw enhancedError;
        }
        this.log(`  ✅ Successfully extracted embedded metadata`);

        title = undefined; // Clear title since we're using file input

        // Display extracted metadata summary
        this.log("\n📋 Embedded Metadata Summary:");
        if (embeddedMetadata.title) {
          this.log(`  Title: ${embeddedMetadata.title}`);
        }
        if (embeddedMetadata.contributors?.length) {
          const authors = embeddedMetadata.contributors
            .filter((c) => c.roles.includes("aut"))
            .map((c) => c.name);
          if (authors.length > 0) {
            this.log(`  Authors: ${authors.join(", ")}`);
          }
        }
        if (embeddedMetadata.identifiers?.length) {
          const isbns = embeddedMetadata.identifiers
            .filter((id) => id.type === "isbn")
            .map((id) => id.value);
          if (isbns.length > 0) {
            this.log(`  ISBN: ${isbns.join(", ")}`);
          }
        }
        if (embeddedMetadata.language) {
          this.log(`  Language: ${embeddedMetadata.language}`);
        }
        if (embeddedMetadata.datePublished) {
          this.log(
            `  Publication Date: ${embeddedMetadata.datePublished.getFullYear()}`,
          );
        }
        if (embeddedMetadata.numberOfPages) {
          this.log(`  Pages: ${embeddedMetadata.numberOfPages}`);
        }
        if (embeddedMetadata.tags?.length) {
          const subjects = embeddedMetadata.tags.slice(0, 3).join(", ");
          const more =
            embeddedMetadata.tags.length > 3
              ? ` (+${embeddedMetadata.tags.length - 3} more)`
              : "";
          this.log(`  Subjects: ${subjects}${more}`);
        }
        this.log("");
      } catch (error) {
        // Handle file processing errors with comprehensive error handling
        const errorDetails = this.analyzeFileError(error as Error, input);
        this.log(`❌ File processing failed: ${errorDetails.message}`);

        // Show detailed error information if available
        if (errorDetails.details) {
          this.log(`   Details: ${errorDetails.details}`);
        }

        // Provide specific fallback suggestions based on error type
        const fallbackSuggestions = this.generateFileErrorFallbacks(
          errorDetails,
          input,
          {
            creator: creator || undefined,
            isbn: isbn || undefined,
            publisher: publisher || undefined,
            subject: subject || undefined,
          },
        );
        this.log("💡 Fallback options:");
        for (const suggestion of fallbackSuggestions) {
          this.log(`  • ${suggestion}`);
        }

        // If we have manual flags, continue with those
        if (isbn || creator?.length || subject?.length || publisher) {
          this.log("  • Continuing with manual search criteria...\n");
          title = input; // Use input as title fallback
        } else {
          // Provide more helpful error message with specific next steps
          const nextSteps = this.generateFileErrorNextSteps(
            errorDetails,
            input,
          );
          this.log("\n🔧 Next steps:");
          for (const step of nextSteps) {
            this.log(`  ${step}`);
          }
          this.error(
            "File processing failed and no manual search criteria provided. Please try one of the suggestions above.",
          );
        }
      }
    } else if (input) {
      // Input is treated as title text
      title = input;
      this.log(`📝 Using manual input: "${title}"\n`);
    }

    // Validate input parameters including flag overrides
    const validationErrors = this.validateInput(
      title,
      isbn,
      creator,
      subject,
      publisher,
      language,
      yearFrom,
      yearTo,
    );
    if (validationErrors.length > 0) {
      this.log("❌ Input validation errors:");
      for (const error of validationErrors) {
        this.log(`  • ${error}`);
      }
      this.error("Please fix the input errors above and try again.");
    }

    try {
      // Initialize metadata providers (using OpenLibrary and WikiData)
      const providers: NewMetadataProvider[] = [
        new OpenLibraryMetadataProvider(),
        new WikiDataMetadataProvider(),
        // Additional providers can be added here when available
      ];

      // Show provider information
      this.log("📡 Configured Providers:");
      for (const provider of providers) {
        this.log(`  • ${provider.name} (Priority: ${provider.priority})`);
        this.log(
          `    Rate Limit: ${provider.rateLimit.maxRequests} requests per ${provider.rateLimit.windowMs}ms`,
        );
        this.log(`    Timeout: ${provider.timeout.requestTimeout}ms`);
      }
      this.log("");

      // Build multi-criteria query from embedded metadata and flags
      const yearRange =
        yearFrom || yearTo
          ? ([yearFrom || 1000, yearTo || new Date().getFullYear()] as [
              number,
              number,
            ])
          : undefined;

      const query: MultiCriteriaQuery = { fuzzy };

      // Use embedded metadata as primary source, with flag overrides
      if (embeddedMetadata) {
        // Title: use flag override or embedded title
        if (title) {
          query.title = title;
        } else if (embeddedMetadata.title) {
          query.title = embeddedMetadata.title;
        }

        // Authors: use flag override or embedded contributors
        if (creator?.length) {
          query.authors = creator;
        } else if (embeddedMetadata.contributors?.length) {
          const authors = embeddedMetadata.contributors
            .filter((c) => c.roles.includes("aut"))
            .map((c) => c.name);
          if (authors.length > 0) {
            query.authors = authors;
          }
        }

        // ISBN: use flag override or embedded identifiers
        if (isbn) {
          query.isbn = isbn;
        } else if (embeddedMetadata.identifiers?.length) {
          const isbns = embeddedMetadata.identifiers
            .filter((id) => id.type === "isbn")
            .map((id) => id.value);
          if (isbns.length > 0) {
            query.isbn = isbns[0]; // Use first ISBN found
          }
        }

        // Language: use flag override or embedded language
        if (language) {
          query.language = language;
        } else if (embeddedMetadata.language) {
          query.language = embeddedMetadata.language;
        }

        // Subjects: use flag override or embedded tags
        if (subject?.length) {
          query.subjects = subject;
        } else if (embeddedMetadata.tags?.length) {
          query.subjects = embeddedMetadata.tags.slice(0, 5); // Limit to first 5 subjects
        }

        // Publisher: use flag override or embedded publisher
        if (publisher) {
          query.publisher = publisher;
        } else if (embeddedMetadata.contributors?.length) {
          const publishers = embeddedMetadata.contributors
            .filter((c) => c.roles.includes("bkp"))
            .map((c) => c.name);
          if (publishers.length > 0) {
            query.publisher = publishers[0]; // Use first publisher found
          }
        }

        // Year range: use flags or embedded publication date
        if (yearRange) {
          query.yearRange = yearRange;
        } else if (embeddedMetadata.datePublished) {
          const year = embeddedMetadata.datePublished.getFullYear();
          query.yearRange = [year - 1, year + 1]; // Allow 1 year variance
        }
      } else {
        // Manual input mode - use flags only
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
      }

      // Display search criteria with override information
      this.displaySearchCriteriaWithOverrides(query, embeddedMetadata, {
        creator: creator || undefined,
        fuzzy,
        isbn: isbn || undefined,
        language: language || undefined,
        publisher: publisher || undefined,
        subject: subject || undefined,
        title: title || undefined,
        yearFrom: yearFrom || undefined,
        yearTo: yearTo || undefined,
      });

      // Execute coordinated query across providers
      this.log("⏳ Querying metadata providers...");
      const startTime = Date.now();

      // Simple coordination: query all providers and aggregate results
      const providerResults: Array<{
        duration: number;
        error?: Error;
        provider: string;
        records: MetadataRecord[];
        success: boolean;
      }> = [];

      for (const provider of providers) {
        const providerStartTime = Date.now();
        try {
          const records = await provider.searchMultiCriteria(query);
          providerResults.push({
            duration: Date.now() - providerStartTime,
            provider: provider.name,
            records,
            success: true,
          });
        } catch (error) {
          if (!(error instanceof Error)) {
            throw error;
          }

          const errorDetails = this.analyzeProviderError(error);
          this.log(`⚠️  ${provider.name}: ${errorDetails.message}`);

          // Show additional details for debugging if available
          if (errorDetails.details) {
            this.log(`     Details: ${errorDetails.details}`);
          }

          // Show recovery suggestions for recoverable errors
          if (
            errorDetails.recoverable &&
            errorDetails.suggestedActions.length > 0
          ) {
            this.log(`     Suggestion: ${errorDetails.suggestedActions[0]}`);
          }

          providerResults.push({
            duration: Date.now() - providerStartTime,
            error: error as Error,
            provider: provider.name,
            records: [],
            success: false,
          });
        }
      }

      // Aggregate all successful results
      const allRecords: MetadataRecord[] = [];

      // Add embedded metadata record if we have it
      if (embeddedMetadata && fileType) {
        const embeddedRecord = convertEmbeddedMetadata(
          embeddedMetadata,
          fileType as "epub" | "mobi" | "pdf",
          input,
        );
        allRecords.push(embeddedRecord);
      }

      // Add external provider results
      for (const result of providerResults) {
        if (result.success) {
          allRecords.push(...result.records);
        }
      }

      // Simple deduplication by title and author combination (but keep embedded metadata separate)
      const seen = new Set<string>();
      const results: MetadataRecord[] = [];

      for (const record of allRecords) {
        // Always include embedded metadata
        if (record.source === "embedded") {
          results.push(record);
          continue;
        }

        // Deduplicate external records
        const key = `${record.title || "unknown"}-${record.authors?.join(",") || "unknown"}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(record);
        }
      }

      // Sort by confidence (highest first)
      results.sort((a, b) => b.confidence - a.confidence);

      const duration = Date.now() - startTime;

      // Display results summary
      this.log(`\n📊 Query Results Summary:`);
      this.log(`  Duration: ${duration}ms`);
      this.log(`  Records Found: ${results.length}`);
      this.log("");

      if (results.length === 0) {
        this.log("❌ No metadata found for the given criteria.");

        // Analyze why no results were found and provide specific guidance
        const noResultsAnalysis = this.analyzeNoResultsScenario(
          query,
          providerResults,
          embeddedMetadata,
        );

        if (noResultsAnalysis.reason) {
          this.log(`   Reason: ${noResultsAnalysis.reason}`);
        }

        this.log("💡 Suggestions:");
        for (const suggestion of noResultsAnalysis.suggestions) {
          this.log(`  • ${suggestion}`);
        }

        // Show provider-specific issues if any
        if (noResultsAnalysis.providerIssues.length > 0) {
          this.log("\n⚠️  Provider Issues:");
          for (const issue of noResultsAnalysis.providerIssues) {
            this.log(`  • ${issue}`);
          }
        }

        // Provide example commands for common scenarios
        if (noResultsAnalysis.exampleCommands.length > 0) {
          this.log("\n📝 Example commands to try:");
          for (const example of noResultsAnalysis.exampleCommands) {
            this.log(`  ${example}`);
          }
        }

        return;
      }

      // Show raw results if requested
      if (showRaw) {
        this.log("=== Raw Metadata Results ===");
        for (const [index, record] of results.entries()) {
          this.log(`\n--- Record ${index + 1} ---`);
          this.log(`ID: ${record.id}`);
          this.log(`Source: ${record.source}`);
          this.log(`Confidence: ${(record.confidence * 100).toFixed(1)}%`);
          this.log(`Timestamp: ${record.timestamp.toISOString()}`);

          if (record.title) {
            this.log(`Title: ${record.title}`);
          }
          if (record.authors?.length) {
            this.log(`Authors: ${record.authors.join(", ")}`);
          }
          if (record.isbn?.length) {
            this.log(`ISBN: ${record.isbn.join(", ")}`);
          }
          if (record.language) {
            this.log(`Language: ${record.language}`);
          }
          if (record.publisher) {
            this.log(`Publisher: ${record.publisher}`);
          }
          if (record.publicationDate) {
            this.log(
              `Publication Date: ${record.publicationDate.getFullYear()}`,
            );
          }
          if (record.pageCount) {
            this.log(`Pages: ${record.pageCount}`);
          }
          if (record.subjects?.length) {
            const subjects = record.subjects.slice(0, 5).join(", ");
            const more =
              record.subjects.length > 5
                ? ` (+${record.subjects.length - 5} more)`
                : "";
            this.log(`Subjects: ${subjects}${more}`);
          }
          if (record.description) {
            const desc =
              record.description.length > 200
                ? record.description.slice(0, 200) + "..."
                : record.description;
            this.log(`Description: ${desc}`);
          }
          if (record.series?.name) {
            this.log(
              `Series: ${record.series.name}${record.series.volume ? ` (Volume ${record.series.volume})` : ""}`,
            );
          }
          if (record.coverImage?.url) {
            this.log(`Cover: ${record.coverImage.url}`);
          }

          if (record.providerData) {
            this.log(`\nProvider Data:`);
            for (const [key, value] of Object.entries(record.providerData)) {
              if (typeof value === "object") {
                this.log(`  ${key}: ${JSON.stringify(value)}`);
              } else {
                this.log(`  ${key}: ${value}`);
              }
            }
          }
        }
        this.log("");
      }

      // Display output based on selected format
      switch (outputFormat) {
        case "json": {
          this.displayJsonOutput(
            results,
            providerResults,
            providers,
            query,
            duration,
          );
          break;
        }
        case "table": {
          this.displayTableOutput(results, showConfidence);
          break;
        }
        default: {
          this.displayDetailedOutput(
            results,
            providerResults,
            providers,
            showConfidence,
          );
          break;
        }
      }
    } catch (error) {
      this.error(
        `Enhanced metadata discovery failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  #normalizeString(value: string): string {
    return value
      .toLowerCase()
      .replaceAll(/[^\w\s]/g, "")
      .replaceAll(/\s+/g, " ")
      .trim();
  }

  /**
   * Analyze file processing errors and provide detailed error information
   */
  private analyzeFileError(
    error: Error,
    filePath: string,
  ): {
    details?: string;
    message: string;
    recoverable: boolean;
    suggestedActions: string[];
    type:
      | "access"
      | "corruption"
      | "format"
      | "network"
      | "parsing"
      | "size"
      | "unknown";
  } {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || "";

    // File access errors
    if (message.includes("enoent") || message.includes("no such file")) {
      return {
        details: "The specified file path does not exist or is not accessible",
        message: `File not found: ${filePath}`,
        recoverable: true,
        suggestedActions: [
          "Verify the file path is correct",
          "Check if the file was moved or deleted",
          "Ensure you have read permissions for the file",
        ],
        type: "access",
      };
    }

    if (message.includes("eacces") || message.includes("permission denied")) {
      return {
        details: "Insufficient permissions to access the file",
        message: `Permission denied: Cannot read file ${filePath}`,
        recoverable: true,
        suggestedActions: [
          "Check file permissions (chmod +r)",
          "Run with appropriate user privileges",
          "Ensure the file is not locked by another process",
        ],
        type: "access",
      };
    }

    if (message.includes("eisdir")) {
      return {
        details: "The provided path points to a directory instead of a file",
        message: `Path is a directory, not a file: ${filePath}`,
        recoverable: true,
        suggestedActions: [
          "Specify the full path to the ebook file",
          "List directory contents to find the correct file",
          "Use a file picker or tab completion",
        ],
        type: "access",
      };
    }

    // File format errors
    if (
      message.includes("unsupported file format") ||
      message.includes("unsupported format")
    ) {
      return {
        details:
          "The file format is not supported. Supported formats: EPUB, MOBI, PDF",
        message: "Unsupported file format",
        recoverable: true,
        suggestedActions: [
          "Convert the file to EPUB, MOBI, or PDF format",
          "Check if the file extension matches the actual format",
          "Try renaming the file with the correct extension",
        ],
        type: "format",
      };
    }

    // File corruption errors
    if (
      message.includes("corrupt") ||
      message.includes("invalid") ||
      message.includes("malformed")
    ) {
      return {
        details: "The file structure is damaged and cannot be parsed",
        message: "File appears to be corrupted or malformed",
        recoverable: false,
        suggestedActions: [
          "Try re-downloading the file from the original source",
          "Check if you have a backup copy of the file",
          "Use file repair tools if available for the format",
        ],
        type: "corruption",
      };
    }

    if (
      message.includes("zip") &&
      (message.includes("error") || message.includes("invalid"))
    ) {
      return {
        details:
          "EPUB files are ZIP archives, and the ZIP structure is corrupted",
        message: "EPUB file structure is invalid (ZIP corruption)",
        recoverable: false,
        suggestedActions: [
          "Try opening the file with a ZIP utility to verify integrity",
          "Re-download the EPUB file from the source",
          "Use EPUB repair tools if available",
        ],
        type: "corruption",
      };
    }

    if (message.includes("pdf") && message.includes("error")) {
      return {
        details: "The PDF file cannot be parsed due to structural issues",
        message: "PDF file structure is invalid or corrupted",
        recoverable: false,
        suggestedActions: [
          "Try opening the PDF in a PDF viewer to verify it works",
          "Re-download the PDF file from the source",
          "Use PDF repair tools to fix corruption",
        ],
        type: "corruption",
      };
    }

    if (message.includes("mobi") && message.includes("error")) {
      return {
        details: "The MOBI file format is not properly structured",
        message: "MOBI file structure is invalid or corrupted",
        recoverable: false,
        suggestedActions: [
          "Try opening the file in a MOBI-compatible reader",
          "Re-download the MOBI file from the source",
          "Convert the file to EPUB format if possible",
        ],
        type: "corruption",
      };
    }

    // Memory/size errors
    if (message.includes("out of memory") || message.includes("enomem")) {
      return {
        details: "The file exceeds available memory limits",
        message: "File is too large to process",
        recoverable: true,
        suggestedActions: [
          "Try processing a smaller file first",
          "Close other applications to free memory",
          "Use a machine with more available RAM",
        ],
        type: "size",
      };
    }

    // Network-related errors (for remote files)
    if (
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("econnreset")
    ) {
      return {
        details: "Unable to download or access the file over the network",
        message: "Network error while accessing file",
        recoverable: true,
        suggestedActions: [
          "Check your internet connection",
          "Try again in a few moments",
          "Download the file locally first",
        ],
        type: "network",
      };
    }

    // Parsing-specific errors
    if (
      message.includes("parse") ||
      message.includes("syntax") ||
      stack.includes("parser")
    ) {
      return {
        details: "The file format is recognized but contains parsing errors",
        message: "File parsing failed",
        recoverable: false,
        suggestedActions: [
          "Check if the file was created by a compatible application",
          "Try converting the file using a different tool",
          "Verify the file is not a different format with wrong extension",
        ],
        type: "parsing",
      };
    }

    // Generic fallback
    return {
      details: "An unexpected error occurred during file processing",
      message: `File processing error: ${error.message}`,
      recoverable: true,
      suggestedActions: [
        "Try the operation again",
        "Check if the file is valid and accessible",
        "Report this error if it persists",
      ],
      type: "unknown",
    };
  }

  /**
   * Analyze why no results were found and provide comprehensive guidance
   */
  private analyzeNoResultsScenario(
    query: MultiCriteriaQuery,
    providerResults: Array<{
      error?: Error;
      provider: string;
      success: boolean;
    }>,
    embeddedMetadata: EbookMetadata | null,
  ): {
    exampleCommands: string[];
    providerIssues: string[];
    reason?: string;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    const providerIssues: string[] = [];
    const exampleCommands: string[] = [];
    let reason: string | undefined;

    // Analyze provider failures
    const failedProviders = providerResults.filter((r) => !r.success);
    const successfulProviders = providerResults.filter((r) => r.success);

    if (failedProviders.length === providerResults.length) {
      reason = "All metadata providers failed to respond";
      providerIssues.push("All configured providers are currently unavailable");
      suggestions.push(
        "Check your internet connection and try again",
        "Wait a few minutes and retry as providers may be experiencing issues",
      );
      return {
        ...(reason && { reason }),
        exampleCommands,
        providerIssues,
        suggestions,
      };
    }

    if (failedProviders.length > 0) {
      providerIssues.push(
        `${failedProviders.length} of ${providerResults.length} providers failed`,
      );
      for (const failed of failedProviders) {
        const errorType = failed.error?.message.toLowerCase();
        if (errorType?.includes("rate limit") || errorType?.includes("429")) {
          providerIssues.push(
            `${failed.provider}: Rate limited - wait before retrying`,
          );
        } else if (errorType?.includes("timeout")) {
          providerIssues.push(
            `${failed.provider}: Request timed out - provider may be slow`,
          );
        } else if (
          errorType?.includes("network") ||
          errorType?.includes("fetch failed")
        ) {
          providerIssues.push(`${failed.provider}: Network connection failed`);
        } else {
          providerIssues.push(
            `${failed.provider}: ${failed.error?.message || "Unknown error"}`,
          );
        }
      }
    }

    // Analyze search criteria and suggest improvements
    if (successfulProviders.length > 0) {
      reason =
        "Providers responded successfully but no matching books were found";

      // Suggest fuzzy matching if not enabled
      if (!query.fuzzy) {
        suggestions.push(
          "Try using fuzzy matching (--fuzzy) for more flexible search",
        );
        exampleCommands.push(
          `${process.argv[0]} ${process.argv[1]} discovery preview --fuzzy ${query.title ? `"${query.title}"` : ""} ${query.isbn ? `--isbn "${query.isbn}"` : ""}`,
        );
      }

      // Suggest broadening search criteria
      if (query.title && query.authors?.length && query.subjects?.length) {
        suggestions.push(
          "Try searching with fewer criteria (e.g., just title or just author)",
        );
        exampleCommands.push(
          `${process.argv[0]} ${process.argv[1]} discovery preview "${query.title}"`,
        );
        if (query.authors?.length) {
          exampleCommands.push(
            `${process.argv[0]} ${process.argv[1]} discovery preview --creator "${query.authors[0]}"`,
          );
        }
      }

      // Title-specific suggestions
      if (query.title) {
        suggestions.push(
          "Try alternative spellings or shorter versions of the title",
          "Try searching without subtitle or series information",
        );

        // Extract potential main title (before colon or dash)
        const mainTitle = query.title.split(/[:\-–—]/)[0].trim();
        if (mainTitle !== query.title && mainTitle.length > 3) {
          exampleCommands.push(
            `${process.argv[0]} ${process.argv[1]} discovery preview "${mainTitle}"`,
          );
        }
      }

      // Author-specific suggestions
      if (query.authors?.length) {
        suggestions.push(
          "Try searching with just the last name of the author",
          "Check the spelling of author names",
        );

        for (const author of query.authors) {
          const lastName = author.split(" ").pop();
          if (lastName && lastName !== author) {
            exampleCommands.push(
              `${process.argv[0]} ${process.argv[1]} discovery preview --creator "${lastName}"`,
            );
          }
        }
      }

      // ISBN-specific suggestions
      if (query.isbn) {
        suggestions.push(
          "Verify the ISBN is correct and try without hyphens",
          "Try searching by title and author instead of ISBN",
        );

        const cleanIsbn = query.isbn.replaceAll(/[-\s]/g, "");
        if (cleanIsbn !== query.isbn) {
          exampleCommands.push(
            `${process.argv[0]} ${process.argv[1]} discovery preview --isbn "${cleanIsbn}"`,
          );
        }

        if (embeddedMetadata?.title) {
          exampleCommands.push(
            `${process.argv[0]} ${process.argv[1]} discovery preview "${embeddedMetadata.title}"`,
          );
        }
      }

      // Language-specific suggestions
      if (query.language) {
        suggestions.push("Try searching without language restriction");
        const queryWithoutLang = { ...query };
        delete queryWithoutLang.language;
        if (queryWithoutLang.title) {
          exampleCommands.push(
            `${process.argv[0]} ${process.argv[1]} discovery preview "${queryWithoutLang.title}"`,
          );
        }
      }

      // Year range suggestions
      if (query.yearRange) {
        suggestions.push(
          "Try expanding the publication year range",
          "Try searching without year restrictions",
        );
      }

      // Subject-specific suggestions
      if (query.subjects?.length) {
        suggestions.push(
          "Try searching without subject restrictions",
          "Try broader subject categories",
        );
      }

      // Publisher-specific suggestions
      if (query.publisher) {
        suggestions.push(
          "Try searching without publisher restriction",
          "Check publisher name spelling and try variations",
        );
      }
    }

    // Generic suggestions
    suggestions.push(
      "Check for typos in your search terms",
      "Try searching for a more well-known work by the same author",
      "The book may not be available in public metadata databases",
    );

    // Embedded metadata specific suggestions
    if (embeddedMetadata) {
      suggestions.push(
        "The embedded metadata may be incomplete or non-standard",
        "Try extracting key information manually and using search flags",
      );

      if (embeddedMetadata.title) {
        // Suggest manual search with embedded title
        exampleCommands.push(
          `${process.argv[0]} ${process.argv[1]} discovery preview "${embeddedMetadata.title}" --fuzzy`,
        );
      }

      if (embeddedMetadata.contributors?.length) {
        const authors = embeddedMetadata.contributors
          .filter((c) => c.roles.includes("aut"))
          .map((c) => c.name);
        if (authors.length > 0) {
          exampleCommands.push(
            `${process.argv[0]} ${process.argv[1]} discovery preview --creator "${authors[0]}" --fuzzy`,
          );
        }
      }
    }

    // If we have very restrictive criteria, suggest loosening them
    const criteriaCount = [
      query.title,
      query.authors?.length,
      query.isbn,
      query.language,
      query.subjects?.length,
      query.publisher,
      query.yearRange,
    ].filter(Boolean).length;

    if (criteriaCount > 3) {
      suggestions.push("Try using fewer search criteria at once");
      reason = reason || "Search criteria may be too restrictive";
    }

    return {
      ...(reason && { reason }),
      exampleCommands,
      providerIssues,
      suggestions,
    };
  }

  /**
   * Analyze provider errors and provide detailed error information
   */
  private analyzeProviderError(error: Error): {
    details?: string;
    message: string;
    recoverable: boolean;
    suggestedActions: string[];
    type:
      | "auth"
      | "network"
      | "query"
      | "ratelimit"
      | "server"
      | "timeout"
      | "unknown";
  } {
    const message = error.message.toLowerCase();

    // Network-related errors
    if (
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("econnreset") ||
      message.includes("enotfound") ||
      message.includes("econnrefused")
    ) {
      return {
        details: "Unable to connect to the metadata provider",
        message: "Network connection failed",
        recoverable: true,
        suggestedActions: [
          "Check your internet connection",
          "Verify the provider service is available",
          "Try again in a few moments",
          "Check if you're behind a firewall or proxy",
        ],
        type: "network",
      };
    }

    // Timeout errors
    if (
      message.includes("timeout") ||
      message.includes("etimedout") ||
      message.includes("aborted")
    ) {
      return {
        details: "The provider took too long to respond",
        message: "Request timed out",
        recoverable: true,
        suggestedActions: [
          "Try again as the provider may be experiencing high load",
          "Check your internet connection speed",
          "The provider servers may be overloaded",
        ],
        type: "timeout",
      };
    }

    // Rate limiting errors
    if (
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("429") ||
      message.includes("quota exceeded")
    ) {
      return {
        details: "Too many requests sent to the provider",
        message: "Rate limit exceeded",
        recoverable: true,
        suggestedActions: [
          "Wait a few minutes before trying again",
          "Reduce the frequency of requests",
          "The provider has temporary usage limits",
        ],
        type: "ratelimit",
      };
    }

    // Authentication errors
    if (
      message.includes("unauthorized") ||
      message.includes("401") ||
      message.includes("403") ||
      message.includes("forbidden") ||
      message.includes("api key") ||
      message.includes("authentication")
    ) {
      return {
        details: "Invalid or missing API credentials",
        message: "Authentication failed",
        recoverable: true,
        suggestedActions: [
          "Check your API key configuration",
          "Verify your account has access to this provider",
          "Ensure API credentials are not expired",
        ],
        type: "auth",
      };
    }

    // Server errors
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("internal server error") ||
      message.includes("bad gateway") ||
      message.includes("service unavailable")
    ) {
      return {
        details: "The metadata provider is experiencing technical difficulties",
        message: "Provider server error",
        recoverable: true,
        suggestedActions: [
          "Try again in a few minutes",
          "The provider may be undergoing maintenance",
          "Check the provider's status page if available",
        ],
        type: "server",
      };
    }

    // Query/API-specific errors
    if (
      message.includes("invalid query") ||
      message.includes("bad request") ||
      message.includes("400") ||
      message.includes("malformed") ||
      message.includes("invalid parameter")
    ) {
      return {
        details: "The search parameters are not accepted by this provider",
        message: "Invalid search criteria",
        recoverable: true,
        suggestedActions: [
          "Try simplifying your search criteria",
          "Check for special characters in search terms",
          "Verify ISBN format is correct",
          "Try searching with different parameters",
        ],
        type: "query",
      };
    }

    // JSON parsing errors (common with API responses)
    if (
      message.includes("json") ||
      message.includes("parse") ||
      message.includes("syntax")
    ) {
      return {
        details: "The provider returned malformed data",
        message: "Invalid response from provider",
        recoverable: true,
        suggestedActions: [
          "Try the request again",
          "The provider may be experiencing issues",
          "Check if the provider API has changed",
        ],
        type: "server",
      };
    }

    // SSL/TLS errors
    if (
      message.includes("ssl") ||
      message.includes("tls") ||
      message.includes("certificate")
    ) {
      return {
        details: "Unable to establish secure connection to provider",
        message: "SSL/TLS connection error",
        recoverable: true,
        suggestedActions: [
          "Check your system's SSL certificates",
          "Try again as this may be temporary",
          "Verify system date and time are correct",
        ],
        type: "network",
      };
    }

    // Generic fallback
    return {
      details: "An unexpected error occurred while querying the provider",
      message: `Provider error: ${error.message}`,
      recoverable: true,
      suggestedActions: [
        "Try the request again",
        "Check if other providers are working",
        "Report this error if it persists",
      ],
      type: "unknown",
    };
  }

  /**
   * Check if two author names likely refer to the same person
   */
  private areAuthorsSimilar(name1: string, name2: string): boolean {
    const norm1 = this.#normalizeString(name1);
    const norm2 = this.#normalizeString(name2);

    // Check if one is "Last, First" version of the other
    if (name1.includes(",") && !name2.includes(",")) {
      const [last, first] = name1.split(",").map((s) => s.trim());
      const expected = this.#normalizeString(`${first} ${last}`);

      return expected === norm2;
    }

    if (name2.includes(",") && !name1.includes(",")) {
      const [last, first] = name2.split(",").map((s) => s.trim());
      const expected = this.#normalizeString(`${first} ${last}`);

      return expected === norm1;
    }

    // Simple fuzzy match
    return norm1 === norm2;
  }

  /**
   * Helper method to compare arrays for equality
   */
  private arraysEqual(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) {
      return false;
    }
    return arr1.every((item, index) => item === arr2[index]);
  }

  /**
   * Calculate format score for author name
   */
  private calculateAuthorFormatScore(name: string, confidence: number): number {
    let score = confidence;

    // Penalty for "Last, First" format
    if (name.includes(",")) {
      score -= 0.25; // Larger penalty for comma format
    }

    // Bonus for "First Last" format (no comma, multiple words, not initials)
    const words = name.trim().split(/\s+/);
    if (words.length >= 2 && !name.includes(",")) {
      const hasInitials = words.some(
        (word) =>
          word.length <= 2 && (word.includes(".") || word.match(/^[A-Z]$/)),
      );

      if (!hasInitials) {
        score += 0.2; // Larger bonus for full "First Last" format
      }
    }

    return score;
  }

  /**
   * Choose better author format between two options
   */
  private chooseBetterAuthorFormat(
    embeddedAuthor: string,
    externalAuthor: string,
    embeddedConfidence: number,
    externalConfidence: number,
  ): string {
    // Check if they're likely the same author
    if (!this.areAuthorsSimilar(embeddedAuthor, externalAuthor)) {
      // Different authors - prefer higher confidence
      return embeddedConfidence > externalConfidence
        ? embeddedAuthor
        : externalAuthor;
    }

    // Same author, different formats - apply format preference
    const embeddedScore = this.calculateAuthorFormatScore(
      embeddedAuthor,
      embeddedConfidence,
    );
    const externalScore = this.calculateAuthorFormatScore(
      externalAuthor,
      externalConfidence,
    );

    return externalScore > embeddedScore ? externalAuthor : embeddedAuthor;
  }

  /**
   * Create source attribution for reconciled metadata
   */
  private createSourceAttribution(
    embeddedRecord?: MetadataRecord,
    externalRecord?: MetadataRecord,
  ): Record<string, string> {
    const attribution: Record<string, string> = {};

    const fieldsToCheck = [
      "title",
      "authors",
      "isbn",
      "publicationDate",
      "language",
      "publisher",
      "subjects",
      "description",
      "series",
      "pageCount",
      "coverImage",
    ];

    for (const field of fieldsToCheck) {
      const embeddedValue = embeddedRecord
        ? embeddedRecord[field as keyof typeof embeddedRecord]
        : null;
      const externalValue = externalRecord
        ? externalRecord[field as keyof typeof externalRecord]
        : null;

      if (embeddedValue) {
        attribution[field] = "embedded (file)";
      } else if (externalValue) {
        attribution[field] = externalRecord!.source;
      }
    }

    return attribution;
  }

  /**
   * Detect conflicts between embedded and external metadata
   */
  private detectConflicts(
    embeddedRecord?: MetadataRecord,
    externalRecords?: MetadataRecord[],
  ): Array<{
    embedded: unknown;
    external: Array<{ confidence: number; source: string; value: unknown }>;
    field: string;
  }> {
    if (!embeddedRecord || !externalRecords || externalRecords.length === 0) {
      return [];
    }

    const conflicts: Array<{
      embedded: unknown;
      external: Array<{ confidence: number; source: string; value: unknown }>;
      field: string;
    }> = [];

    const fieldsToCheck = [
      { key: "title", label: "Title" },
      { key: "authors", label: "Authors" },
      { key: "isbn", label: "ISBN" },
      { key: "publicationDate", label: "Publication Date" },
      { key: "language", label: "Language" },
      { key: "publisher", label: "Publisher" },
      { key: "subjects", label: "Subjects" },
      { key: "description", label: "Description" },
      { key: "pageCount", label: "Page Count" },
    ];

    for (const field of fieldsToCheck) {
      const embeddedValue =
        embeddedRecord[field.key as keyof typeof embeddedRecord];

      if (!embeddedValue) {
        continue;
      }

      const externalValues = externalRecords
        .map((record) => ({
          confidence: record.confidence,
          source: record.source,
          value: record[field.key as keyof typeof record],
        }))
        .filter((item) => item.value);

      if (externalValues.length === 0) {
        continue;
      }

      // Check for conflicts
      const hasConflict = externalValues.some((external) => {
        return !this.valuesMatch(embeddedValue, external.value);
      });

      if (hasConflict) {
        conflicts.push({
          embedded: embeddedValue,
          external: externalValues,
          field: field.label,
        });
      }
    }

    return conflicts;
  }

  /**
   * Display conflicts between embedded and external metadata
   */
  private displayConflictsAndReconciliation(
    embeddedRecord: MetadataRecord,
    externalRecords: MetadataRecord[],
    showConfidence: boolean,
  ): void {
    this.log("\n=== ⚖️ Conflicts & Reconciliation ===");

    const conflicts: Array<{
      embedded: unknown;
      external: Array<{ confidence: number; source: string; value: unknown }>;
      field: string;
    }> = [];

    // Check each metadata field for conflicts
    const fieldsToCheck = [
      { key: "title", label: "Title" },
      { key: "authors", label: "Authors" },
      { key: "isbn", label: "ISBN" },
      { key: "publicationDate", label: "Publication Date" },
      { key: "language", label: "Language" },
      { key: "publisher", label: "Publisher" },
      { key: "subjects", label: "Subjects" },
      { key: "description", label: "Description" },
      { key: "pageCount", label: "Page Count" },
    ];

    for (const field of fieldsToCheck) {
      const embeddedValue =
        embeddedRecord[field.key as keyof typeof embeddedRecord];

      if (!embeddedValue) {
        continue;
      }

      const externalValues = externalRecords
        .map((record) => ({
          confidence: record.confidence,
          source: record.source,
          value: record[field.key as keyof typeof record],
        }))
        .filter((item) => item.value);

      if (externalValues.length === 0) {
        continue;
      }

      // Check for conflicts
      const hasConflict = externalValues.some((external) => {
        return !this.valuesMatch(embeddedValue, external.value);
      });

      if (hasConflict) {
        conflicts.push({
          embedded: embeddedValue,
          external: externalValues,
          field: field.label,
        });
      }
    }

    if (conflicts.length === 0) {
      this.log(
        "✅ No conflicts detected between embedded and external metadata.",
      );
      this.log("All sources provide consistent information.");
    } else {
      this.log(
        `⚠️  Found ${conflicts.length} conflict(s) between embedded and external metadata:`,
      );
      this.log("");

      for (const conflict of conflicts) {
        this.log(`🔍 ${conflict.field}:`);

        // Display embedded value
        const embeddedDisplay = this.formatValueForDisplay(conflict.embedded);
        this.log(`  📖 Embedded: ${embeddedDisplay}`);

        // Display external values
        for (const external of conflict.external) {
          const externalDisplay = this.formatValueForDisplay(external.value);
          const confidenceIcon =
            external.confidence >= 0.8
              ? "🟢"
              : external.confidence > 0.5
                ? "🟡"
                : "🔴";
          if (showConfidence) {
            this.log(
              `  🌐 ${external.source}: ${externalDisplay} (${confidenceIcon} ${(external.confidence * 100).toFixed(1)}%)`,
            );
          } else {
            this.log(`  🌐 ${external.source}: ${externalDisplay}`);
          }
        }

        // Show resolution reasoning
        this.log(
          `  ⚖️  Resolution: Using embedded metadata (higher confidence from original file)`,
        );
        this.log("");
      }
    }
  }

  /**
   * Display results in detailed format (default)
   */
  private displayDetailedOutput(
    results: MetadataRecord[],
    providerResults: Array<{
      duration: number;
      error?: Error;
      provider: string;
      records: MetadataRecord[];
      success: boolean;
    }>,
    providers: NewMetadataProvider[],
    showConfidence: boolean,
  ): void {
    // Separate embedded metadata from external provider results
    const embeddedRecords = results.filter(
      (record) => record.source === "embedded",
    );
    const externalRecords = results.filter(
      (record) => record.source !== "embedded",
    );

    // Display embedded metadata section
    if (embeddedRecords.length > 0) {
      this.log("=== 📖 Embedded Metadata (From File) ===");
      const embeddedRecord = embeddedRecords[0]; // Should only be one embedded record

      this.log(
        `Source: ${(embeddedRecord.providerData?.fileFormat as string)?.toUpperCase()} file`,
      );
      this.log(
        `Confidence: ${(embeddedRecord.confidence * 100).toFixed(1)}% (High - from original file)`,
      );
      this.log("");

      // Display embedded metadata fields
      this.displayMetadataFieldWithSource(
        "Title",
        embeddedRecord.title,
        embeddedRecord.source,
        embeddedRecord.confidence,
        showConfidence,
      );
      this.displayMetadataFieldWithSource(
        "Authors",
        embeddedRecord.authors,
        embeddedRecord.source,
        embeddedRecord.confidence,
        showConfidence,
      );
      this.displayMetadataFieldWithSource(
        "ISBN",
        embeddedRecord.isbn,
        embeddedRecord.source,
        embeddedRecord.confidence,
        showConfidence,
      );
      this.displayMetadataFieldWithSource(
        "Publication Date",
        embeddedRecord.publicationDate,
        embeddedRecord.source,
        embeddedRecord.confidence,
        showConfidence,
      );
      this.displayMetadataFieldWithSource(
        "Language",
        embeddedRecord.language,
        embeddedRecord.source,
        embeddedRecord.confidence,
        showConfidence,
      );
      this.displayMetadataFieldWithSource(
        "Publisher",
        embeddedRecord.publisher,
        embeddedRecord.source,
        embeddedRecord.confidence,
        showConfidence,
      );
      this.displayMetadataFieldWithSource(
        "Subjects",
        embeddedRecord.subjects,
        embeddedRecord.source,
        embeddedRecord.confidence,
        showConfidence,
      );
      this.displayMetadataFieldWithSource(
        "Description",
        embeddedRecord.description,
        embeddedRecord.source,
        embeddedRecord.confidence,
        showConfidence,
      );
      this.displayMetadataFieldWithSource(
        "Series",
        embeddedRecord.series,
        embeddedRecord.source,
        embeddedRecord.confidence,
        showConfidence,
      );
      this.displayMetadataFieldWithSource(
        "Page Count",
        embeddedRecord.pageCount,
        embeddedRecord.source,
        embeddedRecord.confidence,
        showConfidence,
      );
      this.displayMetadataFieldWithSource(
        "Cover Image",
        embeddedRecord.coverImage,
        embeddedRecord.source,
        embeddedRecord.confidence,
        showConfidence,
      );
    }

    // Display external metadata section
    if (externalRecords.length > 0) {
      this.log("\n=== 🌐 External Metadata (From Providers) ===");

      // Group external records by provider
      const recordsByProvider = new Map<string, MetadataRecord[]>();
      for (const record of externalRecords) {
        const provider = record.source;
        if (!recordsByProvider.has(provider)) {
          recordsByProvider.set(provider, []);
        }
        recordsByProvider.get(provider)!.push(record);
      }

      // Display each provider's results
      for (const [providerName, providerRecords] of recordsByProvider) {
        this.log(`\n--- ${providerName} ---`);
        this.log(`Records found: ${providerRecords.length}`);

        // Show best result from this provider
        // eslint-disable-next-line unicorn/no-array-reduce -- most straightforward here
        const bestProviderRecord = providerRecords.reduce((best, current) =>
          current.confidence > best.confidence ? current : best,
        );

        this.log(
          `Best match confidence: ${(bestProviderRecord.confidence * 100).toFixed(1)}%`,
        );
        this.log("");

        // Display external metadata fields
        this.displayMetadataFieldWithSource(
          "Title",
          bestProviderRecord.title,
          bestProviderRecord.source,
          bestProviderRecord.confidence,
          showConfidence,
        );
        this.displayMetadataFieldWithSource(
          "Authors",
          bestProviderRecord.authors,
          bestProviderRecord.source,
          bestProviderRecord.confidence,
          showConfidence,
        );
        this.displayMetadataFieldWithSource(
          "ISBN",
          bestProviderRecord.isbn,
          bestProviderRecord.source,
          bestProviderRecord.confidence,
          showConfidence,
        );
        this.displayMetadataFieldWithSource(
          "Publication Date",
          bestProviderRecord.publicationDate,
          bestProviderRecord.source,
          bestProviderRecord.confidence,
          showConfidence,
        );
        this.displayMetadataFieldWithSource(
          "Language",
          bestProviderRecord.language,
          bestProviderRecord.source,
          bestProviderRecord.confidence,
          showConfidence,
        );
        this.displayMetadataFieldWithSource(
          "Publisher",
          bestProviderRecord.publisher,
          bestProviderRecord.source,
          bestProviderRecord.confidence,
          showConfidence,
        );
        this.displayMetadataFieldWithSource(
          "Subjects",
          bestProviderRecord.subjects,
          bestProviderRecord.source,
          bestProviderRecord.confidence,
          showConfidence,
        );
        this.displayMetadataFieldWithSource(
          "Description",
          bestProviderRecord.description,
          bestProviderRecord.source,
          bestProviderRecord.confidence,
          showConfidence,
        );
        this.displayMetadataFieldWithSource(
          "Series",
          bestProviderRecord.series,
          bestProviderRecord.source,
          bestProviderRecord.confidence,
          showConfidence,
        );
        this.displayMetadataFieldWithSource(
          "Page Count",
          bestProviderRecord.pageCount,
          bestProviderRecord.source,
          bestProviderRecord.confidence,
          showConfidence,
        );
        this.displayMetadataFieldWithSource(
          "Cover Image",
          bestProviderRecord.coverImage,
          bestProviderRecord.source,
          bestProviderRecord.confidence,
          showConfidence,
        );
      }
    }

    // Display conflicts and reconciliation
    if (embeddedRecords.length > 0 && externalRecords.length > 0) {
      this.displayConflictsAndReconciliation(
        embeddedRecords[0],
        externalRecords,
        showConfidence,
      );
    }

    // Display final reconciled metadata
    this.displayReconciledMetadata(results, showConfidence);

    // Show provider reliability scores if requested
    if (showConfidence) {
      this.log("\n=== Provider Reliability Scores ===");
      for (const provider of providers) {
        this.log(`\n${provider.name}:`);
        const dataTypes = Object.values(MetadataType);
        for (const type of dataTypes) {
          const score = provider.getReliabilityScore(type);
          const supported = provider.supportsDataType(type);
          this.log(
            `  ${type}: ${(score * 100).toFixed(1)}% ${supported ? "✓" : "✗"}`,
          );
        }
      }
    }

    // Show all results summary
    if (results.length > 1) {
      this.log(`\n=== All Results Summary ===`);
      this.log(`Found ${results.length} total results:`);
      for (const [index, result] of results.entries()) {
        const sourceIcon = result.source === "embedded" ? "📖" : "🌐";
        this.log(
          `  ${index + 1}. ${sourceIcon} ${result.title || "Unknown Title"} (${(result.confidence * 100).toFixed(1)}% confidence, ${result.source})`,
        );
      }
    }

    // Show provider performance summary
    if (showConfidence && providerResults.length > 0) {
      this.log(`\n=== Provider Performance ===`);
      for (const result of providerResults) {
        const status = result.success ? "✅" : "❌";
        const recordInfo = result.success
          ? `${result.records.length} records`
          : "failed";
        this.log(
          `${status} ${result.provider}: ${recordInfo} (${result.duration}ms)`,
        );
        if (!result.success && result.error) {
          this.log(`    Error: ${result.error.message}`);
        }
      }
    }
  }

  /**
   * Display results in JSON format
   */
  private displayJsonOutput(
    results: MetadataRecord[],
    providerResults: Array<{
      duration: number;
      error?: Error;
      provider: string;
      records: MetadataRecord[];
      success: boolean;
    }>,
    providers: NewMetadataProvider[],
    query: MultiCriteriaQuery,
    duration: number,
  ): void {
    // Separate embedded and external metadata
    const embeddedRecords = results.filter(
      (record) => record.source === "embedded",
    );
    const externalRecords = results.filter(
      (record) => record.source !== "embedded",
    );

    // Create reconciled metadata
    const embeddedRecord = embeddedRecords[0];
    const bestExternalRecord =
      externalRecords.length > 0
        ? // eslint-disable-next-line unicorn/no-array-reduce -- most straightforward here
          externalRecords.reduce((best, current) =>
            current.confidence > best.confidence ? current : best,
          )
        : null;

    const reconciledMetadata =
      embeddedRecord || bestExternalRecord
        ? {
            authors: embeddedRecord?.authors || bestExternalRecord?.authors,
            coverImage:
              embeddedRecord?.coverImage || bestExternalRecord?.coverImage,
            description:
              embeddedRecord?.description || bestExternalRecord?.description,
            isbn: embeddedRecord?.isbn || bestExternalRecord?.isbn,
            language: embeddedRecord?.language || bestExternalRecord?.language,
            pageCount:
              embeddedRecord?.pageCount || bestExternalRecord?.pageCount,
            publicationDate:
              embeddedRecord?.publicationDate ||
              bestExternalRecord?.publicationDate,
            publisher:
              embeddedRecord?.publisher || bestExternalRecord?.publisher,
            series: embeddedRecord?.series || bestExternalRecord?.series,
            sourceAttribution: this.createSourceAttribution(
              embeddedRecord,
              bestExternalRecord || undefined,
            ),
            subjects: embeddedRecord?.subjects || bestExternalRecord?.subjects,
            title: embeddedRecord?.title || bestExternalRecord?.title,
          }
        : null;

    const output = {
      conflicts: this.detectConflicts(embeddedRecord, externalRecords),
      embeddedMetadata:
        embeddedRecords.length > 0
          ? {
              extractionMethod: embeddedRecord.providerData?.extractionMethod,
              fileFormat: embeddedRecord.providerData?.fileFormat,
              record: {
                authors: embeddedRecord.authors,
                confidence: embeddedRecord.confidence,
                coverImage: embeddedRecord.coverImage,
                description: embeddedRecord.description,
                id: embeddedRecord.id,
                isbn: embeddedRecord.isbn,
                language: embeddedRecord.language,
                pageCount: embeddedRecord.pageCount,
                providerData: embeddedRecord.providerData,
                publicationDate: embeddedRecord.publicationDate,
                publisher: embeddedRecord.publisher,
                series: embeddedRecord.series,
                source: embeddedRecord.source,
                subjects: embeddedRecord.subjects,
                title: embeddedRecord.title,
              },
            }
          : null,
      externalMetadata: {
        bestMatch: bestExternalRecord
          ? {
              authors: bestExternalRecord.authors,
              confidence: bestExternalRecord.confidence,
              coverImage: bestExternalRecord.coverImage,
              description: bestExternalRecord.description,
              id: bestExternalRecord.id,
              isbn: bestExternalRecord.isbn,
              language: bestExternalRecord.language,
              pageCount: bestExternalRecord.pageCount,
              providerData: bestExternalRecord.providerData,
              publicationDate: bestExternalRecord.publicationDate,
              publisher: bestExternalRecord.publisher,
              series: bestExternalRecord.series,
              source: bestExternalRecord.source,
              subjects: bestExternalRecord.subjects,
              title: bestExternalRecord.title,
            }
          : null,
        recordsByProvider: this.groupRecordsByProvider(externalRecords),
        totalRecords: externalRecords.length,
      },
      providerReliability: providers.map((provider) => ({
        name: provider.name,
        priority: provider.priority,
        // eslint-disable-next-line unicorn/no-array-reduce -- most straightforward here
        reliabilityScores: Object.values(MetadataType).reduce(
          (scores, type) => {
            scores[type] = {
              score: provider.getReliabilityScore(type),
              supported: provider.supportsDataType(type),
            };

            return scores;
          },
          {} as Record<MetadataType, { score: number; supported: boolean }>,
        ),
      })),
      providerResults: providerResults.map((result) => ({
        duration: result.duration,
        error: result.error?.message,
        provider: result.provider,
        recordCount: result.records.length,
        success: result.success,
      })),
      query,
      reconciledMetadata,
      summary: {
        conflictsDetected: this.detectConflicts(embeddedRecord, externalRecords)
          .length,
        embeddedRecords: embeddedRecords.length,
        externalRecords: externalRecords.length,
        failedProviders: providerResults.filter((r) => !r.success).length,
        providersQueried: providers.length,
        successfulProviders: providerResults.filter((r) => r.success).length,
        totalDuration: duration,
        totalRecords: results.length,
      },
    };

    this.log(JSON.stringify(output, null, 2));
  }

  /**
   * Display a metadata field with source attribution
   */
  private displayMetadataFieldWithSource(
    label: string,
    value: unknown,
    source: string,
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

    // Display the field with source attribution
    const sourceIcon = source === "embedded" ? "📖" : "🌐";
    this.log(`${label}: ${displayValue}`);

    if (showConfidence) {
      const confidenceIcon =
        confidence >= 0.8 ? "🟢" : confidence > 0.5 ? "🟡" : "🔴";
      this.log(
        `  ${sourceIcon} Source: ${source} | ${confidenceIcon} Confidence: ${(confidence * 100).toFixed(1)}%`,
      );
    } else {
      this.log(`  ${sourceIcon} Source: ${source}`);
    }

    this.log(""); // Empty line between fields
  }

  /**
   * Display the final reconciled metadata that would be used in the library
   */
  private displayReconciledMetadata(
    results: MetadataRecord[],
    showConfidence: boolean,
  ): void {
    this.log("\n=== 📚 Final Reconciled Metadata (Library Preview) ===");
    this.log(
      "This is how the book would appear in your library after processing:",
    );
    this.log("");

    // For now, use simple reconciliation: prefer embedded metadata, then highest confidence external
    const embeddedRecord = results.find(
      (record) => record.source === "embedded",
    );
    const externalRecords = results.filter(
      (record) => record.source !== "embedded",
    );
    const bestExternalRecord =
      externalRecords.length > 0
        ? // eslint-disable-next-line unicorn/no-array-reduce -- most straightforward here
          externalRecords.reduce((best, current) =>
            current.confidence > best.confidence ? current : best,
          )
        : null;

    // Create reconciled metadata by preferring embedded, falling back to external
    // Special handling for authors to prefer better format
    const reconciledAuthors = this.reconcileAuthors(
      embeddedRecord,
      bestExternalRecord,
    );

    const reconciledMetadata = {
      authors: reconciledAuthors,
      coverImage: embeddedRecord?.coverImage || bestExternalRecord?.coverImage,
      description:
        embeddedRecord?.description || bestExternalRecord?.description,
      isbn: embeddedRecord?.isbn || bestExternalRecord?.isbn,
      language: embeddedRecord?.language || bestExternalRecord?.language,
      pageCount: embeddedRecord?.pageCount || bestExternalRecord?.pageCount,
      publicationDate:
        embeddedRecord?.publicationDate || bestExternalRecord?.publicationDate,
      publisher: embeddedRecord?.publisher || bestExternalRecord?.publisher,
      series: embeddedRecord?.series || bestExternalRecord?.series,
      subjects: embeddedRecord?.subjects || bestExternalRecord?.subjects,
      title: embeddedRecord?.title || bestExternalRecord?.title,
    };

    // Display reconciled fields with source attribution
    const fieldsToDisplay = [
      { key: "title", label: "Title" },
      { key: "authors", label: "Authors" },
      { key: "isbn", label: "ISBN" },
      { key: "publicationDate", label: "Publication Date" },
      { key: "language", label: "Language" },
      { key: "publisher", label: "Publisher" },
      { key: "subjects", label: "Subjects" },
      { key: "description", label: "Description" },
      { key: "series", label: "Series" },
      { key: "pageCount", label: "Page Count" },
      { key: "coverImage", label: "Cover Image" },
    ];

    for (const field of fieldsToDisplay) {
      const value =
        reconciledMetadata[field.key as keyof typeof reconciledMetadata];
      if (!value) {
        continue;
      }

      // Determine source of this field
      const embeddedValue = embeddedRecord
        ? embeddedRecord[field.key as keyof typeof embeddedRecord]
        : null;
      const externalValue = bestExternalRecord
        ? bestExternalRecord[field.key as keyof typeof bestExternalRecord]
        : null;

      let source: string;
      let confidence: number;

      if (embeddedValue && this.valuesMatch(value, embeddedValue)) {
        source = "embedded (file)";
        confidence = embeddedRecord!.confidence;
      } else if (externalValue && this.valuesMatch(value, externalValue)) {
        source = bestExternalRecord!.source;
        confidence = bestExternalRecord!.confidence;
      } else {
        source = "reconciled";
        confidence = 0.7; // Default confidence for reconciled values
      }

      this.displayMetadataFieldWithSource(
        field.label,
        value,
        source,
        confidence,
        showConfidence,
      );
    }

    // Show reconciliation summary
    const embeddedFields = fieldsToDisplay.filter((field) => {
      const value =
        reconciledMetadata[field.key as keyof typeof reconciledMetadata];
      const embeddedValue = embeddedRecord
        ? embeddedRecord[field.key as keyof typeof embeddedRecord]
        : null;
      return value && embeddedValue && this.valuesMatch(value, embeddedValue);
    }).length;

    const externalFields = fieldsToDisplay.filter((field) => {
      const value =
        reconciledMetadata[field.key as keyof typeof reconciledMetadata];
      const embeddedValue = embeddedRecord
        ? embeddedRecord[field.key as keyof typeof embeddedRecord]
        : null;
      const externalValue = bestExternalRecord
        ? bestExternalRecord[field.key as keyof typeof bestExternalRecord]
        : null;

      return (
        value &&
        !embeddedValue &&
        externalValue &&
        this.valuesMatch(value, externalValue)
      );
    }).length;

    this.log("📊 Reconciliation Summary:");
    this.log(`  📖 Fields from embedded metadata: ${embeddedFields}`);
    this.log(`  🌐 Fields from external providers: ${externalFields}`);
    this.log(
      `  ⚖️  Total fields reconciled: ${embeddedFields + externalFields}`,
    );
  }

  /**
   * Display search criteria with override information
   */
  private displaySearchCriteriaWithOverrides(
    query: MultiCriteriaQuery,
    embeddedMetadata: EbookMetadata | null,
    flags: {
      creator?: string[] | undefined;
      fuzzy: boolean;
      isbn?: string | undefined;
      language?: string | undefined;
      publisher?: string | undefined;
      subject?: string[] | undefined;
      title?: string | undefined;
      yearFrom?: number | undefined;
      yearTo?: number | undefined;
    },
  ): void {
    this.log("🔍 Search Criteria:");

    // Track which fields are overridden
    const overrides: string[] = [];

    // Title
    if (query.title) {
      const isOverride =
        embeddedMetadata?.title &&
        flags.title &&
        flags.title !== embeddedMetadata.title;
      const source = isOverride
        ? " (🔧 flag override)"
        : embeddedMetadata?.title
          ? " (📖 from file)"
          : " (📝 manual input)";
      this.log(`  Title: "${query.title}"${source}`);
      if (isOverride) {
        overrides.push(`Title: "${embeddedMetadata.title}" → "${flags.title}"`);
      }
    }

    // Authors/Creators
    if (query.authors?.length) {
      const embeddedAuthors =
        embeddedMetadata?.contributors
          ?.filter((c) => c.roles.includes("aut"))
          .map((c) => c.name) || [];
      const isOverride =
        embeddedAuthors.length > 0 &&
        flags.creator?.length &&
        !this.arraysEqual(flags.creator, embeddedAuthors);
      const source = isOverride
        ? " (🔧 flag override)"
        : embeddedAuthors.length > 0
          ? " (📖 from file)"
          : " (📝 manual input)";
      this.log(`  Creators: ${query.authors.join(", ")}${source}`);
      if (isOverride) {
        overrides.push(
          `Creators: "${embeddedAuthors.join(", ")}" → "${flags.creator!.join(", ")}"`,
        );
      }
    }

    // ISBN
    if (query.isbn) {
      const embeddedIsbns =
        embeddedMetadata?.identifiers
          ?.filter((id) => id.type === "isbn")
          .map((id) => id.value) || [];
      const embeddedIsbn = embeddedIsbns[0];
      const isOverride =
        embeddedIsbn && flags.isbn && flags.isbn !== embeddedIsbn;
      const source = isOverride
        ? " (🔧 flag override)"
        : embeddedIsbn
          ? " (📖 from file)"
          : " (📝 manual input)";
      this.log(`  ISBN: ${query.isbn}${source}`);
      if (isOverride) {
        overrides.push(`ISBN: "${embeddedIsbn}" → "${flags.isbn}"`);
      }
    }

    // Language
    if (query.language) {
      const isOverride =
        embeddedMetadata?.language &&
        flags.language &&
        flags.language !== embeddedMetadata.language;
      const source = isOverride
        ? " (🔧 flag override)"
        : embeddedMetadata?.language
          ? " (📖 from file)"
          : " (📝 manual input)";
      this.log(`  Language: ${query.language}${source}`);
      if (isOverride) {
        overrides.push(
          `Language: "${embeddedMetadata.language}" → "${flags.language}"`,
        );
      }
    }

    // Subjects
    if (query.subjects?.length) {
      const embeddedSubjects = embeddedMetadata?.tags?.slice(0, 5) || [];
      const isOverride =
        embeddedSubjects.length > 0 &&
        flags.subject?.length &&
        !this.arraysEqual(flags.subject, embeddedSubjects);
      const source = isOverride
        ? " (🔧 flag override)"
        : embeddedSubjects.length > 0
          ? " (📖 from file)"
          : " (📝 manual input)";
      this.log(`  Subjects: ${query.subjects.join(", ")}${source}`);
      if (isOverride) {
        overrides.push(
          `Subjects: "${embeddedSubjects.join(", ")}" → "${flags.subject!.join(", ")}"`,
        );
      }
    }

    // Publisher
    if (query.publisher) {
      const embeddedPublishers =
        embeddedMetadata?.contributors
          ?.filter((c) => c.roles.includes("bkp"))
          .map((c) => c.name) || [];
      const embeddedPublisher = embeddedPublishers[0];
      const isOverride =
        embeddedPublisher &&
        flags.publisher &&
        flags.publisher !== embeddedPublisher;
      const source = isOverride
        ? " (🔧 flag override)"
        : embeddedPublisher
          ? " (📖 from file)"
          : " (📝 manual input)";
      this.log(`  Publisher: "${query.publisher}"${source}`);
      if (isOverride) {
        overrides.push(
          `Publisher: "${embeddedPublisher}" → "${flags.publisher}"`,
        );
      }
    }

    // Year Range
    if (query.yearRange) {
      const embeddedYear = embeddedMetadata?.datePublished?.getFullYear();
      const isOverride =
        embeddedYear &&
        (flags.yearFrom || flags.yearTo) &&
        (query.yearRange[0] !== embeddedYear - 1 ||
          query.yearRange[1] !== embeddedYear + 1);
      const source = isOverride
        ? " (🔧 flag override)"
        : embeddedYear
          ? " (📖 from file)"
          : " (📝 manual input)";
      this.log(
        `  Year Range: ${query.yearRange[0]} - ${query.yearRange[1]}${source}`,
      );
      if (isOverride) {
        overrides.push(
          `Year Range: "${embeddedYear}" → "${query.yearRange[0]}-${query.yearRange[1]}"`,
        );
      }
    }

    // Fuzzy matching
    this.log(`  Fuzzy Matching: ${flags.fuzzy ? "enabled" : "disabled"}`);

    // Show override summary if any overrides were applied
    if (overrides.length > 0) {
      this.log("\n🔧 Flag Overrides Applied:");
      for (const override of overrides) {
        this.log(`  • ${override}`);
      }
    }

    this.log("");
  }

  /**
   * Display results in table format
   */
  private displayTableOutput(
    results: MetadataRecord[],
    showConfidence: boolean,
  ): void {
    if (results.length === 0) {
      this.log("No results to display in table format.");
      return;
    }

    this.log("=== Results Table ===");

    // Create table headers
    const headers = ["#", "Title", "Authors", "Year", "Source"];
    if (showConfidence) {
      headers.push("Confidence");
    }

    // Calculate column widths
    const colWidths = [3, 30, 25, 6, 15];
    if (showConfidence) {
      colWidths.push(10);
    }

    // Display header
    const headerRow = headers
      .map((header, i) => header.padEnd(colWidths[i]))
      .join(" | ");
    this.log(headerRow);
    this.log("-".repeat(headerRow.length));

    // Display rows
    for (const [index, result] of results.slice(0, 20).entries()) {
      const sourceIcon = result.source === "embedded" ? "📖" : "🌐";
      const sourceDisplay = `${sourceIcon} ${result.source}`;

      const row = [
        (index + 1).toString().padEnd(colWidths[0]),
        (result.title || "Unknown")
          .slice(0, Math.max(0, colWidths[1] - 3))
          .padEnd(colWidths[1]),
        (result.authors?.join(", ") || "Unknown")
          .slice(0, Math.max(0, colWidths[2] - 3))
          .padEnd(colWidths[2]),
        (result.publicationDate?.getFullYear()?.toString() || "N/A").padEnd(
          colWidths[3],
        ),
        sourceDisplay
          .slice(0, Math.max(0, colWidths[4] - 3))
          .padEnd(colWidths[4]),
      ];

      if (showConfidence) {
        row.push(
          `${(result.confidence * 100).toFixed(1)}%`.padEnd(colWidths[5]),
        );
      }

      this.log(row.join(" | "));
    }

    if (results.length > 20) {
      this.log(
        `\n... and ${results.length - 20} more results (use --output-format=detailed to see all)`,
      );
    }
  }

  /**
   * Format a value for display in conflict resolution
   */
  private formatValueForDisplay(value: unknown): string {
    if (!value) {
      return "N/A";
    }

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (value instanceof Date) {
      return value.getFullYear().toString();
    }

    if (typeof value === "object") {
      if ("name" in value) {
        return (
          value.name + ("volume" in value ? ` (Volume ${value.volume})` : "")
        );
      }

      if ("url" in value && value.url) {
        return String(value.url);
      }

      return JSON.stringify(value);
    }

    const str = String(value);

    return str.length > 100 ? str.slice(0, 100) + "…" : str;
  }

  /**
   * Generate fallback suggestions based on error type and available flags
   */
  private generateFileErrorFallbacks(
    errorDetails: ReturnType<Preview["analyzeFileError"]>,
    filePath: string,
    flags: {
      creator?: string[] | undefined;
      isbn?: string | undefined;
      publisher?: string | undefined;
      subject?: string[] | undefined;
    },
  ): string[] {
    const suggestions: string[] = [...errorDetails.suggestedActions];

    // Add error-specific suggestions

    // Add general fallback options
    if (errorDetails.recoverable) {
      suggestions.push("Try processing the file again after fixing the issue");
    }

    // If we have manual flags, suggest continuing with those
    const hasManualFlags =
      flags.isbn ||
      flags.creator?.length ||
      flags.subject?.length ||
      flags.publisher;
    if (hasManualFlags) {
      suggestions.push("Continue with manual search criteria (flags provided)");
    } else {
      suggestions.push(
        "Provide manual search criteria using --isbn, --creator, --subject, or --publisher flags",
      );
    }

    // File-specific suggestions
    if (errorDetails.type === "format") {
      suggestions.push(
        "Use the filename as a title search if it contains book information",
      );
    }

    if (errorDetails.type === "access") {
      suggestions.push("Try copying the file to a different location");
    }

    // Add format-specific conversion suggestions
    const extension = filePath.split(".").pop()?.toLowerCase();
    if (extension && !["epub", "mobi", "pdf"].includes(extension)) {
      suggestions.push(
        `Convert .${extension} file to EPUB, MOBI, or PDF format`,
      );
    }

    return suggestions;
  }

  /**
   * Generate specific next steps for file processing errors
   */
  private generateFileErrorNextSteps(
    errorDetails: ReturnType<Preview["analyzeFileError"]>,
    filePath: string,
  ): string[] {
    const steps: string[] = [];

    switch (errorDetails.type) {
      case "access": {
        steps.push(
          "1. Verify the file path exists and is accessible",
          "2. Check file permissions and ownership",
          "3. Try providing manual search criteria instead",
        );
        break;
      }

      case "corruption": {
        steps.push(
          "1. Re-download the file from the original source",
          "2. Try opening the file in a compatible reader to verify",
          "3. Use manual search criteria to find metadata",
        );
        break;
      }

      case "format": {
        steps.push(
          "1. Check the file extension matches the actual format",
          "2. Convert to a supported format (EPUB, MOBI, PDF)",
          "3. Use manual search with book information from filename",
        );
        break;
      }

      case "network": {
        steps.push(
          "1. Check your internet connection",
          "2. Download the file locally first",
          "3. Try again after network issues are resolved",
        );
        break;
      }

      case "parsing": {
        steps.push(
          "1. Verify the file was created by a compatible application",
          "2. Try converting the file using different software",
          "3. Extract book information manually and use search flags",
        );
        break;
      }

      case "size": {
        steps.push(
          "1. Close other applications to free memory",
          "2. Try processing on a machine with more RAM",
          "3. Use manual search instead of file processing",
        );
        break;
      }

      default: {
        steps.push(
          "1. Try the operation again",
          "2. Verify the file is valid and accessible",
          "3. Use manual search criteria as an alternative",
        );
        break;
      }
    }

    // Add example command for manual search
    const filename =
      filePath
        .split("/")
        .pop()
        ?.replace(/\.[^.]+$/, "") || "book title";
    steps.push(
      `4. Example: ${process.argv[0]} ${process.argv[1]} discovery preview "${filename}" --creator "Author Name"`,
    );

    return steps;
  }

  /**
   * Group external records by provider
   */
  private groupRecordsByProvider(
    externalRecords: MetadataRecord[],
  ): Record<string, MetadataRecord[]> {
    const grouped: Record<string, MetadataRecord[]> = {};

    for (const record of externalRecords) {
      if (!grouped[record.source]) {
        grouped[record.source] = [];
      }
      grouped[record.source].push(record);
    }

    return grouped;
  }

  /**
   * Reconcile authors with format preference
   */
  private reconcileAuthors(
    embeddedRecord: MetadataRecord | undefined,
    bestExternalRecord: MetadataRecord | null,
  ): string[] | undefined {
    const embeddedAuthors = embeddedRecord?.authors;
    const externalAuthors = bestExternalRecord?.authors;

    // If no authors from either source, return undefined
    if (!embeddedAuthors && !externalAuthors) {
      return undefined;
    }

    // If only one source has authors, use that
    if (!embeddedAuthors) {
      return externalAuthors;
    }
    if (!externalAuthors) {
      return embeddedAuthors;
    }

    // Both sources have authors - apply format preference
    const reconciledAuthors: string[] = [];

    for (
      let i = 0;
      i < Math.max(embeddedAuthors.length, externalAuthors.length);
      i++
    ) {
      const embeddedAuthor = embeddedAuthors[i];
      const externalAuthor = externalAuthors[i];

      if (!embeddedAuthor) {
        reconciledAuthors.push(externalAuthor);
      } else if (externalAuthor) {
        // Both sources have this author - choose better format
        const chosenAuthor = this.chooseBetterAuthorFormat(
          embeddedAuthor,
          externalAuthor,
          embeddedRecord!.confidence,
          bestExternalRecord!.confidence,
        );
        reconciledAuthors.push(chosenAuthor);
      } else {
        reconciledAuthors.push(embeddedAuthor);
      }
    }

    return reconciledAuthors;
  }

  /**
   * Validate input parameters and provide helpful error messages
   */
  private validateInput(
    title?: string,
    isbn?: string,
    creator?: string[],
    subject?: string[],
    publisher?: string,
    language?: string,
    yearFrom?: number,
    yearTo?: number,
  ): string[] {
    const errors: string[] = [];

    // ISBN validation
    if (isbn) {
      const cleanIsbn = isbn.replaceAll(/[-\s]/g, "");
      if (!/^\d{10}(\d{3})?$/.test(cleanIsbn)) {
        errors.push(
          "ISBN must be 10 or 13 digits (hyphens and spaces are allowed)",
        );
      }
    }

    // Title validation
    if (title && title.trim().length < 2) {
      errors.push("Title must be at least 2 characters long");
    }

    // Creator validation
    if (creator?.some((c) => c.trim().length < 2)) {
      errors.push("Creator names must be at least 2 characters long");
    }

    // Subject validation
    if (subject?.some((s) => s.trim().length < 2)) {
      errors.push("Subject terms must be at least 2 characters long");
    }

    // Publisher validation
    if (publisher && publisher.trim().length < 2) {
      errors.push("Publisher name must be at least 2 characters long");
    }

    // Language validation
    if (language) {
      if (!language.trim()) {
        errors.push("Language cannot be empty");
      } else if (!/^[a-z]{2,3}$/i.test(language.trim())) {
        errors.push(
          `Invalid language format: ${language}. Expected 2-3 letter language code (e.g., 'en', 'eng', 'fr', 'spa')`,
        );
      }
    }

    // Year range validation
    const currentYear = new Date().getFullYear();
    if (
      yearFrom !== undefined &&
      (yearFrom < 1000 || yearFrom > currentYear + 10)
    ) {
      errors.push(
        `Invalid year-from: ${yearFrom}. Expected year between 1000 and ${currentYear + 10}`,
      );
    }

    if (yearTo !== undefined && (yearTo < 1000 || yearTo > currentYear + 10)) {
      errors.push(
        `Invalid year-to: ${yearTo}. Expected year between 1000 and ${currentYear + 10}`,
      );
    }

    if (yearFrom !== undefined && yearTo !== undefined && yearFrom > yearTo) {
      errors.push(
        `Invalid year range: year-from (${yearFrom}) cannot be greater than year-to (${yearTo})`,
      );
    }

    return errors;
  }

  /**
   * Check if two values match (accounting for different data types)
   */
  private valuesMatch(value1: unknown, value2: unknown): boolean {
    if (value1 === value2) {
      return true;
    }

    // Handle arrays
    if (Array.isArray(value1) && Array.isArray(value2)) {
      if (value1.length !== value2.length) {
        return false;
      }

      return value1.every((item, index) =>
        this.valuesMatch(item, value2[index]),
      );
    }

    // Handle dates
    if (value1 instanceof Date && value2 instanceof Date) {
      return value1.getTime() === value2.getTime();
    }

    // Handle objects
    if (
      typeof value1 === "object" &&
      typeof value2 === "object" &&
      value1 !== null &&
      value2 !== null
    ) {
      const keys1 = Object.keys(value1);
      const keys2 = Object.keys(value2);

      if (keys1.length !== keys2.length) {
        return false;
      }

      return keys1.every((key) =>
        this.valuesMatch(
          value1[key as keyof typeof value1],
          value2[key as keyof typeof value2],
        ),
      );
    }

    // Handle string comparison (case-insensitive)
    if (typeof value1 === "string" && typeof value2 === "string") {
      return value1.toLowerCase().trim() === value2.toLowerCase().trim();
    }

    return false;
  }
}
