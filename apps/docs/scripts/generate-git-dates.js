#!/usr/bin/env node

/**
 * Generates a JSON file with git commit dates for all markdown files.
 * This is run as a prebuild step to enable "Last updated" display on pages.
 *
 * Optimized for incremental updates:
 * - Only processes files that changed since the last git-dates.json update
 * - Falls back to full generation if the output file doesn't exist
 *
 * Output format: { "/slug": "2024-01-15T10:30:00Z", ... }
 */

import { glob } from "glob";
import { execSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname } from "node:path";

const CONTENT_DIR = "content";
const OUTPUT_FILE = "src/lib/data/git-dates.json";

/**
 * Convert file path to URL slug
 */
function fileToSlug(file) {
  let slug = file
    .replace(`${CONTENT_DIR}/`, "/")
    .replace(".md", "")
    .replace(/\/(index|overview)$/, "");

  // Handle root index
  if (slug === "/index" || slug === "/") {
    slug = "/";
  }

  return slug;
}

/**
 * Get git commit date for a single file
 */
function getGitDate(file) {
  try {
    return execSync(`git log -1 --format=%cI -- "${file}"`, { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

/**
 * Get list of files changed since a given timestamp
 */
function getChangedFilesSince(timestamp) {
  try {
    // Get files changed since timestamp using git diff
    const isoDate = new Date(timestamp).toISOString();
    const output = execSync(
      `git log --since="${isoDate}" --name-only --pretty=format: -- "${CONTENT_DIR}/**/*.md" | sort -u`,
      { encoding: "utf-8" },
    );
    return output.split("\n").filter((f) => f.trim() && f.endsWith(".md"));
  } catch {
    return [];
  }
}

/**
 * Load existing dates from output file
 */
function loadExistingDates() {
  if (!existsSync(OUTPUT_FILE)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Get the modification time of the output file
 */
function getOutputFileMtime() {
  if (!existsSync(OUTPUT_FILE)) {
    return null;
  }

  try {
    return statSync(OUTPUT_FILE).mtime.getTime();
  } catch {
    return null;
  }
}

async function main() {
  const existingDates = loadExistingDates();
  const outputMtime = getOutputFileMtime();

  // Determine if we can do incremental update
  const canIncremental = existingDates !== null && outputMtime !== null;

  if (canIncremental) {
    console.log("Performing incremental git dates update...");

    const changedFiles = getChangedFilesSince(outputMtime);

    if (changedFiles.length === 0) {
      console.log("No content files changed since last update, skipping.");
      return;
    }

    console.log(`Updating dates for ${changedFiles.length} changed file(s)...`);

    // Update dates for changed files
    for (const file of changedFiles) {
      const slug = fileToSlug(file);
      const date = getGitDate(file);

      if (date) {
        existingDates[slug] = date;
      }
    }

    // Also check for deleted files by scanning current files
    const currentFiles = await glob(`${CONTENT_DIR}/**/*.md`);
    const currentSlugs = new Set(currentFiles.map(fileToSlug));

    // Remove entries for deleted files
    for (const slug of Object.keys(existingDates)) {
      if (!currentSlugs.has(slug)) {
        delete existingDates[slug];
      }
    }

    // Write updated dates
    mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify(existingDates, null, 2));

    console.log(
      `Updated git dates (${Object.keys(existingDates).length} total entries) -> ${OUTPUT_FILE}`,
    );
  } else {
    // Full generation
    console.log("Generating git dates for all content files...");

    const files = await glob(`${CONTENT_DIR}/**/*.md`);
    const dates = {};

    for (const file of files) {
      const slug = fileToSlug(file);
      const date = getGitDate(file);

      if (date) {
        dates[slug] = date;
      }
    }

    // Ensure the output directory exists
    mkdirSync(dirname(OUTPUT_FILE), { recursive: true });

    // Write the dates to a JSON file
    writeFileSync(OUTPUT_FILE, JSON.stringify(dates, null, 2));

    console.log(`Generated git dates for ${Object.keys(dates).length} files -> ${OUTPUT_FILE}`);
  }
}

main().catch((error) => {
  console.error("Error generating git dates:", error);
  process.exit(1);
});
