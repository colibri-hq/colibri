import { loadClient, NoResultError } from "@colibri-hq/sdk";
import { input } from "@inquirer/prompts";
import { Args, Flags } from "@oclif/core";
import { colorize } from "@oclif/core/ux";
import ora from "ora";
import { BaseCommand } from "../../../command.ts";

export default class Remove extends BaseCommand<typeof Remove> {
  static args = {
    id: Args.string({
      description: "Client ID to remove",
      required: true,
    }),
  };
  static description = "Remove an OAuth client.";
  static examples = [
    {
      command: "<%= config.bin %> <%= command.id %> myapp",
      description: "Remove an OAuth client:",
    },
    {
      command: "<%= config.bin %> <%= command.id %> myapp --force",
      description: "Force remove an OAuth client without confirmation:",
    },
    {
      command: "<%= config.bin %> <%= command.id %> myapp --instance https://colibri.example.com",
      description: "Remove an OAuth client from a specific Colibri instance:",
    },
  ];
  static flags = {
    force: Flags.boolean({
      char: "f",
      description: "Force the removal without confirmation.",
    }),
  };

  async run() {
    const spinner = ora({
      stream: process.stderr,
      text: "Loading OAuth client…",
    }).start();
    const { id } = this.args;
    const { force, verbose } = this.flags;

    try {
      const client = await loadClient(this.instance.database, id);
      spinner.succeed(`Found OAuth client: ${client.id}`);

      const confirmation =
        force ||
        (await input({
          message:
            "Are you sure you want to remove the OAuth client " +
            `"${colorize("cyan", client.name ?? client.id)}"?\n` +
            "This will revoke all tokens and authorization codes associated with this client.\n\n" +
            `To confirm, type the client ID "${client.id}":`,
          required: false,
          validate(input) {
            if (input !== client.id) {
              return `Please enter "${client.id}" to confirm.`;
            }

            return true;
          },
        }));

      if (!confirmation) {
        this.logToStderr("Aborted.");
        this.exit(1);
      }

      // For now, we'll just log that we would remove the client
      // In a real implementation, we would remove the client
      this.logToStderr(`OAuth client ${client.id} would be removed.`);

      return client;
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
