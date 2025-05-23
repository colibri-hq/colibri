import { createBook } from "@colibri-hq/sdk";
import { BaseCommand } from "../../command.ts";

export default class Add extends BaseCommand<typeof Add> {
  static override description = "describe the command here";
  static override examples = ["<%= config.bin %> <%= command.id %>"];

  public async run() {
    await createBook(this.instance.database, "test");
  }
}
