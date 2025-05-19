import { type Client, listBuckets, listObjects } from "@colibri-hq/sdk/storage";
import { humanReadableFileSize } from "@colibri-hq/shared";
import { Args } from "@oclif/core";
import { StorageBaseCommand } from "../../domain/storage/command.ts";
import { table } from "../../utils/tables.ts";

export class List extends StorageBaseCommand<typeof List> {
  static aliases = ["storage ls"];
  static args = {
    bucket: Args.string({
      description: "Name of the bucket to list",
      name: "bucket",
      required: false,
    }),
  };
  static description = "List buckets, or objects in a storage bucket.";
  static examples = [
    {
      command: "<%= config.bin %> <%= command.id %>",
      description: "List all available storage buckets",
    },
    {
      command: "<%= config.bin %> <%= command.id %> assets",
      description: "List all files in the 'assets' bucket",
    },
  ];

  async run(): Promise<object> {
    const { bucket } = this.args;

    return bucket === undefined
      ? this.#listBuckets(this.storage)
      : this.#listObjects(this.storage, bucket);
  }

  async #listBuckets(storage: Client) {
    console.log({listBuckets});
    const buckets = await listBuckets(storage);

    if (buckets.length === 0) {
      this.log("No buckets found.");

      return [];
    }

    this.log(
      table(buckets as Record<string, unknown>[], [
        { name: "Name" },
        { accessor: "BucketRegion", name: "Region" },
        { accessor: "CreationDate", name: "Creation Date" },
      ]),
    );

    return buckets;
  }

  async #listObjects(storage: Client, bucket: string) {
    const objects = await listObjects(storage, bucket, "", "/");

    if (objects.length === 0) {
      this.logToStderr(`No objects found in bucket "${bucket}".`);

      return [];
    }

    this.log(
      table(objects, [
        { align: "start", name: "Key" },
        {
          accessor: "Size",
          align: "end",
          format(value) {
            return humanReadableFileSize(Number(value));
          },
          name: "Size",
        },
        { accessor: "LastModified", name: "Last Modified" },
        { accessor: "StorageClass", name: "Storage Class" },
        { name: "ETag" },
      ]),
    );

    return objects;
  }
}
