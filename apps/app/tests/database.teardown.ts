import { initialize } from "@colibri-hq/sdk";
import { test as teardown } from "playwright/test";
import {
  TEST_USER_ID,
  TEST_NON_ADMIN_USER_ID,
  TEST_WORK_IDS,
  TEST_CREATOR_IDS,
  TEST_PUBLISHER_IDS,
  TEST_COLLECTION_IDS,
} from "./test-data";

teardown("Remove test database entries", async () => {
  const database = initialize(process.env.DB_URL!, {
    certificate: process.env.DATABASE_CERTIFICATE,
  });

  await Promise.all([
    // Clean up authentication data
    database
      .deleteFrom("authentication.user")
      .where("id", "in", [TEST_USER_ID, TEST_NON_ADMIN_USER_ID])
      .execute(),
    database
      .deleteFrom("authentication.client")
      .where("id", "in", ["test-client", "test-client-confidential"])
      .execute(),

    // Clean up search test data (order matters due to foreign keys)
    // Collections first (no dependencies)
    database
      .deleteFrom("collection")
      .where(
        "id",
        "in",
        TEST_COLLECTION_IDS.map((id) => BigInt(id)),
      )
      .execute(),

    // Creators (no dependencies on other test data)
    database
      .deleteFrom("creator")
      .where(
        "id",
        "in",
        TEST_CREATOR_IDS.map((id) => BigInt(id)),
      )
      .execute(),

    // Publishers (no dependencies on other test data)
    database
      .deleteFrom("publisher")
      .where(
        "id",
        "in",
        TEST_PUBLISHER_IDS.map((id) => BigInt(id)),
      )
      .execute(),

    // Works will cascade delete editions
    database
      .deleteFrom("work")
      .where(
        "id",
        "in",
        TEST_WORK_IDS.map((id) => BigInt(id)),
      )
      .execute(),
  ]);
});
