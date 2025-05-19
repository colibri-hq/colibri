import { initialize } from "@colibri-hq/sdk";
import { Args } from "@oclif/core";
import { BaseCommand } from "../command.ts";
import { loadConfig, saveConfig } from "../utils/config.ts";
import { promptForInstance } from "../utils/interactive.ts";

export default class Connect extends BaseCommand<typeof Connect> {
  static args = {
    dsn: Args.url({
      description: "The database DSN to connect to",
      async parse(input) {
        if (!input.startsWith("postgres://")) {
          input = `postgres://${input.replace(/^.*:\/\//, "")}`;
        }

        try {
          return new URL(input);
        } catch {
          throw new Error(
            "Invalid DSN format. Please provide a valid Postgres DSN.",
          );
        }
      },
      required: true,
    }),
  };
  static description = "Connect to a Colibri Postgres database.";
  static examples = [
    "<%= config.bin %> <%= command.id %> postgres://user:pass@host:port/db",
    {
      command:
        "<%= config.bin %> <%= command.id %> postgres://user:pass@host:port/db --instance https://colibri.example.com",
      description:
        "To connect to a specific Colibri instance, use the --instance option:",
    },
  ];

  async run() {
    const instanceUri = this.instance
      ? this.instance.url
      : await promptForInstance();

    try {
      // Try to connect to the database
      initialize(this.args.dsn);

      // If we get here, the connection was successful
      this.logToStderr("Successfully connected to the database");

      // Load existing config
      const config = await loadConfig();

      // Store the connection string in the config
      const instanceKey = instanceUri.toString();
      config.instances[instanceKey] = { databaseUri: this.args.dsn.toString() };

      // If this is the first instance, set it as default
      if (Object.keys(config.instances).length === 1) {
        config.defaultInstance = instanceKey;
      }

      await saveConfig(config);

      this.logToStderr(`Configuration saved for instance ${instanceKey}`);

      if (config.defaultInstance === instanceKey) {
        this.logToStderr("This instance is set as the default");
      }
    } catch (error) {
      this.error("Failed to connect to the database:", error as Error);
    }
  }
}
