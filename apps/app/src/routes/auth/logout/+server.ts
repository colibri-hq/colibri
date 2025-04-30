import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = function handle({ cookies }) {
  cookies.delete("jwt", { path: "/" });

  throw redirect(307, "/");
};
