import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { version } from "../../../../package.json" with { type: "json" };

export const GET = function handle({ url }) {
  return json({ instance_url: url.origin, version });
} satisfies RequestHandler;
