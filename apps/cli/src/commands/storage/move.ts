import { moveObject } from "@colibri-hq/sdk/storage";
import { Args } from "@oclif/core";
import { StorageBaseCommand } from "../../domain/storage/command.ts";

export class MoveCommand extends StorageBaseCommand<typeof MoveCommand> {
  static aliases = ["storage mv"];
  static args = {
    bucket: Args.string({
      description: "Name of the bucket to move the file in",
      name: "bucket",
      required: true,
    }),
    destination: Args.string({
      description: "Destination path to move to",
      name: "destination",
      required: true,
    }),
    source: Args.string({
      description: "Source path to move",
      name: "source",
      required: true,
    }),
  };
  static description = "Move a file or folder in storage.";
  static examples = [
    {
      command:
        "<%= config.bin %> <%= command.id %> assets/old-folder assets/new-folder",
      description: "Move 'old-folder' to 'new-folder'",
    },
  ];

  async run() {
    const { destination, source } = this.args;

    await moveObject(this.storage, source, destination);

    if (this.flags.verbose) {
      this.logToStderr(
        `Moved object from "${source}" to "${destination}" successfully.`,
      );
    }
  }
}
