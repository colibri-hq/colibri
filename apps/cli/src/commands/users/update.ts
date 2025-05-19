import type {
  AuthenticationColorScheme,
  AuthenticationUserRole,
} from "@colibri-hq/sdk/schema";
import {
  findUserByEmail,
  findUserByIdentifier,
  NoResultError,
  updateUser,
} from "@colibri-hq/sdk";
import { Flags } from "@oclif/core";
import { colorize } from "@oclif/core/ux";
import { userIdentifier } from "../../args/user.ts";
import { BaseCommand } from "../../command.ts";
import { date } from "../../flags/date.ts";

const roleFlag = Flags.option({
  options: [
    "admin",
    "adult",
    "child",
    "guest",
  ] satisfies AuthenticationUserRole[],
});

const colorSchemeFlag = Flags.option({
  options: ["light", "dark", "system"] satisfies AuthenticationColorScheme[],
});

export default class Update extends BaseCommand<typeof Update> {
  static args = {
    user: userIdentifier({
      description: "Email address or ID of the user to update.",
      required: true,
    }),
  };
  static description = "Update a user's information.";
  static examples = [
    {
      command: "<%= config.bin %> <%= command.id %> jane@doe.com --name \"Jane Doe\"",
      description: "Update a user's name by email address:",
    },
    {
      command: "<%= config.bin %> <%= command.id %> 42 --role admin",
      description: "Update a user's role by ID:",
    },
    {
      command: "<%= config.bin %> <%= command.id %> 42 --instance https://colibri.example.com --color-scheme dark",
      description:
        "Update a user's color scheme by ID from a specific Colibri instance:",
    },
  ];
  static flags = {
    birthdate: date({
      description: "Birthdate of the user.",
      multiple: false,
      required: false,
    }),
    colorScheme: colorSchemeFlag({
      description: "Color scheme preference of the user.",
      multiple: false,
      required: false,
    }),
    name: Flags.string({
      description: "Name of the user.",
      required: false,
    }),
    role: roleFlag({
      char: "r",
      description: "Role of the user.",
      multiple: false,
      required: false,
    }),
    verified: Flags.boolean({
      description: "Whether the user is verified.",
      required: false,
    }),
  };

  async run() {
    const { user } = this.args;
    const { birthdate, colorScheme, name, role, verbose, verified } =
      this.flags;
    let account;

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

    const updateData: Record<string, unknown> = {};

    if (birthdate !== undefined) {
      updateData.birthdate = birthdate;
    }

    if (colorScheme !== undefined) {
      updateData.color_scheme = colorScheme;
    }

    if (name !== undefined) {
      updateData.name = name;
    }

    if (role !== undefined) {
      updateData.role = role;
    }

    if (verified !== undefined) {
      updateData.verified = verified;
    }

    if (Object.keys(updateData).length === 0) {
      this.error(
        "No update data provided. Please specify at least one field to update.",
        {
          exit: 1,
          suggestions: [
            "Use --name to update the user's name",
            "Use --role to update the user's role",
            "Use --birthdate to update the user's birthdate",
            "Use --color-scheme to update the user's color scheme preference",
            "Use --verified to update the user's verification status",
          ],
        },
      );
    }

    try {
      await updateUser(this.instance.database, account.id, updateData);
      this.logToStderr(
        `User ${colorize(
          "cyan",
          account.name ?? account.email,
        )} updated successfully.`,
      );
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      this.error("An error occurred while updating the user.", {
        exit: 1,
        message: error.message,
        suggestions: [
          "Check your network connection.",
          "Verify you have the necessary permissions.",
        ],
      });
    }
  }
}
