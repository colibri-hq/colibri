import { listObjects } from "@colibri-hq/sdk/storage";
import { humanReadableFileSize } from "@colibri-hq/shared";
import { Args } from "@oclif/core";
import { BaseCommand } from "../../command.ts";
import { table } from "../../utils/tables.ts";

export class ListObjects extends BaseCommand<typeof ListObjects> {
  static aliases = ["storage list", "storage ls"];
  static args = {
    bucket: Args.string({
      description: "Name of the bucket to list",
      name: "bucket",
      required: false,
    }),
  };
  static description = "List all objects in a storage bucket.";
  static examples = [
    {
      command: "<%= config.bin %> <%= command.id %>",
      description: "List all objects in the default bucket",
    },
    {
      command: "<%= config.bin %> <%= command.id %> assets",
      description: "List all objects in the 'assets' bucket",
    },
  ];

  async run(): Promise<object> {
    const storage = await this.storage;
    const { bucket = storage.defaultBucket } = this.args;
    const objects = await listObjects(storage, "", "/", bucket);

    if (objects.length === 0) {
      this.logToStderr(`No objects found in bucket "${bucket}".`);

      return [];
    }

    this.log(
      table(objects, [
        { justify: "start", name: "Key" },
        {
          accessor: "Size",
          format(value) {
            return humanReadableFileSize(Number(value));
          },
          justify: "end",
          name: "Size",
        },
        {
          accessor: "LastModified",
          format: (date) => date?.toLocaleString(this.flags.displayLocale) ?? "—",
          name: "Last Modified",
        },
        { accessor: "Owner", name: "Owner" },
        { accessor: "StorageClass", name: "Storage Class" },
        { format: (etag) => etag?.toString()?.replaceAll('"', "") ?? "—", name: "ETag" },
      ]),
    );

    return objects;
  }
}
