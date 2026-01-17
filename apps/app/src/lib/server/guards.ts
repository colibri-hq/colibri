import { findUserByIdentifier, type Database } from "@colibri-hq/sdk";
import { error } from "@sveltejs/kit";

/**
 * Require admin role. Call after authentication is verified.
 * @throws 403 error if user is not admin
 */
export async function requireAdmin(database: Database, userId: string) {
  const user = await findUserByIdentifier(database, userId);

  if (user.role !== "admin") {
    throw error(403, "You do not have permission to access this page");
  }

  return user;
}
