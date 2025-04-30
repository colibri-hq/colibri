// @ts-nocheck
import { resolveUserId } from "$lib/server/auth";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load = async ({ cookies }: Parameters<LayoutServerLoad>[0]) => {
  if (!resolveUserId(cookies)) {
    throw redirect(307, "/auth/login");
  }
};
