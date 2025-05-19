import { createBucket } from "@colibri-hq/sdk/storage";
import { Args } from "@oclif/core";
import { StorageBaseCommand } from "../../domain/storage/command.ts";

export class MakeBucket extends StorageBaseCommand<typeof MakeBucket> {
  static aliases = ["storage mb"];
  static args = {
    bucket: Args.string({
      description: "Name of the bucket to create",
      name: "bucket",
      required: true,
    }),
  };
  static description = "Create a new storage bucket.";
  static examples = [
    {
      command: "<%= config.bin %> <%= command.id %> assets",
      description: "Create a new bucket named 'assets'",
    },
  ];

  async run() {
    const { bucket } = this.args;

    await createBucket(this.storage, bucket);

    if (this.flags.verbose) {
      this.logToStderr(`Bucket "${bucket}" created successfully.`);
    }
  }
}
