#!/usr/bin/env tsx
/**
 * Series and Tags Extraction Demo
 *
 * This script demonstrates:
 * 1. Extracting series metadata from EPUB files
 * 2. Extracting and normalizing subject tags
 * 3. Finding or creating series with fuzzy matching
 * 4. Finding or creating tags with normalization
 *
 * Run with: tsx packages/sdk/src/examples/series-tags-demo.ts
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { loadEpubMetadata } from "../ebooks/epub.js";

async function demonstrateMetadataExtraction() {
  console.log("=== EPUB Metadata Extraction Demo ===\n");

  // Check if test EPUB exists
  const epubPath = "/Users/moritz/Projects/colibri/Mogi, Ken - Ikigai.epub";

  if (!existsSync(epubPath)) {
    console.log("❌ Test EPUB file not found at:", epubPath);
    console.log("\nTo run this demo, you need an EPUB file.");
    console.log("The demo expects series and subject metadata in the EPUB.\n");
    return;
  }

  try {
    // Load EPUB file
    console.log("📚 Loading EPUB file...");
    const buffer = await readFile(epubPath);
    const file = new File([buffer], "Ikigai.epub", { type: "application/epub+zip" });

    // Extract metadata
    console.log("🔍 Extracting metadata...\n");
    const metadata = await loadEpubMetadata(file);

    // Display basic info
    console.log("Basic Information:");
    console.log("  Title:", metadata.title);
    console.log("  Language:", metadata.language);
    console.log("  Contributors:", metadata.contributors.map((c) => c.name).join(", "));
    console.log("  Published:", metadata.datePublished?.toDateString());
    console.log();

    // Display series information
    console.log("Series Information:");
    if (metadata.series) {
      console.log("  ✅ Series detected:");
      console.log("    Name:", metadata.series.name);
      console.log("    Position:", metadata.series.position ?? "Not specified");
    } else {
      console.log("  ℹ️  No series metadata found");
      console.log("    (This book is not part of a series or metadata is missing)");
    }
    console.log();

    // Display tags/subjects
    console.log("Subject Tags:");
    if (metadata.tags && metadata.tags.length > 0) {
      console.log(`  ✅ ${metadata.tags.length} tags extracted:`);
      metadata.tags.forEach((tag, i) => {
        console.log(`    ${i + 1}. ${tag}`);
      });
    } else {
      console.log("  ℹ️  No subject tags found");
      console.log("    (This EPUB doesn't have <dc:subject> elements or they're empty)");
    }
    console.log();

    // Demonstrate subject splitting
    console.log("Subject Splitting Examples:");
    const compoundSubjects = [
      "Fiction / Fantasy / Epic",
      "Young Adult Fiction / Action & Adventure",
      "Self-Help / Personal Growth / Success",
    ];

    compoundSubjects.forEach((subject) => {
      const parts = subject.split(" / ").map((s) => s.trim());
      console.log(`  "${subject}"`);
      console.log(`    → ${parts.join(", ")}`);
    });
    console.log();

    // Demonstrate tag normalization
    console.log("Tag Normalization Examples:");
    const rawTags = ["  Fiction  ", "FANTASY", "Science Fiction", "Sci-Fi", "science fiction"];

    console.log("  Raw tags:");
    rawTags.forEach((tag) => console.log(`    "${tag}"`));

    console.log("\n  Normalized tags:");
    const normalized = [...new Set(rawTags.map((t) => t.toLowerCase().trim()))];
    normalized.forEach((tag) => console.log(`    "${tag}"`));

    console.log(`\n  Result: ${rawTags.length} raw → ${normalized.length} unique`);
    console.log();
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

async function demonstrateSeriesMatching() {
  console.log("=== Series Fuzzy Matching Demo ===\n");

  // Simulate fuzzy matching algorithm
  const existingSeries = [
    "The Lord of the Rings",
    "Harry Potter",
    "A Song of Ice and Fire",
    "The Hitchhiker's Guide to the Galaxy",
  ];

  const queries = [
    "Lord of the Rings", // Missing "The"
    "Harry potter", // Different case
    "Song of Ice and Fire", // Missing "A"
    "Hitchhikers Guide", // Different spelling
    "Completely New Series", // No match
  ];

  console.log("Existing series in database:");
  existingSeries.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log();

  console.log("Query results (70% similarity threshold):");
  queries.forEach((query) => {
    // Simple similarity check (in real code, uses PostgreSQL pg_trgm)
    const match = existingSeries.find((existing) => {
      const similarity = calculateSimpleSimilarity(query, existing);
      return similarity > 0.7;
    });

    if (match) {
      console.log(`  ✅ "${query}" → "${match}" (matched)`);
    } else {
      console.log(`  ➕ "${query}" → Create new series`);
    }
  });
  console.log();
}

function calculateSimpleSimilarity(str1: string, str2: string): number {
  // Simple Jaccard similarity for demo
  // Real implementation uses PostgreSQL similarity() function
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

async function demonstrateIngestionFlow() {
  console.log("=== Ingestion Flow Demo ===\n");

  console.log("Step 1: Upload EPUB file");
  console.log("  → loadEpubMetadata() extracts series and tags");
  console.log();

  console.log("Step 2: Process series metadata");
  console.log('  → findOrCreateSeries("The Lord of the Rings", { language: "en" })');
  console.log("    1. Try exact match (case-insensitive)");
  console.log("    2. Try fuzzy match (>70% similarity)");
  console.log("    3. Create new series if no match");
  console.log("  → addWorkToSeries(workId, seriesId, position: 1)");
  console.log();

  console.log("Step 3: Process tags");
  console.log("  → For each tag in metadata.tags:");
  console.log('    1. normalizeTag("  Fiction  ") → "fiction"');
  console.log('    2. findOrCreateTag(database, "fiction")');
  console.log("    3. addTagToWork(workId, tagId)");
  console.log();

  console.log("Step 4: Handle duplicates when adding edition");
  console.log("  → Check if work is already in series (skip if yes)");
  console.log("  → Check existing tags for work (skip duplicates)");
  console.log("  → Only add new tags that don't exist");
  console.log();

  console.log("Error Handling:");
  console.log("  ✅ Graceful degradation - ingestion never fails");
  console.log("  ✅ Warnings array contains any issues");
  console.log('  ✅ Example: warnings.push("Failed to link series: ...")');
  console.log();
}

async function demonstrateQueryExamples() {
  console.log("=== Query Examples ===\n");

  console.log("Query all works in a series:");
  console.log("  const works = await loadSeriesWorks(database, seriesId);");
  console.log("  works.forEach(work => {");
  console.log("    console.log(`${work.series_position}. ${work.edition_title}`);");
  console.log("  });");
  console.log();

  console.log("Query all tags for a work:");
  console.log("  const tags = await loadTagsForWork(database, workId);");
  console.log("  console.log(tags.map(t => t.value));");
  console.log('  // ["fiction", "fantasy", "epic"]');
  console.log();

  console.log("Find or create a series:");
  console.log('  const series = await findOrCreateSeries(database, "Harry Potter", {');
  console.log('    language: "en",');
  console.log('    userId: "user123",');
  console.log("  });");
  console.log();

  console.log("Find or create a tag:");
  console.log('  const tag = await findOrCreateTag(database, "Science Fiction", {');
  console.log('    color: "#3b82f6",');
  console.log('    emoji: "🚀",');
  console.log('    userId: "user123",');
  console.log("  });");
  console.log('  console.log(tag.value); // "science fiction"');
  console.log();
}

// Main execution
async function main() {
  console.log("\n📖 Series and Tags Extraction - Feature Demo\n");
  console.log("This demo shows how Colibri extracts and processes");
  console.log("series and tag metadata from EPUB files.\n");
  console.log("=".repeat(60));
  console.log();

  await demonstrateMetadataExtraction();
  console.log("=".repeat(60));
  console.log();

  await demonstrateSeriesMatching();
  console.log("=".repeat(60));
  console.log();

  await demonstrateIngestionFlow();
  console.log("=".repeat(60));
  console.log();

  await demonstrateQueryExamples();
  console.log("=".repeat(60));
  console.log();

  console.log("✅ Demo complete!\n");
  console.log("For more information, see:");
  console.log("  - /packages/sdk/SERIES_AND_TAGS_IMPLEMENTATION.md");
  console.log("  - /packages/sdk/src/ebooks/epub-metadata.test.ts");
  console.log("  - /packages/sdk/src/ingestion/series-tags.test.ts");
  console.log();
}

main().catch(console.error);
