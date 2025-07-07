import { listBuckets } from "@colibri-hq/sdk/storage";
import { BaseCommand } from "../../command.ts";
import { table } from "../../utils/tables.ts";

export class ListBuckets extends BaseCommand<typeof ListBuckets> {
  static aliases = ["storage lb"];
  static description = "List all available buckets.";
  static examples = [
    {
      command: "<%= config.bin %> <%= command.id %>",
      description: "List all available storage buckets",
    },
  ];

  async run(): Promise<object> {
    const buckets = await listBuckets(await this.storage);

    if (buckets.length === 0) {
      this.log("No buckets found.");

      return [];
    }

    this.log(
      table(buckets, [
        { accessor: "Name", justify: "start", name: "Name" },
        { accessor: "BucketRegion", name: "Region" },
        {
          accessor: "CreationDate",
          format: (date: Date | string | undefined) =>
            date?.toLocaleString(this.flags.displayLocale) ?? "—",
          justify: "end",
          name: "Creation Date",
        },
      ]),
    );

    return buckets;
  }
}
