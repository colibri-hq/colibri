import type { Database } from "@colibri-hq/sdk";
import * as p from "@clack/prompts";
import { createUser, initialize, setSetting, storeSecret } from "@colibri-hq/sdk";
import { updateStorageDsn } from "@colibri-hq/sdk/storage";
import { Command, Flags } from "@oclif/core";
import { buildStorageDsn } from "../core/state.js";
import { validateDatabaseDsn, validateEmail, validateStorageEndpoint } from "../core/validation.js";
import { startGuiServer } from "../lib/server.js";

export default class Setup extends Command {
  static override description = "Interactive setup wizard for new Colibri instances";

  static override examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --gui",
    "<%= config.bin %> <%= command.id %> --gui --port 8080",
  ];

  static override flags = {
    gui: Flags.boolean({
      default: false,
      description: "Launch web-based setup wizard instead of CLI",
    }),
    port: Flags.integer({ default: 3333, description: "Port for web GUI server" }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Setup);

    if (flags.gui) {
      await startGuiServer({ port: flags.port });
      return;
    }

    await this.runCliWizard();
  }

  private async runCliWizard(): Promise<void> {
    p.intro("Colibri Setup");

    let database: Database | null = null;

    const results = await p.group(
      {
        // Step 2: Admin account
        adminEmail: () =>
          p.text({
            message: "Admin email address:",
            placeholder: "admin@example.com",
            validate: validateEmail,
          }),

        adminName: ({ results }) =>
          p.text({
            initialValue: results.adminEmail?.split("@")[0] ?? "",
            message: "Admin display name:",
          }),

        // Step 5: SMTP (optional)
        configureSmtp: () =>
          p.confirm({ initialValue: false, message: "Configure SMTP for email notifications?" }),

        // Test database connection
        database: async ({ results }) => {
          const s = p.spinner();
          s.start("Testing database connection...");

          try {
            const db = initialize(results.databaseDsn!);
            // Test connection by running a simple query
            await db.selectFrom("authentication.user").select("id").limit(1).execute();
            s.stop("Database connected successfully");
            database = db;
            return db;
          } catch (error) {
            s.stop("Connection failed");

            if (error instanceof Error && error.message.includes("does not exist")) {
              p.log.error("The database schema is not initialized. Please run migrations first.");
              p.log.info("Run: pnpx supabase db push");
            } else {
              p.log.error(error instanceof Error ? error.message : "Unknown error");
            }

            throw error;
          }
        },

        // Step 1: Database connection
        databaseDsn: () =>
          p.text({
            message: "PostgreSQL connection string:",
            placeholder: "postgres://user:pass@localhost:5432/colibri",
            validate: validateDatabaseDsn,
          }),

        instanceDescription: () =>
          p.text({
            message: "Instance description (optional):",
            placeholder: "My personal ebook library",
          }),

        // Step 3: Instance settings
        instanceName: () => p.text({ initialValue: "Colibri", message: "Instance name:" }),

        smtpFrom: ({ results }) =>
          results.configureSmtp
            ? p.text({ message: "SMTP from address:", placeholder: "noreply@example.com" })
            : Promise.resolve(),

        smtpHost: ({ results }) =>
          results.configureSmtp ? p.text({ message: "SMTP host:" }) : Promise.resolve(),

        smtpPassword: ({ results }) =>
          results.configureSmtp ? p.password({ message: "SMTP password:" }) : Promise.resolve(),

        smtpPort: ({ results }) =>
          results.configureSmtp
            ? p.text({ initialValue: "587", message: "SMTP port:" })
            : Promise.resolve(),

        smtpUsername: ({ results }) =>
          results.configureSmtp ? p.text({ message: "SMTP username:" }) : Promise.resolve(),

        storageAccessKey: () => p.text({ message: "Storage access key ID:" }),

        // Step 4: Storage configuration
        storageEndpoint: () =>
          p.text({
            message: "S3-compatible storage endpoint:",
            placeholder: "https://s3.amazonaws.com",
            validate: validateStorageEndpoint,
          }),

        storageForcePathStyle: () =>
          p.confirm({
            initialValue: true,
            message: "Force path-style URLs? (required for MinIO/local S3)",
          }),

        storageRegion: () =>
          p.text({ message: "Storage region (optional):", placeholder: "us-east-1" }),

        storageSecretKey: () => p.password({ message: "Storage secret access key:" }),
      },
      {
        onCancel: () => {
          p.cancel("Setup cancelled.");
          process.exit(0);
        },
      },
    );

    // Verify we have a database connection
    if (!database) {
      p.log.error("Database connection was not established.");
      process.exit(1);
      return; // TypeScript needs this to understand the flow ends
    }

    // After the null check, we know database is defined
    const db: Database = database;

    // Apply all configuration
    p.log.step("Applying configuration...");

    await p.tasks([
      {
        task: async () => {
          await createUser(db, {
            email: results.adminEmail!,
            name: results.adminName || results.adminEmail!.split("@")[0],
            role: "admin",
            verified: true,
          });
          return "Admin account created";
        },
        title: "Creating admin account",
      },
      {
        task: async () => {
          await setSetting(
            db,
            "urn:colibri:settings:general:instance-name",
            results.instanceName || "Colibri",
          );

          if (results.instanceDescription) {
            await setSetting(
              db,
              "urn:colibri:settings:general:instance-description",
              results.instanceDescription,
            );
          }
          return "Instance settings configured";
        },
        title: "Configuring instance settings",
      },
      {
        task: async () => {
          const region = results.storageRegion || undefined;
          const storageDsn = buildStorageDsn({
            accessKeyId: results.storageAccessKey!,
            endpoint: results.storageEndpoint!,
            secretAccessKey: results.storageSecretKey!,
            ...(region ? { region } : {}),
            forcePathStyle: results.storageForcePathStyle ?? true,
          });
          await updateStorageDsn(db, storageDsn);
          return "Storage configured";
        },
        title: "Configuring storage",
      },
      {
        enabled: results.configureSmtp === true,
        task: async () => {
          if (typeof results.smtpHost === "string") {
            await storeSecret(db, "smtp.host", results.smtpHost, "SMTP server hostname");
          }
          if (typeof results.smtpPort === "string") {
            await storeSecret(db, "smtp.port", results.smtpPort, "SMTP server port");
          }
          if (typeof results.smtpUsername === "string") {
            await storeSecret(db, "smtp.username", results.smtpUsername, "SMTP username");
          }
          if (typeof results.smtpPassword === "string") {
            await storeSecret(db, "smtp.password", results.smtpPassword, "SMTP password");
          }
          if (typeof results.smtpFrom === "string") {
            await storeSecret(db, "smtp.from", results.smtpFrom, "SMTP from address");
          }
          return "SMTP configured";
        },
        title: "Configuring SMTP",
      },
    ]);

    // Close database connection
    await db.destroy();

    p.outro("Setup complete! Start Colibri with: pnpm dev:app");
  }
}
