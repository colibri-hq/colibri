import type { RequestEvent } from "@sveltejs/kit";
import {
  createUser,
  initialize,
  setSetting,
  storeSecret,
} from "@colibri-hq/sdk";
import { updateStorageDsn } from "@colibri-hq/sdk/storage";
import { json } from "@sveltejs/kit";
import { buildStorageDsn, type SetupConfig } from "../../../core/state.js";

interface ConfigRequest {
  admin: {
    email: string;
    name: string;
  };
  databaseDsn: string;
  instance: {
    description?: string;
    name: string;
  };
  smtp?: {
    from: string;
    host: string;
    password: string;
    port: number;
    username: string;
  };
  storage: {
    accessKeyId: string;
    endpoint: string;
    forcePathStyle?: boolean;
    region?: string;
    secretAccessKey: string;
  };
}

export async function POST({ request }: RequestEvent) {
  let db;

  try {
    const config: ConfigRequest = await request.json();

    // Initialize database connection
    db = initialize(config.databaseDsn);

    // Create admin user
    await createUser(db, {
      email: config.admin.email,
      name: config.admin.name,
      role: "admin",
      verified: true,
    });

    // Set instance settings
    await setSetting(
      db,
      "urn:colibri:settings:general:instance-name",
      config.instance.name,
    );

    if (config.instance.description) {
      await setSetting(
        db,
        "urn:colibri:settings:general:instance-description",
        config.instance.description,
      );
    }

    // Configure storage
    const storageConfig: SetupConfig["storage"] = {
      accessKeyId: config.storage.accessKeyId,
      endpoint: config.storage.endpoint,
      forcePathStyle: config.storage.forcePathStyle ?? true,
      secretAccessKey: config.storage.secretAccessKey,
    };

    if (config.storage.region) {
      storageConfig.region = config.storage.region;
    }

    const storageDsn = buildStorageDsn(storageConfig);
    await updateStorageDsn(db, storageDsn);

    // Configure SMTP if provided
    if (config.smtp) {
      await storeSecret(
        db,
        "smtp.host",
        config.smtp.host,
        "SMTP server hostname",
      );
      await storeSecret(
        db,
        "smtp.port",
        String(config.smtp.port),
        "SMTP server port",
      );
      await storeSecret(
        db,
        "smtp.username",
        config.smtp.username,
        "SMTP username",
      );
      await storeSecret(
        db,
        "smtp.password",
        config.smtp.password,
        "SMTP password",
      );
      await storeSecret(db, "smtp.from", config.smtp.from, "SMTP from address");
    }

    await db.destroy();

    return json({ success: true });
  } catch (error) {
    if (db) {
      await db.destroy();
    }

    return json(
      {
        error: error instanceof Error ? error.message : "Configuration failed",
        success: false,
      },
      { status: 500 },
    );
  }
}
