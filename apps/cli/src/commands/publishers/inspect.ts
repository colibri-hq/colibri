import { loadPublisher, NoResultError, type Publisher } from "@colibri-hq/sdk";
import { Args } from "@oclif/core";
import { dim } from "ansis";
import { BaseCommand } from "../../command.js";
import { invisibleTheme, table } from "../../utils/tables.js";

export class Inspect extends BaseCommand<typeof Inspect> {
  static override aliases = ["publishers get", "publishers show"];
  static override args = {
    identifier: Args.string({
      description: "The ID of the publisher to inspect",
      name: "identifier",
      required: true,
    }),
  };
  static override description = "Inspect a publisher";
  static override flags = {};

  async run() {
    const { identifier: id } = this.args;
    const { database } = this.instance;
    let publisher: Publisher | undefined;

    try {
      publisher = await loadPublisher(database, id);
    } catch (error) {
      if (!(error instanceof NoResultError)) {
        throw error;
      }
    }

    if (!publisher) {
      this.error(`Publisher with ID "${id}" not found.`);
    }

    this.log(
      table(
        [
          { key: "ID", value: publisher.id },
          { key: "Name", value: publisher.name },
          { key: "Description", value: publisher.description },
          { key: "Wikipedia Page", value: publisher.wikipedia_url },
          { key: "Image", value: publisher.image },
          { key: "Website", value: publisher.url },
          { key: "Sorting Key", value: publisher.sorting_key },
          { key: "Created", value: publisher.created_at.toLocaleString(this.flags.displayLocale) },
          {
            key: "Last Updated",
            value: publisher.updated_at?.toLocaleString(this.flags.displayLocale),
          },
          { key: "Last Updated By", value: publisher.updated_by },
        ],
        [
          { format: (value) => dim(value), justify: "end", name: "key", wrap: false },
          { justify: "start", name: "value" },
        ],
        { displayHeader: false, theme: invisibleTheme },
      ),
    );

    return publisher;
  }
}
