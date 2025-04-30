// @ts-nocheck
import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load = async function load(event: Parameters<PageLoad>[0]) {
  const query = event.url.searchParams.get("q") || undefined;
  const books = await trpc(event).books.list.query({ query });

  return { books };
};
