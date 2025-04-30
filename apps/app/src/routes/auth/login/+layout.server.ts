import { redirectToPreviousLocation } from "$lib/server/utilities";
import type { LayoutServerLoad } from "./$types";

export const load = async function load({ parent, url, cookies }) {
  const data = await parent();

  if (data.isAuthenticated) {
    return redirectToPreviousLocation(cookies, url);
  }

  return data;
} satisfies LayoutServerLoad;
