import type { Database } from "@colibri-hq/sdk";
import { initialize } from "@colibri-hq/sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applySetup, buildStorageDsn, type SetupConfig } from "../src/index.js";
import { setupTestDatabase, teardownTestDatabase, type TestContext } from "./test-utils.js";

describe("Setup E2E Tests", () => {
  let testContext: TestContext;
  let database: Database;

  beforeAll(async () => {
    // Start PostgreSQL container with migrations
    testContext = await setupTestDatabase();
    database = initialize(testContext.connectionString);
  }, 120_000);

  afterAll(async () => {
    if (database) {
      await database.destroy();
    }
    if (testContext) {
      await teardownTestDatabase(testContext);
    }
  });

  describe("Database Connection", () => {
    it("should connect to the test database", async () => {
      const result = await database
        .selectFrom("authentication.user")
        .select(({ fn }) => fn.count("id").as("count"))
        .executeTakeFirstOrThrow();

      expect(result).toBeDefined();
      expect(Number(result.count)).toBe(0);
    });

    it("should have the schema properly created", async () => {
      // Check that key tables exist
      const tables = await database
        .selectFrom("information_schema.tables")
        .select(["table_schema", "table_name"])
        .where("table_schema", "in", ["public", "authentication"])
        .where("table_type", "=", "BASE TABLE")
        .execute();

      const tableNames = tables.map((t) => `${t.table_schema}.${t.table_name}`);

      // Core authentication tables
      expect(tableNames).toContain("authentication.user");
      expect(tableNames).toContain("authentication.authenticator");
      expect(tableNames).toContain("authentication.client");

      // Core public tables
      expect(tableNames).toContain("public.work");
      expect(tableNames).toContain("public.edition");
      expect(tableNames).toContain("public.creator");
      expect(tableNames).toContain("public.publisher");
      expect(tableNames).toContain("public.settings_revision");
    });
  });

  describe("buildStorageDsn", () => {
    it("should build S3 DSN from configuration", () => {
      const storage = {
        accessKeyId: "myAccessKey",
        endpoint: "https://s3.amazonaws.com",
        forcePathStyle: true,
        region: "us-east-1",
        secretAccessKey: "mySecretKey",
      };

      const dsn = buildStorageDsn(storage);

      expect(dsn).toContain("s3.amazonaws.com");
      expect(dsn).toContain("myAccessKey");
      expect(dsn).toContain("mySecretKey");
      expect(dsn).toContain("forcePathStyle=true");
      expect(dsn).toContain("region=us-east-1");
    });

    it("should handle MinIO-style endpoint", () => {
      const storage = {
        accessKeyId: "minio",
        endpoint: "http://localhost:9000",
        forcePathStyle: true,
        secretAccessKey: "minio123",
      };

      const dsn = buildStorageDsn(storage);

      expect(dsn).toContain("localhost:9000");
      expect(dsn).toContain("minio");
      expect(dsn).toContain("forcePathStyle=true");
    });
  });

  describe("applySetup", () => {
    it("should create admin user and configure instance", async () => {
      const config: SetupConfig = {
        admin: { email: "admin@example.com", name: "Test Admin" },
        database,
        databaseDsn: testContext.connectionString,
        instance: { description: "A test instance", name: "Test Library" },
        storage: {
          accessKeyId: "test-access-key",
          endpoint: "http://localhost:9000",
          forcePathStyle: true,
          secretAccessKey: "test-secret-key",
        },
      };

      await applySetup(config);

      // Verify admin user was created
      const adminUser = await database
        .selectFrom("authentication.user")
        .selectAll()
        .where("email", "=", "admin@example.com")
        .executeTakeFirstOrThrow();

      expect(adminUser).toBeDefined();
      expect(adminUser.name).toBe("Test Admin");
      expect(adminUser.role).toBe("admin");
      expect(adminUser.verified).toBe(true);

      // Verify instance name was set via settings
      const { getSetting } = await import("@colibri-hq/sdk");
      const instanceNameSetting = await getSetting(
        database,
        "urn:colibri:settings:general:instance-name",
      );
      expect(instanceNameSetting.value).toBe("Test Library");

      // Verify instance description was set
      const instanceDescSetting = await getSetting(
        database,
        "urn:colibri:settings:general:instance-description",
      );
      expect(instanceDescSetting.value).toBe("A test instance");

      // Verify storage was configured (stored as a secret)
      const storageDsn = await database
        .selectFrom("vault.decrypted_secrets")
        .select("decrypted_secret")
        .where("name", "=", "storage.dsn")
        .executeTakeFirstOrThrow();

      expect(storageDsn.decrypted_secret).toContain("localhost:9000");
      expect(storageDsn.decrypted_secret).toContain("test-access-key");
    });

    it("should create admin with SMTP configuration", async () => {
      // First, clear any existing data
      await database.deleteFrom("authentication.user").execute();
      await database.deleteFrom("settings_revision").execute();
      await database.deleteFrom("vault.secrets").execute();

      const config: SetupConfig = {
        admin: { email: "admin2@example.com", name: "Admin Two" },
        database,
        databaseDsn: testContext.connectionString,
        instance: { name: "SMTP Test Library" },
        smtp: {
          from: "noreply@example.com",
          host: "smtp.example.com",
          password: "smtp-password",
          port: 587,
          username: "smtp-user",
        },
        storage: {
          accessKeyId: "access-key",
          endpoint: "http://localhost:9000",
          secretAccessKey: "secret-key",
        },
      };

      await applySetup(config);

      // Verify SMTP secrets were stored
      const smtpHost = await database
        .selectFrom("vault.decrypted_secrets")
        .select("decrypted_secret")
        .where("name", "=", "smtp.host")
        .executeTakeFirstOrThrow();

      expect(smtpHost.decrypted_secret).toBe("smtp.example.com");

      const smtpPort = await database
        .selectFrom("vault.decrypted_secrets")
        .select("decrypted_secret")
        .where("name", "=", "smtp.port")
        .executeTakeFirstOrThrow();

      expect(smtpPort.decrypted_secret).toBe("587");

      const smtpFrom = await database
        .selectFrom("vault.decrypted_secrets")
        .select("decrypted_secret")
        .where("name", "=", "smtp.from")
        .executeTakeFirstOrThrow();

      expect(smtpFrom.decrypted_secret).toBe("noreply@example.com");
    });
  });

  describe("Usability Verification", () => {
    it("should result in a usable Colibri instance", async () => {
      // Clear and set up fresh
      await database.deleteFrom("authentication.user").execute();
      await database.deleteFrom("settings_revision").execute();
      await database.deleteFrom("vault.secrets").execute();

      const config: SetupConfig = {
        admin: { email: "librarian@mybooks.com", name: "My Librarian" },
        database,
        databaseDsn: testContext.connectionString,
        instance: { description: "My personal ebook collection", name: "My Book Library" },
        storage: {
          accessKeyId: "AKIAIOSFODNN7EXAMPLE",
          endpoint: "https://s3.us-west-2.amazonaws.com",
          forcePathStyle: false,
          region: "us-west-2",
          secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        },
      };

      await applySetup(config);

      // Test 1: Admin can be found
      const admin = await database
        .selectFrom("authentication.user")
        .selectAll()
        .where("role", "=", "admin")
        .executeTakeFirstOrThrow();

      expect(admin.email).toBe("librarian@mybooks.com");
      expect(admin.verified).toBe(true);

      // Test 2: Instance settings are queryable via getSetting
      const { getSetting } = await import("@colibri-hq/sdk");

      const instanceName = await getSetting(database, "urn:colibri:settings:general:instance-name");
      expect(instanceName.value).toBe("My Book Library");

      const instanceDesc = await getSetting(
        database,
        "urn:colibri:settings:general:instance-description",
      );
      expect(instanceDesc.value).toBe("My personal ebook collection");

      // Storage DSN is stored as a secret
      const storageDsn = await database
        .selectFrom("vault.decrypted_secrets")
        .select("decrypted_secret")
        .where("name", "=", "storage.dsn")
        .executeTakeFirst();

      expect(storageDsn?.decrypted_secret).toBeDefined();

      // Test 3: Can create works (basic CRUD test)
      const work = await database
        .insertInto("work")
        .defaultValues()
        .returning("id")
        .executeTakeFirstOrThrow();

      expect(work.id).toBeDefined();

      // Test 4: Can create creators
      const creator = await database
        .insertInto("creator")
        .values({ name: "Test Author" })
        .returning("id")
        .executeTakeFirstOrThrow();

      expect(creator.id).toBeDefined();

      // Test 5: Can create editions and link to work/creator
      const edition = await database
        .insertInto("edition")
        .values({ title: "Test Book Title", work_id: work.id })
        .returning("id")
        .executeTakeFirstOrThrow();

      expect(edition.id).toBeDefined();

      // Test 6: Can link edition to creator via contribution
      await database
        .insertInto("contribution")
        .values({ creator_id: creator.id, edition_id: edition.id, role: "aut" })
        .execute();

      const contribution = await database
        .selectFrom("contribution")
        .selectAll()
        .where("edition_id", "=", edition.id)
        .executeTakeFirstOrThrow();

      expect(contribution.creator_id).toBe(creator.id);
      expect(contribution.role).toBe("aut");

      // Clean up test data
      await database.deleteFrom("contribution").execute();
      await database.deleteFrom("edition").execute();
      await database.deleteFrom("work").execute();
      await database.deleteFrom("creator").execute();
    });
  });
});
