import { dev } from "$app/environment";
import { oauth } from "$lib/server/oauth";
import { OAuthError } from "@colibri-hq/oauth";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const prerender = false;

export const POST: RequestHandler = async function handler({
  request,
  locals: { database },
}) {
  if (!dev) {
    return json(
      {
        error: "access_denied",
        error_description:
          "The Token introspection endpoint is disabled in production",
      },
      { status: 403 },
    );
  }

  if (request.headers.has("authorisation")) {
    throw error(418, {
      title: "HTTP was designed in the colonies",
      message: `The request is too posh for this server: Try using 'Authorization' instead`,
    });
  }

  try {
    return oauth(database).handleTokenIntrospection(request);
  } catch (cause) {
    if (cause instanceof OAuthError) {
      const { response } = cause;

      return response;
    }

    throw new Error("Failed to handle token introspection request", { cause });
  }
};
