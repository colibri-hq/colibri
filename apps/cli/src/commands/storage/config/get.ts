import { Flags } from "@oclif/core";
import { bold, dim } from "ansis";
import type { InstanceConfig } from "../../../utils/config.ts";
import { StorageBaseCommand } from "../../../domain/storage/command.ts";

export class Get extends StorageBaseCommand<typeof Get> {
  static aliases = ["storage config"];
  static description = "Get the current storage configuration.";
  static examples = [];
  static flags = {
    env: Flags.boolean({
      char: "E",
      default: false,
      description:
        "Output the configuration in a format suitable for .env files.",
      exclusive: ["json"],
    }),
  };

  async run(): Promise<InstanceConfig["storage"]> {
    const config = this.instance.config.storage;

    if (!config) {
      this.error("No storage configuration found.");
    }

    if (this.flags.env) {
      this.log(this.#renderEnv(config));

      return this.exit(0);
    }

    this.#renderConsole(config);

    return config;
  }

  #renderConsole({
    accessKeyId,
    endpoint,
    forcePathStyle,
    region,
    secretAccessKey,
  }: Required<InstanceConfig>["storage"]) {
    if (!process.stdout.isTTY) {
      this.logToStderr(
        dim(
          '  Hint: You can use either the "--env flag to print the configuration in a ' +
            'format suitable for .env files, or the "--json" flag for JSON output.',
        ),
      );
    }

    this.logToStderr("");
    this.log(bold("  Storage configuration:"));
    this.log(`  ${dim("Endpoint.........:")} ${endpoint}`);
    this.log(`  ${dim("Region...........:")} ${region}`);
    this.log(`  ${dim("Access Key ID....:")} ${accessKeyId}`);
    this.log(`  ${dim("Secret Access Key:")} ${secretAccessKey}`);
    this.log(`  ${dim("Force Path-Style.:")} ${forcePathStyle}`);
    this.logToStderr("");
  }

  #renderEnv(config: Required<InstanceConfig>["storage"]) {
    return [
      `COLIBRI_STORAGE_URL=${config.endpoint ?? ""}`,
      `COLIBRI_STORAGE_REGION=${config.region ?? ""}`,
      `COLIBRI_STORAGE_ACCESS_KEY_ID=${config.accessKeyId ?? ""}`,
      `COLIBRI_STORAGE_SECRET_ACCESS_KEY=${config.secretAccessKey ?? ""}`,
      `COLIBRI_STORAGE_FORCE_PATH_STYLE=${config.forcePathStyle ? "yes" : "no"}`,
    ].join("\n");
  }
}
