import { createCreator, findCreatorByName } from "@colibri-hq/sdk";
import { Args, Flags } from "@oclif/core";
import { BaseCommand } from "../../command.js";
import { bold, gray } from "ansis";

export class Add extends BaseCommand<typeof Add> {
  static override args = {
    name: Args.string({
      description: "Name of the creator",
      name: "name",
      required: true,
    }),
  };
  static override description = "Add a new creator to the database";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    "amazon-id": Flags.string({
      char: "a",
      description: "Amazon Author ID",
      name: "amazon-id",
      required: false,
    }),
    description: Flags.string({
      char: "d",
      description: "Description of the creator",
      required: false,
    }),
    "goodreads-id": Flags.string({
      char: "g",
      description: "Goodreads Author ID",
      name: "goodreads-id",
      required: false,
    }),
    image: Flags.file({
      char: "I",
      description: "Image file for the creator",
      name: "image",
      required: false,
    }),
    "no-discovery": Flags.boolean({
      allowNo: false,
      description:
        "Disable automatic discovery of missing metadata for this creator and leave fields empty instead",
      name: "no-discovery",
    }),
    "sorting-key": Flags.string({
      char: "s",
      description: "Key used for sorting. Defaults to the creator's name",
      required: false,
    }),
    url: Flags.url({
      char: "u",
      description: "URL to creator's website",
      name: "url",
      required: false,
    }),
    "wikipedia-url": Flags.url({
      char: "w",
      description: "URL to creator's Wikipedia page",
      name: "wikipedia-url",
      required: false,
    }),
  };

  async run() {
    const { database } = this.instance;
    const { name } = this.args;

    const existing = await findCreatorByName(database, name);

    if (existing) {
      this.error(
        `Creator with name "${name}" already exists in the database. ` +
          'You can use the "edit" command to update it instead.',
      );
    }

    const creator = await createCreator(database, name, {
      amazonId: this.flags["amazon-id"],
      description: this.flags.description,
      goodreadsId: this.flags["goodreads-id"],
      // TODO: Handle image upload
      //image: this.flags.image,
      sortingKey: this.flags["sorting-key"],
      url: this.flags.url?.toString(),
      wikipediaUrl: this.flags["wikipedia-url"]?.toString(),
    });

    this.logToStderr(gray(`Added new creator ${bold(creator.name)}`));

    return creator;
  }
}
