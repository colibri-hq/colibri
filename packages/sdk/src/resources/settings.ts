import type { Database, Schema } from "../database.js";
import type { Settings as $Settings } from "../schema.js";
import type { Selectable, Updateable } from "kysely";

const table = "settings" as const;

export function loadSettings(database: Database) {
  return database
    .selectFrom(table)
    .leftJoin("authentication.user as user", "updated_by", "id")
    .selectAll(table)
    .select(({ fn }) => fn.toJson("user").as("updated_by"))
    .executeTakeFirstOrThrow();
}

export function updateSettings(
  database: Database,
  settings: Updateable<Selectable<Schema["settings_revision"]>>,
) {
  return database
    .updateTable("settings_revision")
    .set(settings)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getSecret(
  database: Database,
  key: string,
): Promise<string | undefined> {
  const result = await database
    .selectFrom("vault.decrypted_secrets")
    .where("name", "=", key)
    .select("decrypted_secret")
    .executeTakeFirst();

  return result ? (result.decrypted_secret ?? undefined) : undefined;
}

type UnwrapNamespacedName<T extends `${string}.${string}` | string> =
  T extends `${string}.${infer Name}` ? Name : T;

export async function getSecrets<T extends string>(
  database: Database,
  keys: T[],
): Promise<Record<UnwrapNamespacedName<T>, string | undefined>> {
  const secrets = await database
    .selectFrom("vault.decrypted_secrets")
    .where("name", "in", keys)
    .select(["name", "decrypted_secret"])
    .execute();

  return Object.fromEntries(
    secrets.map(({ name, decrypted_secret }) => [
      name?.split(".").slice(1).join(".") ?? name,
      decrypted_secret ?? undefined,
    ]),
  );
}

export async function removeSecret(
  database: Database,
  key: string,
): Promise<void> {
  await database.deleteFrom("vault.secrets").where("name", "=", key).execute();
}

export async function storeSecret(
  database: Database,
  key: string,
  value: string,
  description?: string,
): Promise<void> {
  await database
    .selectNoFrom(({ fn, val }) =>
      fn<[string, string, string]>("vault.create_secret", [
        val(value),
        val(key),
        val(description ?? `Secret for ${key}`),
      ]).as("_result"),
    )
    .execute();
}

export type Settings = Selectable<$Settings>;
