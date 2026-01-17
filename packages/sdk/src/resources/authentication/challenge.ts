import type { Insertable, Selectable } from "kysely";
import type { Database, Schema } from "../../database.js";

const table = "authentication.challenge" as const;

export async function resolveCurrentChallenge(client: Database, identifier: string) {
  const { challenge, expires_at } = await client
    .selectFrom(table)
    .select(["expires_at", "challenge"])
    .where("session_identifier", "=", identifier)
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirstOrThrow();

  if (new Date(expires_at) <= new Date()) {
    throw new Error("Challenge has expired");
  }

  return challenge;
}

export async function findChallengeByIdentifier(client: Database, identifier: string) {
  return await client
    .selectFrom(table)
    .selectAll()
    .where("session_identifier", "=", identifier)
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirstOrThrow();
}

export async function createChallenge(client: Database, data: Insertable<Table>) {
  return await client.insertInto(table).values(data).executeTakeFirstOrThrow();
}

export function deleteChallenges(client: Database, identifier: string) {
  return client
    .deleteFrom(table)
    .where("session_identifier", "=", identifier)
    .executeTakeFirstOrThrow();
}

type Table = Schema[typeof table];
export type Challenge = Selectable<Table>;
