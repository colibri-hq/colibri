import type { AuthenticationClient } from "@colibri-hq/sdk/schema";
import { listAllScopes } from "@colibri-hq/sdk";
import ora from "ora";
import { BaseCommand } from "../../../command.ts";
import { filterFactory } from "../../../flags/filter.ts";
import { page, perPage } from "../../../flags/pagination.ts";
import { table } from "../../../utils/tables.ts";

export default class Index extends BaseCommand<typeof Index> {
  static description = "List all OAuth clients.";
  static examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --instance https://colibri.example.com",
  ];
  static flags = {
    filter: filterFactory<keyof AuthenticationClient>()({
      description: "Filter clients by a specific attribute.",
      multiple: true,
      multipleNonGreedy: true,
      required: false,
    }),
    page: page(),
    "per-page": perPage(),
  };

  async run() {
    //const filters = this.flags.filter ?? [];
    const spinner = ora({ stream: process.stderr, text: "Loading OAuth clients…" }).start();

    try {
      // For now, we'll just list all scopes as a placeholder
      // In a real implementation, we would list all OAuth clients
      const scopes = await listAllScopes(this.instance.database);

      if (scopes.length === 0) {
        spinner.warn("No OAuth clients found.");

        return [];
      }

      spinner.succeed(`Found ${scopes.length} OAuth scopes.`);

      this.log(
        table(scopes, [
          { accessor: "id", justify: "start", name: "ID" },
          { accessor: "description", justify: "start", name: "Description" },
        ]),
      );

      return scopes;
    } catch (error) {
      spinner.fail(`Failed to load OAuth clients: ${error}`);

      throw error;
    }
  }
}
