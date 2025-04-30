import { oauth } from "$lib/server/oauth";
import { OAuthError } from "@colibri-hq/oauth";
import type { RequestHandler } from "./$types";

export const prerender = false;

export const POST = async function handle({ request, locals: { database } }) {
  try {
    return oauth(database).handleTokenRequest(request);
  } catch (cause) {
    if (cause instanceof OAuthError) {
      const { response } = cause;

      return response;
    }

    throw new Error("Failed to handle token request", { cause });
  }
} satisfies RequestHandler;
