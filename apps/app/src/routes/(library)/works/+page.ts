import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async function load(event) {
  const query = event.url.searchParams.get("q") || undefined;
  const works = await trpc(event).books.list.query({ query });

  return { works };
};
