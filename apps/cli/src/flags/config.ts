import { Flags } from "@oclif/core";
import { type Config, loadConfig, saveConfig } from "../utils/config.ts";

export const config = Flags.custom<ConfigAccessor>({
  char: "c",
  async default() {
    return { load: () => loadConfig(), save: (config: Config) => saveConfig(config) };
  },
  async defaultHelp() {
    return "(nearest config file)";
  },
  description: "Configuration file to use.",
  env: "COLIBRI_CONFIG",
  multiple: false,
  name: "config",
  async parse(input) {
    return { load: () => loadConfig(input), save: (config: Config) => saveConfig(config, input) };
  },
  required: false,
});

type ConfigAccessor = { load(): Promise<Config>; save(config: Config): Promise<void> };
