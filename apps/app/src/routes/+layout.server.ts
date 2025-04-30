import { getJwtCookie, verifyToken } from "$lib/server/auth";
import { findUserByIdentifier, type User } from "@colibri-hq/sdk";
import type { LayoutServerLoad } from "./$types";

export type AuthData =
  | { isAuthenticated?: false; user?: never }
  | { isAuthenticated: true; user: User };

export const load = async function load({
  cookies,
  depends,
  locals: { database },
}) {
  depends("auth:user");

  try {
    const token = getJwtCookie(cookies) || "";
    const { sub } = verifyToken(token);
    const user = await findUserByIdentifier(database, sub as string);

    return { isAuthenticated: true, user };
  } catch {
    return { isAuthenticated: false };
  }
} satisfies LayoutServerLoad<AuthData>;
