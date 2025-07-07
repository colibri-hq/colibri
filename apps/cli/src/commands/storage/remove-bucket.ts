import { removeBucket } from "@colibri-hq/sdk/storage";
import { Args } from "@oclif/core";
import { BaseCommand } from "../../command.ts";
import { withConfirmation } from "../../utils/interactive.ts";

export class RemoveBucket extends BaseCommand<typeof RemoveBucket> {
  static aliases = ["storage rb"];
  static args = {
    bucket: Args.string({
      description: "Name of the bucket to create",
      name: "bucket",
      required: true,
    }),
  };
  static description = "Remove a storage bucket.";
  static examples = [
    {
      command: "<%= config.bin %> <%= command.id %> assets",
      description: "Remove the bucket named 'assets'",
    },
  ];

  async run() {
    const { bucket } = this.args;

    const operation = await withConfirmation(
      async () => removeBucket(await this.storage, bucket),
      `You are about to permanently delete the storage bucket "${bucket}".\n` +
        "  Type its full name to confirm:",
      { default: bucket, shortCircuit: this.flags.force },
    );

    await operation();

    if (this.flags.verbose) {
      this.logToStderr(`Bucket "${bucket}" removed successfully.`);
    }
  }
}
