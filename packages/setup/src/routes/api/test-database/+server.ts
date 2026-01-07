import type { RequestEvent } from "@sveltejs/kit";
import { initialize } from "@colibri-hq/sdk";
import { json } from "@sveltejs/kit";

export async function POST({ request }: RequestEvent) {
  try {
    const { dsn } = await request.json();

    if (!dsn) {
      return json(
        { error: "Connection string is required", success: false },
        { status: 400 },
      );
    }

    // Validate DSN format
    try {
      const url = new URL(dsn);
      if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
        return json(
          {
            error:
              "Must be a valid PostgreSQL connection string (postgres://...)",
            success: false,
          },
          { status: 400 },
        );
      }
    } catch {
      return json(
        { error: "Invalid connection string format", success: false },
        { status: 400 },
      );
    }

    // Test connection
    const db = initialize(dsn);

    try {
      await db
        .selectFrom("authentication.user")
        .select("id")
        .limit(1)
        .execute();
      await db.destroy();
      return json({ success: true });
    } catch (error) {
      await db.destroy();

      if (error instanceof Error && error.message.includes("does not exist")) {
        return json(
          {
            error:
              "The database schema is not initialized. Please run migrations first (pnpx supabase db push).",
            success: false,
          },
          { status: 400 },
        );
      }

      return json(
        {
          error: error instanceof Error ? error.message : "Connection failed",
          success: false,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 },
    );
  }
}
