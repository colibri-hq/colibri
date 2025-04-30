import { oauth } from "$lib/server/oauth";
import type { RequestHandler } from "./$types";

// TODO: Prerender this page once we've decided on statically building for the
//       given environment configuration
export const prerender = false;

export const GET = async function handle({ request, locals: { database } }) {
  return oauth(database).handleServerMetadataRequest(request);
} satisfies RequestHandler;
