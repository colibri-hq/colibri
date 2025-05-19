import {
  findUserByEmail,
  findUserByIdentifier,
  NoResultError,
  removeUser,
  type User,
} from "@colibri-hq/sdk";
import { colorize } from "@oclif/core/ux";
import { userIdentifier } from "../../args/user.ts";
import { BaseCommand } from "../../command.ts";
import { force } from "../../flags/force.ts";
import { withConfirmation } from "../../utils/interactive.ts";

export class Remove extends BaseCommand<typeof Remove> {
  static args = {
    user: userIdentifier({
      description: "Email address or ID of the user to remove.",
      required: true,
    }),
  };
  static description = "Remove a user from your Colibri instance.";
  static examples = [
    {
      command: "<%= config.bin %> <%= command.id %> jane@doe.com",
      description: "Remove a user by email address:",
    },
    {
      command: "<%= config.bin %> <%= command.id %> 42",
      description: "Remove a user by ID:",
    },
    {
      command: "<%= config.bin %> <%= command.id %> 42 --instance https://colibri.example.com",
      description: "Remove a user by ID from a specific Colibri instance:",
    },
  ];
  static flags = {
    force: force({ description: "Force the removal without confirmation." }),
  };

  async run() {
    const { user } = this.args;
    const { force, verbose } = this.flags;
    let account: User;

    try {
      account =
        "email" in user
          ? await findUserByEmail(this.instance.database, user.email)
          : await findUserByIdentifier(this.instance.database, user.id);
    } catch (error) {
      if (error instanceof NoResultError) {
        if (verbose) {
          this.logToStderr(`${error.name}: ${error.message}`);
        }

        this.error(
          `User not found: ${"email" in user ? user.email : user.id}`,
          {
            exit: 1,
            suggestions: [
              "Make sure you've entered the correct email address or ID.",
            ],
          },
        );
      }

      if (!(error instanceof Error)) {
        throw error;
      }

      this.error("An error occurred while fetching the user.", {
        exit: 1,
        message: error.message,
        suggestions: [
          "Make sure the user exists.",
          "Check your network connection.",
        ],
      });
    }

    const operation = await withConfirmation(
      () => removeUser(this.instance.database, account.id),
      "Are you sure you want to remove the account of " +
        `"${colorize("cyan", account.name ?? account.email)}"?\n` +
        "This will remove all data associated with this user.\n\n" +
        `To confirm, type their ${account.name ? "name" : "email address"}:`,
      { default: account.name ?? account.email, shortCircuit: force },
    );

    try {
      await operation();
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      this.error("An error occurred while removing the user.", {
        exit: 1,
        message: error.message,
        suggestions: ["Check your network connection."],
      });
    }

    this.logToStderr(`User with id "${account.id}" removed successfully.`);
    this.exit(0);
  }
}
