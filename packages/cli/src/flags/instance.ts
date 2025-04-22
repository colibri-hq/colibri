import { type Config, loadConfig } from '$cli/utils/config.js';
import { type Database, initialize } from '@colibri-hq/sdk';
import { Flags } from '@oclif/core';

export const instance = Flags.custom<Database>({
  char: 'i',
  async default() {
    const config = await loadConfig();

    if (!config.defaultInstance) {
      throw new Error(
        'No instance specified and no default instance found. ' +
        'Please run "colibri connect" first.',
      );
    }

    return connect(config.defaultInstance, config);
  },
  async defaultHelp() {
    return '(default instance)';
  },
  description: 'The URL of your Colibri instance.',
  env: 'COLIBRI_INSTANCE',
  multiple: false,
  async parse(input) {
    const config = await loadConfig();

    return connect(input, config);
  },
  required: false,
});

function connect(uri: string, config: Config) {
  let instanceUrl: URL;

  try {
    instanceUrl = new URL('/', uri);
  } catch {
    throw new Error(
      'Invalid instance URL format. Please provide a valid URL.',
    );
  }

  const instanceConfig = config.instances[instanceUrl.toString()];

  if (!instanceConfig) {
    throw new Error(
      `No configuration found for instance "${instanceUrl}". ` +
      'Please run "colibri connect" first.',
    );
  }

  // Initialize and return the client
  return initialize(instanceConfig.databaseUri);
}
