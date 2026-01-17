import type { Insertable, Selectable, Updateable } from "kysely";
import type { Database, Schema } from "../../database.js";
import { paginate } from "../../utilities.js";

const table = "authentication.user" as const;

export function findUserByIdentifier(client: Database, id: number | string) {
  return client
    .selectFrom(table)
    .selectAll()
    .where("id", "=", id.toString())
    .executeTakeFirstOrThrow();
}

export function findUserByEmail(client: Database, email: string) {
  return client
    .selectFrom(table)
    .selectAll()
    .where("email", "=", email.toLowerCase())
    .executeTakeFirstOrThrow();
}

export async function userExists(client: Database, email: string) {
  const { count } = await client
    .selectFrom(table)
    .select(({ fn }) => fn.count("id").as("count"))
    .where("email", "=", email)
    .executeTakeFirstOrThrow();

  return Number(count) > 0;
}

export async function updateUser(client: Database, id: number | string, data: UpdatableUser) {
  await client.updateTable(table).set(data).where("id", "=", id.toString()).execute();
}

export async function listUsers(client: Database, page = 1, perPage = 10) {
  return paginate(client, table, page, perPage).selectAll().execute();
}

/**
 * Search for users by name (for @mention autocomplete)
 * @param client - Database client
 * @param query - Search query (partial name match)
 * @param limit - Maximum number of results (default 10)
 * @returns List of users matching the query
 */
export async function searchUsers(
  client: Database,
  query: string,
  limit = 10,
): Promise<Array<{ id: string; name: string | null; email: string }>> {
  if (!query.trim()) {
    return [];
  }

  return client
    .selectFrom(table)
    .select(["id", "name", "email"])
    .where("name", "ilike", `%${query}%`)
    .orderBy("name", "asc")
    .limit(limit)
    .execute();
}

export async function createUser(client: Database, data: InsertableUser): Promise<User> {
  return await client
    .insertInto(table)
    .values({ ...data, email: data.email.toLowerCase() })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function removeUser(client: Database, id: number | string): Promise<void> {
  await client.deleteFrom(table).where("id", "=", id.toString()).execute();
}

type Table = Schema[typeof table];
type SelectableUser = Selectable<Table>;
export type User = Omit<SelectableUser, "created_at" | "updated_at"> & {
  created_at: string | Date;
  updated_at: string | Date | null;
};
export type UpdatableUser = Partial<Updateable<Table>>;
export type InsertableUser = Insertable<Table>;

// region User Blocking

/**
 * Block a user (hide their comments from the blocker)
 */
export async function blockUser(
  database: Database,
  blockerId: string,
  blockedId: string,
): Promise<void> {
  await database
    .insertInto("user_block")
    .values({ blocker_id: blockerId, blocked_id: blockedId })
    .onConflict((eb) => eb.constraint("user_block_pkey").doNothing())
    .execute();
}

/**
 * Unblock a user
 */
export async function unblockUser(
  database: Database,
  blockerId: string,
  blockedId: string,
): Promise<void> {
  await database
    .deleteFrom("user_block")
    .where("blocker_id", "=", blockerId)
    .where("blocked_id", "=", blockedId)
    .execute();
}

/**
 * Get list of users blocked by a user
 */
export async function getBlockedUsers(database: Database, userId: string): Promise<User[]> {
  return database
    .selectFrom("user_block")
    .innerJoin(table, "user_block.blocked_id", `${table}.id`)
    .selectAll(table)
    .where("user_block.blocker_id", "=", userId)
    .orderBy("user_block.created_at", "desc")
    .execute() as Promise<User[]>;
}

/**
 * Get list of blocked user IDs (for filtering comments)
 */
export async function getBlockedUserIds(database: Database, userId: string): Promise<string[]> {
  const blocks = await database
    .selectFrom("user_block")
    .select("blocked_id")
    .where("blocker_id", "=", userId)
    .execute();

  return blocks.map((b) => b.blocked_id);
}

/**
 * Check if a user is blocked by another user
 */
export async function isUserBlocked(
  database: Database,
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const result = await database
    .selectFrom("user_block")
    .select("blocker_id")
    .where("blocker_id", "=", blockerId)
    .where("blocked_id", "=", blockedId)
    .executeTakeFirst();

  return !!result;
}

// endregion
