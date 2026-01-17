import { type Database, initialize } from "@colibri-hq/sdk";
import type { Config } from "./config.ts";

export function configureInstance(uri: string, config: Config): Instance {
  let instanceUrl: URL;

  try {
    instanceUrl = new URL("/", uri);
  } catch {
    throw new Error("Invalid instance URL format. Please provide a valid URL.");
  }

  const instanceConfig = config.instances?.[instanceUrl.toString()];

  if (!instanceConfig) {
    throw new Error(
      `No configuration found for instance "${instanceUrl}". ` +
        'Please run "colibri connect" first.',
    );
  }

  // Initialize and return the client
  return {
    config: instanceConfig,
    database: initialize(instanceConfig.databaseUri),
    url: instanceUrl,
  };
}

type Instance = { config: Config["instances"][string]; database: Database; url: URL };
