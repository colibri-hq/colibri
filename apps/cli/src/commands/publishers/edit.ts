import { loadPublisher, NoResultError, type Publisher, updatePublisher } from "@colibri-hq/sdk";
import { Args, Flags } from "@oclif/core";
import { bold, dim } from "ansis";
import { BaseCommand } from "../../command.js";

export class Edit extends BaseCommand<typeof Edit> {
  static override args = {
    identifier: Args.string({
      description: "The ID of the publisher to edit",
      name: "identifier",
      required: true,
    }),
  };
  static override description = "Edit a publisher";
  static override examples = [
    "$ colibri publishers edit <identifier>",
    "$ colibri publishers edit <identifier> --name 'New Publisher Name'",
  ];
  static override flags = {
    description: Flags.string({
      char: "d",
      description: "New description for the publisher",
      name: "description",
      required: false,
    }),
    image: Flags.file({ char: "I", description: "Image file for the publisher", required: false }),
    name: Flags.string({
      char: "n",
      description: "New name for the publisher",
      name: "name",
      required: false,
    }),
    "sorting-key": Flags.string({
      char: "s",
      description: "Key used for sorting. Defaults to the publisher's name",
      required: false,
    }),
    url: Flags.url({ char: "u", description: "URL to publisher's website", required: false }),
    "wikipedia-url": Flags.url({
      char: "w",
      description: "URL to publisher's Wikipedia page",
      async parse(input: string) {
        if (!/^(https?:\/\/)?((www|[a-z]+)\.)?wikipedia\.org\/wiki\//.test(input)) {
          throw new Error("Invalid Wikipedia URL");
        }

        return new URL(input);
      },
      required: false,
    }),
  };

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

      this.error(`Publisher with ID ${id} not found.`);
    }

    publisher = await updatePublisher(database, id, {
      // TODO: Handle image upload
      //image: this.flags.image,
      description: this.flags.description,
      name: this.flags.name,
      sortingKey: this.flags["sorting-key"],
      url: this.flags.url?.toString(),
      wikipediaUrl: this.flags["wikipedia-url"]?.toString(),
    });

    this.logToStderr(dim(`Updated publisher ${bold(publisher.name)}`));

    return publisher;
  }
}
