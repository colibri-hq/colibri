import { initialize } from "@colibri-hq/sdk";
import { createHash } from "node:crypto";
import { test as setup } from "playwright/test";
import { storageState } from "../playwright.config";
import {
  TEST_USER_ID,
  TEST_NON_ADMIN_USER_ID,
  TEST_WORK_IDS,
  TEST_EDITION_IDS,
  TEST_CREATOR_IDS,
  TEST_PUBLISHER_IDS,
  TEST_COLLECTION_IDS,
} from "./test-data";

setup("Seed the database", async ({ context }) => {
  const database = initialize(process.env.DB_URL!, {
    certificate: process.env.DATABASE_CERTIFICATE,
  });

  await database.transaction().execute(async (trx) => {
    // region User and OAuth Setup
    const user = await trx
      .insertInto("authentication.user")
      .values({
        id: TEST_USER_ID,
        name: "Test User",
        email: "test@colibri.io",
        role: "admin",
      })
      .onConflict((conflict) =>
        conflict.column("id").doUpdateSet({ updated_at: new Date() }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    // Non-admin user for testing authorization guards
    await trx
      .insertInto("authentication.user")
      .values({
        id: TEST_NON_ADMIN_USER_ID,
        name: "Regular User",
        email: "user@colibri.io",
        role: "adult",
      })
      .onConflict((conflict) =>
        conflict.column("id").doUpdateSet({ updated_at: new Date() }),
      )
      .execute();

    const client = await trx
      .insertInto("authentication.client")
      .values({
        id: "test-client",
        name: "Test Client",
        description: "A test client",
        redirect_uris: ["http://localhost:3000/oauth/callback"],
        secret: null,
        active: true,
        personal: false,
        revoked: false,
        user_id: user.id,
      })
      .onConflict((conflict) =>
        conflict.column("id").doUpdateSet({ updated_at: new Date() }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("authentication.client_scope")
      .values([
        { scope_id: "profile", client_id: client.id },
        { scope_id: "offline_access", client_id: client.id },
        { scope_id: "email", client_id: client.id },
        { scope_id: "openid", client_id: client.id },
        { scope_id: "ingest", client_id: client.id },
      ])
      .onConflict((conflict) => conflict.doNothing())
      .execute();

    const client2 = await trx
      .insertInto("authentication.client")
      .values({
        id: "test-client-confidential",
        name: "Confidential Test Client",
        description: "A confidential test client",
        redirect_uris: null,
        secret: createHash("sha256").update("foo").digest("base64url"),
        active: true,
        personal: false,
        revoked: false,
        user_id: user.id,
      })
      .onConflict((conflict) =>
        conflict.column("id").doUpdateSet({ updated_at: new Date() }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("authentication.client_scope")
      .values([{ scope_id: "ingest", client_id: client2.id }])
      .onConflict((conflict) => conflict.doNothing())
      .execute();
    // endregion

    // region Search Test Data - Creators
    const testCreators = [
      {
        id: TEST_CREATOR_IDS[0],
        name: "Brandon Sanderson",
        description:
          "Epic fantasy author known for intricate magic systems and the Cosmere universe",
      },
      {
        id: TEST_CREATOR_IDS[1],
        name: "Isaac Asimov",
        description:
          "Science fiction legend, author of the Foundation series and robot stories",
      },
    ];

    for (const creator of testCreators) {
      await trx
        .insertInto("creator")
        .values({
          id: BigInt(creator.id),
          name: creator.name,
          description: creator.description,
          sorting_key: creator.name,
        })
        .onConflict((conflict) =>
          conflict.column("id").doUpdateSet({
            name: creator.name,
            description: creator.description,
            updated_at: new Date(),
          }),
        )
        .execute();
    }
    // endregion

    // region Search Test Data - Publishers
    const testPublishers = [
      {
        id: TEST_PUBLISHER_IDS[0],
        name: "Tor Books",
        description:
          "Major fantasy and science fiction publisher founded in 1980",
      },
    ];

    for (const publisher of testPublishers) {
      await trx
        .insertInto("publisher")
        .values({
          id: BigInt(publisher.id),
          name: publisher.name,
          description: publisher.description,
          sorting_key: publisher.name,
        })
        .onConflict((conflict) =>
          conflict.column("id").doUpdateSet({
            name: publisher.name,
            description: publisher.description,
            updated_at: new Date(),
          }),
        )
        .execute();
    }
    // endregion

    // region Search Test Data - Works and Editions
    const testBooks = [
      {
        workId: TEST_WORK_IDS[0],
        editionId: TEST_EDITION_IDS[0],
        title: "The Fantasy Quest",
        synopsis:
          "An epic adventure in a magical realm filled with dragons and wizards",
      },
      {
        workId: TEST_WORK_IDS[1],
        editionId: TEST_EDITION_IDS[1],
        title: "Science Fiction Galaxy",
        synopsis: "Space exploration and alien contact in a distant future",
      },
      {
        workId: TEST_WORK_IDS[2],
        editionId: TEST_EDITION_IDS[2],
        title: "Mystery Manor",
        synopsis:
          "A detective investigates strange occurrences in a haunted house",
      },
      {
        workId: TEST_WORK_IDS[3],
        editionId: TEST_EDITION_IDS[3],
        title: "Fantasy World Builder",
        synopsis: "Creating imaginary realms and epic stories",
      },
      {
        workId: TEST_WORK_IDS[4],
        editionId: TEST_EDITION_IDS[4],
        title: "Romance in Paris",
        synopsis: "A love story set in the beautiful streets of France",
      },
    ];

    for (const book of testBooks) {
      // Create work
      await trx
        .insertInto("work")
        .values({
          id: BigInt(book.workId),
        })
        .onConflict((conflict) =>
          conflict.column("id").doUpdateSet({ updated_at: new Date() }),
        )
        .execute();

      // Create edition
      await trx
        .insertInto("edition")
        .values({
          id: BigInt(book.editionId),
          work_id: BigInt(book.workId),
          title: book.title,
          synopsis: book.synopsis,
          sorting_key: book.title,
        })
        .onConflict((conflict) =>
          conflict.column("id").doUpdateSet({
            title: book.title,
            synopsis: book.synopsis,
            updated_at: new Date(),
          }),
        )
        .execute();

      // Update work to point to main edition
      await trx
        .updateTable("work")
        .set({ main_edition_id: BigInt(book.editionId) })
        .where("id", "=", BigInt(book.workId))
        .execute();
    }
    // endregion

    // region Search Test Data - Collections
    const testCollections = [
      {
        id: TEST_COLLECTION_IDS[0],
        name: "Fantasy Favorites",
        description: "My favorite fantasy novels and epic adventures",
      },
      {
        id: TEST_COLLECTION_IDS[1],
        name: "Sci-Fi Classics",
        description: "Classic science fiction books everyone should read",
      },
    ];

    for (const collection of testCollections) {
      await trx
        .insertInto("collection")
        .values({
          id: BigInt(collection.id),
          name: collection.name,
          description: collection.description,
          created_by: BigInt(user.id),
          shared: true,
        })
        .onConflict((conflict) =>
          conflict.column("id").doUpdateSet({
            name: collection.name,
            description: collection.description,
            updated_at: new Date(),
          }),
        )
        .execute();
    }
    // endregion
  });

  await context.storageState({ path: storageState });
});
