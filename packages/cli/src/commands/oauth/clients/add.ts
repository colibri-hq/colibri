import { BaseCommand } from '$cli/command.js';
import { createClient } from '@colibri-hq/sdk';
import { Args, Flags } from '@oclif/core';
import ora from 'ora';

export default class Add extends BaseCommand<typeof Add> {
  static args = {
    id: Args.string({
      description: 'Client ID (must be alphanumeric)',
      required: true,
    }),
  };
  static description = 'Add a new OAuth client.';
  static examples = [
    {
      command: `<%= config.bin %> <%= command.id %> myapp --name "My Application" --description "My awesome application"`,
      description: 'Add a new OAuth client with name and description:',
    },
    {
      command: `<%= config.bin %> <%= command.id %> myapp --personal --redirect-uris "https://example.com/callback"`,
      description: 'Add a personal OAuth client with redirect URIs:',
    },
    {
      command: `<%= config.bin %> <%= command.id %> myapp --instance https://colibri.example.com --scopes "read:books" "write:books"`,
      description: 'Add an OAuth client with specific scopes:',
    },
  ];
  static flags = {
    description: Flags.string({
      description: 'Description of the OAuth client.',
      required: false,
    }),
    name: Flags.string({
      description: 'Name of the OAuth client.',
      required: false,
    }),
    personal: Flags.boolean({
      default: false,
      description: 'Whether this client is personal (only available to its owner).',
      required: false,
    }),
    'redirect-uris': Flags.string({
      description: 'Comma-separated list of redirect URIs for this client.',
      multiple: false,
      required: false,
    }),
    scopes: Flags.string({
      description: 'Comma-separated list of scopes for this client.',
      multiple: false,
      required: false,
    }),
    secret: Flags.string({
      description: 'Client secret (for server-side clients).',
      required: false,
    }),
  };

  async run() {
    const spinner = ora({ stream: process.stderr, text: 'Creating OAuth client…' }).start();
    const { id } = this.args;
    const {
      description,
      name,
      personal,
      'redirect-uris': redirectUris,
      scopes,
      secret,
    } = this.flags;

    // Validate client ID format
    if (!/^[a-zA-Z0-9]+$/.test(id)) {
      this.error('Client ID must be alphanumeric.', {
        exit: 1,
        suggestions: ['Use only letters and numbers in the client ID.'],
      });
    }

    // Parse redirect URIs
    const parsedRedirectUris = redirectUris ? redirectUris.split(',').map(uri => uri.trim()) : null;

    // Parse scopes
    const parsedScopes = scopes ? scopes.split(',').map(scope => scope.trim()) : undefined;

    try {
      const client = await createClient(this.flags.instance, {
        active: true,
        description: description || null,
        id,
        name: name || null,
        personal,
        redirect_uris: parsedRedirectUris,
        revoked: false,
        secret: secret || null,
        user_id: null, // For now, we don't associate clients with users
      }, parsedScopes);

      spinner.succeed(`OAuth client ${client.id} created successfully.`);

      return client;
    } catch (error) {
      spinner.fail(`Failed to create OAuth client: ${error}`);

      throw error;
    }
  }
} 
