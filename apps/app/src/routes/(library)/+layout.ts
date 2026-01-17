import { trpc } from "$lib/trpc/client";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async function load(event) {
  const parentData = await event.parent();
  const collections = parentData.isAuthenticated ? trpc(event).collections.list.query() : [];

  return {
    ...parentData,
    ...event.data, // Include server load data (moderationEnabled)
    collections,
  };
};
