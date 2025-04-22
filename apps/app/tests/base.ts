import { type Database, initialize } from '@colibri-hq/sdk';
import { test as base } from '@playwright/test';

type DatabaseFixtures = {
  database: Database;
};

export const test = base.extend<DatabaseFixtures>({
  async database(_context, use) {
    const database = initialize(process.env.DATABASE_URL!, {
      certificate: process.env.DATABASE_CERTIFICATE!,
      debug: true,
    });

    await use(database);
  },
});
