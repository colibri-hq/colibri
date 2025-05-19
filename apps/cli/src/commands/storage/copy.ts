import { copyObject } from "@colibri-hq/sdk/storage";
import { Args } from "@oclif/core";
import { access, constants } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { StorageBaseCommand } from "../../domain/storage/command.ts";

export class CopyCommand extends StorageBaseCommand<typeof CopyCommand> {
  static aliases = ["storage cp"];
  static args = {
    source: Args.string({
      description: "Source path to copy",
      name: "source",
      required: true,
    }),
    // eslint-disable-next-line perfectionist/sort-objects
    destination: Args.string({
      description: "Destination path to copy to",
      name: "destination",
      required: true,
    }),
  };
  static description = "Copy an object in storage.";
  static examples = [
    {
      command: "<%= config.bin %> <%= command.id %> assets/foo assets/bar",
      description: "Copy 'foo' to 'bar'",
    },
  ];
  static strict = false;

  async run() {
    let destination = this.rawArgs.pop()!;
    const sources = this.rawArgs;

    if (
      !destination.includes("://") &&
      (destination.startsWith(".") ||
        destination.startsWith("/") ||
        destination.startsWith("~") ||
        (await this.#fileExists(dirname(destination))))
    ) {
      destination = `file://${resolve(destination)}`;
    }

    await Promise.all(
      sources.map(async (source) => {
        if (!source.includes("://") && (await this.#fileExists(source))) {
          source = `file://${resolve(source)}`;
        }

        if (destination.endsWith("/")) {
          const sourceName = source.split("/").pop();

          if (sourceName) {
            destination += sourceName;
          }
        }

        if (await this.#fileExists(destination)) {
          throw new Error(
            `Cowardly refusing to overwrite "${destination}": ` +
              "A file already exists at that location.",
          );
        }

        await copyObject(this.storage, source, destination);

        if (this.flags.verbose) {
          this.logToStderr(
            `Copied object from "${source}" to "${destination}" successfully.`,
          );
        }
      }),
    );
  }

  async #fileExists(path: string) {
    try {
      await access(path, constants.R_OK);
    } catch {
      return false;
    }

    return true;
  }
}
