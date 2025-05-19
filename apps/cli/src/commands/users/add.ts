import type {
  AuthenticationColorScheme,
  AuthenticationUserRole,
} from "@colibri-hq/sdk/schema";
import { createUser } from "@colibri-hq/sdk";
import { inferNameFromEmailAddress } from "@colibri-hq/shared";
import { Args, Flags } from "@oclif/core";
import ora from "ora";
import { BaseCommand } from "../../command.ts";
import { date } from "../../flags/date.ts";

const roleFlag = Flags.option({
  default: "adult" as const,
  options: [
    "admin",
    "adult",
    "child",
    "guest",
  ] satisfies AuthenticationUserRole[],
});
const colorSchemeFlag = Flags.option({
  default: "system" as const,
  options: ["light", "dark", "system"] satisfies AuthenticationColorScheme[],
});

export default class Add extends BaseCommand<typeof Add> {
  static args = {
    email: Args.string({
      description: "Email address of the new user",
      required: true,
    }),
  };
  static description = "Add a new user.";
  static examples = [
    "<%= config.bin %> <%= command.id %> jane.doe@gmail.com --name Jane",
  ];
  static flags = {
    birthdate: date({
      description: "Birthdate of the new user.",
      multiple: false,
      required: false,
    }),
    colorScheme: colorSchemeFlag({
      description: "Color scheme of the new user.",
      multiple: false,
      required: false,
    }),
    name: Flags.string({
      description: "Name of the new user.",
      required: false,
    }),
    role: roleFlag({
      char: "r",
      description: "Role of the new user.",
      multiple: false,
      required: false,
    }),
    verified: Flags.boolean({
      default: false,
      description:
        "Whether the new user is verified and does not need to verify their email address.",
      required: false,
    }),
  };

  async run() {
    const spinner = ora({
      stream: process.stderr,
      text: "Creating user…",
    }).start();
    const { email } = this.args;
    const { birthdate = null, colorScheme, role, verified } = this.flags;
    let { name } = this.flags;

    if (!name) {
      name = inferNameFromEmailAddress(email);

      if (this.flags.verbose) {
        this.logToStderr(`Inferred name from email address: ${name}`);
      }
    }

    try {
      const user = await createUser(this.instance.database, {
        birthdate,
        color_scheme: colorScheme,
        email,
        name,
        role,
        verified,
      });

      spinner.succeed(`User ${user.email} created successfully.`);

      return user;
    } catch (error) {
      spinner.fail(`Failed to create user: ${error}`);

      throw error;
    }
  }
}
