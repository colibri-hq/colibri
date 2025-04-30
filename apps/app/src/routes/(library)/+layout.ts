import { trpc } from "$lib/trpc/client";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async function load(event) {
  const data = await event.parent();
  const collections = data.isAuthenticated
    ? trpc(event).collections.list.query()
    : [];

  return {
    ...data,
    collections,
  };
};
