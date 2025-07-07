import { loadCreators } from "@colibri-hq/sdk";
import { BaseCommand } from "../../command.ts";
import { table } from "../../utils/tables.ts";

export default class List extends BaseCommand<typeof List> {
  static override aliases = ["creators", "creators ls"];
  static override description = "List all creators in the database";
  static override examples = ["<%= config.bin %> <%= command.id %>"];

  public async run() {
    const { database } = this.instance;
    const creators = await loadCreators(database);

    this.log(
      table(creators, [
        { accessor: "id", justify: "end", name: "ID" },
        { accessor: "name", name: "Name", wrap: false },
        { accessor: "sorting_key", name: "Sorting Key" },
        { accessor: "description", name: "Description" },
        { accessor: "goodreads_id", name: "Goodreads Page" },
        { accessor: "amazon_id", name: "Amazon Page" },
        { accessor: "wikipedia_url", name: "Wikipedia" },
        { accessor: "url", name: "URL" },
        { accessor: "created_at", name: "Created At" },
        { accessor: "updated_at", name: "Updated At" },
        { accessor: "updated_by", name: "Updated By" },
      ]),
    );

    return creators;
  }
}
