import type { User } from "./user";
import type { Database, Schema } from "../../database";
import { type Insertable, type Selectable, type Updateable } from "kysely";

const table = "authentication.authenticator" as const;

export async function findAuthenticatorByIdentifier(
  client: Database,
  identifier: string,
) {
  return await client
    .selectFrom(table)
    .selectAll()
    .where("identifier", "=", identifier)
    .executeTakeFirstOrThrow();
}

export async function listAuthenticatorsForUser(
  client: Database,
  user: User | string,
) {
  const userId = typeof user === "string" ? user : user.id;

  return await client
    .selectFrom(table)
    .selectAll()
    // @ts-expect-error -- Type is not inferred correctly
    .select(({ fn }) => fn.toJson("transports").as("transports"))
    .where("user_id", "=", userId.toString())
    .execute();
}

export async function hasRegisteredAuthenticator(
  client: Database,
  user: User | string,
) {
  const userId = typeof user === "string" ? user : user.id;
  const { count } = await client
    .selectFrom(table)
    .select(({ fn: { count } }) => count("id").as("count"))
    .where("user_id", "=", userId.toString())
    .executeTakeFirstOrThrow();

  return Number(count) > 0;
}

export async function updateAuthenticator(
  client: Database,
  identifier: string,
  changes: Updateable<Authenticator>,
) {
  await client
    .updateTable("authentication.authenticator")
    .set(changes)
    .where("identifier", "=", identifier)
    .execute();
}

export async function removeAuthenticator(
  client: Database,
  identifier: string,
) {
  await client
    .deleteFrom(table)
    .where("identifier", "=", identifier)
    .executeTakeFirstOrThrow();
}

export async function createAuthenticator(
  client: Database,
  data: Omit<
    Insertable<Schema["authentication.authenticator"]>,
    "created_at" | "id"
  >,
) {
  return await client.insertInto(table).values(data).executeTakeFirstOrThrow();
}

type Table = Schema[typeof table];
export type Authenticator = Selectable<Table>;
