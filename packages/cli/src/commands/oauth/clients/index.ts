import type { AuthenticationClient } from '@colibri-hq/sdk/schema';
import { BaseCommand } from '$cli/command.js';
import { filterFactory } from '$cli/flags/filter.js';
import { page, perPage } from '$cli/flags/pagination.js';
import { table } from '$cli/utils/tables.js';
import { listAllScopes } from '@colibri-hq/sdk';
import ora from 'ora';

export default class Index extends BaseCommand<typeof Index> {
  static description = 'List all OAuth clients.';
  static examples = [
    `<%= config.bin %> <%= command.id %>`,
    `<%= config.bin %> <%= command.id %> --instance https://colibri.example.com`,
  ];
  static flags = {
    filter: filterFactory<keyof AuthenticationClient>()({
      description: 'Filter clients by a specific attribute.',
      multiple: true,
      multipleNonGreedy: true,
      required: false,
    }),
    page: page(),
    'per-page': perPage(),
  };

  async run() {
    const filters = (this.flags.filter ?? []);
    this.logToStderr('Applying filters:', filters);

    const spinner = ora({ stream: process.stderr, text: 'Loading OAuth clients…' }).start();

    try {
      // For now, we'll just list all scopes as a placeholder
      // In a real implementation, we would list all OAuth clients
      const scopes = await listAllScopes(this.flags.instance);

      if (scopes.length === 0) {
        spinner.warn('No OAuth clients found.');

        return [];
      }

      spinner.succeed(`Found ${scopes.length} OAuth scopes.`);

      this.log(table(scopes, [
        {
          accessor: 'id',
          align: 'start',
          name: 'ID',
        },
        {
          accessor: 'description',
          align: 'start',
          name: 'Description',
        },
      ]));

      return scopes;
    } catch (error) {
      spinner.fail(`Failed to load OAuth clients: ${error}`);

      throw error;
    }
  }
} 
