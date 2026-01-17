import type { Database } from "@colibri-hq/sdk";
import { createUser, setSetting, storeSecret } from "@colibri-hq/sdk";
import { updateStorageDsn } from "@colibri-hq/sdk/storage";

export interface SetupConfig {
  admin: { email: string; name: string };
  database: Database;

  databaseDsn: string;

  instance: { description?: string; name: string };

  smtp?: { from: string; host: string; password: string; port: number; username: string };

  storage: {
    accessKeyId: string;
    endpoint: string;
    forcePathStyle?: boolean;
    region?: string;
    secretAccessKey: string;
  };
}

/**
 * Build S3 storage DSN from configuration
 */
export function buildStorageDsn(storage: SetupConfig["storage"]): string {
  const dsn = new URL(storage.endpoint);
  dsn.username = storage.accessKeyId;
  dsn.password = storage.secretAccessKey;
  dsn.searchParams.set("forcePathStyle", String(storage.forcePathStyle ?? true));

  if (storage.region) {
    dsn.searchParams.set("region", storage.region);
  }

  return dsn.toString();
}

/**
 * Apply all setup configuration to the database
 */
export async function applySetup(config: SetupConfig): Promise<void> {
  const { admin, database, instance, smtp, storage } = config;

  // Create admin user
  await createUser(database, {
    email: admin.email,
    name: admin.name,
    role: "admin",
    verified: true,
  });

  // Set instance settings
  await setSetting(database, "urn:colibri:settings:general:instance-name", instance.name);

  if (instance.description) {
    await setSetting(
      database,
      "urn:colibri:settings:general:instance-description",
      instance.description,
    );
  }

  // Configure storage
  const storageDsn = buildStorageDsn(storage);
  await updateStorageDsn(database, storageDsn);

  // Configure SMTP if provided
  if (smtp) {
    await storeSecret(database, "smtp.host", smtp.host, "SMTP server hostname");
    await storeSecret(database, "smtp.port", String(smtp.port), "SMTP server port");
    await storeSecret(database, "smtp.username", smtp.username, "SMTP username");
    await storeSecret(database, "smtp.password", smtp.password, "SMTP password");
    await storeSecret(database, "smtp.from", smtp.from, "SMTP from address");
  }
}
