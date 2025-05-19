import { loadClient, NoResultError } from "@colibri-hq/sdk";
import { Args, Flags } from "@oclif/core";
import ora from "ora";
import { BaseCommand } from "../../../command.ts";

export default class Update extends BaseCommand<typeof Update> {
  static args = {
    id: Args.string({
      description: "Client ID to update",
      required: true,
    }),
  };
  static description = "Update an OAuth client.";
  static examples = [
    {
      command: "<%= config.bin %> <%= command.id %> myapp --name \"Updated App Name\"",
      description: "Update an OAuth client name:",
    },
    {
      command: "<%= config.bin %> <%= command.id %> myapp --active false",
      description: "Deactivate an OAuth client:",
    },
    {
      command: "<%= config.bin %> <%= command.id %> myapp --instance https://colibri.example.com --redirect-uris \"https://new-example.com/callback\"",
      description: "Update redirect URIs for an OAuth client:",
    },
  ];
  static flags = {
    active: Flags.boolean({
      description: "Whether the client is active.",
      required: false,
    }),
    description: Flags.string({
      description: "Description of the OAuth client.",
      required: false,
    }),
    name: Flags.string({
      description: "Name of the OAuth client.",
      required: false,
    }),
    personal: Flags.boolean({
      description:
        "Whether this client is personal (only available to its owner).",
      required: false,
    }),
    "redirect-uris": Flags.string({
      description: "Comma-separated list of redirect URIs for this client.",
      multiple: false,
      required: false,
    }),
    revoked: Flags.boolean({
      description: "Whether the client is revoked.",
      required: false,
    }),
    secret: Flags.string({
      description: "Client secret (for server-side clients).",
      required: false,
    }),
  };

  async run() {
    const spinner = ora({
      stream: process.stderr,
      text: "Loading OAuth client…",
    }).start();
    const { id } = this.args;
    const {
      active,
      description,
      name,
      personal,
      "redirect-uris": redirectUris,
      revoked,
      secret,
      verbose,
    } = this.flags;

    try {
      const client = await loadClient(this.instance.database, id);
      spinner.succeed(`Found OAuth client: ${client.id}`);

      // Parse redirect URIs
      const parsedRedirectUris = redirectUris
        ? redirectUris.split(",").map((uri) => uri.trim())
        : undefined;

      // Prepare update data
      const updateData: Record<string, unknown> = {};

      if (active !== undefined) {
        updateData.active = active;
      }

      if (description !== undefined) {
        updateData.description = description;
      }

      if (name !== undefined) {
        updateData.name = name;
      }

      if (personal !== undefined) {
        updateData.personal = personal;
      }

      if (parsedRedirectUris !== undefined) {
        updateData.redirect_uris = parsedRedirectUris;
      }

      if (revoked !== undefined) {
        updateData.revoked = revoked;
      }

      if (secret !== undefined) {
        updateData.secret = secret;
      }

      if (Object.keys(updateData).length === 0) {
        this.error(
          "No update data provided. Please specify at least one field to update.",
          {
            exit: 1,
            suggestions: [
              "Use --name to update the client name",
              "Use --description to update the client description",
              "Use --active to activate or deactivate the client",
              "Use --personal to change whether the client is personal",
              "Use --redirect-uris to update the redirect URIs",
              "Use --revoked to revoke or unrevoke the client",
              "Use --secret to update the client secret",
            ],
          },
        );
      }

      // For now, we'll just log the update data
      // In a real implementation, we would update the client
      this.logToStderr("Update data:", updateData);
      this.logToStderr(
        `OAuth client ${client.id} would be updated with the above data.`,
      );

      return { client, updateData };
    } catch (error) {
      if (error instanceof NoResultError) {
        if (verbose) {
          this.logToStderr(`${error.name}: ${error.message}`);
        }

        this.error(`OAuth client not found: ${id}`, {
          exit: 1,
          suggestions: ["Make sure you've entered the correct client ID."],
        });
      }

      spinner.fail(`Failed to load OAuth client: ${error}`);

      throw error;
    }
  }
}
