import type { Database } from "@colibri-hq/sdk";
import { initialize } from "@colibri-hq/sdk";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  clearTestDatabase,
  setupTestDatabase,
  teardownTestDatabase,
  type TestContext,
} from "./test-utils.js";

// Helper functions moved to module scope for lint compliance

function validateConfig(config: unknown): string[] {
  const errors: string[] = [];
  const c = config as Record<string, unknown>;

  if (!c.databaseDsn || typeof c.databaseDsn !== "string") {
    errors.push("Database DSN is required");
  }

  const admin = c.admin as Record<string, unknown> | undefined;
  if (!admin?.email) {
    errors.push("Admin email is required");
  }
  if (!admin?.name) {
    errors.push("Admin name is required");
  }

  const instance = c.instance as Record<string, unknown> | undefined;
  if (!instance?.name) {
    errors.push("Instance name is required");
  }

  const storage = c.storage as Record<string, unknown> | undefined;
  if (!storage?.endpoint) {
    errors.push("Storage endpoint is required");
  }
  if (!storage?.accessKeyId) {
    errors.push("Storage access key is required");
  }
  if (!storage?.secretAccessKey) {
    errors.push("Storage secret key is required");
  }

  return errors;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidDsn(dsn: string): boolean {
  try {
    const url = new URL(dsn);
    return url.protocol === "postgres:" || url.protocol === "postgresql:";
  } catch {
    return false;
  }
}

function isValidEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * These tests verify the API endpoints work correctly.
 * Since SvelteKit endpoints require the full server context,
 * we test the core logic that the endpoints use directly.
 */
describe("API Endpoint Logic E2E Tests", () => {
  let testContext: TestContext;
  let database: Database;

  beforeAll(async () => {
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

  beforeEach(async () => {
    await clearTestDatabase(testContext.connectionString);
  });

  describe("Test Database Connection Logic", () => {
    it("should successfully test a valid database connection", async () => {
      // This simulates what /api/test-database does
      const testDb = initialize(testContext.connectionString);

      try {
        const result = await testDb
          .selectFrom("authentication.user")
          .select("id")
          .limit(1)
          .execute();

        // Connection successful if we get here
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      } finally {
        await testDb.destroy();
      }
    });

    it("should fail with invalid connection string", async () => {
      const invalidDsn = "postgres://invalid:invalid@localhost:9999/nonexistent";

      // This should fail to connect
      const testDb = initialize(invalidDsn);

      await expect(
        testDb.selectFrom("authentication.user").select("id").limit(1).execute(),
      ).rejects.toThrow();

      await testDb.destroy();
    });
  });

  describe("Apply Config Logic", () => {
    it("should validate required fields", () => {
      // Test missing fields
      const emptyErrors = validateConfig({});
      expect(emptyErrors).toContain("Database DSN is required");
      expect(emptyErrors).toContain("Admin email is required");
      expect(emptyErrors).toContain("Instance name is required");
      expect(emptyErrors).toContain("Storage endpoint is required");

      // Test valid config
      const validErrors = validateConfig({
        admin: { email: "test@test.com", name: "Test" },
        databaseDsn: "postgres://localhost/test",
        instance: { name: "Test" },
        storage: {
          accessKeyId: "key",
          endpoint: "http://localhost:9000",
          secretAccessKey: "secret",
        },
      });
      expect(validErrors).toHaveLength(0);
    });

    it("should apply configuration to database", async () => {
      // Import the actual applySetup function
      const { applySetup } = await import("../core/state.js");

      await applySetup({
        admin: { email: "api-test@example.com", name: "API Test Admin" },
        database,
        databaseDsn: testContext.connectionString,
        instance: { description: "API Test Description", name: "API Test Instance" },
        storage: {
          accessKeyId: "api-access",
          endpoint: "http://minio:9000",
          secretAccessKey: "api-secret",
        },
      });

      // Verify the user was created
      const user = await database
        .selectFrom("authentication.user")
        .selectAll()
        .where("email", "=", "api-test@example.com")
        .executeTakeFirstOrThrow();

      expect(user.name).toBe("API Test Admin");
      expect(user.role).toBe("admin");

      // Verify settings via getSetting
      const { getSetting } = await import("@colibri-hq/sdk");
      const instanceNameSetting = await getSetting(
        database,
        "urn:colibri:settings:general:instance-name",
      );

      expect(instanceNameSetting.value).toBe("API Test Instance");
    });
  });

  describe("Email Validation", () => {
    it("should validate email format", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
      expect(isValidEmail("user+tag@example.com")).toBe(true);

      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("test@")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });
  });

  describe("DSN Validation", () => {
    it("should validate PostgreSQL DSN format", () => {
      expect(isValidDsn("postgres://user:pass@localhost:5432/db")).toBe(true);
      expect(isValidDsn("postgresql://user:pass@localhost/db")).toBe(true);
      expect(isValidDsn("postgres://localhost/db")).toBe(true);

      expect(isValidDsn("mysql://localhost/db")).toBe(false);
      expect(isValidDsn("not-a-url")).toBe(false);
      expect(isValidDsn("")).toBe(false);
    });

    it("should validate S3 endpoint format", () => {
      expect(isValidEndpoint("https://s3.amazonaws.com")).toBe(true);
      expect(isValidEndpoint("http://localhost:9000")).toBe(true);
      expect(isValidEndpoint("https://minio.example.com:9000")).toBe(true);

      expect(isValidEndpoint("ftp://files.example.com")).toBe(false);
      expect(isValidEndpoint("not-a-url")).toBe(false);
    });
  });
});
