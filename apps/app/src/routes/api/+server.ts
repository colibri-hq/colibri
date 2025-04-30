import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET = function handler() {
  return json({});
} satisfies RequestHandler;
