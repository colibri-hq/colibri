import { listPublishers } from "@colibri-hq/sdk";
import { BaseCommand } from "../../command.js";
import { table } from "../../utils/tables.js";

export class List extends BaseCommand<typeof List> {
  static override aliases = ["publishers", "publishers ls"];
  static override description = "List all publishers";
  static override examples = [
    {
      command: "<%= config.bin %> <%= command.id %>",
      description: "List all publishers",
    },
  ];

  async run() {
    const { database } = this.instance;
    const publishers = await listPublishers(database);

    this.log(
      table(publishers, [
        { accessor: "id", justify: "end", name: "ID", wrap: false },
        { accessor: "name", name: "Name" },
        { accessor: "description", name: "Description" },
        { accessor: "url", name: "Website" },
        { accessor: "wikipedia_url", name: "Wikipedia Page" },
        { accessor: "created_at", name: "Created" },
        { accessor: "updated_at", name: "Last Updated" },
        { accessor: "updated_by", name: "Last Updated By" },
      ]),
    );

    return publishers;
  }
}
