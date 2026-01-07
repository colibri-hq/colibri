import { error, json, type RequestHandler } from "@sveltejs/kit";
import { dev } from "$app/environment";

/**
 * Chrome DevTools Workspace Discovery endpoint
 *
 * @see https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/ecosystem/automatic_workspace_folders.md
 */
export const GET = async function GET({ url }) {
  // This endpoint is only available in development mode on localhost
  if (!dev || url.hostname !== "localhost") {
    error(404);
  }

  // This is an async import to avoid importing a node.js module in a production
  // build against another platform (like edge runtime).
  const { resolve } = await import("node:path");

  return json({
    workspace: {
      // Resolves to the monorepo root
      root: resolve(import.meta.dirname, "../../../../../../.."),

      // Chosen by fair dice roll. Guaranteed to be unique.
      // https://xkcd.com/221/
      uuid: "53b029bb-c989-4dca-969b-835fecec3717",
    },
  });
} satisfies RequestHandler;
