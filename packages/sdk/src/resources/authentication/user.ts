import type { Database, Schema } from "../../database";
import type { Insertable, Selectable, Updateable } from "kysely";
import { paginate } from "../../utilities";

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

export async function updateUser(
  client: Database,
  id: number | string,
  data: UpdatableUser,
) {
  await client
    .updateTable(table)
    .set(data)
    .where("id", "=", id.toString())
    .execute();
}

export async function listUsers(client: Database, page = 1, perPage = 10) {
  return paginate(client, table, page, perPage).selectAll().execute();
}

export async function createUser(
  client: Database,
  data: InsertableUser,
): Promise<User> {
  return await client
    .insertInto(table)
    .values({
      ...data,
      email: data.email.toLowerCase(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function removeUser(
  client: Database,
  id: number | string,
): Promise<void> {
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
