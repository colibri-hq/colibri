import { loadBooks } from "@colibri-hq/sdk";
import { BaseCommand } from "../../command.ts";
import { table } from "../../utils/tables.ts";

export default class List extends BaseCommand<typeof List> {
  static override aliases = ["books", "books ls"];
  static override description = "List all books in the database";
  static override examples = ["<%= config.bin %> <%= command.id %>"];

  public async run() {
    const books = await loadBooks(this.instance.database);

    this.log(
      table(books, [
        { accessor: "id", name: "ID" },
        { accessor: "title", name: "Title" },
        { accessor: "created_at", name: "Created At" },
        { accessor: "updated_at", name: "Updated At" },
        { accessor: "updated_by", name: "Updated By" },
      ]),
    );

    return books;
  }
}
