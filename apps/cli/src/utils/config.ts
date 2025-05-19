import type { client } from "@colibri-hq/sdk/storage";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface InstanceConfig {
  databaseUri: string;
  storage?: Parameters<typeof client>[0];
}

export interface Config {
  defaultInstance?: string;
  instances: Record<string, InstanceConfig>;
}

const defaultFileVariant = join(
  process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
  "colibri",
  "config.json",
);
const configFileVariants = [
  ".colibri.json",
  defaultFileVariant,
  join(homedir(), ".colibri", "config.json"),
  "/etc/colibri/config.json",
];

export async function saveConfig(config: Config, file?: string) {
  const configFile = file ?? (await findConfigFile()) ?? defaultFileVariant;

  await mkdir(dirname(configFile), { recursive: true });
  await writeFile(configFile, serializeConfig(config), "utf8");
}

export async function loadConfig(configFile?: string) {
  // If a config file is provided, we are in strict mode: If the file cannot be
  // found or is invalid, we will throw an error instead of silently returning
  // a new config object.
  const strict = Boolean(configFile);

  if (!configFile) {
    configFile = await findConfigFile();

    if (!configFile) {
      return createDefaultConfig();
    }
  }

  try {
    const content = await readFile(configFile, "utf8");

    return parseConfig(content);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (strict) {
      throw new Error(
        `Failed to load configuration file at "${configFile}": ${error}`,
        { cause: error },
      );
    }

    if ("code" in error && error.code === "ENOENT") {
      return createDefaultConfig();
    }

    throw new Error(
      `Failed to load configuration file at "${configFile}": ${error}`,
      {
        cause: error,
      },
    );
  }
}

async function findConfigFile() {
  for (const file of configFileVariants) {
    try {
      await stat(file);

      return file;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }
}

function parseConfig(config: string) {
  try {
    return JSON.parse(config) as Config;
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    throw new Error(`Invalid config file format: ${error.message}`);
  }
}

function serializeConfig(config: Config) {
  return JSON.stringify(config, null, 4);
}

function createDefaultConfig(): Config {
  return {
    instances: {},
  };
}
