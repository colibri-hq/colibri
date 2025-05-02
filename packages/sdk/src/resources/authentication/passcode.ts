import type { User } from "./user.js";
import type { Database } from "../../database.js";
import { generateRandomDigits } from "@colibri-hq/shared";

const table = "authentication.passcode" as const;

export async function verifyPasscode(
  client: Database,
  email: string,
  code: string,
) {
  const result = await client
    .deleteFrom(table)
    .where((expression) =>
      expression.and({ email, code }).and("expires_at", ">", new Date()),
    )
    .using("authentication.user")
    .returning("user_id")
    .executeTakeFirstOrThrow();

  return Number(result.user_id);
}

export function createPasscode(
  client: Database,
  user: User | User["id"],
  { ttl: ttl$1 = 300, length = 6 }: { ttl?: number; length?: number } = {
    ttl: 300,
    length: 6,
  },
) {
  const code = generateRandomDigits(length);
  const ttl = ttl$1 * 1_000;

  return client
    .insertInto(table)
    .values({
      user_id: typeof user === "string" ? user : user.id,
      expires_at: new Date(Date.now() + ttl),
      code,
    })
    .onConflict((conflict) =>
      conflict.column("user_id").doUpdateSet({
        expires_at: new Date(Date.now() + ttl),
        code,
      }),
    )
    .returning("code")
    .executeTakeFirstOrThrow();
}
