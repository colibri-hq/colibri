// @ts-nocheck
import { trpc } from "$lib/trpc/client";
import type { LayoutLoad } from "./$types";

export const load = async function load(event: Parameters<LayoutLoad>[0]) {
  const data = await event.parent();
  const collections = data.isAuthenticated
    ? trpc(event).collections.list.query()
    : [];

  return {
    ...data,
    collections,
  };
};
