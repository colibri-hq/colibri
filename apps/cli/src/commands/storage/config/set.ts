import { type Client, client, listBuckets } from "@colibri-hq/sdk/storage";
import { Flags } from "@oclif/core";
import type { InstanceConfig } from "../../../utils/config.ts";
import { StorageBaseCommand } from "../../../domain/storage/command.ts";
import { promptForInstance } from "../../../utils/interactive.ts";

export default class Set extends StorageBaseCommand<typeof Set> {
  static description = "Connect to a storage provider.";
  static flags = {
    "access-key-id": Flags.string({
      char: "u",
      async default({ flags }) {
        if (flags.endpoint) {
          const key = new URL(flags.endpoint).username;

          if (key) {
            return key;
          }
        }
      },
      defaultHelp: "<value>",
      description: "The access key ID for the storage.",
      env: "COLIBRI_STORAGE_ACCESS_KEY_ID",
      required: false,
    }),
    endpoint: Flags.url({
      char: "e",
      description: "The storage endpoint URL.",
      env: "COLIBRI_STORAGE_URL",
      required: true,
    }),
    "force-path-style": Flags.boolean({
      allowNo: true,
      char: "P",
      default: false,
      description: "Force path style URLs.",
      env: "COLIBRI_STORAGE_FORCE_PATH_STYLE",
      required: false,
    }),
    region: Flags.string({
      char: "r",
      default: "eu-west-1",
      description: "The region of the storage endpoint.",
      env: "COLIBRI_STORAGE_REGION",
      required: false,
    }),
    "secret-access-key": Flags.string({
      allowStdin: true,
      char: "p",
      async default({ flags }) {
        if (flags.endpoint) {
          const key = new URL(flags.endpoint).password;

          if (key) {
            return key;
          }
        }
      },
      defaultHelp: "<value>",
      description: "The secret access key for the storage.",
      env: "COLIBRI_STORAGE_SECRET_ACCESS_KEY",
      required: false,
    }),
  };

  async run() {
    const instanceUri = this.instance
      ? this.instance.url
      : await promptForInstance();

    // Try to connect to the previously configured storage provider
    if (this.instance.config.storage) {
      try {
        // Perform a sample operation to check if the connection is valid
        await listBuckets(this.storage);

        // If we get here, the connection was successful, so the existing configuration is still
        // valid. There's no need to update the config.
        this.logToStderr("Successfully connected to the storage provider");
        this.exit(0);
      } catch (error) {
        // If the connection fails, we need to update the config with the new credentials
        this.debug(`Failed to connect to the storage provider: ${error}`);
      }
    }

    try {
      const { load, save } = this.flags["config-file"];
      const config = await load();

      // Store the connection string in the config
      const instanceKey = instanceUri.toString();
      const storage = this.#createClient();

      config.instances[instanceKey] = {
        ...config.instances[instanceKey],
        ...(await this.#inferInstanceConfiguration(storage)),
      };

      // If this is the first instance, set it as default
      if (Object.keys(config.instances).length === 1) {
        config.defaultInstance = instanceKey;
      }

      await save(config);

      this.logToStderr(`Configuration saved for instance ${instanceKey}`);

      if (config.defaultInstance === instanceKey) {
        this.logToStderr("This instance is set as the default");
      }
    } catch (error) {
      this.#handleError(error);
    }
  }

  #createClient() {
    return client({
      accessKeyId: this.flags["access-key-id"],
      endpoint: this.flags.endpoint.toString(),
      forcePathStyle: this.flags["force-path-style"],
      region: this.flags.region,
      secretAccessKey: this.flags["secret-access-key"],
    });
  }

  #handleError(error: unknown) {
    const configError = new Error(
      `Failed to connect to the storage provider: ${error}`,
      { cause: error },
    );

    this.error(configError, {
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "E_COLIBRI_STORAGE_CONFIG",
      exit: 1,
    });
  }

  async #inferInstanceConfiguration({
    config,
  }: Client): Promise<Pick<InstanceConfig, "storage">> {
    const { accessKeyId, secretAccessKey } = await config.credentials();

    return {
      storage: {
        accessKeyId,
        endpoint: await this.#parseEndpoint(config.endpoint),
        forcePathStyle: config.forcePathStyle,
        region: await this.#parseRegion(config.region),
        secretAccessKey,
      },
    };
  }

  async #parseEndpoint(endpoint: Client["config"]["endpoint"]) {
    const providedEndpoint =
      typeof endpoint === "function" ? await endpoint() : endpoint?.toString();

    if (!providedEndpoint || typeof providedEndpoint === "string") {
      return providedEndpoint;
    }

    const { hostname, path, port, protocol, query } = providedEndpoint;

    return new URL(
      `${protocol}//${hostname}:${port}${path}${query ? "?" + query : ""}`,
    ).toString();
  }

  async #parseRegion(region: Client["config"]["region"]) {
    const providedRegion =
      typeof region === "function" ? await region() : region;

    return providedRegion.toString();
  }
}
