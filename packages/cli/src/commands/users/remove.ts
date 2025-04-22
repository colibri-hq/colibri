import { userIdentifier } from '$cli/args/user.js';
import { BaseCommand } from '$cli/command.js';
import {
  findUserByEmail,
  findUserByIdentifier,
  NoResultError,
  removeUser,
  type User,
} from '@colibri-hq/sdk';
import { input } from '@inquirer/prompts';
import { Flags } from '@oclif/core';
import { colorize } from '@oclif/core/ux';

export class Remove extends BaseCommand<typeof Remove> {
  static args = {
    user: userIdentifier({
      description: 'Email address or ID of the user to remove.',
      required: true,
    }),
  };
  static description = 'Remove a user from your Colibri instance.';
  static examples = [
    {
      command: `<%= config.bin %> <%= command.id %> jane@doe.com`,
      description: 'Remove a user by email address:',
    },
    {
      command: `<%= config.bin %> <%= command.id %> 42`,
      description: 'Remove a user by ID:',
    },
    {
      command: `<%= config.bin %> <%= command.id %> 42 --instance https://colibri.example.com`,
      description: 'Remove a user by ID from a specific Colibri instance:',
    },
  ];
  static flags = {
    force: Flags.boolean({
      char: 'f',
      description: 'Force the removal without confirmation.',
    }),
  };

  async run() {
    const { user } = this.args;
    const { force, instance, verbose } = this.flags;
    let account: User;

    try {
      account = 'email' in user
        ? await findUserByEmail(instance, user.email)
        : await findUserByIdentifier(instance, user.id);
    } catch (error) {
      if (error instanceof NoResultError) {
        if (verbose) {
          this.logToStderr(`${error.name}: ${error.message}`);
        }

        this.error(
          `User not found: ${'email' in user ? user.email : user.id}`,
          {
            exit: 1,
            suggestions: [`Make sure you've entered the correct email address or ID.`],
          },
        );
      }

      if (!(error instanceof Error)) {
        throw error;
      }

      this.error('An error occurred while fetching the user.', {
        exit: 1,
        message: error.message,
        suggestions: [
          'Make sure the user exists.',
          'Check your network connection.',
        ],
      });
    }

    const confirmation = force || await input({
      message: `Are you sure you want to remove the account of ` +
        `"${colorize('cyan', account.name ?? account.email)}"?\n` +
        'This will remove all data associated with this user.\n\n' +
        `To confirm, type their ${account.name ? 'name' : 'email address'}:`,
      required: false,
      validate(input) {
        if (input !== (account.name ?? account.email)) {
          return `Please enter "${account.name ?? account.email}" to confirm.`;
        }

        return true;
      },
    });

    if (!confirmation) {
      this.logToStderr('Aborted.');
      this.exit(1);
    }

    try {
      await removeUser(instance, account.id);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      this.error('An error occurred while removing the user.', {
        exit: 1,
        message: error.message,
        suggestions: [
          'Check your network connection.',
        ],
      });
    }

    this.logToStderr(`User with id "${account.id}" removed successfully.`);
    this.exit(0);
  }
}
