import { ensureLoggedIn } from "$lib/server/utilities";
import type { LayoutServerLoad } from "./$types";

export const load = async function load({ cookies, parent, url }) {
  await ensureLoggedIn(cookies, url, parent());
} satisfies LayoutServerLoad;
