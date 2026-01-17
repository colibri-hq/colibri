import { batchImport } from "@colibri-hq/sdk/ingestion";
import { Args, Flags } from "@oclif/core";
import { green, red, yellow } from "ansis";
import { glob, readFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import ora from "ora";
import { BaseCommand } from "../../command.js";

export default class Import extends BaseCommand<typeof Import> {
  static override args = {
    pattern: Args.string({
      description: "Glob pattern or directory path for ebook files",
      required: true,
    }),
  };

  static override description = "Batch import multiple ebooks from a directory or glob pattern";

  static override examples = [
    "<%= config.bin %> <%= command.id %> './books/*.epub'",
    "<%= config.bin %> <%= command.id %> './library/**/*.{epub,mobi}' --skip-duplicates",
    "<%= config.bin %> <%= command.id %> './new-books/' --dry-run",
  ];

  static override flags = {
    "add-editions": Flags.boolean({
      default: false,
      description: "Add as new editions when duplicates detected",
    }),
    "continue-on-error": Flags.boolean({
      default: true,
      description: "Continue importing even if some files fail",
    }),
    "dry-run": Flags.boolean({
      default: false,
      description: "Show what would be imported without making changes",
    }),
    enrich: Flags.boolean({
      char: "e",
      default: false,
      description: "Enrich metadata from external sources",
    }),
    "skip-duplicates": Flags.boolean({
      default: false,
      description: "Skip duplicate files without prompting",
    }),
  };

  public async run() {
    const { database } = this.instance;
    const { pattern } = this.args;
    const {
      "add-editions": addEditions,
      "continue-on-error": continueOnError,
      "dry-run": dryRun,
      enrich,
      "skip-duplicates": skipDuplicates,
    } = this.flags;

    // Expand glob pattern
    const files = (
      await Array.fromAsync(
        glob(pattern, { exclude: (entry) => !entry.isFile(), withFileTypes: true }),
      )
    ).map(({ name, parentPath }) => resolve(parentPath, name));

    // Filter to supported formats
    const supportedExtensions = new Set([".epub", ".mobi", ".pdf"]);
    const ebookFiles = files.filter((file) => supportedExtensions.has(extname(file).toLowerCase()));

    if (ebookFiles.length === 0) {
      this.error(`No ebook files found matching pattern: ${pattern}`);
    }

    this.log(`Found ${ebookFiles.length} ebook file${ebookFiles.length === 1 ? "" : "s"}`);

    if (dryRun) {
      this.log("\nDry run - files that would be imported:");
      for (const file of ebookFiles) {
        this.log(`  ${basename(file)}`);
      }
      return { failed: [], skipped: [], successful: [], total: ebookFiles.length };
    }

    // Create File objects
    const fileObjects = await Promise.all(
      ebookFiles.map(async (path) => {
        const buffer = await readFile(path);
        return new File([buffer], basename(path));
      }),
    );

    // Setup spinner for progress
    const spinner = ora({ spinner: "dots", text: "Starting import..." }).start();

    // Import files
    const result = await batchImport(database, fileObjects, {
      continueOnError,
      dryRun,
      enrich,
      onDuplicateEdition: skipDuplicates ? "skip" : "prompt",
      onDuplicateWork: addEditions ? "add-edition" : "prompt",
      onProgress: (current: number, total: number, file: string) => {
        spinner.text = `Importing ${current}/${total}: ${file}`;
      },
    });

    spinner.stop();

    // Format duration
    const durationSeconds = Math.floor(result.duration / 1000);
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    // Display summary
    this.log("\n" + this.formatSummary(result, durationStr));

    // Display failures if any
    if (result.failed.length > 0) {
      this.log("\nFailed imports:");
      for (const { error, file } of result.failed) {
        this.log(`  ${red("✗")} ${file}: ${error.message}`);
      }
    }

    // Display skipped if any
    if (result.skipped.length > 0 && this.flags.verbose) {
      this.log("\nSkipped files:");
      for (const { file, reason } of result.skipped) {
        this.log(`  ${yellow("○")} ${file}: ${reason}`);
      }
    }

    return result;
  }

  private formatSummary(result: Awaited<ReturnType<typeof batchImport>>, duration: string): string {
    const parts = [];

    if (result.successful.length > 0) {
      parts.push(`${green("✓")} ${result.successful.length} imported`);
    }

    if (result.skipped.length > 0) {
      parts.push(`${yellow("○")} ${result.skipped.length} skipped`);
    }

    if (result.failed.length > 0) {
      parts.push(`${red("✗")} ${result.failed.length} failed`);
    }

    const summary = parts.join(", ");
    return `${summary} in ${duration}`;
  }
}
