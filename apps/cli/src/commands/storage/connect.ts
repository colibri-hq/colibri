import { getStorageDsn, updateStorageDsn } from "@colibri-hq/sdk/storage";
import { Flags } from "@oclif/core";
import { BaseCommand } from "../../command.js";

export class Connect extends BaseCommand<typeof Connect> {
  static override aliases = ["storage connect"];
  static override description = "Connect to the storage service.";
  static override examples = [
    {
      command: "<%= config.bin %> <%= command.id %>",
      description: "Connect to a storage provider",
    },
  ];
  static override flags = {
    "access-key-id": Flags.string({
      char: "a",
      description: "Access key ID for the storage service",
      required: true,
    }),
    endpoint: Flags.string({
      char: "e",
      description: "Custom endpoint for the storage service",
      required: true,
    }),
    force: Flags.boolean({
      char: "f",
      default: false,
      description: "Force overwriting any existing storage connection",
    }),
    "force-path-style": Flags.boolean({
      allowNo: true,
      char: "F",
      default: false,
      description: "Force path-style URLs for the storage service",
    }),
    region: Flags.string({
      char: "r",
      description: "Region for the storage service",
      required: false,
    }),
    "secret-access-key": Flags.string({
      allowStdin: true,
      char: "s",
      description: "Secret access key for the storage service",
      required: true,
    }),
  };

  async run() {
    const { database } = this.instance;
    const {
      "access-key-id": accessKeyId,
      endpoint,
      force,
      "force-path-style": forcePathStyle,
      region,
      "secret-access-key": secretAccessKey,
    } = this.flags;
    const dsn = new URL(endpoint);

    if (dsn.protocol !== "http:" && dsn.protocol !== "https:") {
      this.error(
        `Invalid protocol "${dsn.protocol}" in endpoint URL: Only "http:" or "https:" is supported`,
      );
    }

    dsn.username = accessKeyId;
    dsn.password = secretAccessKey;
    dsn.searchParams.set("forcePathStyle", String(forcePathStyle));

    if (region) {
      dsn.searchParams.set("region", region);
    }

    // Check if a storage connection already exists
    let existingDsn: null | string = null;
    try {
      existingDsn = await getStorageDsn(database);
    } catch {
      // No existing DSN configured - this is fine for initial setup
    }

    if (existingDsn && !force) {
      this.error(
        `Storage connection already exists at "${new URL(existingDsn).origin}". Use --force to overwrite.`,
      );
    }

    await updateStorageDsn(database, dsn.toString());

    this.log(`Connected to storage provider "${dsn.origin}".`);
  }
}
