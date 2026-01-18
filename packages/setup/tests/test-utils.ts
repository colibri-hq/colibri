import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const currentDir = dirname(fileURLToPath(import.meta.url));

/**
 * Test context containing the database container and connection info
 */
export interface TestContext {
  connectionString: string;
  container: StartedPostgreSqlContainer;
  database: string;
  host: string;
  password: string;
  port: number;
  username: string;
}

/**
 * Start a PostgreSQL container and apply all migrations
 */
export async function setupTestDatabase(): Promise<TestContext> {
  // Start PostgreSQL container
  const container = await new PostgreSqlContainer("postgres:17-alpine")
    .withDatabase("colibri_test")
    .withUsername("test")
    .withPassword("test")
    .start();

  const connectionString = container.getConnectionUri();

  // Apply migrations
  await applyMigrations(connectionString);

  return {
    connectionString,
    container,
    database: "colibri_test",
    host: container.getHost(),
    password: "test",
    port: container.getPort(),
    username: "test",
  };
}

/**
 * Apply all SQL migrations from the supabase/migrations directory
 */
async function applyMigrations(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Create Supabase-like roles that the schema expects
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
      END
      $$;
    `);

    // Create Supabase Vault schema and stub tables/functions
    // This simulates the Vault extension functionality for secrets
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS vault;

      -- Secrets table (simulates vault.secrets)
      CREATE TABLE IF NOT EXISTS vault.secrets (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text UNIQUE NOT NULL,
        description text,
        secret text NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- Decrypted secrets view (simulates vault.decrypted_secrets)
      -- In real Supabase this decrypts, but we store plaintext for testing
      CREATE OR REPLACE VIEW vault.decrypted_secrets AS
      SELECT
        id,
        name,
        description,
        secret as decrypted_secret,
        created_at,
        updated_at
      FROM vault.secrets;

      -- create_secret function (simulates vault.create_secret)
      CREATE OR REPLACE FUNCTION vault.create_secret(
        p_secret text,
        p_name text,
        p_description text DEFAULT NULL
      ) RETURNS uuid AS $$
      DECLARE
        v_id uuid;
      BEGIN
        INSERT INTO vault.secrets (name, description, secret)
        VALUES (p_name, p_description, p_secret)
        ON CONFLICT (name) DO UPDATE SET
          secret = EXCLUDED.secret,
          description = EXCLUDED.description,
          updated_at = now()
        RETURNING id INTO v_id;
        RETURN v_id;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // First, create the required extensions that might not be available
    // We'll create them in the extensions schema like Supabase does
    await client.query(`CREATE SCHEMA IF NOT EXISTS extensions;`);

    // The 'isn' extension might not be available in the test container,
    // so we'll skip it and handle any dependent features gracefully
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS "isn" WITH SCHEMA extensions;`);
    } catch {
      // Extension not available, that's okay for tests
    }

    // unaccent is commonly available
    await client.query(`CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA public;`);

    // Read and execute migration files
    const migrationsDir = resolve(currentDir, "../../../supabase/migrations");
    const migrationFiles = ["20251225151111_schema.sql", "20251226212735_pending_ingestion.sql"];

    for (const file of migrationFiles) {
      const sql = readFileSync(resolve(migrationsDir, file), "utf8");

      // Process the SQL to handle extensions that might not be available
      const processedSql = sql
        // Skip the 'isn' extension creation since it's not available in standard postgres
        .replaceAll(/create extension if not exists "isn"[^;]*;/gi, "-- skipped: isn extension")
        // The unaccent was already created above
        .replaceAll(
          /create extension if not exists "unaccent"[^;]*;/gi,
          "-- skipped: already created",
        );

      await client.query(processedSql);
    }
  } finally {
    await client.end();
  }
}

/**
 * Teardown the test database
 */
export async function teardownTestDatabase(context: TestContext): Promise<void> {
  await context.container.stop();
}

/**
 * Clear all data from the database while keeping the schema
 */
export async function clearTestDatabase(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Get all tables and truncate them
    const result = await client.query(`
      SELECT schemaname, tablename
      FROM pg_tables
      WHERE schemaname IN ('public', 'authentication')
        AND tablename NOT LIKE 'pg_%'
    `);

    for (const row of result.rows) {
      await client.query(`TRUNCATE "${row.schemaname}"."${row.tablename}" CASCADE`);
    }
  } finally {
    await client.end();
  }
}
