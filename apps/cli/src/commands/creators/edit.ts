import { type Creator, loadCreator, NoResultError, updateCreator } from "@colibri-hq/sdk";
import { Args, Flags } from "@oclif/core";
import { bold, dim } from "ansis";
import { BaseCommand } from "../../command.js";

export default class Edit extends BaseCommand<typeof Edit> {
  static override args = {
    identifier: Args.string({
      description: "ID of the creator to edit",
      name: "identifier",
      required: true,
    }),
  };
  static override description = "Edit an existing creator";
  static override flags = {
    "amazon-id": Flags.string({ char: "a", description: "Amazon Author ID", required: false }),
    description: Flags.string({
      char: "d",
      description: "Description of the creator",
      required: false,
    }),
    "goodreads-id": Flags.string({
      char: "g",
      description: "Goodreads Author ID",
      required: false,
    }),
    image: Flags.file({ char: "I", description: "Image file for the creator", required: false }),
    name: Flags.string({ char: "n", description: "Name of the creator", required: false }),
    "sorting-key": Flags.string({
      char: "s",
      description: "Key used for sorting. Defaults to the creator's name",
      required: false,
    }),
    url: Flags.url({ char: "u", description: "URL to creator's website", required: false }),
    "wikipedia-url": Flags.url({
      char: "w",
      description: "URL to creator's Wikipedia page",
      async parse(input: string) {
        if (!/^(https?:\/\/)?((www|[a-z]+)\.)?wikipedia\.org\/wiki\//.test(input)) {
          throw new Error("Invalid Wikipedia URL");
        }

        return new URL(input);
      },
      required: false,
    }),
  };

  public async run() {
    const { identifier: id } = this.args;
    const { database } = this.instance;
    let creator: Creator | undefined;

    try {
      creator = await loadCreator(database, id);
    } catch (error) {
      if (!(error instanceof NoResultError)) {
        throw error;
      }

      this.error(`Creator with ID "${id}" not found.`);
    }

    creator = await updateCreator(database, id, {
      amazonId: this.flags["amazon-id"],
      description: this.flags.description,
      goodreadsId: this.flags["goodreads-id"],
      // TODO: Handle image upload
      //image: this.flags.image,
      name: this.flags.name,
      sortingKey: this.flags["sorting-key"],
      url: this.flags.url?.toString(),
      wikipediaUrl: this.flags["wikipedia-url"]?.toString(),
    });

    this.logToStderr(dim(`Updated creator ${bold(creator.name)}`));

    return creator;
  }
}
