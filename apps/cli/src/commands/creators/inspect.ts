import {
  type Creator,
  findCreatorByName,
  loadCreator,
  NoResultError,
} from "@colibri-hq/sdk";
import { Args } from "@oclif/core";
import { dim } from "ansis";
import { BaseCommand } from "../../command.ts";
import { invisibleTheme, table } from "../../utils/tables.ts";

export default class Inspect extends BaseCommand<typeof Inspect> {
  static override aliases = ["creators get", "creators show"];
  static override args = {
    identifier: Args.string({
      description: "The ID or name of the creator to inspect",
      name: "identifier",
      required: true,
    }),
  };
  static override description = "Inspect a creator by ID or name";
  static override examples = ["<%= config.bin %> <%= command.id %>"];

  public async run() {
    const { database } = this.instance;
    const { identifier } = this.args;
    let creator: Creator | undefined;

    try {
      creator = Number.isNaN(Number(identifier))
        ? await findCreatorByName(database, identifier)
        : await loadCreator(database, identifier);
    } catch (error) {
      if (!(error instanceof NoResultError)) {
        throw error;
      }
    }

    if (!creator) {
      this.error(`Creator with ID or name "${identifier}" not found.`);
    }

    this.log(
      table(
        [
          { key: "ID", value: creator.id },
          { key: "Name", value: creator.name },
          { key: "Description", value: creator.description },
          { key: "Amazon ID", value: creator.amazon_id },
          { key: "Goodreads ID", value: creator.goodreads_id },
          { key: "Wikipedia URL", value: creator.wikipedia_url },
          { key: "Image", value: creator.image },
          { key: "URL", value: creator.url },
          { key: "Sorting Key", value: creator.sorting_key },
          { key: "Created At", value: creator.created_at.toLocaleString(this.flags.displayLocale) },
          { key: "Updated At", value: creator.updated_at?.toLocaleString(this.flags.displayLocale) },
          { key: "Updated By", value: creator.updated_by },
        ],
        [
          {
            format: (value) => dim(value),
            justify: "end",
            name: "key",
            wrap: false,
          },
          { justify: "start", name: "value" },
        ],
        {
          displayHeader: false,
          theme: invisibleTheme,
        },
      ),
    );

    return creator;
  }
}
