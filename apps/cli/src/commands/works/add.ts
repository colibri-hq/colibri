import {
  type ConfirmAction,
  confirmIngestion,
  ingestWork,
  type IngestWorkResult,
} from "@colibri-hq/sdk/ingestion";
import { select } from "@inquirer/prompts";
import { Args, Flags } from "@oclif/core";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { BaseCommand } from "../../command.ts";

export default class Add extends BaseCommand<typeof Add> {
  static override args = {
    file: Args.file({
      description: "The file to add",
      exists: true,
      name: "file",
      required: true,
    }),
  };

  static override description = "Add a work to Colibri";

  static override examples = [
    {
      command: "<%= config.bin %> <%= command.id %> some-file.epub",
      description: "Create a work from 'some-file.epub'",
    },
    {
      command: "<%= config.bin %> <%= command.id %> --enrich some-file.epub",
      description: "Create a work and enrich metadata from external sources",
    },
    {
      command:
        "<%= config.bin %> <%= command.id %> --skip-duplicates some-file.epub",
      description: "Skip the file if it already exists",
    },
  ];
  static override flags = {
    enrich: Flags.boolean({
      char: "e",
      default: false,
      description: "Enrich metadata from external sources",
    }),
    force: Flags.boolean({
      char: "f",
      default: false,
      description: "Force import even if similar works exist",
    }),
    "skip-duplicates": Flags.boolean({
      default: false,
      description: "Skip duplicate files without prompting",
    }),
  };

  public async run() {
    const { database } = this.instance;
    const { file: path } = this.args;
    const { enrich, force, "skip-duplicates": skipDuplicates } = this.flags;

    // Read the file
    const buffer = await readFile(path);
    const file = new File([buffer], basename(path));

    this.log(`Importing ${basename(path)}...`);

    // Perform the ingestion
    const result = await ingestWork(database, file, {
      enrich,
      onDuplicateEdition: skipDuplicates ? "skip" : "prompt",
      onDuplicateWork: force ? "add-edition" : "prompt",
    });

    // Handle confirmation if needed
    if (result.status === "needs-confirmation" && result.pendingId) {
      const action = await this.promptDuplicateAction(result);
      const confirmed = await confirmIngestion(
        database,
        result.pendingId,
        action,
      );
      this.logResult(confirmed);
    } else {
      this.logResult(result);
    }
  }

  private logResult(result: IngestWorkResult) {
    // Log any warnings
    for (const warning of result.warnings) {
      this.warn(warning);
    }

    switch (result.status) {
      case "added-edition": {
        this.log(
          `✓ Added edition "${result.edition?.title ?? "Untitled"}" to existing work (ID: ${result.work?.id})`,
        );
        this.log(`  Edition ID: ${result.edition?.id}`);
        this.log(`  Asset ID: ${result.asset?.id}`);
        break;
      }

      case "created": {
        this.log(
          `✓ Created work "${result.edition?.title ?? "Untitled"}" (ID: ${result.work?.id})`,
        );
        this.log(`  Edition ID: ${result.edition?.id}`);
        this.log(`  Asset ID: ${result.asset?.id}`);
        break;
      }

      case "needs-confirmation": {
        // This shouldn't happen after confirmation, but handle it gracefully
        this.warn("Operation requires confirmation");
        break;
      }

      case "skipped": {
        this.log("⊘ Skipped (duplicate detected)");
        if (result.duplicateInfo?.existingEdition) {
          this.log(
            `  Existing: "${result.duplicateInfo.existingEdition.title}" (Edition ID: ${result.duplicateInfo.existingEdition.id})`,
          );
        }
        break;
      }

      case "updated": {
        this.log(
          `✓ Updated existing edition "${result.edition?.title ?? "Untitled"}" (ID: ${result.edition?.id})`,
        );
        break;
      }
    }
  }

  private async promptDuplicateAction(
    result: IngestWorkResult,
  ): Promise<ConfirmAction> {
    const duplicateInfo = result.duplicateInfo;
    const existingTitle = duplicateInfo?.existingEdition?.title ?? "Unknown";

    this.warn(duplicateInfo?.description ?? "Possible duplicate detected");

    if (duplicateInfo?.existingEdition) {
      this.log(
        `  Existing: "${existingTitle}" (Edition ID: ${duplicateInfo.existingEdition.id})`,
      );
    }

    if (
      duplicateInfo?.confidence !== undefined &&
      duplicateInfo.confidence < 1
    ) {
      this.log(`  Confidence: ${Math.round(duplicateInfo.confidence * 100)}%`);
    }

    const answer = await select({
      choices: [
        {
          description: "Import as a completely new work",
          name: "Create as new work",
          value: "create-work" as const,
        },
        ...(duplicateInfo?.existingWork
          ? [
              {
                description: `Add as a new edition of "${existingTitle}"`,
                name: "Add as new edition",
                value: "create-edition" as const,
              },
            ]
          : []),
        {
          description: "Skip importing this file",
          name: "Skip",
          value: "skip" as const,
        },
      ],
      message: "What would you like to do?",
    });

    return answer;
  }
}
