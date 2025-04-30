import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = async function load() {
  throw redirect(307, "/api/docs");
} satisfies PageServerLoad;
