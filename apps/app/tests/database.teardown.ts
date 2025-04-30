import { createClient } from "@colibri-hq/sdk";
import { test as teardown } from "playwright/test";

teardown("Remove test database entries", async () => {
  const database = createClient(process.env.DATABASE_URL!, {
    certificate: process.env.DATABASE_CERTIFICATE!,
  });

  await Promise.all([
    database
      .deleteFrom("authentication.user")
      .where("id", "in", ["999"])
      .execute(),
    database
      .deleteFrom("authentication.client")
      .where("id", "in", ["test-client", "test-client-confidential"])
      .execute(),
  ]);
});
