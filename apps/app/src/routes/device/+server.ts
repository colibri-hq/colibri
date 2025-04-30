import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const fallback = function handle() {
  throw redirect(303, "/auth/oauth/device");
} satisfies RequestHandler;

// TODO: Prerender this page once we've decided on statically building for the
//       given environment configuration
export const prerender = false;
