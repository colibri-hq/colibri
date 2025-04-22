import { type Config, loadConfig } from '$cli/utils/config.js';
import { Flags } from '@oclif/core';

export const config = Flags.custom<Config>({
  char: 'c',
  default() {
    return loadConfig();
  },
  async defaultHelp() {
    return '(nearest config file)';
  },
  description: 'Configuration file to use.',
  env: 'COLIBRI_CONFIG',
  multiple: false,
  name: 'config',
  parse(input) {
    return loadConfig(input);
  },
  required: false,
});
