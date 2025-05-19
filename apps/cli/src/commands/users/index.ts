import type { User } from "@colibri-hq/sdk";
import { listUsers } from "@colibri-hq/sdk";
import ora from "ora";
import { BaseCommand } from "../../command.ts";
import { filterFactory } from "../../flags/filter.ts";
import { page, perPage } from "../../flags/pagination.ts";
import { table } from "../../utils/tables.ts";

export default class List extends BaseCommand<typeof List> {
  static description = "List all users.";
  static examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --instance https://colibri.example.com",
  ];
  static flags = {
    filter: filterFactory<keyof User>()({
      description: "Filter users by a specific attribute.",
      multiple: true,
      multipleNonGreedy: true,
      required: false,
    }),
    page: page(),
    "per-page": perPage(),
  };

  async run() {
    console.log("Running list users command");
    //const filters = this.flags.filter ?? [];
    const spinner = ora({
      stream: process.stderr,
      text: "Loading users…",
    }).start();

    try {
      const users = await listUsers(
        this.instance.database,
        this.flags.page,
        this.flags["per-page"],
      );

      if (users.length === 0) {
        spinner.warn("No users found.");

        return [];
      }

      spinner.succeed(`Found ${users.length} users.`);

      this.log(
        table(users, [
          {
            accessor: "id",
            align: "end",
            name: "ID",
          },
          {
            accessor: "email",
            align: "start",
            name: "Email Address",
          },
          {
            accessor: "verified",
            name: "Verified",
          },
          {
            accessor: "name",
            align: "start",
            name: "Name",
          },
          {
            accessor: "role",
            name: "Role",
          },
          {
            accessor: "created_at",
            name: "Created",
          },
          {
            accessor: "updated_at",
            name: "Last Updated",
          },
        ]),
      );

      return users;
    } catch (error) {
      spinner.fail(`Failed to load users: ${error}`);

      throw error;
    }
  }
}
