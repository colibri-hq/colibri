import { type Database, initialize } from "@colibri-hq/sdk";
import { test as base } from "@playwright/test";

type DatabaseFixtures = { database: Database };

export const test = base.extend<DatabaseFixtures>({
  async database(_, use) {
    const database = initialize(process.env.DB_URL!, {
      certificate: process.env.DATABASE_CERTIFICATE,
      debug: true,
    });

    await use(database);
  },
});
