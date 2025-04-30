import { resolveUserId } from "$lib/server/auth";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ cookies }) => {
  if (!resolveUserId(cookies)) {
    throw redirect(307, "/auth/login");
  }
};
