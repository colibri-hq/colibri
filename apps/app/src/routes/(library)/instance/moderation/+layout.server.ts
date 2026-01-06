import { requireAdmin } from "$lib/server/guards";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({
  parent,
  locals: { database },
}) => {
  const { user, moderationEnabled } = await parent();

  // Parent layouts ensure authentication - just check admin role
  await requireAdmin(database, user!.id);

  // Check if moderation is enabled
  if (!moderationEnabled) {
    throw redirect(302, "/instance/settings");
  }

  return { isAdmin: true };
};
