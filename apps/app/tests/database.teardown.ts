import { initialize } from "@colibri-hq/sdk";
import { test as teardown } from "playwright/test";

teardown("Remove test database entries", async () => {
  const database = initialize(process.env.DB_URL!);

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
