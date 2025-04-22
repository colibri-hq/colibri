import { BaseCommand } from '$cli/command.js';
import { loadConfig, saveConfig } from '$cli/utils/config.js';
import { initialize } from '@colibri-hq/sdk';
import { input as prompt } from '@inquirer/prompts';
import { Args } from '@oclif/core';

export default class Connect extends BaseCommand<typeof Connect> {
  static args = {
    dsn: Args.url({
      description: 'The database DSN to connect to',
      async parse(input) {
        if (!input.startsWith('postgres://')) {
          input = `postgres://${input.replace(/^.*:\/\//, '')}`;
        }

        try {
          return new URL(input);
        } catch {
          throw new Error('Invalid DSN format. Please provide a valid Postgres DSN.');
        }
      },
      required: true,
    }),
  };
  static description = 'Connect to a Colibri Postgres database.';
  static examples = [
    '<%= config.bin %> <%= command.id %> postgres://user:pass@host:port/db',
    {
      command: '<%= config.bin %> <%= command.id %> postgres://user:pass@host:port/db --instance https://colibri.example.com',
      description: 'To connect to a specific Colibri instance, use the --instance option:',
    },
  ];

  async run() {
    const { args, flags } = await this.parse(Connect);
    const instanceUri = flags.instance ?? await this.promptForInstance();

    try {
      // Try to connect to the database
      initialize(args.dsn);

      // If we get here, the connection was successful
      this.logToStderr('Successfully connected to the database');

      // Load existing config
      const config = await loadConfig();

      // Store the connection string in the config
      const instanceKey = instanceUri.toString();
      config.instances[instanceKey] = { databaseUri: args.dsn.toString() };

      // If this is the first instance, set it as default
      if (Object.keys(config.instances).length === 1) {
        config.defaultInstance = instanceKey;
      }

      await saveConfig(config);

      this.logToStderr(`Configuration saved for instance ${instanceKey}`);

      if (config.defaultInstance === instanceKey) {
        this.logToStderr('This instance is set as the default');
      }
    } catch (error) {
      this.error('Failed to connect to the database:', error as Error);
    }
  }

  private async promptForInstance() {
    try {
      let url = await prompt({
        message: 'Enter the URL of your Colibri instance:',
        required: true,
        validate(input) {
          if (!input.startsWith('http')) {
            input = `http://${input.replace(/^.*:\/\//, '')}`;
          }

          try {
            const url = new URL(input);

            return Boolean(url);
          } catch {
            return `Invalid instance URL "${input}". Please provide a valid URL.`;
          }
        },
      });

      if (!url.startsWith('http')) {
        url = `http://${url.replace(/^.*:\/\//, '')}`;
      }

      return new URL('/', url);
    } catch {
      this.error('Failed to resolve instance URL.');
    }
  }
}
